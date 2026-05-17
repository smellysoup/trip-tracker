import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type {
  Category,
  CategoryTotal,
  Expense,
  ExpenseSplit,
  Trip,
} from "@/lib/types"
import ExpenseTable from "@/components/expense-table"
import CategorySummary from "@/components/category-summary"
import { formatAed, formatDateRange } from "@/lib/format"

type ExpenseWithSplits = Expense & { expense_splits: ExpenseSplit[] }

// Strategy: one query for the trip, then three parallel queries for
// expenses+splits (nested PostgREST select), category_totals, and
// categories. Splits are embedded into expenses via the FK relationship,
// avoiding an in-memory join. Trip lookup is sequential because we need
// to bail with notFound() before doing more work.
export default async function TripPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const tripRes = await supabase
    .from("trips")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()

  if (tripRes.error) throw tripRes.error
  if (!tripRes.data) notFound()
  const trip: Trip = tripRes.data

  const [expensesRes, categoryTotalsRes, categoriesRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, expense_splits(*)")
      .eq("trip_id", trip.id)
      .order("line_no", { ascending: true }),
    supabase.from("category_totals").select("*").eq("trip_id", trip.id),
    supabase.from("categories").select("*").order("display_order"),
  ])

  if (expensesRes.error) throw expensesRes.error
  if (categoryTotalsRes.error) throw categoryTotalsRes.error
  if (categoriesRes.error) throw categoriesRes.error

  const expenses = expensesRes.data as ExpenseWithSplits[]
  const categoryTotals: CategoryTotal[] = categoryTotalsRes.data
  const categories: Category[] = categoriesRes.data
  const categoriesByName = new Map(categories.map((c) => [c.name, c]))

  const totalAed = expenses.reduce((acc, e) => acc + Number(e.aed_price), 0)

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>
          <div className="text-right">
            <div className="font-mono tabular-nums text-lg">
              {formatAed(totalAed)}
            </div>
            <div className="text-xs text-muted-foreground">
              {expenses.length}{" "}
              {expenses.length === 1 ? "expense" : "expenses"}
            </div>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          {trip.destination ? (
            <div>
              <dt className="sr-only">Destination</dt>
              <dd>{trip.destination}</dd>
            </div>
          ) : null}
          <div>
            <dt className="sr-only">Dates</dt>
            <dd>{formatDateRange(trip.start_date, trip.end_date)}</dd>
          </div>
          <div>
            <dt className="sr-only">Currency</dt>
            <dd className="font-mono tabular-nums">
              1 {trip.native_currency} = {Number(trip.fx_rate_to_aed).toFixed(4)}{" "}
              AED
            </dd>
          </div>
        </dl>
      </header>

      {expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses yet.</p>
      ) : (
        <>
          <section>
            <ExpenseTable
              expenses={expenses}
              categoriesByName={categoriesByName}
            />
          </section>
          <section>
            <CategorySummary
              totals={categoryTotals}
              categoriesByName={categoriesByName}
            />
          </section>
        </>
      )}
    </div>
  )
}
