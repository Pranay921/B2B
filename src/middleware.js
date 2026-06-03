import { NextResponse } from 'next/server';
import { verifyJWT } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Exclude static assets, icons, and auth APIs
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get('session_token')?.value;
  const user = token ? await verifyJWT(token) : null;

  // Login and register routes redirect to dashboard if session exists
  if (pathname === '/login' || pathname === '/register') {
    if (user) {
      const role = user.role.toLowerCase();
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    return NextResponse.next();
  }

  const isAdminPath = pathname.startsWith('/admin');
  const isSellerPath = pathname.startsWith('/seller');
  const isBuyerPath = pathname.startsWith('/buyer');
  const isApiPath = pathname.startsWith('/api');

  // Route guarding
  if (isAdminPath || isSellerPath || isBuyerPath) {
    if (!user) {
      if (isApiPath) {
        return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user.status === 'INACTIVE') {
      const response = NextResponse.redirect(new URL('/login?error=account_deactivated', request.url));
      response.cookies.delete('session_token');
      return response;
    }

    // Role-based access validation
    if (isAdminPath && user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (isSellerPath && user.role !== 'SELLER') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (isBuyerPath && user.role !== 'BUYER') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Protecting specific API endpoints based on role
  if (isApiPath && !pathname.startsWith('/api/auth')) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.status === 'INACTIVE') {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }
    
    // Admin only APIs
    if (pathname.startsWith('/api/users') && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
