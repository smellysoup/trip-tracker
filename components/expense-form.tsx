"use client"

import {
  useState,
  useEffect,
  useMemo,
  type FormEvent,
  type ChangeEvent,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import CurrencyCombobox from "@/components/currency-combobox"
import SplitEditor, { type SplitValue } from "@/components/split-editor"
import type {
  Category,
  Expense,
  ExpenseInsert,
  ExpenseSplit,
  ExpenseSplitInsert,
  ExpenseUpdate,
  PaymentMethod,
  Trip,
} from "@/lib/types"

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mixed", label: "Mixed" },
]

const TOL = 0.02
const NONE = "__none__" // sentinel for nullable Select fields

type ExpenseWithSplits = Expense & { expense_splits: ExpenseSplit[] }

type Props = {
  mode: "create" | "edit"
  trip: Trip
  expense?: ExpenseWithSplits
  categories: Category[]
  onSuccess: () => void
}

type FormState = {
  item: string
  category: string
  expense_date: string
  expense_date_text: string
  native_currency: string
  native_price: string
  aed_price: string
  fx_rate_used: string
  payment_method: PaymentMethod
  paid_by: string // "Melly" | "Ash" | NONE
  description: string
}

type FieldErrors = Partial<Record<keyof FormState | "split" | "_general", string>>

function half(n: number): [number, number] {
  if (!Number.isFinite(n) || n <= 0) return [0, 0]
  const a = Math.round((n / 2) * 100) / 100
  const b = Math.round((n - a) * 100) / 100
  return [a, b]
}

function defaultsForCreate(trip: Trip): {
  form: FormState
  split: SplitValue
} {
  const [a, b] = (trip.participants ?? ["Melly", "Ash"]) as string[]
  return {
    form: {
      item: "",
      category: "",
      expense_date: "",
      expense_date_text: "",
      native_currency: trip.native_currency ?? "",
      native_price: "",
      aed_price: "",
      fx_rate_used: "",
      payment_method: "unknown",
      paid_by: NONE,
      description: "",
    },
    split: {
      type: "even",
      splits: [
        { participant: a, share_amount_aed: 0 },
        { participant: b, share_amount_aed: 0 },
      ],
    },
  }
}

function defaultsForEdit(
  trip: Trip,
  expense: ExpenseWithSplits
): { form: FormState; split: SplitValue } {
  return {
    form: {
      item: expense.item ?? "",
      category: expense.category ?? "",
      expense_date: expense.expense_date ?? "",
      expense_date_text: expense.expense_date_text ?? "",
      native_currency: expense.native_currency ?? "",
      native_price:
        expense.native_price != null ? String(expense.native_price) : "",
      aed_price: expense.aed_price != null ? String(expense.aed_price) : "",
      fx_rate_used:
        expense.fx_rate_used != null ? String(expense.fx_rate_used) : "",
      payment_method: expense.payment_method ?? "unknown",
      paid_by: expense.paid_by ?? NONE,
      description: expense.description ?? "",
    },
    split: {
      type: expense.split_type,
      splits: expense.expense_splits.map((s) => ({
        participant: s.participant,
        share_amount_aed: Number(s.share_amount_aed),
      })),
    },
  }
}

export default function ExpenseForm({
  mode,
  trip,
  expense,
  categories,
  onSuccess,
}: Props) {
  const router = useRouter()
  const participants = (trip.participants ?? ["Melly", "Ash"]) as string[]

  const init = useMemo(
    () =>
      mode === "edit" && expense
        ? defaultsForEdit(trip, expense)
        : defaultsForCreate(trip),
    // Recompute only when the expense identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, expense?.id, trip.id]
  )

  const [form, setForm] = useState<FormState>(init.form)
  const [split, setSplit] = useState<SplitValue>(init.split)
  const [isAedManuallyEdited, setIsAedManuallyEdited] = useState(
    mode === "edit"
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)

  // Reset when switching to a different expense (edit dialog reused for diff row).
  useEffect(() => {
    setForm(init.form)
    setSplit(init.split)
    setIsAedManuallyEdited(mode === "edit")
    setErrors({})
  }, [init, mode])

  // Auto-compute AED from native_price × effective FX rate (unless the user
  // has taken control of AED). Effective rate = fx_rate_used override, else
  // trip default.
  useEffect(() => {
    if (isAedManuallyEdited) return
    if (!form.native_price || !form.native_currency) return
    const np = Number(form.native_price)
    if (!Number.isFinite(np) || np <= 0) return
    const fx = form.fx_rate_used
      ? Number(form.fx_rate_used)
      : Number(trip.fx_rate_to_aed)
    if (!Number.isFinite(fx) || fx <= 0) return
    const computed = Math.round(np * fx * 100) / 100
    setForm((prev) =>
      prev.aed_price === String(computed)
        ? prev
        : { ...prev, aed_price: String(computed) }
    )
  }, [
    form.native_price,
    form.native_currency,
    form.fx_rate_used,
    trip.fx_rate_to_aed,
    isAedManuallyEdited,
  ])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onAedChange(e: ChangeEvent<HTMLInputElement>) {
    setIsAedManuallyEdited(true)
    update("aed_price", e.target.value)
    // Keep even-mode in sync as the user types.
    setSplit((prev) => {
      const parsed = Number(e.target.value)
      const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
      if (prev.type === "even") {
        const [a, b] = half(safe)
        return {
          type: "even",
          splits: [
            { participant: participants[0], share_amount_aed: a },
            { participant: participants[1], share_amount_aed: b },
          ],
        }
      }
      if (prev.type === "personal" && prev.splits.length === 1) {
        return {
          type: "personal",
          splits: [
            { participant: prev.splits[0].participant, share_amount_aed: safe },
          ],
        }
      }
      return prev
    })
  }

  function onCurrencyChange(code: string) {
    update("native_currency", code)
    if (!code) {
      // Clear native_price if currency is cleared — keeps the pair invariant.
      update("native_price", "")
    }
  }

  function validate(): { ok: true; aed: number } | { ok: false } {
    const next: FieldErrors = {}
    const aed = Number(form.aed_price)

    if (!form.item.trim()) next.item = "Required"
    if (!form.category) next.category = "Required"
    if (!Number.isFinite(aed) || aed <= 0) next.aed_price = "Must be > 0"

    const hasNativeCur = !!form.native_currency
    const hasNativePrice = !!form.native_price && Number(form.native_price) > 0
    if (hasNativeCur !== hasNativePrice) {
      next.native_price =
        "Native price and currency must be set together (or both empty)"
    }

    if (form.fx_rate_used && Number(form.fx_rate_used) <= 0) {
      next.fx_rate_used = "Must be > 0 if set"
    }

    // Split validation
    if (split.type === "reference") {
      if (split.splits.length !== 0) next.split = "Reference must have no splits"
    } else if (split.splits.some((s) => Number(s.share_amount_aed) < 0)) {
      // Block negatives outright — otherwise (-10) + (110) could pass a sum
      // check at target=100 while masking obviously wrong input.
      next.split = "Share amounts must be ≥ 0"
    } else {
      const sum = split.splits.reduce(
        (acc, s) => acc + Number(s.share_amount_aed || 0),
        0
      )
      if (Math.abs(sum - aed) > TOL) {
        next.split = `Sum ${sum.toFixed(2)} ≠ AED ${aed.toFixed(2)} (must match within 0.02)`
      }
      if (split.type === "personal" && split.splits.length !== 1) {
        next.split = "Personal split must have exactly one participant"
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
      ? { ok: true, aed }
      : { ok: false }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const v = validate()
    if (!v.ok) return

    setBusy(true)
    const supabase = createClient()

    if (mode === "create") {
      // 1. Compute next line_no
      const maxRes = await supabase
        .from("expenses")
        .select("line_no")
        .eq("trip_id", trip.id)
        .order("line_no", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (maxRes.error) {
        setBusy(false)
        toast.error(maxRes.error.message)
        return
      }
      const nextLineNo = (maxRes.data?.line_no ?? 0) + 1

      // 2. Insert expense
      const payload: ExpenseInsert = {
        trip_id: trip.id,
        line_no: nextLineNo,
        item: form.item.trim(),
        category: form.category,
        expense_date: form.expense_date || null,
        expense_date_text: form.expense_date_text.trim() || null,
        native_currency: form.native_currency || null,
        native_price: form.native_price ? Number(form.native_price) : null,
        aed_price: v.aed,
        fx_rate_used: form.fx_rate_used ? Number(form.fx_rate_used) : null,
        payment_method: form.payment_method,
        paid_by: form.paid_by === NONE ? null : (form.paid_by as "Melly" | "Ash"),
        split_type: split.type,
        description: form.description.trim() || null,
      }
      const insertRes = await supabase
        .from("expenses")
        .insert(payload)
        .select("id")
        .single()
      if (insertRes.error || !insertRes.data) {
        setBusy(false)
        toast.error(insertRes.error?.message ?? "Insert failed")
        return
      }
      const expenseId = insertRes.data.id

      // 3. Insert splits (if any)
      if (split.splits.length > 0) {
        const splitRows: ExpenseSplitInsert[] = split.splits.map((s) => ({
          expense_id: expenseId,
          participant: s.participant as "Melly" | "Ash",
          share_amount_aed: s.share_amount_aed,
        }))
        const splitRes = await supabase
          .from("expense_splits")
          .insert(splitRows)
        if (splitRes.error) {
          // Rollback expense row — splits were the only post-insert step.
          await supabase.from("expenses").delete().eq("id", expenseId)
          setBusy(false)
          toast.error(splitRes.error.message)
          return
        }
      }

      setBusy(false)
      toast.success("Expense added")
      onSuccess()
      router.refresh()
      return
    }

    // ───── edit mode ─────
    if (!expense) {
      setBusy(false)
      toast.error("Missing expense to edit")
      return
    }

    const updatePayload: ExpenseUpdate = {
      item: form.item.trim(),
      category: form.category,
      expense_date: form.expense_date || null,
      expense_date_text: form.expense_date_text.trim() || null,
      native_currency: form.native_currency || null,
      native_price: form.native_price ? Number(form.native_price) : null,
      aed_price: v.aed,
      fx_rate_used: form.fx_rate_used ? Number(form.fx_rate_used) : null,
      payment_method: form.payment_method,
      paid_by: form.paid_by === NONE ? null : (form.paid_by as "Melly" | "Ash"),
      split_type: split.type,
      description: form.description.trim() || null,
    }
    const updateRes = await supabase
      .from("expenses")
      .update(updatePayload)
      .eq("id", expense.id)
    if (updateRes.error) {
      setBusy(false)
      toast.error(updateRes.error.message)
      return
    }

    // Delete existing splits, insert new ones.
    const delRes = await supabase
      .from("expense_splits")
      .delete()
      .eq("expense_id", expense.id)
    if (delRes.error) {
      setBusy(false)
      toast.error(delRes.error.message)
      return
    }
    if (split.splits.length > 0) {
      const splitRows: ExpenseSplitInsert[] = split.splits.map((s) => ({
        expense_id: expense.id,
        participant: s.participant as "Melly" | "Ash",
        share_amount_aed: s.share_amount_aed,
      }))
      const insRes = await supabase.from("expense_splits").insert(splitRows)
      if (insRes.error) {
        setBusy(false)
        toast.error(insRes.error.message)
        return
      }
    }

    setBusy(false)
    toast.success("Expense updated")
    onSuccess()
    router.refresh()
  }

  const aedPriceNum = Number(form.aed_price) || 0

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="item">Item</Label>
        <Input
          id="item"
          value={form.item}
          onChange={(e) => update("item", e.target.value)}
          disabled={busy}
          autoComplete="off"
          className="h-11"
        />
        {errors.item ? (
          <p className="text-xs text-destructive">{errors.item}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select
          value={form.category}
          onValueChange={(v) => update("category", v)}
          disabled={busy}
        >
          <SelectTrigger id="category" className="h-11">
            <SelectValue placeholder="Pick a category…" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category ? (
          <p className="text-xs text-destructive">{errors.category}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="expense_date">Date</Label>
          <Input
            id="expense_date"
            type="date"
            value={form.expense_date}
            onChange={(e) => update("expense_date", e.target.value)}
            disabled={busy}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense_date_text">
            Date label{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="expense_date_text"
            value={form.expense_date_text}
            onChange={(e) => update("expense_date_text", e.target.value)}
            disabled={busy}
            placeholder="e.g. Jul 31 - Aug 3"
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="native_currency">Native currency</Label>
          <CurrencyCombobox
            id="native_currency"
            value={form.native_currency}
            onValueChange={onCurrencyChange}
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="native_price">Native price</Label>
          <Input
            id="native_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.native_price}
            onChange={(e) => update("native_price", e.target.value)}
            disabled={busy || !form.native_currency}
            className="h-11 font-mono tabular-nums"
          />
          {errors.native_price ? (
            <p className="text-xs text-destructive">{errors.native_price}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="aed_price">AED price</Label>
          <Input
            id="aed_price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={form.aed_price}
            onChange={onAedChange}
            disabled={busy}
            className="h-11 font-mono tabular-nums"
          />
          {errors.aed_price ? (
            <p className="text-xs text-destructive">{errors.aed_price}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx_rate_used">FX override</Label>
          <Input
            id="fx_rate_used"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0"
            value={form.fx_rate_used}
            onChange={(e) => update("fx_rate_used", e.target.value)}
            disabled={busy}
            placeholder={`Trip: ${Number(trip.fx_rate_to_aed).toFixed(4)}`}
            className="h-11 font-mono tabular-nums"
          />
          {errors.fx_rate_used ? (
            <p className="text-xs text-destructive">{errors.fx_rate_used}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="payment_method">Payment</Label>
          <Select
            value={form.payment_method}
            onValueChange={(v) => update("payment_method", v as PaymentMethod)}
            disabled={busy}
          >
            <SelectTrigger id="payment_method" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paid_by">Paid by</Label>
          <Select
            value={form.paid_by}
            onValueChange={(v) => update("paid_by", v)}
            disabled={busy}
          >
            <SelectTrigger id="paid_by" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unspecified</SelectItem>
              {participants.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Split</Label>
        <SplitEditor
          aedPrice={aedPriceNum}
          participants={participants}
          value={split}
          onChange={setSplit}
        />
        {errors.split ? (
          <p className="text-xs text-destructive">{errors.split}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          disabled={busy}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy
            ? mode === "create"
              ? "Adding…"
              : "Saving…"
            : mode === "create"
              ? "Add expense"
              : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
