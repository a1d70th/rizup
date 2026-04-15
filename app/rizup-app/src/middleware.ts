import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/home", "/journal", "/profile", "/notifications", "/settings", "/premium", "/admin", "/vision", "/habits", "/growth"];
const authPaths = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => { request.cookies.set(name, value); });
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => { response.cookies.set(name, value, options); });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect helper that propagates any auth cookies Supabase just refreshed
  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => {
      const { name, value, ...options } = c;
      redirect.cookies.set(name, value, options);
    });
    return redirect;
  };

  // Unauthenticated → /login
  if (!user && (protectedPaths.some((p) => pathname.startsWith(p)) || pathname === "/onboarding")) {
    return redirectWithCookies(new URL("/login", request.url));
  }

  // Authenticated → skip auth pages
  if (authPaths.some((p) => pathname.startsWith(p)) && user) {
    return redirectWithCookies(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/home/:path*", "/journal/:path*", "/profile/:path*",
    "/notifications/:path*", "/settings/:path*",
    "/premium/:path*", "/admin/:path*",
    "/vision/:path*", "/habits/:path*",
    "/growth/:path*",
    "/login", "/register", "/onboarding", "/auth/callback",
  ],
};
