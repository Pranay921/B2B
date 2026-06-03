'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      textAlign: 'center',
    }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '3rem 2rem' }}>
        <ShieldAlert size={60} style={{ color: 'var(--error)', marginBottom: '1.5rem' }} />
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Access Denied
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You do not have the required permissions or roles to view this page. Please log in with an authorized account.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/login" className="btn btn-primary">
            Sign In
          </Link>
          <Link href="/" className="btn btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
