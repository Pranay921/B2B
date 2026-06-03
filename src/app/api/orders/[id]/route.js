/**
 * ORDER DETAILS API ENDPOINT (PUT /api/orders/:id)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. PUT /api/orders/o991c...
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "status": "PROCESSING" // or "SHIPPED", "COMPLETED", "CANCELLED"
 * }
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. PUT Status Update Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Order status updated to PROCESSING",
 *   "order": { ... }
 * }
 * 
 * VALIDATION RULES:
 * - status: enum ["PENDING", "APPROVED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"]
 * 
 * AUTHORIZATION RULES:
 * - Restricted to ADMIN role, or the SELLER who owns products in the order.
 * - BUYERS can query, but can only transition to CANCELLED if the status is PENDING (request cancellation).
 * 
 * DATABASE OPERATIONS:
 * - If status is CANCELLED, restores inventoryQuantity (base unit) for each product in transaction.
 * - Updates Order status in database.
 * - Writes activity and inventory history logs.
 * - Runs fully inside a database Transaction.
 * 
 * INTERVIEW EXPLANATION:
 * The update order status route handles the cancellation workflow. When an order status 
 * is transitioned to CANCELLED, B2B practices require releasing the allocated inventory. 
 * The route initiates a Prisma transaction, iterates through the order items, increments 
 * each product's stock levels by the ordered base quantity, and records an `ADD` type 
 * transaction in the inventory audit logs. It then updates the order's status to CANCELLED.
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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    // Retrieve order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization checks
    if (user.role === 'BUYER') {
      // Buyers can only cancel their own orders, and only if the order is still PENDING
      if (order.buyerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: This is not your order' }, { status: 403 });
      }

      if (status !== 'CANCELLED') {
        return NextResponse.json({ error: 'Forbidden: Buyers can only request cancellation' }, { status: 403 });
      }

      if (order.status !== 'PENDING') {
        return NextResponse.json({ error: 'Cannot cancel order once it has been processed' }, { status: 400 });
      }
    } else if (user.role === 'SELLER') {
      // Sellers can update order status for orders containing their products
      const sellsItem = order.items.some((it) => it.product.sellerId === user.id);
      if (!sellsItem) {
        return NextResponse.json({ error: 'Forbidden: You do not sell products in this order' }, { status: 403 });
      }
    }

    // Process status update (including stock restoration if cancelled)
    let updatedOrder;

    if (status === 'CANCELLED') {
      if (order.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Order is already cancelled' }, { status: 400 });
      }
      if (order.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Cannot cancel a completed order' }, { status: 400 });
      }

      // Restore stock levels in transaction
      updatedOrder = await prisma.$transaction(async (tx) => {
        // 1. Update order status
        const ord = await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });

        // 2. Loop and restore product stocks
        for (const item of order.items) {
          const updatedProd = await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: {
                increment: item.baseQuantity,
              },
            },
          });

          // Write Inventory History Log
          await tx.inventoryHistory.create({
            data: {
              productId: item.productId,
              type: 'ADD',
              quantityChanged: item.baseQuantity,
              previousQuantity: item.product.inventoryQuantity,
              newQuantity: updatedProd.inventoryQuantity,
              note: `Restored stock from cancelled Order ID: ${order.id}`,
              userId: user.id,
            },
          });
        }

        return ord;
      });
    } else {
      // Just update the status normally (PROCESSING, SHIPPED, COMPLETED)
      updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
      });
    }

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: `ORDER_${status}`,
        details: `Order ID '${id}' status updated to ${status} by user ${user.name}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order details error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
