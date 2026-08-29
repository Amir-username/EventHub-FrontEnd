/**
 * Money helpers — EventHub stores ALL amounts as integer cents + ISO 4217
 * currency code (backend contract). Never do math on formatted strings;
 * format only at display time.
 *
 * Auto-imported by Nuxt from shared/utils/.
 */

/** Format integer cents for display, e.g. formatMoney(1250) → "$12.50" */
export function formatMoney(cents: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}

/** Parse user-facing major-unit input ("12.50") into integer cents for API payloads. */
export function toCents(major: string | number): number {
  const value = typeof major === 'string' ? Number.parseFloat(major) : major
  if (Number.isNaN(value)) return 0
  return Math.round(value * 100)
}
