/**
 * EventHub — session bootstrap (client-only)
 *
 * Runs ONCE per full page load, before route middleware — so by the time
 * any guard checks `auth.isAdmin`, the profile is already hydrated and
 * there is no redirect race.
 *
 * Why `.client.ts`:
 * - The access token lives in a non-httpOnly cookie + Bearer header flow;
 *   there is no server-side session to restore.
 * - `/` and `/events/**` are SWR-cached and SHARED across users — fetching
 *   /auth/me during SSR would cache one user's profile for everyone
 *   (ROADMAP gotcha #1). Client-only sidesteps it entirely.
 *
 * Blocking `await` is deliberate: it costs one /auth/me call per hard
 * reload (logged-in users only) and guarantees middleware correctness.
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();
  await auth.bootstrap();
});
