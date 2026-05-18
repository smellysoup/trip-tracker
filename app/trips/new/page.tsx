import TripForm from "@/components/trip-form"

export default function NewTripPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New trip</h1>
      <TripForm mode="create" />
    </div>
  )
}
