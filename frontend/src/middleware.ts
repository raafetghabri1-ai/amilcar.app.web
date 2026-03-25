import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_PATHS: Record<string, string> = {
  admin: "/dashboard/admin",
  worker: "/dashboard/worker",
  client: "/dashboard/client",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname === "/login" || pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check if accessing a dashboard route
  if (pathname.startsWith("/dashboard")) {
    const role = request.cookies.get("user_role")?.value;

    // No role cookie → redirect to login
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Prevent accessing other role's dashboard
    // Allow shared routes like /dashboard/settings
    const sharedPaths = ["/dashboard/settings"];
    const isShared = sharedPaths.some((p) => pathname.startsWith(p));

    const allowedPath = ROLE_PATHS[role];
    if (allowedPath && !isShared && !pathname.startsWith(allowedPath)) {
      return NextResponse.redirect(new URL(allowedPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
