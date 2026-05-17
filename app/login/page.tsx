"use client"

import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) return
    setSending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setSending(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
    toast.success("Magic link sent")
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll email you a one-time magic link.
        </p>
      </div>

      {sent ? (
        <div className="rounded-md border border-dashed p-4 text-sm">
          <p className="font-medium">Check your email.</p>
          <p className="mt-1 text-muted-foreground">
            We sent a magic link to{" "}
            <span className="font-mono">{email}</span>. Open it on this device
            to finish signing in.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={sending}
            />
          </div>
          <Button type="submit" disabled={sending || !email} className="w-full">
            {sending ? "Sending…" : "Send magic link"}
          </Button>
        </form>
      )}
    </div>
  )
}
