/**
 * INVENTORY AUDIT HISTORY API ENDPOINT (GET /api/inventory/history)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * GET /api/inventory/history
 * Cookie: session_token=<admin-token>
 * 
 * RESPONSE EXAMPLE:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "history": [
 *     {
 *       "id": "lh82ad...",
 *       "productId": "p81d1a...",
 *       "type": "ADD",
 *       "quantityChanged": 5000.0,
 *       "previousQuantity": 50000.0,
 *       "newQuantity": 55000.0,
 *       "note": "Restocking sugar supplies",
 *       "createdAt": "2026-06-03T04:20:00Z",
 *       "product": { "name": "Organic Sugar", "sku": "SUG-ORG-001" },
 *       "user": { "name": "Raj Traders" }
 *     }
 *   ]
 * }
 * 
 * AUTHORIZATION RULES:
 * - Restricted to ADMIN and SELLER roles.
 * 
 * DATABASE OPERATIONS:
 * - prisma.inventoryHistory.findMany({ include: { product, user } })
 * 
 * INTERVIEW EXPLANATION:
 * The inventory history endpoint serves as a ledger of all stock modifications. 
 * It runs a query on the `InventoryHistory` model, fetching related product names/SKUs 
 * and auditor details. It is ordered by `createdAt: desc` to present the latest changes first.
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

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const where = {};
    
    // Sellers should only see logs related to their own products
    if (user.role === 'SELLER') {
      where.product = {
        sellerId: user.id,
      };
    }

    const history = await prisma.inventoryHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            baseUnit: true,
          },
        },
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Fetch inventory history error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
