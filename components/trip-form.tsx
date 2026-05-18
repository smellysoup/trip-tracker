"use client"

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { fetchFxRate } from "@/lib/fx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import CurrencyCombobox from "@/components/currency-combobox"
import type { Trip, TripInsert, TripUpdate } from "@/lib/types"

const TripFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    destination: z.string().trim(),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    native_currency: z
      .string()
      .trim()
      .length(3, "Pick a currency"),
    fx_rate_to_aed: z
      .number({ message: "FX rate is required" })
      .positive("FX rate must be > 0")
      .finite(),
    notes: z.string().trim(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  })

type FormState = {
  name: string
  destination: string
  start_date: string
  end_date: string
  native_currency: string
  fx_rate_to_aed: string
  notes: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; trip: Trip }

export default function TripForm(props: Props) {
  const router = useRouter()
  const initial: FormState =
    props.mode === "edit"
      ? {
          name: props.trip.name ?? "",
          destination: props.trip.destination ?? "",
          start_date: props.trip.start_date ?? "",
          end_date: props.trip.end_date ?? "",
          native_currency: props.trip.native_currency ?? "",
          fx_rate_to_aed:
            props.trip.fx_rate_to_aed != null
              ? String(props.trip.fx_rate_to_aed)
              : "",
          notes: props.trip.notes ?? "",
        }
      : {
          name: "",
          destination: "",
          start_date: "",
          end_date: "",
          native_currency: "",
          fx_rate_to_aed: "",
          notes: "",
        }

  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  // Don't yank a rate the user has manually typed. Set true the moment they
  // edit the FX field, or implicitly true on /edit (rates predate this form).
  const [isFxManuallyEdited, setIsFxManuallyEdited] = useState(
    props.mode === "edit"
  )
  const [fxLoading, setFxLoading] = useState(false)
  const [fxFailed, setFxFailed] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onCurrencyChange(code: string) {
    update("native_currency", code)
    if (isFxManuallyEdited || props.mode === "edit") return
    setFxFailed(false)
    setFxLoading(true)
    const result = await fetchFxRate(code, "AED")
    setFxLoading(false)
    if (!result) {
      setFxFailed(true)
      return
    }
    update("fx_rate_to_aed", String(Number(result.rate.toFixed(4))))
  }

  function onFxChange(e: ChangeEvent<HTMLInputElement>) {
    setIsFxManuallyEdited(true)
    setFxFailed(false)
    update("fx_rate_to_aed", e.target.value)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})

    const parsed = TripFormSchema.safeParse({
      name: form.name,
      destination: form.destination,
      start_date: form.start_date,
      end_date: form.end_date,
      native_currency: form.native_currency,
      fx_rate_to_aed: form.fx_rate_to_aed ? Number(form.fx_rate_to_aed) : NaN,
      notes: form.notes,
    })

    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState
        if (!next[k]) next[k] = issue.message
      }
      setErrors(next)
      return
    }

    const data = parsed.data
    setBusy(true)
    const supabase = createClient()

    if (props.mode === "create") {
      const payload: TripInsert = {
        name: data.name,
        destination: data.destination || null,
        start_date: data.start_date,
        end_date: data.end_date,
        native_currency: data.native_currency,
        fx_rate_to_aed: data.fx_rate_to_aed,
        participants: ["Melly", "Ash"],
        notes: data.notes || null,
      }
      const { data: inserted, error } = await supabase
        .from("trips")
        .insert(payload)
        .select("id")
        .single()
      setBusy(false)
      if (error || !inserted) {
        toast.error(error?.message ?? "Failed to create trip")
        return
      }
      router.push(`/trips/${inserted.id}`)
      router.refresh()
      return
    }

    const payload: TripUpdate = {
      name: data.name,
      destination: data.destination || null,
      start_date: data.start_date,
      end_date: data.end_date,
      native_currency: data.native_currency,
      fx_rate_to_aed: data.fx_rate_to_aed,
      notes: data.notes || null,
    }
    const { error } = await supabase
      .from("trips")
      .update(payload)
      .eq("id", props.trip.id)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    router.push(`/trips/${props.trip.id}`)
    router.refresh()
  }

  // Re-sync state when switching between trips on the same form mount.
  useEffect(() => {
    if (props.mode === "edit") setForm(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode === "edit" ? props.trip.id : null])

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          disabled={busy}
          autoComplete="off"
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destination">
          Destination <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="destination"
          value={form.destination}
          onChange={(e) => update("destination", e.target.value)}
          disabled={busy}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            type="date"
            value={form.start_date}
            onChange={(e) => update("start_date", e.target.value)}
            disabled={busy}
          />
          {errors.start_date ? (
            <p className="text-xs text-destructive">{errors.start_date}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date">End date</Label>
          <Input
            id="end_date"
            type="date"
            value={form.end_date}
            onChange={(e) => update("end_date", e.target.value)}
            disabled={busy}
          />
          {errors.end_date ? (
            <p className="text-xs text-destructive">{errors.end_date}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="native_currency">Native currency</Label>
          <CurrencyCombobox
            id="native_currency"
            value={form.native_currency}
            onValueChange={onCurrencyChange}
            disabled={busy}
          />
          {errors.native_currency ? (
            <p className="text-xs text-destructive">{errors.native_currency}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fx_rate_to_aed">
            FX rate to AED
            {fxLoading ? (
              <span className="ml-2 text-xs text-muted-foreground">
                Fetching…
              </span>
            ) : null}
          </Label>
          <Input
            id="fx_rate_to_aed"
            type="number"
            step="0.0001"
            min="0.0001"
            inputMode="decimal"
            value={form.fx_rate_to_aed}
            onChange={onFxChange}
            disabled={busy}
            className="font-mono tabular-nums"
          />
          {fxFailed ? (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Couldn&apos;t fetch rate — enter manually
            </p>
          ) : null}
          {errors.fx_rate_to_aed ? (
            <p className="text-xs text-destructive">{errors.fx_rate_to_aed}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Notes <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          disabled={busy}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy
            ? props.mode === "create"
              ? "Creating…"
              : "Saving…"
            : props.mode === "create"
              ? "Create trip"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
