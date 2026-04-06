import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const publicPaths = ["/", "/login", "/view", "/api/auth", "/api/proposal-shares", "/api/proposals/import", "/reports/report", "/reports/api"]
  const isPublicPath = publicPaths.some(path =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  )

  if (isPublicPath) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.ico$).*)",
  ],
}
