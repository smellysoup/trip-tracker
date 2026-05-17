import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Sign-in link failed
        </h1>
        <p className="text-sm text-muted-foreground">
          The magic link couldn&apos;t be exchanged for a session. This usually
          means the link expired or was already used.
        </p>
      </div>

      {searchParams.error ? (
        <pre className="overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
          {searchParams.error}
        </pre>
      ) : null}

      <Button asChild className="w-full">
        <Link href="/login">Request a new link</Link>
      </Button>
    </div>
  )
}
