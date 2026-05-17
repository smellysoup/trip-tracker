import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import HeaderAuth from "@/components/header-auth"

export const metadata: Metadata = {
  title: "Trip Tracker",
  description: "Personal trip expense tracker",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight hover:underline underline-offset-4"
            >
              Trip Tracker
            </Link>
            <HeaderAuth />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
