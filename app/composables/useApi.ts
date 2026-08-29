/**
 * useApi — the single fetch wrapper encoding the EventHub backend contract.
 * See ROADMAP.md Phase 2.1.
 *
 * Contract facts (from app/api/auth.py + app/factory.py):
 *  - Routers are mounted at ROOT → apiBase is e.g. http://localhost:8000 (no /api)
 *  - Auth: JWT RS256, Authorization: Bearer <access>; access 30min / refresh 4d
 *  - POST /auth/refresh takes `refresh_token` as a QUERY param (bare str = FastAPI query)
 *  - Errors: {"detail": string}; 422 = {"detail": [{loc, msg}]}; 429 has Retry-After
 *  - Allowed headers in prod: Authorization / Content-Type / X-Request-ID
 */
import type { FetchError, FetchOptions } from "ofetch";

/* ---------- Contract types ---------- */

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** ADR 007 pagination envelope */
export interface Paginated<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export type ApiErrorType =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "server"
  | "unknown";

export interface ApiError {
  type: ApiErrorType;
  status: number | null;
  message: string;
  /** 422 only: "field" -> messages (loc minus the "body" segment) */
  fieldErrors?: Record<string, string[]>;
  /** 429 only: seconds to wait before retrying */
  retryAfterSeconds?: number;
  raw?: unknown;
}

/* ---------- Internals ---------- */

const ACCESS_COOKIE = "eh_at"; // maxAge 30 min — matches access token TTL
const REFRESH_COOKIE = "eh_rt"; // maxAge 4 days — matches refresh token TTL
const REFRESH_PATH = "/auth/refresh";

let refreshInFlight: Promise<boolean> | null = null;

function requestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/** Map any FetchError into one predictable shape (pure, unit-testable). */
export function normalizeApiError(err: FetchError): ApiError {
  const status = err.response?.status ?? null;
  const data = err.response?._data as { detail?: unknown } | undefined;
  const retryAfter = Number(
    err.response?.headers?.get?.("retry-after") ?? Number.NaN,
  );

  let message = err.message || "Request failed";
  let fieldErrors: Record<string, string[]> | undefined;

  if (Array.isArray(data?.detail)) {
    fieldErrors = {};
    for (const item of data.detail as Array<{
      loc?: (string | number)[];
      msg?: string;
    }>) {
      const field =
        (item.loc ?? []).filter((seg) => seg !== "body").join(".") || "_";
      (fieldErrors[field] ||= []).push(item.msg ?? "Invalid value");
    }
    message = (data.detail as Array<{ msg?: string }>)[0]?.msg ?? message;
  } else if (typeof data?.detail === "string") {
    message = data.detail;
  }

  const type: ApiErrorType =
    status === null
      ? "network"
      : status === 401
        ? "unauthorized"
        : status === 403
          ? "forbidden"
          : status === 404
            ? "not_found"
            : status === 409
              ? "conflict"
              : status === 422
                ? "validation"
                : status === 429
                  ? "rate_limited"
                  : status >= 500
                    ? "server"
                    : "unknown";

  return {
    type,
    status,
    message,
    fieldErrors,
    retryAfterSeconds: Number.isNaN(retryAfter) ? undefined : retryAfter,
    raw: err,
  };
}

/* ---------- Composable ---------- */

export function useApi() {
  const baseURL = useRuntimeConfig().public.apiBase;

  const access = useCookie<string | null>(ACCESS_COOKIE, {
    maxAge: 60 * 30,
    sameSite: "lax",
    default: () => null,
  });
  const refresh = useCookie<string | null>(REFRESH_COOKIE, {
    maxAge: 60 * 60 * 24 * 4,
    sameSite: "lax",
    default: () => null,
  });

  function setTokens(tokens: TokenPair) {
    access.value = tokens.access_token;
    refresh.value = tokens.refresh_token;
  }

  function clearTokens() {
    access.value = null;
    refresh.value = null;
  }

  const isAuthenticated = computed(() => Boolean(access.value));

  function redirectToLogin() {
    if (!import.meta.client) return;
    const current = window.location.pathname + window.location.search;
    navigateTo(
      current && current !== "/"
        ? `/auth/login?redirect=${encodeURIComponent(current)}`
        : "/auth/login",
    );
  }

  /**
   * Single-flight refresh: concurrent 401s share one promise.
   * Uses raw $fetch (no auth interceptor, no recursion) and skips server-side —
   * all token-dependent routes are ssr:false anyway.
   */
  async function tryRefresh(): Promise<boolean> {
    if (import.meta.server || !refresh.value) return false;
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        try {
          // NOTE: refresh_token goes in the QUERY — backend signature is `refresh(refresh_token: str)`
          const tokens = await $fetch<TokenPair>(REFRESH_PATH, {
            baseURL,
            method: "POST",
            query: { refresh_token: refresh.value! },
          });
          setTokens(tokens);
          return true;
        } catch {
          clearTokens();
          return false;
        } finally {
          refreshInFlight = null;
        }
      })();
    }
    return refreshInFlight;
  }

  const fetcher = $fetch.create({
    baseURL,
    retry: 0, // 429/5xx are handled explicitly — no blind retries (Retry-After is a contract, not a hint)
    onRequest({ options }) {
      const headers = new Headers(options.headers);
      if (access.value) headers.set("Authorization", `Bearer ${access.value}`);
      headers.set("X-Request-ID", requestId());
      options.headers = headers;
    },
  });

  /**
   * The one true request method. Throws normalized ApiError.
   * 401 → try refresh once → retry the original call; on failure clear + redirect.
   * /auth/* calls never trigger the refresh dance.
   */
  async function api<T = unknown>(
    path: string,
    opts: FetchOptions = {},
  ): Promise<T> {
    try {
      return await fetcher<T>(path, opts);
    } catch (err) {
      const e = err as FetchError;
      const status = e.response?.status ?? null;
      const isAuthCall = path.startsWith("/auth/");

      if (status === 401 && !isAuthCall && refresh.value) {
        const ok = await tryRefresh();
        if (ok) {
          try {
            return await fetcher<T>(path, opts);
          } catch (retryErr) {
            throw normalizeApiError(retryErr as FetchError);
          }
        }
        redirectToLogin();
      }
      throw normalizeApiError(e);
    }
  }

  return {
    api,
    setTokens,
    clearTokens,
    tryRefresh,
    isAuthenticated,
    redirectToLogin,
  };
}
