"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatAed } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SplitType } from "@/lib/types"

export type SplitRow = { participant: string; share_amount_aed: number }
export type SplitValue = { type: SplitType; splits: SplitRow[] }

type Props = {
  aedPrice: number
  participants: string[]
  value: SplitValue
  onChange: (value: SplitValue) => void
}

const TOL = 0.02

// Round to 2 decimals using bankers-style halve to avoid 0.10/0.01 imbalance.
function half(n: number): [number, number] {
  if (!Number.isFinite(n) || n <= 0) return [0, 0]
  const a = Math.round((n / 2) * 100) / 100
  const b = Math.round((n - a) * 100) / 100
  return [a, b]
}

function findShare(splits: SplitRow[], who: string): number | undefined {
  return splits.find((s) => s.participant === who)?.share_amount_aed
}

export default function SplitEditor({
  aedPrice,
  participants,
  value,
  onChange,
}: Props) {
  const [expanded, setExpanded] = useState(value.type !== "even")
  const lastAedPriceRef = useRef(aedPrice)
  const [a, b] = participants
  const safePrice = Number.isFinite(aedPrice) && aedPrice > 0 ? aedPrice : 0

  // Sync splits when aedPrice changes externally — but only for modes that
  // are computed from the total. Custom amounts are user-authored, so we
  // never silently overwrite them.
  useEffect(() => {
    if (lastAedPriceRef.current === aedPrice) return
    lastAedPriceRef.current = aedPrice
    if (value.type === "even") {
      const [m, s] = half(safePrice)
      onChange({
        type: "even",
        splits: [
          { participant: a, share_amount_aed: m },
          { participant: b, share_amount_aed: s },
        ],
      })
    } else if (value.type === "personal" && value.splits.length === 1) {
      onChange({
        type: "personal",
        splits: [
          { participant: value.splits[0].participant, share_amount_aed: safePrice },
        ],
      })
    }
    // intentionally not depending on `value` — react-hooks/exhaustive-deps
    // would force loops. We only react to aedPrice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aedPrice, a, b])

  function setMode(mode: SplitType) {
    if (mode === "even") {
      const [m, s] = half(safePrice)
      onChange({
        type: "even",
        splits: [
          { participant: a, share_amount_aed: m },
          { participant: b, share_amount_aed: s },
        ],
      })
    } else if (mode === "custom") {
      // Carry over the current effective amounts as a starting point.
      const existingA = findShare(value.splits, a)
      const existingB = findShare(value.splits, b)
      const [defaultA, defaultB] = half(safePrice)
      onChange({
        type: "custom",
        splits: [
          { participant: a, share_amount_aed: existingA ?? defaultA },
          { participant: b, share_amount_aed: existingB ?? defaultB },
        ],
      })
    } else if (mode === "personal") {
      // Default the payer to whoever currently has a share (or first participant).
      const currentPayer =
        value.splits.length === 1 ? value.splits[0].participant : a
      onChange({
        type: "personal",
        splits: [{ participant: currentPayer, share_amount_aed: safePrice }],
      })
    } else {
      onChange({ type: "reference", splits: [] })
    }
  }

  function setCustomAmount(who: string, raw: string) {
    if (value.type !== "custom") return
    const parsed = raw === "" ? 0 : Number(raw)
    const safeParsed = Number.isFinite(parsed) ? parsed : 0
    onChange({
      type: "custom",
      splits: value.splits.map((s) =>
        s.participant === who ? { ...s, share_amount_aed: safeParsed } : s
      ),
    })
  }

  function autofillOther(seedWho: string) {
    if (value.type !== "custom") return
    const seed = findShare(value.splits, seedWho) ?? 0
    const other = participants.find((p) => p !== seedWho)
    if (!other) return
    const rest = Math.round((safePrice - seed) * 100) / 100
    onChange({
      type: "custom",
      splits: value.splits.map((s) =>
        s.participant === other ? { ...s, share_amount_aed: rest } : s
      ),
    })
  }

  // ───── Collapsed default (mode=even, ≥1 participant) ─────
  if (!expanded && value.type === "even") {
    const each = safePrice / 2
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Split evenly:</span>{" "}
          <span className="font-mono tabular-nums">{formatAed(each)}</span>{" "}
          <span className="text-muted-foreground">each</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(true)}
          className="h-9 min-w-[44px]"
        >
          Adjust split
          <ChevronDown className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <Tabs
        value={value.type}
        onValueChange={(v) => setMode(v as SplitType)}
      >
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 p-1">
          <TabsTrigger value="even" className="h-9">
            Even
          </TabsTrigger>
          <TabsTrigger value="custom" className="h-9">
            Custom
          </TabsTrigger>
          <TabsTrigger value="personal" className="h-9">
            Personal
          </TabsTrigger>
          <TabsTrigger value="reference" className="h-9">
            Reference
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {value.type === "even" ? (
        <p className="text-sm text-muted-foreground">
          Each person owes{" "}
          <span className="font-mono tabular-nums text-foreground">
            {formatAed(safePrice / 2)}
          </span>
          .
        </p>
      ) : null}

      {value.type === "custom" ? (
        <CustomMode
          participants={participants}
          splits={value.splits}
          aedPrice={safePrice}
          onAmountChange={setCustomAmount}
          onAutofill={autofillOther}
        />
      ) : null}

      {value.type === "personal" ? (
        <PersonalMode
          participants={participants}
          currentPayer={value.splits[0]?.participant ?? a}
          aedPrice={safePrice}
          onPayerChange={(who) =>
            onChange({
              type: "personal",
              splits: [{ participant: who, share_amount_aed: safePrice }],
            })
          }
        />
      ) : null}

      {value.type === "reference" ? (
        <p className="text-sm text-muted-foreground">
          This expense is tracked at the trip total but not split between
          participants.
        </p>
      ) : null}

      {value.type === "even" ? (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="h-9 min-w-[44px]"
          >
            Collapse
            <ChevronUp className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function CustomMode({
  participants,
  splits,
  aedPrice,
  onAmountChange,
  onAutofill,
}: {
  participants: string[]
  splits: SplitRow[]
  aedPrice: number
  onAmountChange: (who: string, raw: string) => void
  onAutofill: (seedWho: string) => void
}) {
  const [a, b] = participants
  const va = findShare(splits, a) ?? 0
  const vb = findShare(splits, b) ?? 0
  const sum = Math.round((va + vb) * 100) / 100
  const diff = Math.abs(sum - aedPrice)
  const valid = aedPrice > 0 && diff <= TOL

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="split-a" className="text-xs">
            {a}
          </Label>
          <Input
            id="split-a"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={va === 0 ? "" : String(va)}
            onChange={(e) => onAmountChange(a, e.target.value)}
            className="h-11 text-right font-mono tabular-nums"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onAutofill(a)}
          aria-label={`Auto-fill ${b}'s share`}
          title={`Auto-fill ${b}'s share`}
          className="h-11 w-11 self-end"
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <div className="space-y-1.5">
          <Label htmlFor="split-b" className="text-xs">
            {b}
          </Label>
          <Input
            id="split-b"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={vb === 0 ? "" : String(vb)}
            onChange={(e) => onAmountChange(b, e.target.value)}
            className="h-11 text-right font-mono tabular-nums"
          />
        </div>
      </div>
      <p
        className={cn(
          "text-xs tabular-nums",
          valid ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"
        )}
      >
        Sum: <span className="font-mono">{formatAed(sum)}</span>
        {" / "}
        target <span className="font-mono">{formatAed(aedPrice)}</span>
        {valid ? " ✓" : diff > TOL ? ` (off by ${formatAed(diff)})` : ""}
      </p>
    </div>
  )
}

function PersonalMode({
  participants,
  currentPayer,
  aedPrice,
  onPayerChange,
}: {
  participants: string[]
  currentPayer: string
  aedPrice: number
  onPayerChange: (who: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {participants.map((p) => (
          <Button
            key={p}
            type="button"
            variant={currentPayer === p ? "default" : "outline"}
            onClick={() => onPayerChange(p)}
            className="h-11"
          >
            {p}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {currentPayer} owes{" "}
        <span className="font-mono tabular-nums text-foreground">
          {formatAed(aedPrice)}
        </span>
        . Other participant has no debt.
      </p>
    </div>
  )
}
