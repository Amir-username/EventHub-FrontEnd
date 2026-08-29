/**
 * EventHub — auth session store (Pinia, setup-style)
 *
 * Owns the session: tokens (cookie persistence) + user profile (/auth/me).
 * Transport lives in useApi(); this store never builds URLs or headers itself.
 *
 * Backend contract (verified against repo-scan source):
 * - POST /auth/login    {email, password}              -> TokenPair (401 bad creds)
 * - POST /auth/register {full_name?, email, password,
 *                        confirm_pass}                 -> UserRead (NO tokens, 409 dup email)
 * - POST /auth/refresh  ?refresh_token=... (QUERY!)    -> TokenPair (handled inside useApi)
 * - GET  /auth/me       Bearer                          -> UserRead
 * - NO /auth/logout: JWTs are stateless -> logout = client-side teardown only
 * - role wire values are LOWERCASE: 'customer' | 'admin'
 */
import { defineStore } from "pinia";

/** POST /auth/login and /auth/refresh response — backend `TokenPair` */
export interface AuthTokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** GET /auth/me and POST /auth/register response — backend `UserRead` */
export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string; // 'customer' | 'admin' (lowercase — see UserRole enum)
  created_at: string; // ISO 8601 UTC
}

/** Register form payload — camelCase here, mapped to snake_case on the wire */
export interface RegisterPayload {
  fullName?: string | null;
  email: string;
  password: string; // min 8 chars (backend Field constraint)
  confirmPass: string; // -> confirm_pass
}

/* Cookie names shared with useApi's refresh flow — keep in sync */
const ACCESS_COOKIE = "eh_at";
const REFRESH_COOKIE = "eh_rt";
/** Mirror the backend JWT TTLs exactly (core/security.py: 30 min / 4 days) */
const ACCESS_TTL = 60 * 30;
const REFRESH_TTL = 60 * 60 * 24 * 4;

/**
 * Decode a JWT payload WITHOUT verification. UI-gating only:
 * the server re-verifies the signature on every request, so a forged
 * `role` claim changes nothing but a menu item.
 */
function decodeJwtPayload(token: string): { role?: string } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const json = new TextDecoder().decode(
      Uint8Array.from(bytes, (c) => c.charCodeAt(0)),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  /* ---------- transport ---------- */
  /** Configured client from useApi — Bearer, refresh-on-401, error normalization */
  const $api = useApi();

  /* ---------- state: cookies are the persistence layer ---------- */
  const accessToken = useCookie<string | null>(ACCESS_COOKIE, {
    path: "/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: ACCESS_TTL,
    default: () => null,
  });
  const refreshToken = useCookie<string | null>(REFRESH_COOKIE, {
    path: "/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: REFRESH_TTL,
    default: () => null,
  });
  /** Full profile — memory only, re-hydrated from /auth/me by bootstrap() */
  const user = ref<AuthUser | null>(null);

  /** Role from the JWT payload — available instantly after reload, before /auth/me */
  const tokenRole = ref<string | null>(
    decodeJwtPayload(accessToken.value ?? "")?.role ?? null,
  );

  /* ---------- getters ---------- */
  const isAuthenticated = computed(() => Boolean(accessToken.value));
  /** user.role wins once /auth/me has responded; token claim is the instant fallback */
  const isAdmin = computed(
    () => (user.value?.role ?? tokenRole.value) === "admin",
  );
  const displayName = computed(
    () => user.value?.full_name || user.value?.email || "",
  );

  /* ---------- actions ---------- */

  /** Called by useApi's single-flight 401 refresh — single write path for tokens */
  function setTokens(pair: AuthTokenPair) {
    accessToken.value = pair.access_token;
    refreshToken.value = pair.refresh_token;
    tokenRole.value = decodeJwtPayload(pair.access_token)?.role ?? null;
  }

  /** Pure teardown — useApi's refresh-failure path uses this (it does its own redirect) */
  function clearTokens() {
    accessToken.value = null; // assigning null removes the cookie
    refreshToken.value = null;
    tokenRole.value = null;
    user.value = null;
  }

  /** User-initiated logout — clears state and returns to home */
  async function logout() {
    clearTokens();
    await navigateTo("/");
  }

  /**
   * Silent session recovery — POST /auth/refresh with the refresh token as a
   * QUERY param (backend contract: bare str -> query string).
   *
   * Safe against races: the backend refresh is stateless (JWT type=refresh,
   * no rotation — verified in auth_service.refresh), so this coexisting with
   * useApi's single-flight 401 refresh can never invalidate a live session.
   */
  async function tryRefresh(): Promise<boolean> {
    if (!refreshToken.value) return false;
    try {
      const pair = await $api<AuthTokenPair>("/auth/refresh", {
        method: "POST",
        query: { refresh_token: refreshToken.value },
      });
      setTokens(pair);
      return true;
    } catch {
      clearTokens(); // refresh rejected/expired -> teardown; next guard bounces to login
      return false;
    }
  }

  /** POST /auth/login (JSON — never the OAuth2 /auth/token form endpoint) */
  async function login(email: string, password: string) {
    const pair = await $api<AuthTokenPair>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setTokens(pair);
    await fetchMe(); // token has email+role; profile adds full_name/created_at
  }

  /**
   * POST /auth/register — returns the created user, NOT a session.
   * Wire body is snake_case: confirm_pass (and optional full_name).
   * 409 = email already exists, 422 = validation / password mismatch.
   */
  async function register(payload: RegisterPayload): Promise<AuthUser> {
    return await $api<AuthUser>("/auth/register", {
      method: "POST",
      body: {
        full_name: payload.fullName?.trim() || undefined,
        email: payload.email,
        password: payload.password,
        confirm_pass: payload.confirmPass,
      },
    });
  }

  /** GET /auth/me — 401s are silently handled by useApi (refresh + retry) */
  async function fetchMe() {
    if (!accessToken.value) return;
    user.value = await $api<AuthUser>("/auth/me");
  }

  /**
   * Client boot (see plugins/auth.client.ts): restore and validate the
   * session before any middleware runs. Never runs during SSR — SWR pages
   * are shared across users, so /auth/me must never be fetched server-side.
   */
  async function bootstrap() {
    if (user.value) return;

    // Hard-load recovery: the access cookie lives 30 min, the refresh cookie
    // 4 days. If only the refresh cookie remains, silently restore the
    // session FIRST — otherwise every guard would bounce a perfectly
    // logged-in user to /auth/login.
    if (!accessToken.value && refreshToken.value) await tryRefresh();

    if (!accessToken.value || user.value) return;
    try {
      await fetchMe();
    } catch {
      // network/5xx: keep the "token but no profile" state — the next
      // authed request re-runs the 401 refresh flow through useApi
    }
  }

  return {
    // state
    accessToken,
    refreshToken,
    user,
    // getters
    isAuthenticated,
    isAdmin,
    displayName,
    // actions
    login,
    register,
    logout,
    tryRefresh,
    fetchMe,
    setTokens,
    clearTokens,
    bootstrap,
  };
});
