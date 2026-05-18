import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { Category, CategoryTotal, Trip, TripTotal } from "@/lib/types"
import TripList from "@/components/trip-list"
import HomeDashboard from "@/components/home-dashboard"
import type {
  CategoryDatum,
  TripDatum,
} from "@/components/dashboard-charts"
import { Button } from "@/components/ui/button"

// All aggregations are computed server-side from the views.
// trip_totals and category_totals are pre-joined; we just sum across them.
export default async function HomePage() {
  const supabase = createClient()

  const [tripsRes, totalsRes, catTotalsRes, categoriesRes] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("archived", false)
      .order("start_date", { ascending: false }),
    supabase.from("trip_totals").select("*"),
    supabase.from("category_totals").select("*"),
    supabase.from("categories").select("*").order("display_order"),
  ])

  if (tripsRes.error) throw tripsRes.error
  if (totalsRes.error) throw totalsRes.error
  if (catTotalsRes.error) throw catTotalsRes.error
  if (categoriesRes.error) throw categoriesRes.error

  const trips: Trip[] = tripsRes.data
  const totalsByTripId = new Map<string, TripTotal>(
    totalsRes.data
      .filter((t): t is TripTotal & { trip_id: string } => t.trip_id !== null)
      .map((t) => [t.trip_id, t])
  )

  // Grand totals across all trips
  const totalAed = totalsRes.data.reduce(
    (acc, t) => acc + Number(t.total_aed ?? 0),
    0
  )
  const expenseCount = totalsRes.data.reduce(
    (acc, t) => acc + (t.expense_count ?? 0),
    0
  )
  const mellyShare = totalsRes.data.reduce(
    (acc, t) => acc + Number(t.melly_share_aed ?? 0),
    0
  )
  const ashShare = totalsRes.data.reduce(
    (acc, t) => acc + Number(t.ash_share_aed ?? 0),
    0
  )

  // By-trip: sorted desc, exclude zero-total trips so the chart doesn't waste rows.
  const byTrip: TripDatum[] = totalsRes.data
    .filter(
      (t): t is TripTotal & { trip_id: string; name: string } =>
        t.trip_id !== null && t.name !== null && Number(t.total_aed ?? 0) > 0
    )
    .map((t) => ({
      trip_id: t.trip_id,
      name: t.name,
      total_aed: Number(t.total_aed),
    }))
    .sort((a, b) => b.total_aed - a.total_aed)

  // By-category: aggregate category_totals across trips, attach color from categories table.
  const categories: Category[] = categoriesRes.data
  const catColorByName = new Map(categories.map((c) => [c.name, c.color]))
  const catBuckets = new Map<string, number>()
  for (const row of catTotalsRes.data as CategoryTotal[]) {
    if (!row.category) continue
    catBuckets.set(
      row.category,
      (catBuckets.get(row.category) ?? 0) + Number(row.total_aed ?? 0)
    )
  }
  const byCategory: CategoryDatum[] = [...catBuckets.entries()]
    .map(([category, total]) => ({
      category,
      total_aed: total,
      color: catColorByName.get(category) ?? "hsl(var(--muted-foreground))",
    }))
    .filter((d) => d.total_aed > 0)
    .sort((a, b) => b.total_aed - a.total_aed)

  return (
    <div className="space-y-6">
      {trips.length === 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Trips</h2>
            <Button asChild size="sm">
              <Link href="/trips/new">
                <Plus className="size-4" />
                New trip
              </Link>
            </Button>
          </div>
          <div className="space-y-2 rounded-md border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No trips yet.</p>
            <p className="text-sm text-muted-foreground">
              Click <span className="font-medium">New trip</span> to add one.
            </p>
          </div>
        </div>
      ) : (
        <>
          <HomeDashboard
            totalAed={totalAed}
            expenseCount={expenseCount}
            mellyShare={mellyShare}
            ashShare={ashShare}
            tripCount={trips.length}
            byTrip={byTrip}
            byCategory={byCategory}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Trips</h2>
              <Button asChild size="sm">
                <Link href="/trips/new">
                  <Plus className="size-4" />
                  New trip
                </Link>
              </Button>
            </div>
            <TripList trips={trips} totalsByTripId={totalsByTripId} />
          </div>
        </>
      )}
    </div>
  )
}
