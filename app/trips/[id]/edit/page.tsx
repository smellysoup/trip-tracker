import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import TripForm from "@/components/trip-form"

export default async function EditTripPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()

  if (error) throw error
  if (!trip) notFound()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit trip</h1>
        <p className="text-sm text-muted-foreground">{trip.name}</p>
      </div>
      <TripForm mode="edit" trip={trip} />
    </div>
  )
}
