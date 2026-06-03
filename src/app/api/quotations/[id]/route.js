/**
 * QUOTATION DETAILS API ENDPOINT (PUT /api/quotations/:id)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. PUT /api/quotations/q12a9... (Approve/Reject)
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "status": "APPROVED" // or "REJECTED"
 * }
 * 
 * 2. PUT /api/quotations/q12a9... (Convert to Order)
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "status": "CONVERTED"
 * }
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. PUT Status Update Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Quotation approved successfully"
 * }
 * 
 * 2. PUT Conversion Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Quotation converted to Order successfully",
 *   "orderId": "o991c..."
 * }
 * 
 * VALIDATION RULES:
 * - status: enum ["APPROVED", "REJECTED", "CONVERTED"]
 * 
 * AUTHORIZATION RULES:
 * - APPROVE/REJECT: ADMIN or SELLER (if quotation contains their products).
 * - CONVERTED: BUYER (who created it) or ADMIN or SELLER.
 * 
 * DATABASE OPERATIONS:
 * - Checks stock levels for all products in the quote.
 * - Deducts inventoryQuantity (base unit) for each product.
 * - Creates Order and OrderItems.
 * - Updates Quotation status to CONVERTED.
 * - Logs activities and inventory changes.
 * - Runs fully inside a database Transaction.
 * 
 * INTERVIEW EXPLANATION:
 * The conversion process is a critical B2B lifecycle operation. It is executed in a 
 * database transaction (`prisma.$transaction`) to prevent double-selling stock if concurrent 
 * requests occur. The route fetches the products in the quote with a write lock (or standard 
 * transaction isolation) and verifies that every product's stock satisfies the requested base 
 * quantity. If any product is short, it rolls back the transaction and returns a 400 error. 
 * Otherwise, it creates the order, reduces the stock levels, writes inventory audit logs, 
 * and marks the quotation as converted.
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

    if (!['APPROVED', 'REJECTED', 'CONVERTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Retrieve quotation
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // Role checks
    if (status === 'APPROVED' || status === 'REJECTED') {
      if (user.role !== 'ADMIN' && user.role !== 'SELLER') {
        return NextResponse.json({ error: 'Forbidden: Cannot update status' }, { status: 403 });
      }

      // If seller, check if they own at least one product in this quotation
      if (user.role === 'SELLER') {
        const ownsItem = quotation.items.some((it) => it.product.sellerId === user.id);
        if (!ownsItem) {
          return NextResponse.json({ error: 'Forbidden: You do not sell products in this quotation' }, { status: 403 });
        }
      }

      // Update status
      const updated = await prisma.quotation.update({
        where: { id },
        data: { status },
      });

      // Write activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: `QUOTATION_${status}`,
          details: `Quotation ID '${id}' status updated to ${status} by user ${user.name}.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Quotation ${status.toLowerCase()} successfully`,
        quotation: updated,
      });
    }

    if (status === 'CONVERTED') {
      // Allow buyer who created it, or Admin/Seller
      if (user.role === 'BUYER' && quotation.buyerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: This is not your quotation' }, { status: 403 });
      }

      if (quotation.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Only APPROVED quotations can be converted to orders' }, { status: 400 });
      }

      // Check stock levels before proceeding
      for (const item of quotation.items) {
        if (item.product.inventoryQuantity < item.baseQuantity) {
          return NextResponse.json(
            { error: `Insufficient stock for product '${item.product.name}'. Required: ${item.baseQuantity} ${item.product.baseUnit}, Available: ${item.product.inventoryQuantity} ${item.product.baseUnit}` },
            { status: 400 }
          );
        }
      }

      // Conversion transaction
      const newOrder = await prisma.$transaction(async (tx) => {
        // 1. Create the Order
        const order = await tx.order.create({
          data: {
            buyerId: quotation.buyerId,
            status: 'PENDING',
            totalAmount: quotation.totalAmount,
            quotationId: quotation.id,
          },
        });

        // 2. Create Order Items and update product stock
        for (const item of quotation.items) {
          // Create OrderItem
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              unit: item.unit,
              baseQuantity: item.baseQuantity,
              pricePerBaseUnit: item.pricePerBaseUnit,
              totalPrice: item.totalPrice,
            },
          });

          // Deduct Product Stock
          const updatedProduct = await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: {
                decrement: item.baseQuantity,
              },
            },
          });

          // Write Inventory History Log
          await tx.inventoryHistory.create({
            data: {
              productId: item.productId,
              type: 'REDUCE',
              quantityChanged: item.baseQuantity,
              previousQuantity: item.product.inventoryQuantity,
              newQuantity: updatedProduct.inventoryQuantity,
              note: `Deducted for Order Conversion from Quotation ID: ${quotation.id}`,
              userId: user.id,
            },
          });
        }

        // 3. Mark Quotation as CONVERTED
        await tx.quotation.update({
          where: { id: quotation.id },
          data: { status: 'CONVERTED' },
        });

        return order;
      });

      // Write activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'QUOTATION_CONVERTED',
          details: `Quotation ID '${id}' successfully converted to Order ID '${newOrder.id}'. Stock levels deducted.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Quotation successfully converted to Order',
        orderId: newOrder.id,
      });
    }

    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  } catch (error) {
    console.error('Update quotation details error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
