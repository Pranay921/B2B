'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'account_deactivated') {
      addToast('Your account is deactivated. Please contact support.', 'error');
    }
  }, [searchParams, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Login failed.', 'error');
        return;
      }

      addToast('Login successful! Redirecting...', 'success');
      
      // Let's redirect based on user role
      const role = data.user.role.toLowerCase();
      router.push(`/${role}`);
    } catch (err) {
      console.error(err);
      addToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.05) 0%, transparent 40%)',
    }}>
      <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--accent-primary)' }}>
            ASSAM EDCHEM
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            B2B Client Access Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Securing Session...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have a business account?{' '}
          <Link href="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
