import { createClient } from "@/lib/supabase/server"
import SignOutButton from "./sign-out-button"

// Server component. Renders nothing when there's no session — that naturally
// covers /login and /auth/* (the user is unauthenticated there) without
// having to inspect the pathname.
export default async function HeaderAuth() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground" title={user.email ?? ""}>
        {user.email}
      </span>
      <SignOutButton />
    </div>
  )
}
