'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { 
  ShoppingBag, Warehouse, FileText, ShoppingCart, 
  TrendingUp, Plus, Search, Edit2, Trash2, Ban, 
  CheckCircle2, RefreshCw, X, AlertTriangle 
} from 'lucide-react';
import { formatINR, convertQuantity } from '@/lib/unitConversion';

export default function SellerDashboard() {
  const router = useRouter();
  const { addToast } = useToast();

  // Authentication & Navigation
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Seller Data States
  const [reportData, setReportData] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [quotationsList, setQuotationsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  // Search & Filter States
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productSortBy, setProductSortBy] = useState('newest');

  // Modals States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form Fields
  // Product Form
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodDimension, setProdDimension] = useState('WEIGHT');
  const [prodBaseUnit, setProdBaseUnit] = useState('g');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodStock, setProdStock] = useState(0);

  // Stock Update Form
  const [stockChangeQty, setStockChangeQty] = useState(0);
  const [stockChangeUnit, setStockChangeUnit] = useState('');
  const [stockActionType, setStockActionType] = useState('ADD'); // ADD or REDUCE
  const [stockNote, setStockNote] = useState('');

  // 1. Fetch Auth details
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        console.error(err);
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // 2. Data loader functions
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error('Error fetching reports', e);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      q.append('sellerId', currentUser.id);
      if (productSearch) q.append('search', productSearch);
      if (productCategoryFilter) q.append('category', productCategoryFilter);
      if (productSortBy) q.append('sortBy', productSortBy);

      const res = await fetch(`/api/products?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProductsList(data.products);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, productSearch, productCategoryFilter, productSortBy]);

  const fetchQuotations = useCallback(async () => {
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) {
        const data = await res.json();
        setQuotationsList(data.quotations);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data.orders);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchInventoryLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/history');
      if (res.ok) {
        const data = await res.json();
        setInventoryLogs(data.history);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadAllDashboardData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchReports(),
      fetchProducts(),
      fetchQuotations(),
      fetchOrders(),
    ]);
    setLoading(false);
  }, [fetchReports, fetchProducts, fetchQuotations, fetchOrders]);

  useEffect(() => {
    if (currentUser) {
      loadAllDashboardData();
    }
  }, [currentUser, loadAllDashboardData]);

  // Refetch logs when activeTab === 'inventory'
  useEffect(() => {
    if (currentUser && activeTab === 'inventory') {
      fetchInventoryLogs();
    }
  }, [currentUser, activeTab, fetchInventoryLogs]);

  // Refetch products on search/filter changes
  useEffect(() => {
    if (currentUser) fetchProducts();
  }, [currentUser, fetchProducts]);

  // 3. Action Handlers
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        addToast('Logged out successfully', 'success');
        router.push('/login');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Product Actions
  const openCreateProduct = () => {
    setSelectedProduct(null);
    setProdName('');
    setProdSku('');
    setProdDesc('');
    setProdCategory('');
    setProdDimension('WEIGHT');
    setProdBaseUnit('g');
    setProdPrice(0);
    setProdStock(0);
    setProductModalOpen(true);
  };

  const openEditProduct = (prod) => {
    setSelectedProduct(prod);
    setProdName(prod.name);
    setProdSku(prod.sku);
    setProdDesc(prod.description || '');
    setProdCategory(prod.category);
    setProdDimension(prod.dimensionType);
    setProdBaseUnit(prod.baseUnit);
    setProdPrice(prod.basePrice);
    setProdStock(prod.inventoryQuantity);
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: prodName,
      sku: prodSku,
      description: prodDesc,
      category: prodCategory,
      dimensionType: prodDimension,
      baseUnit: prodBaseUnit,
      basePrice: parseFloat(prodPrice),
      inventoryQuantity: parseFloat(prodStock),
    };

    const isEdit = !!selectedProduct;
    const url = isEdit ? `/api/products/${selectedProduct.id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        addToast(`Product ${isEdit ? 'updated' : 'created'} successfully`, 'success');
        setProductModalOpen(false);
        fetchProducts();
        fetchReports();
      } else {
        addToast(data.error || 'Product submission failed', 'error');
      }
    } catch (err) {
      addToast('Server connection error', 'error');
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${prodId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Product deleted successfully', 'success');
        fetchProducts();
        fetchReports();
      } else {
        const d = await res.json();
        addToast(d.error || 'Failed to delete product', 'error');
      }
    } catch (err) {
      addToast('Server connection error', 'error');
    }
  };

  // Stock Actions
  const openStockUpdate = (prod) => {
    setSelectedProduct(prod);
    setStockChangeQty(0);
    setStockChangeUnit(prod.baseUnit);
    setStockActionType('ADD');
    setStockNote('');
    setStockModalOpen(true);
  };

  const handleStockUpdateSubmit = async (e) => {
    e.preventDefault();
    if (stockChangeQty <= 0) {
      addToast('Quantity must be positive', 'warning');
      return;
    }

    let quantityInBase;
    try {
      quantityInBase = convertQuantity(stockChangeQty, stockChangeUnit, selectedProduct.baseUnit);
    } catch (err) {
      addToast(err.message, 'error');
      return;
    }

    const currentStock = selectedProduct.inventoryQuantity;
    const change = stockActionType === 'ADD' ? quantityInBase : -quantityInBase;
    const finalStock = currentStock + change;

    if (finalStock < 0) {
      addToast(`Cannot reduce stock below zero. Current stock is ${currentStock} ${selectedProduct.baseUnit}.`, 'error');
      return;
    }

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryQuantity: finalStock,
          note: stockNote || `${stockActionType}ed ${stockChangeQty} ${stockChangeUnit} of product.`,
        }),
      });

      if (res.ok) {
        addToast('Product stock level updated successfully', 'success');
        setStockModalOpen(false);
        fetchProducts();
        fetchReports();
        fetchInventoryLogs();
      } else {
        const d = await res.json();
        addToast(d.error || 'Failed to update stock', 'error');
      }
    } catch (err) {
      addToast('Server communication error', 'error');
    }
  };

  // Quotation Actions
  const handleQuotationStatus = async (quoteId, status) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const d = await res.json();
      if (res.ok) {
        addToast(`Quotation ${status.toLowerCase()} successfully`, 'success');
        fetchQuotations();
        fetchReports();
        fetchOrders();
      } else {
        addToast(d.error || 'Failed to update quotation status', 'error');
      }
    } catch (err) {
      addToast('Server connection error', 'error');
    }
  };

  // Order Actions
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const d = await res.json();
      if (res.ok) {
        addToast(`Order status updated to ${newStatus}`, 'success');
        fetchOrders();
        fetchReports();
      } else {
        addToast(d.error || 'Failed to update order status', 'error');
      }
    } catch (err) {
      addToast('Server connection error', 'error');
    }
  };

  const getUnitsForDimension = (dim) => {
    if (dim === 'WEIGHT') return ['g', 'kg'];
    if (dim === 'VOLUME') return ['mL', 'L'];
    return ['item'];
  };

  if (loading && !currentUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        role="SELLER" 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userName={currentUser?.name || 'Seller User'} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
        handleLogout={handleLogout} 
      />

      <div className="main-content">
        <Navbar activeTab={activeTab} setIsMobileOpen={setIsMobileOpen} />

        <div style={{ marginTop: '2rem' }}>
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Stats widgets */}
              <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Products Active</span>
                    <ShoppingBag size={18} color="var(--accent-primary)" />
                  </div>
                  <div className="stat-value">{reportData?.metrics.productsCount || 0}</div>
                  <div className="stat-desc">Your registered catalog lines</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Total Stock Units</span>
                    <Warehouse size={18} color="var(--accent-secondary)" />
                  </div>
                  <div className="stat-value">{reportData?.metrics.inventoryCount || 0}</div>
                  <div className="stat-desc">Summed stock of all SKUs</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Incoming Orders</span>
                    <ShoppingCart size={18} color="var(--info)" />
                  </div>
                  <div className="stat-value">{reportData?.metrics.ordersCount || 0}</div>
                  <div className="stat-desc">Total order batches received</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Gross Revenue</span>
                    <TrendingUp size={18} color="var(--success)" />
                  </div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>
                    {formatINR(reportData?.metrics.revenueGenerated || 0)}
                  </div>
                  <div className="stat-desc">Total sales from active orders</div>
                </div>
              </div>

              <div className="grid-cols-3" style={{ alignItems: 'start' }}>
                {/* Low Stock Warning Card */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                      <AlertTriangle size={20} />
                      Low Stock Warning System
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reportData?.lowStockAlerts && reportData.lowStockAlerts.length > 0 ? (
                      reportData.lowStockAlerts.map((prod) => (
                        <div 
                          key={prod.id} 
                          className="flex-between"
                          style={{
                            padding: '1rem',
                            backgroundColor: 'var(--warning-bg)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid hsla(45, 93%, 47%, 0.2)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--warning)' }}>{prod.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>SKU: {prod.sku}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              {prod.inventoryQuantity} {prod.baseUnit}
                            </div>
                            <button 
                              onClick={() => openStockUpdate(prod)} 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--accent-primary)', 
                                fontWeight: 700, 
                                fontSize: '0.75rem', 
                                cursor: 'pointer',
                                marginTop: '0.2rem' 
                              }}
                            >
                              Restock SKU
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state" style={{ padding: '2rem' }}>
                        All products are sufficiently stocked.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions panel */}
                <div className="card">
                  <h3 style={{ marginBottom: '1.25rem' }}>Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button onClick={openCreateProduct} className="btn btn-primary" style={{ width: '100%' }}>
                      <Plus size={16} /> Add New SKU Product
                    </button>
                    <button onClick={() => setActiveTab('inventory')} className="btn btn-secondary" style={{ width: '100%' }}>
                      Audit Stock levels
                    </button>
                    <button onClick={loadAllDashboardData} className="btn btn-secondary" style={{ width: '100%' }}>
                      Sync Dashboard Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE PRODUCTS */}
          {activeTab === 'products' && (
            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3>Own Product Listings ({productsList.length})</h3>
                
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.85rem' }}
                      placeholder="Search name/SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ fontSize: '0.85rem' }}
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {Array.from(new Set(productsList.map((p) => p.category))).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    className="form-select"
                    style={{ fontSize: '0.85rem' }}
                    value={productSortBy}
                    onChange={(e) => setProductSortBy(e.target.value)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="price_asc">Price Low-High</option>
                    <option value="price_desc">Price High-Low</option>
                    <option value="name_asc">A - Z</option>
                  </select>

                  <button onClick={openCreateProduct} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <Plus size={16} /> New Product
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Stock Quantity</th>
                      <th>Base Price (INR)</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.length > 0 ? (
                      productsList.map((prod) => (
                        <tr key={prod.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{prod.sku}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{prod.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prod.description || 'No description'}</div>
                          </td>
                          <td>{prod.category}</td>
                          <td style={{ fontWeight: 600 }}>
                            {prod.inventoryQuantity} {prod.baseUnit}
                          </td>
                          <td>{formatINR(prod.basePrice)} / {prod.baseUnit}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => openEditProduct(prod)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="btn btn-danger"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No products registered yet. Click 'New Product' to add.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & STOCK */}
          {activeTab === 'inventory' && (
            <div className="grid-cols-3" style={{ alignItems: 'start' }}>
              {/* Product Stock list */}
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Inventory Stock & Prices</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product SKU</th>
                        <th>Base Price</th>
                        <th>Current Stock</th>
                        <th style={{ textAlign: 'right' }}>Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList.length > 0 ? (
                        productsList.map((prod) => (
                          <tr key={prod.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{prod.name}</div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SKU: {prod.sku}</span>
                            </td>
                            <td>{formatINR(prod.basePrice)} / {prod.baseUnit}</td>
                            <td style={{ fontWeight: 700, color: prod.inventoryQuantity === 0 ? 'var(--error)' : 'var(--text-primary)' }}>
                              {prod.inventoryQuantity} {prod.baseUnit}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={() => openStockUpdate(prod)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                Adjust Stock
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center' }}>No products registered</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* History logs card */}
              <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Stock History Logs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
                  {inventoryLogs && inventoryLogs.length > 0 ? (
                    inventoryLogs.map((log) => (
                      <div key={log.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', gap: '0.25rem' }}>
                        <div className="flex-between">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                          <span className={`badge badge-${log.type.toLowerCase()}`}>
                            {log.type === 'ADD' ? `+${log.quantityChanged}` : `-${log.quantityChanged}`}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.product?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.note || 'No notes'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No stock update history logs found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEW QUOTATIONS */}
          {activeTab === 'quotations' && (
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Quotations Received containing your products</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Quote ID</th>
                      <th>Buyer</th>
                      <th>Quote Items (Yours Only)</th>
                      <th>Your Quote Value</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationsList.length > 0 ? (
                      quotationsList.map((quote) => (
                        <tr key={quote.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{quote.id.substring(0, 8)}...</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{quote.buyer?.name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{quote.buyer?.email}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {quote.items.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.8rem' }}>
                                  • {item.product?.name} ({item.quantity} {item.unit}) @ {formatINR(item.pricePerBaseUnit)}/{item.product?.baseUnit}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{formatINR(quote.totalAmount)}</td>
                          <td>
                            <span className={`badge badge-${quote.status.toLowerCase()}`}>{quote.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {quote.status === 'PENDING' ? (
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleQuotationStatus(quote.id, 'APPROVED')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleQuotationStatus(quote.id, 'REJECTED')}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--error)' }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {quote.status === 'CONVERTED' ? 'Converted to Order' : quote.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No quotations received containing your products</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DISPATCH ORDERS */}
          {activeTab === 'orders' && (
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Sales Orders Pipeline</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Buyer</th>
                      <th>Ordered Items (Yours Only)</th>
                      <th>Value of Items</th>
                      <th>Order Date</th>
                      <th>Order Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.length > 0 ? (
                      ordersList.map((order) => (
                        <tr key={order.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{order.id.substring(0, 8)}...</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{order.buyer?.name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.buyer?.email}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {order.items.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.8rem' }}>
                                  • {item.product?.name} ({item.quantity} {item.unit}) @ {formatINR(item.pricePerBaseUnit)}/{item.product?.baseUnit}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{formatINR(order.totalAmount)}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td>
                            <select
                              value={order.status}
                              onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                              className={`form-select badge-${order.status.toLowerCase()}`}
                              style={{ 
                                fontSize: '0.75rem', 
                                padding: '0.25rem 0.5rem', 
                                border: 'none', 
                                outline: 'none', 
                                borderRadius: '50px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <option value="PENDING" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>PENDING</option>
                              <option value="APPROVED" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>APPROVED</option>
                              <option value="PROCESSING" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>PROCESSING</option>
                              <option value="SHIPPED" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>SHIPPED</option>
                              <option value="COMPLETED" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>COMPLETED</option>
                              <option value="CANCELLED" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)' }}>CANCELLED</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No orders registered</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CREATE/EDIT PRODUCT MODAL */}
      {productModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{selectedProduct ? 'Edit Product Parameters' : 'Supply New Product SKU'}</h3>
              <button onClick={() => setProductModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-input" value={prodName} onChange={(e) => setProdName(e.target.value)} required placeholder="e.g. Sodium Nitrate Grade A" />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">SKU Code</label>
                    <input type="text" className="form-input" value={prodSku} onChange={(e) => setProdSku(e.target.value)} required placeholder="e.g. SOD-NIT-01" disabled={!!selectedProduct} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input type="text" className="form-input" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} required placeholder="e.g. Fine Chemicals" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Provide specifications, purity grades, handling cautions..." />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Dimension Type</label>
                    <select 
                      className="form-select" 
                      value={prodDimension} 
                      onChange={(e) => {
                        const dim = e.target.value;
                        setProdDimension(dim);
                        if (dim === 'WEIGHT') setProdBaseUnit('g');
                        else if (dim === 'VOLUME') setProdBaseUnit('mL');
                        else setProdBaseUnit('item');
                      }}
                      disabled={!!selectedProduct}
                    >
                      <option value="WEIGHT">WEIGHT</option>
                      <option value="VOLUME">VOLUME</option>
                      <option value="COUNT">COUNT</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Base Storage Unit</label>
                    <select 
                      className="form-select" 
                      value={prodBaseUnit} 
                      onChange={(e) => setProdBaseUnit(e.target.value)}
                      disabled={!!selectedProduct}
                    >
                      {getUnitsForDimension(prodDimension).map((ut) => (
                        <option key={ut} value={ut}>{ut}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Base Price (INR per unit)</label>
                    <input type="number" step="0.0001" className="form-input" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required placeholder="e.g. 0.04" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity</label>
                    <input type="number" step="0.01" className="form-input" value={prodStock} onChange={(e) => setProdStock(e.target.value)} required placeholder="e.g. 20000" disabled={!!selectedProduct} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedProduct ? 'Save Changes' : 'Supply Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STOCK LEVEL MODAL */}
      {stockModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Stock Auditor: {selectedProduct?.name}</h3>
              <button onClick={() => setStockModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStockUpdateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                  <strong>Current Stock Level:</strong> {selectedProduct?.inventoryQuantity} {selectedProduct?.baseUnit}
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Transaction Type</label>
                    <select className="form-select" value={stockActionType} onChange={(e) => setStockActionType(e.target.value)}>
                      <option value="ADD">ADD Stock (Restock)</option>
                      <option value="REDUCE">REDUCE Stock (Outgoing)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Adjustment Quantity</label>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <input type="number" step="0.01" className="form-input" style={{ flex: 1 }} value={stockChangeQty} onChange={(e) => setStockChangeQty(e.target.value)} required placeholder="10" />
                      <select className="form-select" value={stockChangeUnit} onChange={(e) => setStockChangeUnit(e.target.value)}>
                        {getUnitsForDimension(selectedProduct?.dimensionType).map((ut) => (
                          <option key={ut} value={ut}>{ut}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Audit Notes (Optional)</label>
                  <input type="text" className="form-input" value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder="e.g. Batch #9 arrival" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStockModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
