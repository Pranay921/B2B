/**
 * USER DETAILS API ENDPOINT (PUT /api/users/:id, DELETE /api/users/:id)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. PUT /api/users/c62ad6f7...
 * Content-Type: application/json
 * Cookie: session_token=<admin-token>
 * {
 *   "status": "INACTIVE" // or "ACTIVE"
 * }
 * 
 * 2. DELETE /api/users/c62ad6f7...
 * Cookie: session_token=<admin-token>
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. PUT Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "User status updated successfully",
 *   "user": { ... }
 * }
 * 
 * 2. DELETE Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "User deleted successfully"
 * }
 * 
 * VALIDATION RULES:
 * - PUT: status must be "ACTIVE" or "INACTIVE".
 * 
 * AUTHORIZATION RULES:
 * - Restricted to ADMIN role only.
 * 
 * DATABASE OPERATIONS:
 * - prisma.user.update({ where: { id }, data: { ... } })
 * - prisma.user.delete({ where: { id } })
 * 
 * INTERVIEW EXPLANATION:
 * This detail route allows Admins to activate/deactivate accounts or delete users. 
 * If an Admin deactivates an account, the next API request or page load by that user will 
 * trigger a verification failure in the middleware (as the status check returns INACTIVE), 
 * immediately terminating their session. Admins are blocked from deactivating/deleting themselves 
 * to prevent locked-out states.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const id = (await params).id;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own status' }, { status: 400 });
    }

    const body = await request.json();
    const { status, role } = body;

    const dataToUpdate = {};
    if (status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return NextResponse.json({ error: 'Invalid user status' }, { status: 400 });
      }
      dataToUpdate.status = status;
    }
    if (role !== undefined) {
      if (!['ADMIN', 'SELLER', 'BUYER'].includes(role)) {
        return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
      }
      dataToUpdate.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_MODIFIED',
        details: `User '${updatedUser.name}' (ID: ${id}) modified by Admin: ${JSON.stringify(dataToUpdate)}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user details error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = (await params).id;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const deletedUser = await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_DELETED',
        details: `User '${deletedUser.name}' (Email: ${deletedUser.email}) deleted by Admin`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
