"use client"

import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatAed } from "@/lib/format"

export type TripDatum = {
  trip_id: string
  name: string
  total_aed: number
}

export type CategoryDatum = {
  category: string
  total_aed: number
  color: string // hex from categories table
}

type Props = {
  grandTotalAed: number
  tripCount: number
  expenseCount: number
  categoryCount: number
  byTrip: TripDatum[]
  byCategory: CategoryDatum[]
}

// Chart palette: stroke/grid lines pull from CSS variables so the chart
// follows light/dark themes without recomputing per render.
const GRID_STROKE = "hsl(var(--border))"
const AXIS_TICK = "hsl(var(--muted-foreground))"
const BAR_FILL = "hsl(var(--primary))"

type TooltipItem = {
  value?: number | string
  payload?: { name?: string; category?: string }
}
type ChartTooltipProps = {
  active?: boolean
  payload?: TooltipItem[]
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]
  const inner = datum.payload ?? {}
  const label = inner.name ?? inner.category ?? ""
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-medium text-popover-foreground">{label}</div>
      <div className="font-mono tabular-nums text-popover-foreground">
        {formatAed(Number(datum.value ?? 0))}
      </div>
    </div>
  )
}

export default function DashboardCharts({
  grandTotalAed,
  tripCount,
  expenseCount,
  categoryCount,
  byTrip,
  byCategory,
}: Props) {
  const [tab, setTab] = useState<"trip" | "category" | "total">("trip")

  // Mobile chart height: handled via Tailwind responsive sizing on the wrapper.
  // Recharts ResponsiveContainer fills its parent.
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as typeof tab)}
      className="space-y-3"
    >
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="total">Grand total</TabsTrigger>
        <TabsTrigger value="trip">By trip</TabsTrigger>
        <TabsTrigger value="category">By category</TabsTrigger>
      </TabsList>

      <TabsContent value="total" className="mt-2">
        <div className="space-y-2 rounded-md border p-6">
          <div className="font-mono text-3xl tabular-nums">
            {formatAed(grandTotalAed)}
          </div>
          <div className="text-sm text-muted-foreground">
            {tripCount} {tripCount === 1 ? "trip" : "trips"} ·{" "}
            {expenseCount} {expenseCount === 1 ? "expense" : "expenses"} ·{" "}
            {categoryCount}{" "}
            {categoryCount === 1 ? "category" : "categories"}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="trip" className="mt-2">
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byTrip}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke={GRID_STROKE}
                strokeDasharray="2 4"
              />
              <XAxis
                type="number"
                stroke={AXIS_TICK}
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                axisLine={{ stroke: GRID_STROKE }}
                tickLine={{ stroke: GRID_STROKE }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={AXIS_TICK}
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                width={110}
                axisLine={{ stroke: GRID_STROKE }}
                tickLine={{ stroke: GRID_STROKE }}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              />
              <Bar dataKey="total_aed" fill={BAR_FILL} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>

      <TabsContent value="category" className="mt-2">
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byCategory}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke={GRID_STROKE}
                strokeDasharray="2 4"
              />
              <XAxis
                type="number"
                stroke={AXIS_TICK}
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                axisLine={{ stroke: GRID_STROKE }}
                tickLine={{ stroke: GRID_STROKE }}
              />
              <YAxis
                type="category"
                dataKey="category"
                stroke={AXIS_TICK}
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                width={110}
                axisLine={{ stroke: GRID_STROKE }}
                tickLine={{ stroke: GRID_STROKE }}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              />
              <Bar dataKey="total_aed" radius={[0, 3, 3, 0]}>
                {byCategory.map((d) => (
                  <Cell
                    key={d.category}
                    fill={d.color}
                    fillOpacity={0.7}
                    stroke={d.color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TabsContent>
    </Tabs>
  )
}
