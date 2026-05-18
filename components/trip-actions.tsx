"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Props = {
  tripId: string
  tripName: string
  expenseCount: number
}

export default function TripActions({
  tripId,
  tripName,
  expenseCount,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onConfirmDelete() {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from("trips").delete().eq("id", tripId)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Deleted ${tripName}`)
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/trips/${tripId}/edit`}>
          <Pencil className="size-3.5" />
          Edit
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {tripName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this trip and all {expenseCount}{" "}
              {expenseCount === 1 ? "expense" : "expenses"}. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete trip"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
