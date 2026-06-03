'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';

export default function Navbar({ activeTab, setIsMobileOpen }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'users': return 'User Account Control';
      case 'products': return 'Product Catalogue & SKUs';
      case 'inventory': return 'Inventory Level Auditor';
      case 'quotations': return 'Quotation Negotiations';
      case 'orders': return 'B2B Sales Orders';
      case 'reports': return 'Business Reports & Analytics';
      case 'catalog': return 'Product Procurement Catalog';
      default: return 'B2B Platform';
    }
  };

  return (
    <header 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setIsMobileOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'none',
          }}
          className="mobile-hamburger"
        >
          <Menu size={22} />
        </button>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading)' }}>
          {getPageTitle()}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
}
