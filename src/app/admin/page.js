'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { 
  Users, ShoppingBag, Warehouse, FileText, ShoppingCart, 
  TrendingUp, Activity, Plus, Search, Edit2, Trash2, 
  ArrowUpDown, Ban, CheckCircle2, ChevronRight, RefreshCw, X 
} from 'lucide-react';
import { formatINR, convertQuantity } from '@/lib/unitConversion';

export default function AdminDashboard() {
  const router = useRouter();
  const { addToast } = useToast();

  // Authentication & Navigation
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dash Data States
  const [reportData, setReportData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [quotationsList, setQuotationsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productSortBy, setProductSortBy] = useState('newest');

  // Modals States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
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

  const fetchUsers = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (userSearch) q.append('search', userSearch);
      if (userRoleFilter) q.append('role', userRoleFilter);
      if (userStatusFilter) q.append('status', userStatusFilter);

      const res = await fetch(`/api/users?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users);
      }
    } catch (e) {
      console.error(e);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      const q = new URLSearchParams();
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
  }, [productSearch, productCategoryFilter, productSortBy]);

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
      // Create a specific endpoint or retrieve products with history. 
      // For simplicity, we can fetch all logs through a generic endpoint. Let's create a scratch fetch to retrieve history.
      const res = await fetch('/api/products'); // Products list contains history if implemented, or let's load all inventory levels.
      // Let's create an endpoint GET /api/inventory/history or pull logs from products. 
      // We will create the API route /api/inventory/history to fetch audit log.
      const logsRes = await fetch('/api/inventory/history');
      if (logsRes.ok) {
        const data = await logsRes.json();
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
      fetchUsers(),
      fetchProducts(),
      fetchQuotations(),
      fetchOrders(),
    ]);
    setLoading(false);
  }, [fetchReports, fetchUsers, fetchProducts, fetchQuotations, fetchOrders]);

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

  // Refetch users on search/filter changes
  useEffect(() => {
    if (currentUser) fetchUsers();
  }, [currentUser, fetchUsers]);

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

  // User Actions
  const handleToggleUserStatus = async (userItem) => {
    const newStatus = userItem.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/users/${userItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        addToast(`User account ${newStatus.toLowerCase()}d successfully`, 'success');
        fetchUsers();
        fetchReports();
      } else {
        const d = await res.json();
        addToast(d.error || 'Failed to update user', 'error');
      }
    } catch (err) {
      addToast('Error communicating with server', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This will remove all their items and records.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('User deleted successfully', 'success');
        fetchUsers();
        fetchReports();
      } else {
        const d = await res.json();
        addToast(d.error || 'Failed to delete user', 'error');
      }
    } catch (err) {
      addToast('Error communicating with server', 'error');
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

  // Inventory Management Actions
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

    // Convert changes to base units
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

  // Quotation Management Actions
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

  // Order Management Actions
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

  // Helper selectors for dimensional units
  const getUnitsForDimension = (dim) => {
    if (dim === 'WEIGHT') return ['g', 'kg'];
    if (dim === 'VOLUME') return ['mL', 'L'];
    return ['item'];
  };

  // Render Skeletons
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
        role="ADMIN" 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userName={currentUser?.name || 'Administrator'} 
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
              {/* Metric Row */}
              <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Total Users</span>
                    <Users size={18} color="var(--accent-primary)" />
                  </div>
                  <div className="stat-value">{reportData?.metrics.totalUsers || 0}</div>
                  <div className="stat-desc">
                    {reportData?.metrics.totalBuyers || 0} Buyers | {reportData?.metrics.totalSellers || 0} Sellers
                  </div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Catalogue Items</span>
                    <ShoppingBag size={18} color="var(--accent-secondary)" />
                  </div>
                  <div className="stat-value">{reportData?.metrics.totalProducts || 0}</div>
                  <div className="stat-desc">SKUs active in database</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Active Orders</span>
                    <ShoppingCart size={18} color="var(--info)" />
                  </div>
                  <div className="stat-value">{reportData?.metrics.totalOrders || 0}</div>
                  <div className="stat-desc">Quotation converted: {reportData?.metrics.quotationConversionRate || 0}%</div>
                </div>

                <div className="stat-card">
                  <div className="flex-between">
                    <span className="stat-label">Total Revenue</span>
                    <TrendingUp size={18} color="var(--success)" />
                  </div>
                  <div className="stat-value" style={{ color: 'var(--success)' }}>
                    {formatINR(reportData?.metrics.totalRevenue || 0)}
                  </div>
                  <div className="stat-desc">Calculated from approved orders</div>
                </div>
              </div>

              {/* Lower Section */}
              <div className="grid-cols-2">
                {/* Recent Activity Logs */}
                <div className="card">
                  <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={20} color="var(--accent-primary)" />
                      Recent Platform Activities
                    </h3>
                    <button onClick={loadAllDashboardData} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {reportData?.recentActivities && reportData.recentActivities.length > 0 ? (
                      reportData.recentActivities.map((act) => (
                        <div key={act.id} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '70px' }}>
                            {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{act.action}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{act.details}</div>
                          </div>
                          <div style={{ fontSize: '0.75rem', textAlign: 'right' }}>
                            <span style={{ fontWeight: 600 }}>{act.user?.name}</span>
                            <br />
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{act.user?.role}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No recent activities found</div>
                    )}
                  </div>
                </div>

                {/* Status distribution overview */}
                <div className="card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Order Pipeline Analytics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reportData?.orderStatusAnalytics ? (
                      Object.entries(reportData.orderStatusAnalytics).map(([status, count]) => {
                        const total = Object.values(reportData.orderStatusAnalytics).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={status}>
                            <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={`badge badge-${status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{status}</span>
                              </span>
                              <span style={{ color: 'var(--text-secondary)' }}>{count} Orders ({pct}%)</span>
                            </div>
                            <div style={{ background: 'var(--bg-tertiary)', height: '8px', borderRadius: '50px', overflow: 'hidden' }}>
                              <div style={{ 
                                background: status === 'COMPLETED' ? 'var(--success)' : status === 'CANCELLED' ? 'var(--error)' : 'var(--info)', 
                                width: `${pct}%`, 
                                height: '100%' 
                              }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state">No analytical data loaded</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3>Global User Base ({usersList.length})</h3>
                {/* Search & Filter Header */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.85rem', paddingY: '0.5rem' }}
                      placeholder="Search name/email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="BUYER">BUYER</option>
                    <option value="SELLER">SELLER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>

                  <select
                    className="form-select"
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Registered</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length > 0 ? (
                      usersList.map((userItem) => (
                        <tr key={userItem.id}>
                          <td style={{ fontWeight: 600 }}>{userItem.name}</td>
                          <td>{userItem.email}</td>
                          <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge badge-${userItem.role.toLowerCase()}`}>{userItem.role}</span>
                          </td>
                          <td>
                            <span className={`badge badge-${userItem.status.toLowerCase()}`}>{userItem.status}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleToggleUserStatus(userItem)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', color: userItem.status === 'ACTIVE' ? 'var(--error)' : 'var(--success)' }}
                                title={userItem.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                                disabled={userItem.id === currentUser?.id}
                              >
                                {userItem.status === 'ACTIVE' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="btn btn-danger"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                                title="Delete User Account"
                                disabled={userItem.id === currentUser?.id}
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
                          <div className="empty-state">No users match filters</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT & SKU MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3>Global SKU Registry ({productsList.length})</h3>
                
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.85rem' }}
                      placeholder="Search SKUs/name..."
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
                    {/* Unique categories */}
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
                      <th>Unit Type</th>
                      <th>Stock Quantity</th>
                      <th>Base Price (INR)</th>
                      <th>Supplier</th>
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
                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {prod.dimensionType} ({prod.baseUnit})
                            </span>
                          </td>
                          <td style={{ color: prod.inventoryQuantity <= (prod.baseUnit === 'kg' ? 10 : prod.baseUnit === 'g' ? 1000 : 20) ? 'var(--error)' : 'var(--text-primary)' }}>
                            {prod.inventoryQuantity} {prod.baseUnit}
                            {prod.inventoryQuantity <= (prod.baseUnit === 'kg' ? 10 : prod.baseUnit === 'g' ? 1000 : 20) && (
                              <span style={{ fontSize: '0.65rem', marginLeft: '0.5rem', color: 'var(--error)', textTransform: 'uppercase', fontWeight: 800 }}>Low Stock</span>
                            )}
                          </td>
                          <td>{formatINR(prod.basePrice)} / {prod.baseUnit}</td>
                          <td>{prod.seller?.name || 'Assam EdChem'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => openEditProduct(prod)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                                title="Edit product parameters"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="btn btn-danger"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                                title="Delete product SKU"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No products registered</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY AUDITOR */}
          {activeTab === 'inventory' && (
            <div className="grid-cols-3" style={{ alignItems: 'start' }}>
              {/* Product Stock list */}
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Live Stock Levels</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Base Unit</th>
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
                            <td>{prod.baseUnit}</td>
                            <td style={{ fontWeight: 700, color: prod.inventoryQuantity === 0 ? 'var(--error)' : 'var(--text-primary)' }}>
                              {prod.inventoryQuantity} {prod.baseUnit}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={() => openStockUpdate(prod)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                Add/Reduce Stock
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
                <h3 style={{ marginBottom: '1.5rem' }}>Inventory Audit History</h3>
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{log.note || 'No audit comments'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated by: {log.user?.name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No inventory history logs found.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QUOTATIONS */}
          {activeTab === 'quotations' && (
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Platform Quotation Negotiation Logs</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Quote ID</th>
                      <th>Buyer Info</th>
                      <th>Quote Items</th>
                      <th>Total Value</th>
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
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              {quote.status === 'PENDING' && (
                                <>
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
                                </>
                              )}
                              {quote.status === 'APPROVED' && (
                                <button
                                  onClick={() => handleQuotationStatus(quote.id, 'CONVERTED')}
                                  className="btn btn-primary"
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'var(--info)' }}
                                >
                                  Convert to Order
                                </button>
                              )}
                              {quote.status === 'CONVERTED' && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Converted</span>
                              )}
                              {quote.status === 'REJECTED' && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Rejected</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>
                          <div className="empty-state">No quotations submitted yet</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ORDERS LOG */}
          {activeTab === 'orders' && (
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Platform Sales Orders Pipeline</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Buyer</th>
                      <th>Items Purchased</th>
                      <th>Total Amount</th>
                      <th>Creation Date</th>
                      <th>Order Pipeline Status</th>
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

          {/* TAB 7: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div>
              <div className="grid-cols-2" style={{ marginBottom: '2rem' }}>
                {/* Category distribution */}
                <div className="card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Catalogue Category Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reportData?.categoryDistribution && Object.keys(reportData.categoryDistribution).length > 0 ? (
                      Object.entries(reportData.categoryDistribution).map(([cat, count]) => {
                        const total = Object.values(reportData.categoryDistribution).reduce((a, b) => a + b, 0);
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                              <span style={{ fontWeight: 600 }}>{cat}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{count} Products ({pct}%)</span>
                            </div>
                            <div style={{ background: 'var(--bg-tertiary)', height: '6px', borderRadius: '50px', overflow: 'hidden' }}>
                              <div style={{ background: 'var(--accent-primary)', width: `${pct}%`, height: '100%' }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state">No categories logged</div>
                    )}
                  </div>
                </div>

                {/* Conversion metrics info */}
                <div className="card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Sales Funnel Metrics</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '8px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                        {reportData?.metrics.quotationConversionRate || 0}%
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Quote Conversion Rate</h4>
                        <p style={{ fontSize: '0.85rem' }}>The percentage of total approved RFQs that successfully convert to active production orders.</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span>Total Submitted RFQs:</span>
                        <span style={{ fontWeight: 700 }}>{reportData?.metrics.totalQuotations || 0}</span>
                      </div>
                      <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span>Converted into active Orders:</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                          {/* count calculated from quotes list or reports data */}
                          {quotationsList.filter(q => q.status === 'CONVERTED').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top products table */}
              <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Top Selling Products (by Sales Value)</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Sales Quantity</th>
                        <th>Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData?.topProducts && reportData.topProducts.length > 0 ? (
                        reportData.topProducts.map((prod, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 600 }}>{prod.name}</td>
                            <td style={{ fontFamily: 'monospace' }}>{prod.sku}</td>
                            <td>{prod.sales} base units</td>
                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatINR(prod.revenue)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center' }}>No sales data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              <h3 style={{ margin: 0 }}>{selectedProduct ? 'Edit Product Details' : 'Register New SKU Product'}</h3>
              <button onClick={() => setProductModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-input" value={prodName} onChange={(e) => setProdName(e.target.value)} required placeholder="e.g. Hydrochloric Acid 35%" />
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">SKU Code</label>
                    <input type="text" className="form-input" value={prodSku} onChange={(e) => setProdSku(e.target.value)} required placeholder="e.g. HCL-35-IND" disabled={!!selectedProduct} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input type="text" className="form-input" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} required placeholder="e.g. Industrial Acids" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={prodDesc} onChange={(e) => setProdDesc(e.target.value)} placeholder="Enter details about grade, concentration, purity..." />
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
                        // Auto-assign default unit for dimension
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
                    <input type="number" step="0.0001" className="form-input" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} required placeholder="e.g. 0.06" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Stock Quantity</label>
                    <input type="number" step="0.01" className="form-input" value={prodStock} onChange={(e) => setProdStock(e.target.value)} required placeholder="e.g. 50000" disabled={!!selectedProduct} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedProduct ? 'Save Changes' : 'Create Product'}</button>
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
                  <input type="text" className="form-input" value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder="e.g. Warehouse arrival batch #12" />
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
