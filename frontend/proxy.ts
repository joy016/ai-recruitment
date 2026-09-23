import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "auth_token";
const PROTECTED_PREFIX = "/hr";
const LOGIN_PATH = "/login";
const DEFAULT_AUTHENTICATED_PATH = "/hr/dashboard";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedRoute = pathname.startsWith(PROTECTED_PREFIX);
  const isLoginRoute = pathname === LOGIN_PATH;

  if (isProtectedRoute && !token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && token) {
    return NextResponse.redirect(
      new URL(DEFAULT_AUTHENTICATED_PATH, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hr/:path*", "/login"],
};
