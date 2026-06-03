'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { 
  ShoppingBag, FileText, ShoppingCart, 
  Search, RefreshCw, Plus, Minus, Trash2, 
  CheckCircle, ArrowRight, Eye 
} from 'lucide-react';
import { formatINR } from '@/lib/unitConversion';

export default function BuyerDashboard() {
  const router = useRouter();
  const { addToast } = useToast();

  // Authentication & Navigation
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Buyer Data States
  const [productsList, setProductsList] = useState([]);
  const [quotationsList, setQuotationsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  // Catalog Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Interactive RFQ / Order Builder Basket
  const [basket, setBasket] = useState([]); // Array of { product, quantity, unit }

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
  const fetchProducts = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (searchQuery) q.append('search', searchQuery);
      if (categoryFilter) q.append('category', categoryFilter);
      if (dimensionFilter) q.append('dimensionType', dimensionFilter);
      if (minPrice) q.append('minPrice', minPrice);
      if (maxPrice) q.append('maxPrice', maxPrice);
      if (onlyInStock) q.append('inStock', 'true');
      q.append('sortBy', sortBy);

      const res = await fetch(`/api/products?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProductsList(data.products);
      }
    } catch (e) {
      console.error('Error loading products', e);
    }
  }, [searchQuery, categoryFilter, dimensionFilter, minPrice, maxPrice, onlyInStock, sortBy]);

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

  const loadAllDashboardData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchProducts(),
      fetchQuotations(),
      fetchOrders(),
    ]);
    setLoading(false);
  }, [fetchProducts, fetchQuotations, fetchOrders]);

  useEffect(() => {
    if (currentUser) {
      loadAllDashboardData();
    }
  }, [currentUser, loadAllDashboardData]);

  // Refetch products on catalog search/filters change
  useEffect(() => {
    if (currentUser && activeTab === 'catalog') {
      fetchProducts();
    }
  }, [currentUser, activeTab, fetchProducts]);

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

  // Basket Management
  const addToBasket = (product) => {
    // Default unit corresponds to product dimension type
    const defaultUnit = product.baseUnit;

    const existing = basket.find((item) => item.product.id === product.id);
    if (existing) {
      addToast(`'${product.name}' is already in your RFQ basket.`, 'info');
      return;
    }

    setBasket([...basket, { product, quantity: 1, unit: defaultUnit }]);
    addToast(`Added '${product.name}' to RFQ/Order builder`, 'success');
  };

  const removeFromBasket = (productId) => {
    setBasket(basket.filter((item) => item.product.id !== productId));
  };

  const updateBasketItemQty = (productId, qty) => {
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) return;
    setBasket(
      basket.map((item) => 
        item.product.id === productId ? { ...item, quantity: parsed } : item
      )
    );
  };

  const updateBasketItemUnit = (productId, newUnit) => {
    setBasket(
      basket.map((item) => 
        item.product.id === productId ? { ...item, unit: newUnit } : item
      )
    );
  };

  // Unit Price Calculator (Live math on frontend)
  const getLiveItemPrice = (qty, unit, baseUnit, basePrice) => {
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) return 0;
    
    let baseQty = q;
    if (unit === 'kg' && baseUnit === 'g') baseQty = q * 1000;
    else if (unit === 'g' && baseUnit === 'kg') baseQty = q / 1000;
    else if (unit === 'L' && baseUnit === 'mL') baseQty = q * 1000;
    else if (unit === 'mL' && baseUnit === 'L') baseQty = q / 1000;
    
    return baseQty * parseFloat(basePrice);
  };

  // Cumulative Total of entire basket
  const getBasketTotal = () => {
    return basket.reduce((sum, item) => {
      const price = getLiveItemPrice(item.quantity, item.unit, item.product.baseUnit, item.product.basePrice);
      return sum + price;
    }, 0);
  };

  // Submit Quotation Request
  const handleSubmitQuotation = async () => {
    if (basket.length === 0) {
      addToast('Your basket is empty', 'warning');
      return;
    }

    const payload = {
      items: basket.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Quotation request submitted successfully!', 'success');
        setBasket([]); // clear basket
        setActiveTab('quotations');
        fetchQuotations();
      } else {
        addToast(data.error || 'Failed to submit quotation', 'error');
      }
    } catch (e) {
      addToast('Server connection error', 'error');
    }
  };

  // Submit Direct Order
  const handlePlaceDirectOrder = async () => {
    if (basket.length === 0) {
      addToast('Your basket is empty', 'warning');
      return;
    }

    // Verify stock availability on client side before placing order
    for (const item of basket) {
      let baseQty = item.quantity;
      if (item.unit === 'kg' && item.product.baseUnit === 'g') baseQty = item.quantity * 1000;
      else if (item.unit === 'g' && item.product.baseUnit === 'kg') baseQty = item.quantity / 1000;
      else if (item.unit === 'L' && item.product.baseUnit === 'mL') baseQty = item.quantity * 1000;
      else if (item.unit === 'mL' && item.product.baseUnit === 'L') baseQty = item.quantity / 1000;

      if (item.product.inventoryQuantity < baseQty) {
        addToast(`Insufficient stock for '${item.product.name}'. Available: ${item.product.inventoryQuantity} ${item.product.baseUnit}`, 'error');
        return;
      }
    }

    const payload = {
      items: basket.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unit: item.unit,
      })),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Direct order placed successfully! Stocks allocated.', 'success');
        setBasket([]);
        setActiveTab('orders');
        fetchOrders();
      } else {
        addToast(data.error || 'Failed to place order', 'error');
      }
    } catch (e) {
      addToast('Server connection error', 'error');
    }
  };

  // Convert approved quotation to order
  const handleConvertQuoteToOrder = async (quoteId) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONVERTED' }),
      });

      const d = await res.json();
      if (res.ok) {
        addToast('Quotation converted to Order successfully!', 'success');
        fetchQuotations();
        fetchOrders();
        setActiveTab('orders');
      } else {
        addToast(d.error || 'Failed to convert quotation to order', 'error');
      }
    } catch (err) {
      addToast('Server connection error', 'error');
    }
  };

  // Cancel order request (only if PENDING)
  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const d = await res.json();
      if (res.ok) {
        addToast('Order cancelled successfully. Stock levels restored.', 'success');
        fetchOrders();
      } else {
        addToast(d.error || 'Failed to cancel order', 'error');
      }
    } catch (err) {
      addToast('Server connection error', 'error');
    }
  };

  // Select compatible units for a dimension
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
        role="BUYER" 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userName={currentUser?.name || 'Buyer Procurement'} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
        handleLogout={handleLogout} 
      />

      <div className="main-content">
        <Navbar activeTab={activeTab} setIsMobileOpen={setIsMobileOpen} />

        <div style={{ marginTop: '2rem' }}>
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Stat widgets */}
              <div className="grid-cols-3" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">My Active Quotations</span>
                    <FileText size={18} color="var(--accent-primary)" />
                  </div>
                  <div className="stat-value">
                    {quotationsList.filter(q => q.status === 'PENDING' || q.status === 'APPROVED').length}
                  </div>
                  <div className="stat-desc">Awaiting convert or seller reviews</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">My Placed Orders</span>
                    <ShoppingCart size={18} color="var(--info)" />
                  </div>
                  <div className="stat-value">
                    {ordersList.filter(o => o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length}
                  </div>
                  <div className="stat-desc">In transit or processing orders</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Total Procured Value</span>
                    <ShoppingCart size={18} color="var(--success)" />
                  </div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>
                    {formatINR(ordersList.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + o.totalAmount, 0))}
                  </div>
                  <div className="stat-desc">Gross expenditure from completed purchases</div>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="grid-cols-2">
                <div className="card">
                  <h3>Procurement Catalog</h3>
                  <p style={{ margin: '1rem 0 2rem 0' }}>Explore chemicals, solvents, weight batches, or lab packaging supplies available for direct procurement.</p>
                  <button onClick={() => setActiveTab('catalog')} className="btn btn-primary">
                    Open Catalog Browse <ArrowRight size={16} />
                  </button>
                </div>

                <div className="card">
                  <h3>Recent Purchase</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {ordersList.slice(0, 3).map((ord) => (
                      <div key={ord.id} className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Order #{ord.id.substring(0, 8)}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{formatINR(ord.totalAmount)}</span>
                          <br />
                          <span className={`badge badge-${ord.status.toLowerCase()}`} style={{ fontSize: '0.6rem', marginTop: '0.2rem' }}>{ord.status}</span>
                        </div>
                      </div>
                    ))}
                    {ordersList.length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No orders placed yet.</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT CATALOG & LIVE RFQ BUILDER */}
          {activeTab === 'catalog' && (
            <div className="grid-cols-3" style={{ alignItems: 'start' }}>
              {/* Product catalog panel */}
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3>Procurement Catalog</h3>
                  
                  {/* Sorting & Filters bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.85rem' }}
                        placeholder="Search product/SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <select
                      className="form-select"
                      style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {/* Extract unique categories */}
                      {Array.from(new Set(productsList.map(p => p.category))).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <select
                      className="form-select"
                      style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                      value={dimensionFilter}
                      onChange={(e) => setDimensionFilter(e.target.value)}
                    >
                      <option value="">All Dimensions</option>
                      <option value="WEIGHT">WEIGHT</option>
                      <option value="VOLUME">VOLUME</option>
                      <option value="COUNT">COUNT</option>
                    </select>

                    <select
                      className="form-select"
                      style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name_asc">Alphabetical A-Z</option>
                      <option value="price_asc">Price Low-High</option>
                      <option value="price_desc">Price High-Low</option>
                      <option value="newest">Newest first</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                  {productsList.length > 0 ? (
                    productsList.map((prod) => (
                      <div 
                        key={prod.id} 
                        style={{ 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '1.25rem',
                          backgroundColor: 'var(--bg-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          transition: 'transform var(--transition-fast), border-color var(--transition-fast)'
                        }}
                        className="catalog-item-card"
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                              {prod.category}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                              SKU: {prod.sku}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{prod.name}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {prod.description || 'No description provided.'}
                          </p>
                        </div>

                        <div>
                          <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Price per {prod.baseUnit}</span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--accent-primary)' }}>{formatINR(prod.basePrice)}</strong>
                          </div>

                          <div className="flex-between">
                            <span style={{ fontSize: '0.75rem', color: prod.inventoryQuantity === 0 ? 'var(--error)' : 'var(--text-secondary)' }}>
                              {prod.inventoryQuantity === 0 ? 'Out of stock' : `Stock: ${prod.inventoryQuantity} ${prod.baseUnit}`}
                            </span>
                            <button
                              onClick={() => addToBasket(prod)}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                              disabled={prod.inventoryQuantity === 0}
                            >
                              Add to RFQ
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                      No catalog products matches filters
                    </div>
                  )}
                </div>
              </div>

              {/* Live RFQ / Direct Order Builder basket */}
              <div className="card" style={{ position: 'sticky', top: '100px' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart size={20} color="var(--accent-primary)" />
                  RFQ / Order Builder
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Add products from catalog, toggle requested units, and verify live pricing before checkout.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                  {basket.length > 0 ? (
                    basket.map((item) => {
                      const itemTotalPrice = getLiveItemPrice(item.quantity, item.unit, item.product.baseUnit, item.product.basePrice);
                      return (
                        <div key={item.product.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div className="flex-between">
                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.product.name}</span>
                            <button 
                              onClick={() => removeFromBasket(item.product.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          
                          <div className="flex-between" style={{ gap: '0.5rem' }}>
                            {/* Quantity Input */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                                value={item.quantity}
                                onChange={(e) => updateBasketItemQty(item.product.id, e.target.value)}
                                min="0.01"
                                step="any"
                              />
                              <select
                                className="form-select"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                value={item.unit}
                                onChange={(e) => updateBasketItemUnit(item.product.id, e.target.value)}
                              >
                                {getUnitsForDimension(item.product.dimensionType).map((ut) => (
                                  <option key={ut} value={ut}>{ut}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Live calculations */}
                            <div style={{ textAlign: 'right', minWidth: '80px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {formatINR(itemTotalPrice)}
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                (Base: {item.product.baseUnit})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      RFQ Basket is empty. Add products from catalog.
                    </div>
                  )}
                </div>

                {basket.length > 0 && (
                  <div>
                    <div className="flex-between" style={{ marginBottom: '1.5rem', fontSize: '1.05rem', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <span>Estimated Total:</span>
                      <span style={{ color: 'var(--success)' }}>{formatINR(getBasketTotal())}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button onClick={handleSubmitQuotation} className="btn btn-secondary" style={{ width: '100%' }}>
                        Submit Quote Request (RFQ)
                      </button>
                      <button onClick={handlePlaceDirectOrder} className="btn btn-primary" style={{ width: '100%' }}>
                        Place Direct Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MY QUOTATIONS */}
          {activeTab === 'quotations' && (
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>My Quotations History</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Quote ID</th>
                      <th>Creation Date</th>
                      <th>Requested Items</th>
                      <th>Quoted Value</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationsList.length > 0 ? (
                      quotationsList.map((quote) => (
                        <tr key={quote.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{quote.id.substring(0, 8)}...</td>
                          <td>{new Date(quote.createdAt).toLocaleDateString()}</td>
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
                            {quote.status === 'APPROVED' && (
                              <button 
                                onClick={() => handleConvertQuoteToOrder(quote.id)}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'var(--success)' }}
                              >
                                Checkout to Order
                              </button>
                            )}
                            {quote.status === 'PENDING' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Awaiting review</span>
                            )}
                            {quote.status === 'CONVERTED' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Converted</span>
                            )}
                            {quote.status === 'REJECTED' && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Rejected</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No quotation logs. Request items in 'Browse Catalog'.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MY ORDERS */}
          {activeTab === 'orders' && (
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>My Orders History</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Placed Date</th>
                      <th>Items Purchased</th>
                      <th>Total Value</th>
                      <th>Order Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersList.length > 0 ? (
                      ordersList.map((order) => (
                        <tr key={order.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{order.id.substring(0, 8)}...</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
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
                          <td>
                            <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {order.status === 'PENDING' ? (
                              <button 
                                onClick={() => handleCancelOrder(order.id)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--error)', borderColor: 'var(--error)' }}
                              >
                                Cancel Order
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No actions</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No order history found</div>
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
    </div>
  );
}
