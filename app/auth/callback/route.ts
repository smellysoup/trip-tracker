import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/"

  if (!code) {
    const errUrl = url.clone()
    errUrl.pathname = "/auth/auth-code-error"
    errUrl.search = "?error=missing_code"
    return NextResponse.redirect(errUrl)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const errUrl = url.clone()
    errUrl.pathname = "/auth/auth-code-error"
    errUrl.search = `?error=${encodeURIComponent(error.message)}`
    return NextResponse.redirect(errUrl)
  }

  const dest = url.clone()
  dest.pathname = next.startsWith("/") ? next : "/"
  dest.search = ""
  return NextResponse.redirect(dest)
}
