import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Trip, TripTotal } from "@/lib/types"
import { formatAed, formatDateRange } from "@/lib/format"

type Props = {
  trips: Trip[]
  totalsByTripId: Map<string, TripTotal>
}

export default function TripList({ trips, totalsByTripId }: Props) {
  const grand = trips.reduce(
    (acc, t) => {
      const tot = totalsByTripId.get(t.id)
      acc.count += tot?.expense_count ?? 0
      acc.total += Number(tot?.total_aed ?? 0)
      acc.melly += Number(tot?.melly_share_aed ?? 0)
      acc.ash += Number(tot?.ash_share_aed ?? 0)
      return acc
    },
    { count: 0, total: 0, melly: 0, ash: 0 }
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead className="text-right">Expenses</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Melly</TableHead>
          <TableHead className="text-right">Ash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trips.map((trip) => {
          const totals = totalsByTripId.get(trip.id)
          return (
            <TableRow key={trip.id} className="hover:bg-transparent">
              <TableCell className="font-medium">
                <Link
                  href={`/trips/${trip.id}`}
                  className="hover:underline underline-offset-4"
                >
                  {trip.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {trip.destination ?? ""}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateRange(trip.start_date, trip.end_date)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {totals?.expense_count ?? 0}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatAed(totals?.total_aed ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatAed(totals?.melly_share_aed ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatAed(totals?.ash_share_aed ?? 0)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter className="border-t-2">
        <TableRow className="hover:bg-transparent">
          <TableCell className="pl-4 font-medium">Total</TableCell>
          <TableCell />
          <TableCell />
          <TableCell className="text-right font-mono tabular-nums">
            {grand.count}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums font-medium">
            {formatAed(grand.total)}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatAed(grand.melly)}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatAed(grand.ash)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
