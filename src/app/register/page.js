'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { User, Lock, Mail, Eye, EyeOff, Building2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('BUYER');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      addToast('Please fill in all fields.', 'warning');
      return;
    }

    if (password.length < 6) {
      addToast('Password must be at least 6 characters.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || 'Registration failed.', 'error');
        return;
      }

      addToast('Account created successfully! Please sign in.', 'success');
      router.push('/login');
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
      backgroundImage: 'radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 40%)',
    }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--accent-primary)' }}>
            CREATE B2B ACCOUNT
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Register your business profile at Assam EdChem
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name / Company Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="Raj Traders / John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Business Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                placeholder="procurement@company.com"
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
                placeholder="Min. 6 characters"
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

          <div className="form-group">
            <label className="form-label">Select Business Role</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <select
                className="form-select"
                style={{ width: '100%', paddingLeft: '2.5rem', appearance: 'none', cursor: 'pointer' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="BUYER">BUYER (Request Quotes & Place Orders)</option>
                <option value="SELLER">SELLER (Supply Products & Inventory)</option>
                <option value="ADMIN">ADMIN (Full Platform Controller)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Business Profile...' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <Link href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Portal Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
