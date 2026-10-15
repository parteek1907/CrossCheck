import { NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "./lib/session.js";

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  // Ignore static assets, internal next routes, api routes, landing page, and public incident reports
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/report-incident") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  const session = cookie ? await verifySession(cookie.value) : null;
  const isAuthenticated = Boolean(session && session.userId);

  // Protected paths that require authentication
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/families") ||
    (pathname.startsWith("/report/") && !pathname.startsWith("/report-incident"));


  // Auth paths (login, register)
  const isAuthPath = pathname === "/login" || pathname === "/register";

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/families/:path*",
    "/report/:path*",
    "/login",
    "/register",
  ],
};
