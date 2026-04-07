import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that require authentication
const protectedPaths = ["/home", "/journal", "/profile", "/ranking", "/recommend", "/notifications", "/settings"];
// Pages only for unauthenticated users
const authPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Supabase auth token in cookies
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  // Redirect unauthenticated users away from protected pages
  if (protectedPaths.some((p) => pathname.startsWith(p)) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (authPaths.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/journal/:path*", "/profile/:path*", "/ranking/:path*", "/recommend/:path*", "/notifications/:path*", "/settings/:path*", "/login", "/register"],
};
