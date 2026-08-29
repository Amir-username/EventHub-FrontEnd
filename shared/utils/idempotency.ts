/**
 * Idempotency keys for POST /reservations (backend contract).
 *
 * Rule: the SAME key must be reused across retries of the same attempt —
 * a new key means a NEW reservation. Generate one per attempt and persist
 * it (Phase 2: keep it in the checkout store) until the attempt succeeds
 * or the user abandons checkout.
 *
 * Auto-imported by Nuxt from shared/utils/.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts (http dev hosts without localhost)
  return `eh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
