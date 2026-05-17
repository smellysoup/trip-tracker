// Format helpers used across the app. Display-only; never recompute amounts.
// Dates use en-GB locale (day first) per SPEC §9.
// Currency uses en-US grouping (comma thousands, period decimal) per the
// `AED 1,234.56` and `EUR 161.08` examples in SPEC §6 / §9.

const AED_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const NATIVE_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const DAY_ONLY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  timeZone: "UTC",
})

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

// Postgres `date` columns arrive as 'YYYY-MM-DD' strings. Parsing with
// `new Date('YYYY-MM-DD')` interprets them as UTC midnight, which can shift
// the displayed day in zones west of UTC. We force UTC throughout.
function toUtcDate(input: Date | string | null | undefined): Date | null {
  if (input == null || input === "") return null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input

  // Accept both 'YYYY-MM-DD' and full ISO; force UTC anchor.
  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input)
  const d = new Date(isoDateOnly ? `${input}T00:00:00Z` : input)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatAed(n: number): string {
  return `AED ${AED_FORMATTER.format(n)}`
}

export function formatNative(n: number, currency: string): string {
  return `${currency} ${NATIVE_FORMATTER.format(n)}`
}

export function formatDate(d: Date | string | null | undefined): string {
  const date = toUtcDate(d)
  if (!date) return ""
  return DATE_FORMATTER.format(date)
}

// `formatPercent(0.388)` → `"38.8%"`. Input is a fraction, not a 0-100 value,
// matching `Intl.NumberFormat`'s percent style convention.
export function formatPercent(n: number): string {
  return PERCENT_FORMATTER.format(n)
}

// Range condenses redundant parts:
//   same month + year     → "9–12 May 2025"
//   same year, diff month → "29 May – 3 Jun 2025"
//   different years       → "29 Dec 2024 – 3 Jan 2025"
// Uses en-dash (U+2013) per SPEC §9.
export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  const s = toUtcDate(start)
  const e = toUtcDate(end)
  if (!s && !e) return ""
  if (!s) return formatDate(e)
  if (!e) return formatDate(s)

  const sameYear = s.getUTCFullYear() === e.getUTCFullYear()
  const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth()

  if (sameMonth) {
    return `${DAY_ONLY.format(s)}–${DAY_ONLY.format(e)} ${DATE_FORMATTER.format(e).replace(/^\d+ /, "")}`
  }
  if (sameYear) {
    return `${DAY_MONTH.format(s)} – ${DATE_FORMATTER.format(e)}`
  }
  return `${DATE_FORMATTER.format(s)} – ${DATE_FORMATTER.format(e)}`
}
