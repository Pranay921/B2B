'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  Warehouse, 
  FileText, 
  ShoppingCart, 
  BarChart3, 
  LogOut,
  X
} from 'lucide-react';

export default function Sidebar({ role, activeTab, setActiveTab, userName, isMobileOpen, setIsMobileOpen, handleLogout }) {
  const getNavItems = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { id: 'users', label: 'User Management', icon: <Users size={20} /> },
          { id: 'products', label: 'Product & SKU', icon: <ShoppingBag size={20} /> },
          { id: 'inventory', label: 'Inventory Audit', icon: <Warehouse size={20} /> },
          { id: 'quotations', label: 'Quotations', icon: <FileText size={20} /> },
          { id: 'orders', label: 'Orders Log', icon: <ShoppingCart size={20} /> },
          { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 size={20} /> },
        ];
      case 'SELLER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { id: 'products', label: 'Manage Products', icon: <ShoppingBag size={20} /> },
          { id: 'inventory', label: 'Pricing & Stock', icon: <Warehouse size={20} /> },
          { id: 'quotations', label: 'Review Quotes', icon: <FileText size={20} /> },
          { id: 'orders', label: 'Dispatch Orders', icon: <ShoppingCart size={20} /> },
        ];
      case 'BUYER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
          { id: 'catalog', label: 'Browse Catalog', icon: <ShoppingBag size={20} /> },
          { id: 'quotations', label: 'My Quotations', icon: <FileText size={20} /> },
          { id: 'orders', label: 'My Orders', icon: <ShoppingCart size={20} /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 99,
          }}
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
              ASSAM EDCHEM
            </h2>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '2px', marginTop: '0.2rem', fontWeight: 600 }}>
              B2B PLATFORM
            </span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'none'
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.85rem 1.05rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === item.id ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === item.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
                borderLeft: activeTab === item.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
              Logged In As
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {userName}
            </div>
            <span className={`badge badge-${role.toLowerCase()}`} style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>
              {role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
