import { createClient } from "@/lib/supabase/server"
import type { Trip, TripTotal } from "@/lib/types"
import TripList from "@/components/trip-list"

// Two parallel queries instead of a nested select. `trip_totals` is a
// view of aggregated data over `expenses` + `expense_splits` and Supabase
// doesn't expose an automatic FK relationship from `trips` to it; rather
// than wrestle with a manual join hint, we fetch both and merge in-memory.
// The list is short (3 trips at launch), so two round-trips is fine.
export default async function HomePage() {
  const supabase = createClient()

  const [tripsRes, totalsRes] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .eq("archived", false)
      .order("start_date", { ascending: false }),
    supabase.from("trip_totals").select("*"),
  ])

  if (tripsRes.error) throw tripsRes.error
  if (totalsRes.error) throw totalsRes.error

  const trips: Trip[] = tripsRes.data
  const totalsByTripId = new Map<string, TripTotal>(
    totalsRes.data
      .filter((t): t is TripTotal & { trip_id: string } => t.trip_id !== null)
      .map((t) => [t.trip_id, t])
  )

  if (trips.length === 0) {
    return (
      <div className="space-y-2 rounded-md border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No trips yet.</p>
        <p className="text-sm text-muted-foreground">
          Data is imported via the script in <code>scripts/import-trips.ts</code>{" "}
          (built in a later step).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Trips</h2>
      <TripList trips={trips} totalsByTripId={totalsByTripId} />
    </div>
  )
}
