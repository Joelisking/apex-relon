import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // Define protected routes (require authentication)
  const protectedRoutes = [
    '/dashboard',
    '/leads',
    '/clients',
    '/projects',
    '/reports',
    '/tasks',
    '/invoicing',
    '/cost-breakdown',
    '/admin',
    '/settings',
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // Define auth routes (redirect to dashboard if already authenticated)
  const authRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthRoute && token) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/leads/:path*',
    '/clients/:path*',
    '/projects/:path*',
    '/reports/:path*',
    '/tasks/:path*',
    '/invoicing/:path*',
    '/cost-breakdown/:path*',
    '/admin/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
};
