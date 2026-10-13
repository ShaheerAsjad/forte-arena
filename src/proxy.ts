import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/profile", "/admin"];

function isProtectedPath(pathname: string): boolean {
  if (protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  // Check pattern: /events/[slug]/register
  if (/^\/events\/[^/]+\/register(?:\/.*)?$/.test(pathname)) {
    return true;
  }
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedPath(pathname)) {
    const sessionCookie =
      request.cookies.get("better-auth.session_token")?.value ||
      request.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/events/:path*/register",
  ],
};
