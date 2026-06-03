/**
 * LOGIN API ENDPOINT (POST /api/auth/login)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * POST /api/auth/login
 * Content-Type: application/json
 * {
 *   "email": "buyer@example.com",
 *   "password": "password123",
 *   "remember": true
 * }
 * 
 * RESPONSE EXAMPLE:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Logged in successfully",
 *   "user": {
 *     "id": "c62ad6f7-47b2-4d2d-965a-cfa686f0d922",
 *     "email": "buyer@example.com",
 *     "name": "Jane Buyer",
 *     "role": "BUYER"
 *   }
 * }
 * 
 * VALIDATION RULES (Zod):
 * - email: string, email format, required
 * - password: string, required
 * - remember: boolean, optional
 * 
 * AUTHORIZATION RULES:
 * - Public endpoint.
 * 
 * DATABASE OPERATIONS:
 * - prisma.user.findUnique({ where: { email } }) to check if user exists
 * - prisma.activityLog.create({ data: { userId, action, details } }) to log user login
 * 
 * INTERVIEW EXPLANATION:
 * The login route authenticates users by finding their record by email. 
 * First, it checks if the account is ACTIVE. If the account is deactivated, it returns a 403 Forbidden. 
 * Next, it compares the provided plain text password with the hashed password from the DB using bcrypt.compareSync.
 * If authentication succeeds, it signs a JWT containing the user's id, email, name, role, and status.
 * We set this token in an httpOnly, Secure, and sameSite='strict' cookie. If 'remember' is true, 
 * the cookie is set for 30 days; otherwise, it expires with the session.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { comparePassword, signJWT } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = LoginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { email, password, remember } = validation.data;
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact an admin.' },
        { status: 403 }
      );
    }
    
    const passwordMatch = comparePassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Cookie age: 30 days if remember is true, 1 day otherwise
    const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
    
    const token = await signJWT(tokenPayload, maxAge);
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAge / 1000,
      path: '/',
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGGED_IN',
        details: `User logged in from IP/browser. Session extended for ${remember ? '30 days' : '24 hours'}.`,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
