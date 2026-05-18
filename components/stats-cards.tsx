import { Card, CardContent } from "@/components/ui/card"
import { formatAed } from "@/lib/format"

type Props = {
  totalAed: number
  expenseCount: number
  mellyShare: number
  ashShare: number
}

export default function StatsCards({
  totalAed,
  expenseCount,
  mellyShare,
  ashShare,
}: Props) {
  const cards: Array<{ label: string; value: string }> = [
    { label: "Total", value: formatAed(totalAed) },
    { label: "Expenses", value: expenseCount.toLocaleString("en-US") },
    { label: "Melly share", value: formatAed(mellyShare) },
    { label: "Ash share", value: formatAed(ashShare) },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="space-y-1 p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="font-mono text-xl tabular-nums">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
