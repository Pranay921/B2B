/**
 * REGISTER API ENDPOINT (POST /api/auth/register)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * POST /api/auth/register
 * Content-Type: application/json
 * {
 *   "email": "buyer@example.com",
 *   "password": "password123",
 *   "name": "Jane Buyer",
 *   "role": "BUYER"
 * }
 * 
 * RESPONSE EXAMPLE:
 * Status: 201 Created
 * {
 *   "success": true,
 *   "message": "User registered successfully",
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
 * - password: string, min 6 characters, required
 * - name: string, min 2 characters, required
 * - role: enum ["ADMIN", "SELLER", "BUYER"], default: "BUYER"
 * 
 * AUTHORIZATION RULES:
 * - Public endpoint.
 * 
 * DATABASE OPERATIONS:
 * - prisma.user.findUnique({ where: { email } }) to check duplicate email
 * - prisma.user.create({ data: { email, password: hashed, name, role } }) to insert user
 * - prisma.activityLog.create({ data: { userId, action, details } }) to log signup activity
 * 
 * INTERVIEW EXPLANATION:
 * This endpoint processes user registration. It first validates the request body using a schema built with Zod. 
 * If validation fails, it immediately returns a 400 Bad Request with field-level errors. 
 * Next, it queries the database to ensure the email is unique. 
 * Once confirmed, it hashes the raw password using bcryptjs (salting rounds = 10) before committing to the DB 
 * to prevent storing plain-text passwords. Finally, we record a log of the registration event.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).default('BUYER'),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = RegisterSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { email, password, name, role } = validation.data;
    
    // Restrict ADMIN registration to only one global administrator
    if (role === 'ADMIN') {
      const existingAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (existingAdmin) {
        return NextResponse.json(
          { error: 'An administrator account already exists. Only one admin is allowed on this platform.' },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }
    
    // Hash password and create user
    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        details: `User registered with name ${name} and role ${role}`,
      },
    });
    
    return NextResponse.json(
      { success: true, message: 'User registered successfully', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
