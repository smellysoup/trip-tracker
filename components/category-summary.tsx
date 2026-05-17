import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Category, CategoryTotal } from "@/lib/types"
import { formatAed } from "@/lib/format"

type Props = {
  totals: CategoryTotal[]
  categoriesByName: Map<string, Category>
}

export default function CategorySummary({ totals, categoriesByName }: Props) {
  const sorted = [...totals].sort(
    (a, b) => Number(b.total_aed ?? 0) - Number(a.total_aed ?? 0)
  )
  const grandTotal = sorted.reduce(
    (acc, t) => acc + Number(t.total_aed ?? 0),
    0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Category totals</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses.</p>
        ) : (
          <ul className="divide-y">
            {sorted.map((t) => {
              const name = t.category ?? "—"
              const cat = name ? categoriesByName.get(name) : undefined
              const amount = Number(t.total_aed ?? 0)
              const pct = grandTotal > 0 ? amount / grandTotal : 0
              return (
                <li
                  key={name}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: cat?.color ?? "#94a3b8" }}
                    />
                    <span>{name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({t.expense_count ?? 0})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono tabular-nums text-xs text-muted-foreground">
                      {(pct * 100).toFixed(1)}%
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatAed(amount)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
