/**
 * USERS LIST API ENDPOINT (GET /api/users)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * GET /api/users?search=buyer&role=BUYER&status=ACTIVE
 * Cookie: session_token=<admin-token>
 * 
 * RESPONSE EXAMPLE:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "users": [
 *     {
 *       "id": "c62ad6f7-47b2-4d2d-965a-cfa686f0d922",
 *       "email": "buyer@example.com",
 *       "name": "Jane Buyer",
 *       "role": "BUYER",
 *       "status": "ACTIVE",
 *       "createdAt": "2026-06-03T04:20:00Z"
 *     }
 *   ]
 * }
 * 
 * VALIDATION RULES:
 * - Query filters: search, role, status.
 * 
 * AUTHORIZATION RULES:
 * - Restricted to ADMIN role only. (Checked in middleware and double-checked in handler)
 * 
 * DATABASE OPERATIONS:
 * - prisma.user.findMany({ where: { ... }, select: { id, email, name, role, status, createdAt } })
 * 
 * INTERVIEW EXPLANATION:
 * This endpoint allows Admins to pull list of users. It uses dynamic filtering to search 
 * for name or email sub-matches, filters by role (BUYER, SELLER, ADMIN), and active status. 
 * For security, it explicitly uses Prisma SELECT option to omit the hashed password from the response.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
