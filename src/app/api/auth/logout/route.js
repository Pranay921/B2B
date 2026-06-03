/**
 * LOGOUT API ENDPOINT (POST /api/auth/logout)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * POST /api/auth/logout
 * 
 * RESPONSE EXAMPLE:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 * 
 * VALIDATION RULES:
 * - None.
 * 
 * AUTHORIZATION RULES:
 * - Logged-in users (checked via session cookie).
 * 
 * DATABASE OPERATIONS:
 * - prisma.activityLog.create({ data: { userId, action, details } }) to log logout event
 * 
 * INTERVIEW EXPLANATION:
 * The logout route deletes the `session_token` cookie by setting its maxAge to 0. 
 * If a session is valid, we also capture a database activity log for auditing.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;
    
    if (user) {
      // Log logout
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGGED_OUT',
          details: `User logged out manually`,
        },
      });
    }
    
    // Clear the cookie
    cookieStore.delete('session_token');
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
