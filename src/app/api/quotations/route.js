/**
 * QUOTATIONS API ENDPOINT (GET /api/quotations, POST /api/quotations)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. GET /api/quotations
 * Cookie: session_token=<token>
 * 
 * 2. POST /api/quotations
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "items": [
 *     {
 *       "productId": "p81d1a...",
 *       "quantity": 2.5,
 *       "unit": "kg"
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
 *   "message": "Quotation submitted successfully",
 *   "quotation": {
 *     "id": "q12a9...",
 *     "buyerId": "buyer-uuid",
 *     "status": "PENDING",
 *     "totalAmount": 150.0,
 *     "items": [
 *       {
 *         "productId": "p81d1a...",
 *         "quantity": 2.5,
 *         "unit": "kg",
 *         "baseQuantity": 2500.0,
 *         "pricePerBaseUnit": 0.06,
 *         "totalPrice": 150.0
 *       }
 *     ]
 *   }
 * }
 * 
 * VALIDATION RULES (POST):
 * - items: array of objects, must have at least 1 item
 * - items[i].productId: string, required
 * - items[i].quantity: positive number, required
 * - items[i].unit: string, enum ["g", "kg", "mL", "L", "item"]
 * 
 * AUTHORIZATION RULES:
 * - GET: Restricted to logged-in users.
 *   - BUYER: returns their own quotations.
 *   - SELLER: returns quotations containing products they sell.
 *   - ADMIN: returns all quotations.
 * - POST: Restricted to BUYER role.
 * 
 * DATABASE OPERATIONS:
 * - prisma.product.findMany({ where: { id: { in: productIds } } }) to retrieve prices and units
 * - prisma.quotation.create({ data: { buyerId, totalAmount, items: { createMany } } }) inside transaction
 * - prisma.activityLog.create({ data: { ... } })
 * 
 * INTERVIEW EXPLANATION:
 * The quotations route handles transactions with precision math. For POST requests, 
 * it takes input items and fetches the actual product definitions. It validates that the 
 * requested unit matches the product's dimension type. It then applies the unit conversion 
 * utility to translate requested quantities (e.g. 2.5 kg) to the product's base unit 
 * (e.g. 2500 g) and calculates pricing based on the current base price. All of this runs 
 * inside a database transaction to maintain absolute data consistency.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { convertQuantity, calculatePrice } from '@/lib/unitConversion';

const AddQuoteItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.enum(['g', 'kg', 'mL', 'L', 'item']),
});

const CreateQuotationSchema = z.object({
  items: z.array(AddQuoteItemSchema).min(1, 'Quotation must have at least one product'),
});

// GET quotations based on role
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let quotations = [];

    if (user.role === 'ADMIN') {
      quotations = await prisma.quotation.findMany({
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
      quotations = await prisma.quotation.findMany({
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
      // Find quotations containing products belonging to this seller
      quotations = await prisma.quotation.findMany({
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

      // Filter each quotation's items so the seller only sees their own products (for privacy/clarity)
      quotations = quotations.map((q) => {
        const filteredItems = q.items.filter((item) => item.product.sellerId === user.id);
        const filteredTotal = filteredItems.reduce((sum, item) => sum + item.totalPrice, 0);
        return {
          ...q,
          items: filteredItems,
          totalAmount: filteredTotal, // total value of items belonging to this seller
        };
      });
    }

    return NextResponse.json({
      success: true,
      quotations,
    });
  } catch (error) {
    console.error('Fetch quotations error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST create quotation (BUYER only)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || user.role !== 'BUYER') {
      return NextResponse.json(
        { error: 'Forbidden: Only buyers can create quotations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = CreateQuotationSchema.safeParse(body);

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

    // Build quotation items with price conversion
    let totalAmount = 0.0;
    const itemsToCreate = [];

    // Valid units map to enforce compatibility
    const validUnitsMap = {
      WEIGHT: ['g', 'kg'],
      VOLUME: ['mL', 'L'],
      COUNT: ['item'],
    };

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

      // Calculate conversions
      const baseQty = convertQuantity(item.quantity, item.unit, product.baseUnit);
      const itemTotalPrice = baseQty * product.basePrice;
      totalAmount += itemTotalPrice;

      itemsToCreate.push({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        baseQuantity: baseQty,
        pricePerBaseUnit: product.basePrice,
        totalPrice: itemTotalPrice,
      });
    }

    // Save quotation inside database transaction
    const newQuotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          buyerId: user.id,
          status: 'PENDING',
          totalAmount,
        },
      });

      // Create items associated with this quotation
      await tx.quotationItem.createMany({
        data: itemsToCreate.map((it) => ({
          ...it,
          quotationId: q.id,
        })),
      });

      return tx.quotation.findUnique({
        where: { id: q.id },
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
        action: 'QUOTATION_SUBMITTED',
        details: `Quotation ID '${newQuotation.id}' submitted containing ${itemsToCreate.length} items. Total: ₹${totalAmount.toFixed(2)}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Quotation submitted successfully',
        quotation: newQuotation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create quotation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
