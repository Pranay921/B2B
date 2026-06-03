'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Warehouse, FileText, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            router.push(`/${data.user.role.toLowerCase()}`);
            return;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
      }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 3rem',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            ASSAM EDCHEM
          </h1>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 600 }}>
            Enterprise B2B Hub
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Sign In</Link>
          <Link href="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Get Started</Link>
        </div>
      </header>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
        maxWidth: '1000px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 800,
          lineHeight: 1.15,
          fontFamily: 'var(--font-heading)',
          marginBottom: '1.5rem',
          backgroundImage: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-primary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Next-Gen B2B Inventory, Quotation & Order Platform
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-secondary)',
          maxWidth: '700px',
          marginBottom: '3rem',
        }}>
          Streamline your industrial supply chains with automated unit conversions, high-precision price calculations, and robust audit trail controls.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '4rem' }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: '1rem 2.25rem', fontSize: '1.05rem' }}>
            Register Your Account <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn btn-secondary" style={{ padding: '1rem 2.25rem', fontSize: '1.05rem' }}>
            Client Access Portal
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid-cols-3" style={{ width: '100%' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Warehouse size={36} style={{ color: 'var(--accent-primary)', marginBottom: '1.25rem' }} />
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Real-time Inventory</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Track supply levels dynamically in weight, volume, or counts. Get automated low-stock warnings.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <FileText size={36} style={{ color: 'var(--accent-secondary)', marginBottom: '1.25rem' }} />
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Quotation Negotiator</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Draft detailed quotes. Supports live calculations and unit translation for accurate invoicing.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Shield size={36} style={{ color: 'var(--info)', marginBottom: '1.25rem' }} />
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>RBAC Security</h3>
            <p style={{ fontSize: '0.85rem' }}>
              Secure middleware protecting APIs and pages. Specific dashboards for Admin, Seller, and Buyer.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
      }}>
        © 2026 Assam EdChem. All rights reserved. Built with Next.js & Prisma.
      </footer>
    </div>
  );
}
