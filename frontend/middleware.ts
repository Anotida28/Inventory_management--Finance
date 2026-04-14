import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE_NAME } from "./src/lib/authConstants";

const isPublicRoute = (pathname: string) =>
  pathname === "/login" || pathname === "/register";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value);

  if (!hasSession && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);

    if (pathname !== "/dashboard") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
