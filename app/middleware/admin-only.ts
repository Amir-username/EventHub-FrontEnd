/**
 * EventHub — gate for /admin/**: requires a session AND the admin role.
 *
 * Usage: definePageMeta({ middleware: 'admin-only' })
 *
 * Two stages on purpose:
 * 1. no session          -> login (with redirect back)
 * 2. session, not admin  -> 404, not 403: "you may not enter" also reveals
 *    that the area exists; a 404 keeps /admin invisible to customers.
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();

  if (!auth.isAuthenticated) {
    return navigateTo(
      { path: "/auth/login", query: { redirect: to.fullPath } },
      { replace: true },
    );
  }

  if (!auth.isAdmin) {
    return abortNavigation(
      createError({
        statusCode: 404,
        fatal: true,
        statusMessage: "Page Not Found",
      }),
    );
  }
});
