import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/home", "/journal", "/profile", "/notifications", "/settings", "/recommend", "/vip", "/premium", "/admin", "/vision", "/habits"];
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

  // Unauthenticated → /login
  if (!user && (protectedPaths.some((p) => pathname.startsWith(p)) || pathname === "/onboarding")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated → skip auth pages
  if (authPaths.some((p) => pathname.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Authenticated + protected page → check onboarding_completed flag
  if (user && protectedPaths.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("profiles").select("onboarding_completed").eq("id", user.id).single();

    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Already onboarded → redirect away from /onboarding
  if (user && pathname === "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles").select("onboarding_completed").eq("id", user.id).single();
    if (profile?.onboarding_completed) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/home/:path*", "/journal/:path*", "/profile/:path*",
    "/notifications/:path*", "/settings/:path*", "/recommend/:path*",
    "/vip/:path*", "/premium/:path*", "/admin/:path*",
    "/vision/:path*", "/habits/:path*",
    "/login", "/register", "/onboarding", "/auth/callback",
  ],
};
