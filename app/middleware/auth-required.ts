/**
 * EventHub — gate for signed-in-only pages (/account/**, checkout steps).
 *
 * Usage in a page:
 *   definePageMeta({ middleware: 'auth-required' })
 *
 * Ordering guarantee: plugins/auth.client.ts awaits auth.bootstrap() BEFORE
 * middleware runs on hard loads, so isAuthenticated is always settled here —
 * including the "access cookie expired, refresh cookie alive" case, which
 * bootstrap() already recovered via tryRefresh().
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (auth.isAuthenticated) return;

  // Bounce to login, remembering the destination (the login page validates
  // this value with safeRedirectPath before navigating — never trust it raw).
  // replace: true keeps the bounce out of browser history.
  return navigateTo(
    { path: "/auth/login", query: { redirect: to.fullPath } },
    { replace: true },
  );
});
