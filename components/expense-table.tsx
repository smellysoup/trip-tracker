import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Category, Expense, ExpenseSplit, Trip } from "@/lib/types"
import { formatAed, formatDate, formatNative } from "@/lib/format"
import ExpenseRowActions from "@/components/expense-row-actions"

type ExpenseWithSplits = Expense & { expense_splits: ExpenseSplit[] }

type Props = {
  trip: Trip
  expenses: ExpenseWithSplits[]
  categories: Category[]
  categoriesByName: Map<string, Category>
}

function shareFor(splits: ExpenseSplit[], who: "Melly" | "Ash"): number | null {
  const row = splits.find((s) => s.participant === who)
  return row ? Number(row.share_amount_aed) : null
}

export default function ExpenseTable({
  trip,
  expenses,
  categories,
  categoriesByName,
}: Props) {
  const totals = expenses.reduce(
    (acc, e) => {
      acc.total += Number(e.aed_price)
      acc.melly += Number(shareFor(e.expense_splits, "Melly") ?? 0)
      acc.ash += Number(shareFor(e.expense_splits, "Ash") ?? 0)
      return acc
    },
    { total: 0, melly: 0, ash: 0 }
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10 text-right">#</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Melly</TableHead>
          <TableHead className="text-right">Ash</TableHead>
          <TableHead>Split</TableHead>
          <TableHead className="w-20" aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((e) => {
          const cat = categoriesByName.get(e.category)
          const melly = shareFor(e.expense_splits, "Melly")
          const ash = shareFor(e.expense_splits, "Ash")
          const dateLabel = e.expense_date_text || formatDate(e.expense_date)
          return (
            <TableRow
              key={e.id}
              className="group hover:bg-transparent border-border/60"
            >
              <TableCell className="py-1 text-right font-mono tabular-nums text-muted-foreground">
                {e.line_no}
              </TableCell>
              <TableCell className="py-1">{e.item}</TableCell>
              <TableCell className="py-1">
                <Badge
                  variant="outline"
                  className="font-normal"
                  style={
                    cat
                      ? {
                          backgroundColor: `${cat.color}1a`,
                          borderColor: `${cat.color}66`,
                          color: cat.color,
                        }
                      : undefined
                  }
                >
                  {e.category}
                </Badge>
              </TableCell>
              <TableCell className="py-1 text-muted-foreground">
                {dateLabel}
              </TableCell>
              <TableCell className="py-1 text-right">
                <div className="font-mono tabular-nums">
                  {formatAed(Number(e.aed_price))}
                </div>
                {e.native_price != null && e.native_currency ? (
                  <div className="font-mono tabular-nums text-xs text-muted-foreground">
                    ({formatNative(Number(e.native_price), e.native_currency)})
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="py-1 text-right font-mono tabular-nums">
                {melly != null ? (
                  formatAed(melly)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-1 text-right font-mono tabular-nums">
                {ash != null ? (
                  formatAed(ash)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-1">
                {e.split_type !== "even" ? (
                  <Badge variant="secondary" className="font-normal">
                    {e.split_type}
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="py-1 text-right">
                <ExpenseRowActions
                  trip={trip}
                  expense={e}
                  categories={categories}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter className="border-t-2">
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="pl-4 font-medium">
            Total
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums font-medium">
            {formatAed(totals.total)}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatAed(totals.melly)}
          </TableCell>
          <TableCell className="text-right font-mono tabular-nums">
            {formatAed(totals.ash)}
          </TableCell>
          <TableCell colSpan={2} />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
