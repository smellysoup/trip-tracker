// One-shot importer for data/trips.json.
//
// Usage:
//   npm run import:trips                # dry-run, no writes
//   npm run import:trips -- --commit    # actually write
//   npm run import:trips -- --commit --force   # ignore duplicate-name guard
//
// Uses the service-role key (bypasses RLS). This is a one-time loader; do
// not import lib/supabase/client.ts or server.ts — those use the anon key
// and would be RLS-blocked.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Database } from "../lib/database.types"

// ─── env + cli ────────────────────────────────────────────────

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")
const ENV_PATH = path.join(ROOT, ".env.local")
const DATA_PATH = path.join(ROOT, "data/trips.json")

process.loadEnvFile(ENV_PATH)

const argv = process.argv.slice(2)
const COMMIT = argv.includes("--commit")
const FORCE = argv.includes("--force")

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// ─── schema ───────────────────────────────────────────────────

const Participant = z.enum(["Melly", "Ash"])
const SplitType = z.enum(["even", "custom", "personal", "reference"])
const PaymentMethod = z.enum(["cash", "card", "mixed", "unknown"])

const SplitSchema = z.object({
  participant: Participant,
  share_amount_aed: z.number(),
})

const ExpenseSchema = z.object({
  line_no: z.number().int().positive(),
  item: z.string(),
  category: z.string(),
  expense_date: z.string().nullable(),
  expense_date_text: z.string().nullable(),
  native_currency: z.string().nullable(),
  native_price: z.number().nullable(),
  aed_price: z.number(),
  fx_rate_used: z.number().optional(),
  payment_method: PaymentMethod,
  paid_by: Participant.nullable(),
  split_type: SplitType,
  splits: z.array(SplitSchema),
})

const TripSchema = z.object({
  name: z.string(),
  destination: z.string().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  native_currency: z.string(),
  fx_rate_to_aed: z.number(),
  participants: z.array(Participant),
  notes: z.string().nullable().optional(),
  expenses: z.array(ExpenseSchema),
})

const FileSchema = z.object({
  _meta: z.object({}).passthrough().optional(),
  trips: z.array(TripSchema),
})

type ImportTrip = z.infer<typeof TripSchema>
type ImportExpense = z.infer<typeof ExpenseSchema>

// ─── formatting helpers ──────────────────────────────────────

const AED = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const aed = (n: number) => `AED ${AED.format(n)}`

const SEP = "─".repeat(60)
const DSEP = "═".repeat(60)

function bannerTop(title: string) {
  console.log(DSEP)
  console.log(` ${title}`)
  console.log(DSEP)
}

function section(title: string) {
  console.log()
  console.log(`── ${title} ${SEP.slice(title.length + 4)}`)
}

// ─── main ────────────────────────────────────────────────────

async function main() {
  bannerTop("Trip Tracker — Data Import")
  console.log(
    `Mode:    ${COMMIT ? "COMMIT" : "DRY RUN"}${FORCE ? " (--force)" : ""}`
  )
  console.log(`Source:  ${path.relative(process.cwd(), DATA_PATH)}`)
  console.log(`Target:  ${SUPABASE_URL}`)

  // ─── parse JSON + schema check ───────────────────────────
  const raw = fs.readFileSync(DATA_PATH, "utf8")
  let file: z.infer<typeof FileSchema>
  try {
    file = FileSchema.parse(JSON.parse(raw))
  } catch (err) {
    console.error()
    console.error("JSON schema validation failed:")
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        console.error(`  ✗ ${issue.path.join(".")}: ${issue.message}`)
      }
    } else {
      console.error(err)
    }
    process.exit(1)
  }

  const trips = file.trips
  console.log(`Trips:   ${trips.length}`)

  // ─── per-trip summary + collect validation errors ────────
  const errors: string[] = []

  // 1. categories must exist in DB
  const usedCategories = new Set<string>()
  for (const t of trips) for (const e of t.expenses) usedCategories.add(e.category)

  const catRes = await supabase.from("categories").select("name")
  if (catRes.error) {
    console.error(`Failed to query categories table: ${catRes.error.message}`)
    process.exit(1)
  }
  const dbCategories = new Set(catRes.data.map((c) => c.name))
  for (const c of usedCategories) {
    if (!dbCategories.has(c)) {
      errors.push(`Unknown category "${c}" (not present in categories table)`)
    }
  }

  // 2. per-expense checks + per-trip summary print
  for (const trip of trips) {
    section(trip.name)
    console.log(`  Dates:        ${trip.start_date} → ${trip.end_date}`)
    console.log(
      `  Currency:     ${trip.native_currency} @ ${trip.fx_rate_to_aed} AED/${trip.native_currency}`
    )
    console.log(`  Participants: ${trip.participants.join(", ")}`)
    console.log(`  Expenses:     ${trip.expenses.length}`)

    let total = 0
    let mellyTotal = 0
    let ashTotal = 0
    const byCat = new Map<string, { count: number; total: number }>()
    const seenLines = new Set<number>()

    for (const e of trip.expenses) {
      const where = `[${trip.name} line ${e.line_no}]`

      // unique line_no
      if (seenLines.has(e.line_no)) {
        errors.push(`${where} duplicate line_no`)
      }
      seenLines.add(e.line_no)

      // split rules
      if (e.split_type === "reference") {
        if (e.splits.length > 0) {
          errors.push(
            `${where} split_type=reference but ${e.splits.length} splits row(s) — must be empty`
          )
        }
      } else {
        const sum = e.splits.reduce((a, s) => a + s.share_amount_aed, 0)
        const diff = Math.abs(sum - e.aed_price)
        if (diff > 0.02) {
          errors.push(
            `${where} splits sum ${sum.toFixed(2)} ≠ aed_price ${e.aed_price.toFixed(
              2
            )} (diff ${diff.toFixed(2)} > 0.02)`
          )
        }
      }

      // paid_by ∈ participants
      if (e.paid_by && !trip.participants.includes(e.paid_by)) {
        errors.push(
          `${where} paid_by=${e.paid_by} not in trip.participants [${trip.participants.join(", ")}]`
        )
      }

      // native_price ⟺ native_currency
      const hasPrice = e.native_price != null
      const hasCur = e.native_currency != null
      if (hasPrice !== hasCur) {
        errors.push(
          `${where} native_price/native_currency mismatch: price=${e.native_price}, currency=${e.native_currency}`
        )
      }

      // accumulate for summary
      total += e.aed_price
      for (const s of e.splits) {
        if (s.participant === "Melly") mellyTotal += s.share_amount_aed
        if (s.participant === "Ash") ashTotal += s.share_amount_aed
      }
      const c = byCat.get(e.category) ?? { count: 0, total: 0 }
      c.count++
      c.total += e.aed_price
      byCat.set(e.category, c)
    }

    console.log(`  Total:        ${aed(total)}`)
    console.log(`  Melly share:  ${aed(mellyTotal)}`)
    console.log(`  Ash share:    ${aed(ashTotal)}`)
    console.log(`  Categories:`)
    const sortedCats = [...byCat.entries()].sort(
      (a, b) => b[1].total - a[1].total
    )
    for (const [name, agg] of sortedCats) {
      console.log(
        `    ${name.padEnd(16)} ${String(agg.count).padStart(3)}  ${aed(agg.total)}`
      )
    }
  }

  // ─── validation result ───────────────────────────────────
  section("Validation")
  if (errors.length > 0) {
    for (const e of errors) console.log(`  ✗ ${e}`)
    console.log()
    console.log(`${errors.length} validation error(s). No changes written.`)
    process.exit(1)
  }
  console.log("  ✓ All checks passed")

  if (!COMMIT) {
    console.log()
    console.log("DRY RUN — no changes written. Re-run with --commit to apply.")
    return
  }

  // ─── commit phase ────────────────────────────────────────
  section("Commit")

  // duplicate-name guard
  const names = trips.map((t) => t.name)
  const existingRes = await supabase
    .from("trips")
    .select("id, name")
    .in("name", names)
  if (existingRes.error) {
    console.error(`Failed to check existing trips: ${existingRes.error.message}`)
    process.exit(1)
  }
  if (existingRes.data.length > 0 && !FORCE) {
    console.log()
    console.log("Trip names already present in DB:")
    for (const row of existingRes.data) {
      console.log(`  ✗ ${row.name} (id=${row.id})`)
    }
    console.log()
    console.log(
      "Re-run with --commit --force to allow duplicates (will create a second trip row of the same name)."
    )
    process.exit(1)
  }

  let totalExpenses = 0
  let totalSplits = 0
  const insertedTripNames: string[] = []

  for (const trip of trips) {
    console.log(`  ${trip.name}`)
    const tripId = await insertTrip(trip)
    try {
      const expCount = await insertExpensesAndSplits(tripId, trip)
      totalExpenses += expCount.expenses
      totalSplits += expCount.splits
      insertedTripNames.push(trip.name)
      console.log(
        `    ✓ trip=${tripId}  expenses=${expCount.expenses}  splits=${expCount.splits}`
      )
    } catch (err) {
      console.error(
        `    ✗ ${err instanceof Error ? err.message : String(err)}`
      )
      console.error(`    ↻ Rolling back trip ${tripId}…`)
      const del = await supabase.from("trips").delete().eq("id", tripId)
      if (del.error) {
        console.error(
          `    !! Rollback failed: ${del.error.message}. Manual cleanup needed for trip id=${tripId}.`
        )
      } else {
        console.error(`    ✓ Rolled back trip ${tripId}.`)
      }
      process.exit(1)
    }
  }

  // ─── reconciliation ──────────────────────────────────────
  section("Reconciliation (trip_totals view)")
  const totalsRes = await supabase
    .from("trip_totals")
    .select("*")
    .in("name", insertedTripNames)
  if (totalsRes.error) {
    console.error(`Failed to read trip_totals: ${totalsRes.error.message}`)
  } else {
    for (const trip of trips) {
      const dbRow = totalsRes.data.find((t) => t.name === trip.name)
      if (!dbRow) {
        console.log(`  ⚠ ${trip.name}: no trip_totals row`)
        continue
      }
      const expectedTotal = trip.expenses.reduce(
        (a, e) => a + e.aed_price,
        0
      )
      const expectedMelly = trip.expenses.reduce(
        (a, e) =>
          a +
          e.splits
            .filter((s) => s.participant === "Melly")
            .reduce((b, s) => b + s.share_amount_aed, 0),
        0
      )
      const expectedAsh = trip.expenses.reduce(
        (a, e) =>
          a +
          e.splits
            .filter((s) => s.participant === "Ash")
            .reduce((b, s) => b + s.share_amount_aed, 0),
        0
      )

      const okCount = trip.expenses.length === dbRow.expense_count
      const okTotal =
        Math.abs(expectedTotal - Number(dbRow.total_aed ?? 0)) < 0.01
      const okMelly =
        Math.abs(expectedMelly - Number(dbRow.melly_share_aed ?? 0)) < 0.01
      const okAsh =
        Math.abs(expectedAsh - Number(dbRow.ash_share_aed ?? 0)) < 0.01

      console.log(`  ${trip.name}`)
      console.log(
        `    count:       expected ${trip.expenses.length}, db ${dbRow.expense_count} ${okCount ? "✓" : "✗"}`
      )
      console.log(
        `    total:       expected ${aed(expectedTotal)}, db ${aed(Number(dbRow.total_aed ?? 0))} ${okTotal ? "✓" : "✗"}`
      )
      console.log(
        `    melly share: expected ${aed(expectedMelly)}, db ${aed(Number(dbRow.melly_share_aed ?? 0))} ${okMelly ? "✓" : "✗"}`
      )
      console.log(
        `    ash share:   expected ${aed(expectedAsh)}, db ${aed(Number(dbRow.ash_share_aed ?? 0))} ${okAsh ? "✓" : "✗"}`
      )
    }
  }

  console.log()
  console.log(
    `COMMITTED ${trips.length} trips, ${totalExpenses} expenses, ${totalSplits} splits.`
  )
}

async function insertTrip(trip: ImportTrip): Promise<string> {
  const res = await supabase
    .from("trips")
    .insert({
      name: trip.name,
      destination: trip.destination ?? null,
      start_date: trip.start_date,
      end_date: trip.end_date,
      native_currency: trip.native_currency,
      fx_rate_to_aed: trip.fx_rate_to_aed,
      participants: trip.participants,
      notes: trip.notes ?? null,
    })
    .select("id")
    .single()
  if (res.error || !res.data) {
    throw new Error(`Insert trip failed: ${res.error?.message ?? "no row returned"}`)
  }
  return res.data.id
}

async function insertExpensesAndSplits(
  tripId: string,
  trip: ImportTrip
): Promise<{ expenses: number; splits: number }> {
  const expenseRows = trip.expenses.map((e: ImportExpense) => ({
    trip_id: tripId,
    line_no: e.line_no,
    item: e.item,
    category: e.category,
    expense_date: e.expense_date,
    expense_date_text: e.expense_date_text,
    native_currency: e.native_currency,
    native_price: e.native_price,
    aed_price: e.aed_price,
    fx_rate_used: e.fx_rate_used ?? null,
    payment_method: e.payment_method,
    paid_by: e.paid_by,
    split_type: e.split_type,
  }))

  const expRes = await supabase
    .from("expenses")
    .insert(expenseRows)
    .select("id, line_no")
  if (expRes.error || !expRes.data) {
    throw new Error(`Insert expenses failed: ${expRes.error?.message ?? "no rows"}`)
  }

  const lineToId = new Map<number, string>(
    expRes.data.map((r) => [r.line_no, r.id])
  )

  const splitRows: Array<{
    expense_id: string
    participant: "Melly" | "Ash"
    share_amount_aed: number
  }> = []
  for (const e of trip.expenses) {
    const expenseId = lineToId.get(e.line_no)
    if (!expenseId) {
      throw new Error(
        `Missing inserted expense for line_no=${e.line_no} — split build aborted`
      )
    }
    for (const s of e.splits) {
      splitRows.push({
        expense_id: expenseId,
        participant: s.participant,
        share_amount_aed: s.share_amount_aed,
      })
    }
  }

  if (splitRows.length > 0) {
    const sRes = await supabase.from("expense_splits").insert(splitRows)
    if (sRes.error) {
      throw new Error(`Insert splits failed: ${sRes.error.message}`)
    }
  }

  return { expenses: expRes.data.length, splits: splitRows.length }
}

main().catch((err) => {
  console.error()
  console.error("Fatal:", err instanceof Error ? err.message : String(err))
  if (err instanceof Error && err.stack) console.error(err.stack)
  process.exit(1)
})
