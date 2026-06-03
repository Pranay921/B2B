/**
 * PRODUCT DETAILS API ENDPOINT (PUT /api/products/:id, DELETE /api/products/:id)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. PUT /api/products/p81d1a...
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "name": "Organic Sugar - Premium",
 *   "basePrice": 0.07,
 *   "inventoryQuantity": 60000.0, // stock increase from 50000.0
 *   "note": "Restocking sugar supplies" // optional log note
 * }
 * 
 * 2. DELETE /api/products/p81d1a...
 * Cookie: session_token=<token>
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. PUT Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Product updated successfully",
 *   "product": { ... }
 * }
 * 
 * 2. DELETE Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "message": "Product deleted successfully"
 * }
 * 
 * VALIDATION RULES:
 * - PUT: validation based on fields provided. Checks price, sku, stock bounds.
 * 
 * AUTHORIZATION RULES:
 * - Restricted to ADMIN role, or the SELLER who originally created the product.
 * 
 * DATABASE OPERATIONS:
 * - prisma.product.findUnique({ where: { id } })
 * - prisma.product.update({ where: { id }, data: { ... } })
 * - prisma.inventoryHistory.create({ data: { ... } }) if stock levels change
 * - prisma.product.delete({ where: { id } })
 * 
 * INTERVIEW EXPLANATION:
 * The detail route verifies ownership before editing or deleting resources. It loads the 
 * existing product and checks if the logged-in user is an ADMIN, or a SELLER whose user ID 
 * matches the product's `sellerId`.
 * When inventory is updated, the route calculates the difference (`newStock - currentStock`), 
 * updates the product record, and creates an `InventoryHistory` entry tracking if it was an 
 * `ADD`, `REDUCE`, or `UPDATE` operation, complete with an auditor comment.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

// Helper to check user authority on a product
async function getAuthorizedProduct(productId, user) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return { error: 'Product not found', status: 404 };

  if (user.role !== 'ADMIN' && product.sellerId !== user.id) {
    return { error: 'Forbidden: You do not own this product', status: 403 };
  }

  return { product };
}

// PUT /api/products/:id
export async function PUT(request, { params }) {
  try {
    const id = (await params).id;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product, error, status } = await getAuthorizedProduct(id, user);
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const body = await request.json();
    const { name, description, category, basePrice, inventoryQuantity, sku, note } = body;

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (category !== undefined) dataToUpdate.category = category;
    if (basePrice !== undefined) {
      if (basePrice <= 0) {
        return NextResponse.json({ error: 'Price must be positive' }, { status: 400 });
      }
      dataToUpdate.basePrice = basePrice;
    }
    if (sku !== undefined) {
      // Check SKU unique
      const duplicateSku = await prisma.product.findFirst({
        where: { sku, id: { not: id } },
      });
      if (duplicateSku) {
        return NextResponse.json({ error: `SKU '${sku}' is taken.` }, { status: 400 });
      }
      dataToUpdate.sku = sku;
    }

    let updatedProduct;

    // Handle inventory update separately to write logs
    if (inventoryQuantity !== undefined) {
      const parsedStock = parseFloat(inventoryQuantity);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json({ error: 'Stock cannot be negative' }, { status: 400 });
      }

      const diff = parsedStock - product.inventoryQuantity;
      dataToUpdate.inventoryQuantity = parsedStock;

      // Update in transaction to guarantee consistency
      updatedProduct = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.update({
          where: { id },
          data: dataToUpdate,
        });

        if (diff !== 0) {
          const type = diff > 0 ? 'ADD' : 'REDUCE';
          await tx.inventoryHistory.create({
            data: {
              productId: id,
              type,
              quantityChanged: Math.abs(diff),
              previousQuantity: product.inventoryQuantity,
              newQuantity: parsedStock,
              note: note || `Stock level updated from ${product.inventoryQuantity} to ${parsedStock}`,
              userId: user.id,
            },
          });
        }

        return prod;
      });
    } else {
      updatedProduct = await prisma.product.update({
        where: { id },
        data: dataToUpdate,
      });
    }

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PRODUCT_UPDATED',
        details: `Product '${product.name}' (SKU: ${product.sku}) updated.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/:id
export async function DELETE(request, { params }) {
  try {
    const id = (await params).id;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product, error, status } = await getAuthorizedProduct(id, user);
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    await prisma.product.delete({
      where: { id },
    });

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PRODUCT_DELETED',
        details: `Product '${product.name}' (SKU: ${product.sku}) deleted.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
