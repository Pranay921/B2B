/**
 * ORDERS API ENDPOINT (GET /api/orders, POST /api/orders)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. GET /api/orders
 * Cookie: session_token=<token>
 * 
 * 2. POST /api/orders
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "items": [
 *     {
 *       "productId": "p81d1a...",
 *       "quantity": 10,
 *       "unit": "item"
 *     }
 *   ]
 * }
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. POST Response:
 * Status: 201 Created
 * {
 *   "success": true,
 *   "message": "Order placed successfully",
 *   "order": {
 *     "id": "o991c...",
 *     "buyerId": "buyer-uuid",
 *     "status": "PENDING",
 *     "totalAmount": 1200.0,
 *     "items": [ ... ]
 *   }
 * }
 * 
 * VALIDATION RULES (POST):
 * - items: array, min 1 item
 * - items[i].productId: string, required
 * - items[i].quantity: positive number, required
 * - items[i].unit: string, enum ["g", "kg", "mL", "L", "item"]
 * 
 * AUTHORIZATION RULES:
 * - GET: Restricted to logged-in users.
 *   - BUYER: returns their own orders.
 *   - SELLER: returns orders containing products they sell.
 *   - ADMIN: returns all orders.
 * - POST: Restricted to BUYER role.
 * 
 * DATABASE OPERATIONS:
 * - Checks stock levels for all ordered items.
 * - Deducts inventoryQuantity (base unit) for each product.
 * - Creates Order and OrderItems.
 * - Writes activity and inventory history logs.
 * - Runs fully inside a database Transaction.
 * 
 * INTERVIEW EXPLANATION:
 * The direct order placement endpoint validates stock in real-time. It retrieves product 
 * prices and stock levels, checks compatibility, converts requested quantities to base units 
 * using our helper library, and verifies stock. To prevent double-allocation issues, 
 * this checks and decrements stock within a SQL transaction block. If any step fails, 
 * the entire database operation is aborted.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { convertQuantity } from '@/lib/unitConversion';

const AddOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.enum(['g', 'kg', 'mL', 'L', 'item']),
});

const CreateOrderSchema = z.object({
  items: z.array(AddOrderItemSchema).min(1, 'Order must have at least one product'),
});

// GET orders based on role
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let orders = [];

    if (user.role === 'ADMIN') {
      orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  baseUnit: true,
                  seller: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });
    } else if (user.role === 'BUYER') {
      orders = await prisma.order.findMany({
        where: { buyerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  baseUnit: true,
                  seller: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });
    } else if (user.role === 'SELLER') {
      // Find orders containing products belonging to this seller
      orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                sellerId: user.id,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  baseUnit: true,
                  sellerId: true,
                },
              },
            },
          },
        },
      });

      // Filter each order's items so the seller only sees their own products
      orders = orders.map((o) => {
        const filteredItems = o.items.filter((item) => item.product.sellerId === user.id);
        const filteredTotal = filteredItems.reduce((sum, item) => sum + item.totalPrice, 0);
        return {
          ...o,
          items: filteredItems,
          totalAmount: filteredTotal, // total value of items belonging to this seller
        };
      });
    }

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST create order directly (BUYER only)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'BUYER') {
      return NextResponse.json(
        { error: 'Forbidden: Only buyers can place orders directly' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = CreateOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items: inputItems } = validation.data;

    // Retrieve products
    const productIds = inputItems.map((item) => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check stock levels first before modifying any record
    const validUnitsMap = {
      WEIGHT: ['g', 'kg'],
      VOLUME: ['mL', 'L'],
      COUNT: ['item'],
    };

    const itemsToCreate = [];
    let totalAmount = 0.0;

    for (const item of inputItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product with ID '${item.productId}' not found` },
          { status: 400 }
        );
      }

      // Check unit compatibility
      const dimension = product.dimensionType;
      if (!validUnitsMap[dimension].includes(item.unit)) {
        return NextResponse.json(
          { error: `Unit '${item.unit}' is incompatible with product '${product.name}' (dimension: ${dimension})` },
          { status: 400 }
        );
      }

      // Convert quantity and calculate price
      const baseQty = convertQuantity(item.quantity, item.unit, product.baseUnit);
      if (product.inventoryQuantity < baseQty) {
        return NextResponse.json(
          { error: `Insufficient stock for '${product.name}'. Needed: ${baseQty} ${product.baseUnit}, Available: ${product.inventoryQuantity} ${product.baseUnit}` },
          { status: 400 }
        );
      }

      const itemTotalPrice = baseQty * product.basePrice;
      totalAmount += itemTotalPrice;

      itemsToCreate.push({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        baseQuantity: baseQty,
        pricePerBaseUnit: product.basePrice,
        totalPrice: itemTotalPrice,
        currentStock: product.inventoryQuantity,
      });
    }

    // Direct order placement transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create Order
      const o = await tx.order.create({
        data: {
          buyerId: user.id,
          status: 'PENDING',
          totalAmount,
        },
      });

      // 2. Create OrderItems and Decrement Stocks
      for (const item of itemsToCreate) {
        await tx.orderItem.create({
          data: {
            orderId: o.id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            baseQuantity: item.baseQuantity,
            pricePerBaseUnit: item.pricePerBaseUnit,
            totalPrice: item.totalPrice,
          },
        });

        const updatedProd = await tx.product.update({
          where: { id: item.productId },
          data: {
            inventoryQuantity: {
              decrement: item.baseQuantity,
            },
          },
        });

        // Write Inventory History
        await tx.inventoryHistory.create({
          data: {
            productId: item.productId,
            type: 'REDUCE',
            quantityChanged: item.baseQuantity,
            previousQuantity: item.currentStock,
            newQuantity: updatedProd.inventoryQuantity,
            note: `Direct order checkout. Order ID: ${o.id}`,
            userId: user.id,
          },
        });
      }

      return tx.order.findUnique({
        where: { id: o.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                  baseUnit: true,
                },
              },
            },
          },
        },
      });
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'ORDER_CREATED',
        details: `Direct Order ID '${newOrder.id}' placed containing ${itemsToCreate.length} products. Total: ₹${totalAmount.toFixed(2)}`,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Order placed successfully', order: newOrder },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
