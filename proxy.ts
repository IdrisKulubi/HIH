import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Add home page to public routes
const publicRoutes = ["/", "/login", "/signup", "/no-access"];

// Routes that require authentication
const protectedRoutes = ["/apply", "/profile", "/admin", "/dashboard"];

export async function proxy(request: Request & { nextUrl: URL }) {
  const session = await auth();
  const isAuth = !!session?.user;
  const pathname = request.nextUrl.pathname;

  // Handle service worker
  if (request.nextUrl.pathname === "/sw.js") {
    return NextResponse.rewrite(new URL("/sw", request.url));
  }

  // Public routes - allow access without authentication
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // If accessing a protected route without authentication
  if (isProtectedRoute && !isAuth) {
    // Special handling for apply route - show a friendly message
    if (pathname.startsWith("/apply")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("message", "login-required-for-application");
      return NextResponse.redirect(loginUrl);
    }
    
    // For other protected routes, redirect to login with callback
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle authenticated users accessing login page
  if (pathname.startsWith("/login") && isAuth) {
    // Check if there's a callback URL
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    if (callbackUrl && callbackUrl !== "/login") {
      return NextResponse.redirect(new URL(callbackUrl, request.url));
    }
    // Default redirect after login - go to apply page
    return NextResponse.redirect(new URL("/apply", request.url));
  }

  // Allow access to all other routes for authenticated users
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /static (public files)
     * 4. /*.* (files with extensions)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|static|.*\\.).*)",
    '/sw.js',
  ],
};
