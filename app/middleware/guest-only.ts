/**
 * EventHub — gate for login/register pages: signed-in users never see them.
 *
 * Usage: definePageMeta({ middleware: 'guest-only' })
 *
 * Deliberately does NOT attempt a silent refresh: a user whose access token
 * expired but whose refresh token is still alive simply logs in again here.
 * Recovery from that state is bootstrap()'s job on app pages — auth screens
 * should stay free of background API calls.
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.isAuthenticated) return;

  // Already signed in: honor a safe in-app redirect target, else home.
  return navigateTo(safeRedirectPath(to.query.redirect), { replace: true });
});
