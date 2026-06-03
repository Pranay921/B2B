/**
 * GET ME API ENDPOINT (GET /api/auth/me)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * GET /api/auth/me
 * 
 * RESPONSE EXAMPLE:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "user": {
 *     "id": "c62ad6f7-47b2-4d2d-965a-cfa686f0d922",
 *     "email": "buyer@example.com",
 *     "name": "Jane Buyer",
 *     "role": "BUYER"
 *   }
 * }
 * 
 * VALIDATION RULES:
 * - None.
 * 
 * AUTHORIZATION RULES:
 * - Session token must be present and valid.
 * 
 * DATABASE OPERATIONS:
 * - None (reads from JWT payload to ensure speed) or checks user status if needed.
 * 
 * INTERVIEW EXPLANATION:
 * The `/api/auth/me` endpoint returns the current session payload. It decodes the JWT 
 * from the cookie. Reading from JWT directly saves a database query round-trip.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    // Optionally check if user status is still active in the database
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!dbUser || dbUser.status === 'INACTIVE') {
      cookieStore.delete('session_token');
      return NextResponse.json(
        { error: 'User is inactive or deleted' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: dbUser,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
