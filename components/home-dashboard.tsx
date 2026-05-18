import StatsCards from "@/components/stats-cards"
import DashboardCharts, {
  type CategoryDatum,
  type TripDatum,
} from "@/components/dashboard-charts"

type Props = {
  totalAed: number
  expenseCount: number
  mellyShare: number
  ashShare: number
  tripCount: number
  byTrip: TripDatum[]
  byCategory: CategoryDatum[]
}

export default function HomeDashboard({
  totalAed,
  expenseCount,
  mellyShare,
  ashShare,
  tripCount,
  byTrip,
  byCategory,
}: Props) {
  return (
    <section className="space-y-4">
      <StatsCards
        totalAed={totalAed}
        expenseCount={expenseCount}
        mellyShare={mellyShare}
        ashShare={ashShare}
      />
      <DashboardCharts
        grandTotalAed={totalAed}
        tripCount={tripCount}
        expenseCount={expenseCount}
        categoryCount={byCategory.length}
        byTrip={byTrip}
        byCategory={byCategory}
      />
    </section>
  )
}
