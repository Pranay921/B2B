/**
 * REPORTS AND ANALYTICS API ENDPOINT (GET /api/reports)
 * 
 * =========================================================================
 * REQUEST EXAMPLE:
 * GET /api/reports
 * Cookie: session_token=<token>
 * 
 * RESPONSE EXAMPLES:
 * 
 * 1. ADMIN Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "role": "ADMIN",
 *   "metrics": {
 *     "totalUsers": 12,
 *     "totalBuyers": 8,
 *     "totalSellers": 3,
 *     "totalProducts": 45,
 *     "totalInventory": 150000.0,
 *     "totalQuotations": 23,
 *     "totalOrders": 15,
 *     "totalRevenue": 245000.5,
 *     "quotationConversionRate": 34.8
 *   },
 *   "recentActivities": [ ... ],
 *   "orderStatusAnalytics": { "PENDING": 3, "COMPLETED": 10, ... },
 *   "categoryDistribution": { "Chemicals": 20, "Packaging": 10, ... }
 * }
 * 
 * 2. SELLER Response:
 * Status: 200 OK
 * {
 *   "success": true,
 *   "role": "SELLER",
 *   "metrics": {
 *     "productsCount": 15,
 *     "inventoryCount": 42000.0,
 *     "ordersCount": 8,
 *     "revenueGenerated": 95400.0
 *   },
 *   "lowStockAlerts": [ ... ]
 * }
 * 
 * AUTHORIZATION RULES:
 * - Restricted to logged-in users with role ADMIN or SELLER.
 * 
 * DATABASE OPERATIONS:
 * - prisma.user.count()
 * - prisma.product.aggregate({ _sum: { inventoryQuantity } })
 * - prisma.order.findMany({ include: { items } })
 * - prisma.activityLog.findMany({ take: 10 })
 * - Groupings and aggregates over categories and statuses.
 * 
 * INTERVIEW EXPLANATION:
 * The reports route compiles system-wide metrics. It detects the user's role 
 * and executes targeted Prisma query chains. For Admins, it queries global counts, logs, 
 * order statuses, and category metrics to populate dashboard widgets and visual graph sheets. 
 * For Sellers, it narrows queries to products where `sellerId === user.id` to calculate 
 * individual stock quantities, sales receipts, and low stock items.
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
      return NextResponse.json({ error: 'Forbidden: Unauthorized access' }, { status: 403 });
    }

    if (user.role === 'ADMIN') {
      // Global metrics
      const totalUsers = await prisma.user.count();
      const totalBuyers = await prisma.user.count({ where: { role: 'BUYER' } });
      const totalSellers = await prisma.user.count({ where: { role: 'SELLER' } });
      const totalProducts = await prisma.product.count();
      
      const inventorySum = await prisma.product.aggregate({
        _sum: {
          inventoryQuantity: true,
        },
      });
      const totalInventory = inventorySum._sum.inventoryQuantity || 0;

      const totalQuotations = await prisma.quotation.count();
      const totalOrders = await prisma.order.count();

      // Calculate revenue (COMPLETED, SHIPPED, PROCESSING, APPROVED)
      const revenueOrders = await prisma.order.findMany({
        where: {
          status: {
            in: ['APPROVED', 'PROCESSING', 'SHIPPED', 'COMPLETED'],
          },
        },
        select: {
          totalAmount: true,
        },
      });
      const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.totalAmount, 0.0);

      // Recent activities
      const recentActivities = await prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      });

      // Order status counts
      const orders = await prisma.order.findMany({
        select: { status: true },
      });
      const orderStatusAnalytics = {
        PENDING: 0,
        APPROVED: 0,
        PROCESSING: 0,
        SHIPPED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      };
      orders.forEach((o) => {
        if (orderStatusAnalytics[o.status] !== undefined) {
          orderStatusAnalytics[o.status]++;
        }
      });

      // Quotations converted rate
      const quotes = await prisma.quotation.findMany({
        select: { status: true },
      });
      const quotationStatusAnalytics = {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        CONVERTED: 0,
      };
      quotes.forEach((q) => {
        if (quotationStatusAnalytics[q.status] !== undefined) {
          quotationStatusAnalytics[q.status]++;
        }
      });
      const totalQuotesCount = quotes.length;
      const convertedQuotesCount = quotationStatusAnalytics.CONVERTED;
      const quotationConversionRate = totalQuotesCount > 0 
        ? Math.round((convertedQuotesCount / totalQuotesCount) * 100 * 10) / 10 
        : 0.0;

      // Category distribution
      const products = await prisma.product.findMany({
        select: { category: true },
      });
      const categoryDistribution = {};
      products.forEach((p) => {
        const cat = p.category || 'Uncategorized';
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
      });

      // Top selling products based on order items
      const orderItems = await prisma.orderItem.findMany({
        include: {
          product: {
            select: { name: true, sku: true },
          },
        },
      });

      const productSales = {};
      orderItems.forEach((item) => {
        if (!item.product) return;
        const name = item.product.name;
        if (!productSales[name]) {
          productSales[name] = { name, sku: item.product.sku, sales: 0, revenue: 0 };
        }
        productSales[name].sales += item.baseQuantity;
        productSales[name].revenue += item.totalPrice;
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return NextResponse.json({
        success: true,
        role: 'ADMIN',
        metrics: {
          totalUsers,
          totalBuyers,
          totalSellers,
          totalProducts,
          totalInventory,
          totalQuotations,
          totalOrders,
          totalRevenue,
          quotationConversionRate,
        },
        recentActivities,
        orderStatusAnalytics,
        categoryDistribution,
        topProducts,
      });
    }

    if (user.role === 'SELLER') {
      // Seller-specific metrics
      const productsCount = await prisma.product.count({
        where: { sellerId: user.id },
      });

      const inventorySum = await prisma.product.aggregate({
        where: { sellerId: user.id },
        _sum: {
          inventoryQuantity: true,
        },
      });
      const inventoryCount = inventorySum._sum.inventoryQuantity || 0;

      // Find all order items belonging to this seller's products
      const orderItems = await prisma.orderItem.findMany({
        where: {
          product: {
            sellerId: user.id,
          },
        },
        include: {
          order: true,
        },
      });

      // Calculate unique orders count and total revenue generated for seller
      const uniqueOrderIds = new Set(orderItems.map((item) => item.orderId));
      const ordersCount = uniqueOrderIds.size;
      const revenueGenerated = orderItems
        .filter((item) => ['APPROVED', 'PROCESSING', 'SHIPPED', 'COMPLETED'].includes(item.order.status))
        .reduce((sum, item) => sum + item.totalPrice, 0.0);

      // Low stock warnings (products owned by seller where quantity is low, say < 50 items or < 1000g/mL)
      // For general purposes, alerts show if stock level is less than 100 units
      const lowStockAlerts = await prisma.product.findMany({
        where: {
          sellerId: user.id,
          OR: [
            { dimensionType: 'WEIGHT', inventoryQuantity: { lte: 1000.0 } }, // 1000g (1kg)
            { dimensionType: 'VOLUME', inventoryQuantity: { lte: 1000.0 } }, // 1000mL (1L)
            { dimensionType: 'COUNT', inventoryQuantity: { lte: 20.0 } },     // 20 items
          ],
        },
        orderBy: { inventoryQuantity: 'asc' },
      });

      return NextResponse.json({
        success: true,
        role: 'SELLER',
        metrics: {
          productsCount,
          inventoryCount,
          ordersCount,
          revenueGenerated,
        },
        lowStockAlerts,
      });
    }
  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
