/**
 * PRODUCTS API ENDPOINT (GET /api/products, POST /api/products)
 * 
 * =========================================================================
 * REQUEST EXAMPLES:
 * 
 * 1. GET /api/products?search=Sugar&category=Groceries&sortBy=price_asc&inStock=true
 * 
 * 2. POST /api/products
 * Content-Type: application/json
 * Cookie: session_token=<token>
 * {
 *   "name": "Organic Sugar",
 *   "sku": "SUG-ORG-001",
 *   "description": "Premium quality raw brown sugar",
 *   "category": "Raw Material",
 *   "baseUnit": "g",
 *   "dimensionType": "WEIGHT",
 *   "inventoryQuantity": 50000.0,
 *   "basePrice": 0.06
 * }
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. GET Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "products": [
 *     {
 *       "id": "p81d1a...",
 *       "name": "Organic Sugar",
 *       "sku": "SUG-ORG-001",
 *       "category": "Raw Material",
 *       "baseUnit": "g",
 *       "dimensionType": "WEIGHT",
 *       "inventoryQuantity": 50000.0,
 *       "basePrice": 0.06,
 *       "seller": { "name": "Raj Traders" }
 *     }
 *   ]
 * }
 * 
 * 2. POST Response:
 * Status: 201 Created
 * {
 *   "success": true,
 *   "message": "Product created successfully",
 *   "product": { ... }
 * }
 * 
 * VALIDATION RULES (POST):
 * - name: string, required
 * - sku: string, unique, required
 * - category: string, required
 * - baseUnit: string, enum ["g", "kg", "mL", "L", "item"]
 * - dimensionType: enum ["WEIGHT", "VOLUME", "COUNT"]
 * - inventoryQuantity: non-negative number, required
 * - basePrice: positive number, required
 * 
 * AUTHORIZATION RULES:
 * - GET: Open to all authenticated users (BUYER, SELLER, ADMIN).
 * - POST: Restricted to ADMIN and SELLER roles.
 * 
 * DATABASE OPERATIONS:
 * - prisma.product.findMany({ where: filterConditions, orderBy: sortConditions, include: { seller: true } })
 * - prisma.product.create({ data: { ... } })
 * - prisma.inventoryHistory.create({ data: { ... } })
 * - prisma.activityLog.create({ data: { ... } })
 * 
 * INTERVIEW EXPLANATION:
 * The products endpoint allows rich listing and filtering. For GET, it constructs dynamic Prisma query conditions based on parameters like search terms (using SQL `contains` with case-insensitive matching), category checks, price boundaries, and stock availability. 
 * For POST, it enforces role validation (only ADMIN and SELLER can create products). A new product creation also initiates a record in both the `InventoryHistory` and `ActivityLog` tables for audit control.
 * =========================================================================
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth';

const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name is too short'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  description: z.string().optional().default(''),
  category: z.string().min(2, 'Category is too short'),
  baseUnit: z.enum(['g', 'kg', 'mL', 'L', 'item']),
  dimensionType: z.enum(['WEIGHT', 'VOLUME', 'COUNT']),
  inventoryQuantity: z.number().nonnegative('Stock cannot be negative'),
  basePrice: z.number().positive('Price must be greater than zero'),
});

// GET all products with filtering, searching, and sorting
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const dimensionType = searchParams.get('dimensionType');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStock = searchParams.get('inStock');
    const sellerId = searchParams.get('sellerId');
    const sortBy = searchParams.get('sortBy');

    const where = {};

    // Apply Search (Product Name, SKU, Description, Category, or Seller Name)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { seller: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Apply Filters
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (dimensionType) {
      where.dimensionType = dimensionType;
    }
    if (sellerId) {
      where.sellerId = sellerId;
    }
    if (inStock === 'true') {
      where.inventoryQuantity = { gt: 0 };
    }

    // Price filters (filters applied against the basePrice)
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = parseFloat(minPrice);
      if (maxPrice) where.basePrice.lte = parseFloat(maxPrice);
    }

    // Apply Sorting
    let orderBy = { createdAt: 'desc' }; // default: newest
    if (sortBy) {
      switch (sortBy) {
        case 'price_asc':
          orderBy = { basePrice: 'asc' };
          break;
        case 'price_desc':
          orderBy = { basePrice: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'name_asc':
          orderBy = { name: 'asc' };
          break;
        case 'name_desc':
          orderBy = { name: 'desc' };
          break;
      }
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST create product
export async function POST(request) {
  try {
    // Authenticate
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyJWT(token) : null;

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Only Sellers and Admins can create products' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = CreateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify dimension units compatibility
    const validUnitsMap = {
      WEIGHT: ['g', 'kg'],
      VOLUME: ['mL', 'L'],
      COUNT: ['item'],
    };
    if (!validUnitsMap[data.dimensionType].includes(data.baseUnit)) {
      return NextResponse.json(
        { error: `Invalid unit '${data.baseUnit}' for dimension type '${data.dimensionType}'` },
        { status: 400 }
      );
    }

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: `SKU '${data.sku}' already exists.` },
        { status: 400 }
      );
    }

    // Assign sellerId. Sellers can only create products for themselves.
    // Admins can create products, but they need to assign themselves (or we default to Admin's user ID).
    const sellerId = user.id;

    // Create product
    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        description: data.description,
        category: data.category,
        baseUnit: data.baseUnit,
        dimensionType: data.dimensionType,
        inventoryQuantity: data.inventoryQuantity,
        basePrice: data.basePrice,
        sellerId,
      },
      include: {
        seller: {
          select: {
            name: true,
          },
        },
      },
    });

    // Write initial inventory history if quantity > 0
    if (data.inventoryQuantity > 0) {
      await prisma.inventoryHistory.create({
        data: {
          productId: product.id,
          type: 'ADD',
          quantityChanged: data.inventoryQuantity,
          previousQuantity: 0.0,
          newQuantity: data.inventoryQuantity,
          note: 'Initial product inventory setup',
          userId: user.id,
        },
      });
    }

    // Write activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PRODUCT_CREATED',
        details: `Product '${data.name}' (SKU: ${data.sku}) created with base price ₹${data.basePrice}/${data.baseUnit}`,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Product created successfully', product },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
