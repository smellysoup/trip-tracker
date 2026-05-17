# Trip Tracker — Architectural Spec

**Version:** 1.0.0
**Stack:** Next.js 14 (App Router) + TypeScript + Supabase + Vercel + Anthropic API
**Owner:** Alex Melnyk (amelnyk.digital@gmail.com)
**Last updated:** 2026-05-17

This document is the single source of truth for the project's structure, conventions, and phasing. Read this before any other action when working on the codebase.

---

## 1. Overview

Personal trip expense tracker. Replaces a set of Google Sheets used to log shared spending across trips. Two users: Melly (Alex) and Ash. Each trip has a native currency that must be convertible to AED. Expenses are split between participants — sometimes 50/50, sometimes uneven, sometimes personal-only, sometimes informational reference entries.

**Three deployed trips at launch:** Seychelles 2025, Croatia 2025, Norway 2024.

---

## 2. Stack and versions

- **Framework:** Next.js 14 App Router with TypeScript strict mode
- **Package manager:** npm
- **Database:** Supabase Postgres (project: `trip-tracker`)
- **Auth:** Supabase Auth, email magic link
- **Storage:** Supabase Storage (for receipt images, Phase 5)
- **Vision/OCR:** Anthropic API (Claude Sonnet 4.5+, via `@anthropic-ai/sdk`)
- **Hosting:** Vercel, connected to GitHub `smellysoup/trip-tracker`
- **UI library:** shadcn/ui (style: new-york, color: neutral)
- **Table:** Tanstack Table v8
- **Charts:** Recharts (Phase 4)
- **Icons:** lucide-react
- **Validation:** zod
- **Styling:** Tailwind CSS

---

## 3. Folder structure

```
trip-tracker/
├── app/
│   ├── layout.tsx                      # root layout, header, sign-out
│   ├── page.tsx                        # trip list (home)
│   ├── login/page.tsx                  # magic link form
│   ├── auth/callback/route.ts          # OAuth callback handler
│   ├── trips/
│   │   ├── [id]/page.tsx               # single trip view
│   │   ├── [id]/edit/page.tsx          # trip metadata edit (Phase 2)
│   │   └── new/page.tsx                # create trip (Phase 2)
│   ├── dashboard/page.tsx              # cross-trip dashboard (Phase 4)
│   └── api/
│       └── extract-receipt/route.ts    # Anthropic vision call (Phase 5)
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── trip-list.tsx
│   ├── expense-table.tsx
│   ├── category-summary.tsx
│   ├── split-editor.tsx                # Phase 2
│   ├── receipt-upload.tsx              # Phase 5
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # browser-side client
│   │   ├── server.ts                   # server-side client (cookies)
│   │   └── middleware.ts               # auth middleware
│   ├── database.types.ts               # generated from live schema
│   ├── types.ts                        # app-level types + re-exports
│   ├── format.ts                       # currency, date, percent formatters
│   └── utils.ts
├── scripts/
│   └── import-trips.ts                 # one-shot import from data/trips.json
├── data/
│   └── trips.json                      # source trip data (3 trips)
├── supabase/
│   └── migrations/
│       └── 001_initial.sql             # initial schema
├── middleware.ts                       # auth gate
├── .env.local                          # secrets (gitignored)
├── SPEC.md                             # this file
└── package.json
```

---

## 4. Database schema (summary)

See `supabase/migrations/001_initial.sql` for the source of truth. High level:

- **`categories`** — 5 seeded values: Hotel, Transportation, Food, Entertainment, Shopping
- **`trips`** — name, dates, native_currency (ISO code), fx_rate_to_aed (default), participants
- **`expenses`** — line_no, item, category, native price + AED price, fx_rate_used override, paid_by, split_type
- **`expense_splits`** — one row per participant owing money on this expense
- **`itinerary_days`** — optional, for trips that have day plans
- **`accommodation_research`** — optional, for hotel shortlists

**Two views for the dashboard:**
- `trip_totals` — per-trip totals, Melly share, Ash share
- `category_totals` — spend per category per trip

---

## 5. Auth and RLS

- Magic link auth via Supabase.
- Allowlist enforced in SQL via the `is_allowlisted()` function: only `amelnyk.digital@gmail.com` and `ashee.edwards@gmail.com` can read/write anything.
- All tables have RLS enabled. Categories are read-only. All other tables are read+write for allowlisted users.
- Server-side imports use the `service_role` key which bypasses RLS — only used in `scripts/import-trips.ts`, never in user-facing code.

---

## 6. Currency handling

**Two-tier system:**

1. **Trip-level default rate** (`trips.fx_rate_to_aed`) — applied to all expenses in this trip by default.
2. **Per-expense override** (`expenses.fx_rate_used`) — set on individual rows where the actual conversion differed (e.g., card payment with bank FX margin).

**Authoritative value is always `aed_price`.** The native_price + fx_rate are for context/audit. Display logic should always work off `aed_price` and never recompute it.

**Display:**
- Always right-align numeric columns.
- Use `Intl.NumberFormat` with `style: 'currency', currency: 'AED'` for AED amounts.
- Use plain number formatting for native currency, shown smaller and muted next to AED.
- Format: `AED 1,234.56` primary, `(SCR 4,750.23)` secondary.

**Currencies in use:**
- AED — UAE Dirham (always the target)
- SCR — Seychelles Rupee
- EUR — Euro
- NOK — Norwegian Krone

---

## 7. Split logic

Four `split_type` values, each with different semantics:

| Type | Meaning | Splits rows |
|---|---|---|
| `even` | 50/50 between Melly and Ash | 2 rows, equal amounts |
| `custom` | Uneven split with explicit amounts | 2 rows, unequal |
| `personal` | One person paid for themselves, not shared | 1 row, 100% to that person |
| `reference` | Tracked at total level only (e.g. pre-paid flights) | 0 rows |

**Invariant:** for `even`, `custom`, and `personal`, sum of `share_amount_aed` across splits = `aed_price`. For `reference`, no constraint.

**Examples from source data:**
- Croatia "Dinner Zagreb" — even split: Melly 101.15, Ash 101.15 (total 202.30)
- Seychelles "Car x2 days (CASH)" — custom split: Ash 138.67 (1/3), Melly 277.33 (2/3) (total 416.00)
- Croatia "Jersey" — personal: Melly 280.50, no Ash row
- Croatia "Group fees ALEX" — personal: Melly 3123.75, no Ash row
- Croatia "Villa Fees" — reference: no splits rows (total 3548.00, informational)

---

## 8. Phases and deliverables

### Phase 1 — Read-only views ✅ first priority

- Home page lists all trips with name, dates, total AED, Melly share, Ash share, expense count.
- Single trip page shows full expense table matching the source spreadsheet visually: dense rows, line numbers, monospace amounts, category badges, native + AED display.
- Below the table: category summary panel (totals per category for this trip).
- All server components. No client-side state.
- No CRUD yet. Read-only.

### Phase 2 — CRUD

- Create new trip (form with name, dates, currency, FX rate, participants).
- Add expense (form with all fields, including split editor).
- Edit expense inline or via dialog.
- Delete expense (with confirmation).
- Split editor component: 4 modes (even, custom, personal, reference), enforces the sum invariant.

### Phase 3 — Itinerary and accommodation (optional, on-demand)

- Day-by-day schedule view per trip.
- Accommodation shortlist with ranking.
- Only built for trips that need it (Norway has both, Seychelles has neither).

### Phase 4 — Dashboard

- Cross-trip view at `/dashboard`.
- Charts (Recharts): category mix across all trips, Ash net balance running total, cost per day per trip.
- Year-over-year if data spans multiple years.

### Phase 5 — Receipt OCR

- Upload screenshot → Anthropic vision API extracts item, total, currency, date, category.
- Pre-fill expense form. User reviews and confirms before save.
- Store image in Supabase Storage, link via `expenses.receipt_url`.

### Phase 6 — Polish

- Trip duplication ("clone this trip as a template").
- Live FX rates (override default with current rate from an API at expense creation time).
- Export trip to PDF/CSV.

---

## 9. Conventions

### Naming
- React components: PascalCase files (`ExpenseTable.tsx`), default export.
- Utility files: kebab-case (`format.ts`, `import-trips.ts`).
- Database: snake_case for all table/column names.
- Routes: lowercase, kebab-case.

### Server vs client components
- Default to server components. Reach for `"use client"` only when you need: state, effects, browser APIs, event handlers.
- Data fetching always happens server-side via the server Supabase client.

### Type safety
- Strict TypeScript. No `any`. Prefer `unknown` + narrowing.
- Database types regenerated after every migration: `npx supabase gen types typescript --project-id <REF> > lib/database.types.ts`.
- App-level view models live in `lib/types.ts` and may extend or compose the generated types.

### Formatting helpers (in `lib/format.ts`)
- `formatAed(n: number): string` — `AED 1,234.56`
- `formatNative(n: number, currency: string): string` — `EUR 161.08`
- `formatDate(d: Date | string): string` — `9 May 2025`
- `formatDateRange(start, end): string` — `9–12 May 2025`
- `formatPercent(n: number): string` — `38.8%`

### Visual style — matching the source spreadsheet
- Dense rows: padding y-1, text-sm
- Monospace for all numeric columns: `font-mono tabular-nums`
- Right-align numeric columns: `text-right`
- Category as colored badge using the color from the `categories` table
- Subtle dividers between rows
- No row hover effect on read-only tables — these aren't interactive

---

## 10. Environment variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

The same four must be set in Vercel project settings before deploying.

---

## 11. Open questions / things to revisit

- **`paid_by` is mostly null in the imported data.** The source sheets don't always indicate who fronted the cash. CRUD UI in Phase 2 should make this required, but for historical data it's nullable.
- **Norway has a "pre-booked fees" section** with per-person flight/hotel costs. Imported as `personal` split-type expenses paid_by the relevant person.
- **Seychelles row 2 "Car - gas"** had no Ash share in the source (likely a sheet oversight). Imported as `even` 50/50 to match the rest of the car expenses. Flagged for user review.
- **Two Norway rows use a higher FX rate** than the trip default (0.437 vs 0.36 NOK→AED). Both are Radisson hotel nights, likely card-paid with bank FX margin. Per-row `fx_rate_used` is set to preserve the source AED values.
- **The matrix tab's location dropdowns** (Panama / USA / Dubai) are template residue from a previous trip template. Not imported. Categories list IS imported as the seed values.

---

## 12. What this spec is NOT

- Not a UX wireframe — those decisions are made during Phase 1 implementation with shadcn defaults as the starting point.
- Not a complete API reference — Supabase client patterns are standard and well-documented.
- Not a deployment runbook — see `TRIP-TRACKER-SETUP.md` for that.
