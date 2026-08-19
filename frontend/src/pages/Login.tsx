import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, Lock, EnvelopeSimple, Spinner, WarningCircle } from '@phosphor-icons/react';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      await login(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: '24px',
      }}
    >
      <div
        className="animate-fade-in responsive-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--accent-sage)',
              color: 'var(--text-inverse)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
            }}
          >
            <Printer size={28} weight="fill" />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>Welcome Back</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Access your secure library print queue
          </p>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-rose-subtle)',
              border: '1px solid rgba(196, 132, 122, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              color: 'var(--accent-rose)',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <WarningCircle size={18} weight="duotone" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              School Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.edu"
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px 12px 38px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <EnvelopeSimple
                size={18}
                weight="duotone"
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px 12px 38px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <Lock
                size={18}
                weight="duotone"
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--accent-sage)',
              color: 'var(--text-inverse)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-glow-sage)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Spinner size={20} className="animate-spin" /> : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
            color: 'var(--text-muted)',
            fontSize: '12px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ padding: '0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            or continue with
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Google Sign-In */}
        <GoogleSignInButton onError={(msg) => setError(msg)} text="signin_with" />

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-sage)', fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
