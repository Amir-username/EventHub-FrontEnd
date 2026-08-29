/**
 * EventHub — ?redirect= whitelist (ROADMAP Phase 5 contract).
 *
 * Login/guest flows accept a redirect target, which makes them open-redirect
 * material. Only safe in-app relative paths are allowed; everything else
 * falls back:
 * - absolute URLs      https://evil.tld   -> fallback
 * - protocol-relative  //evil.tld         -> fallback
 * - backslash tricks   /\evil.tld         -> fallback
 */
export function safeRedirectPath(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;

  const value = raw.trim();
  if (!value.startsWith("/")) return fallback; // not a relative path -> external
  if (value.startsWith("//")) return fallback; // protocol-relative URL
  if (value.includes("\\") || value.includes("://")) return fallback;

  return value;
}
