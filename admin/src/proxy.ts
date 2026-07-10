import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (config.matcher is unchanged).

// The driver-facing API is consumed by the Expo app, which browsers treat as cross-origin when
// running `expo start --web` (a different port than the Next.js server) or as a deployed web build.
// Native iOS/Android builds aren't subject to CORS, but the web target and local dev both need it.
// Driver requests carry their own Supabase access token (checked inside the route handler, same
// as before) rather than the admin's cookie-based session, so they're passed through here.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isDriverApi = pathname.startsWith("/api/driver");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isDriverApi) {
    if (req.method === "OPTIONS") {
      return withCors(new NextResponse(null, { status: 204 }));
    }
    return withCors(NextResponse.next());
  }

  // The login page itself is under /mfi/:path* (so its own session gets refreshed if already
  // signed in) but must never be redirect-target'd back to itself when unauthenticated.
  if (pathname === "/mfi/login") {
    return NextResponse.next();
  }

  // Standard Supabase SSR session-refresh pattern: reading `getUser()` here (not just the
  // cookie) revalidates the token with Supabase and re-issues cookies if it was refreshed, so
  // Server Components downstream see an up-to-date session.
  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (pathname.startsWith("/mfi")) {
      return NextResponse.redirect(new URL("/mfi/login", req.nextUrl.origin));
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return response;
}

export const config = {
  matcher: [
    "/drivers/:path*",
    "/settlement/:path*",
    "/settings/:path*",
    "/audit-log/:path*",
    "/lenders/:path*",
    "/mfi/:path*",
    "/api/admin/:path*",
    "/api/driver/:path*",
  ],
};
