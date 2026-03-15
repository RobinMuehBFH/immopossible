import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth")

  const isDashboardRoute = pathname.startsWith("/dashboard")
  const isPortalRoute = pathname.startsWith("/portal")
  const isApiRoute = pathname.startsWith("/api")

  // Allow API routes and auth callback to pass through
  if (isApiRoute || pathname === "/auth/callback") {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login
  if (!token && (isDashboardRoute || isPortalRoute)) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (token && isAuthRoute) {
    const role = token.role as string
    const url = new URL(role === "tenant" ? "/portal" : "/dashboard", request.url)
    return NextResponse.redirect(url)
  }

  // Ensure supabase token is present for protected routes
  if (token && !token.supabaseAccessToken && (isDashboardRoute || isPortalRoute)) {
    const signoutUrl = new URL("/api/auth/signout", request.url)
    signoutUrl.searchParams.set("callbackUrl", "/login?relogin=true")
    return NextResponse.redirect(signoutUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
