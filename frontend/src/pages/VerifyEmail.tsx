import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, CheckCircle, XCircle, Spinner } from '@phosphor-icons/react';
import { authApi } from '../api/auth';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((res) => {
        if (res.already_verified) {
          setStatus('already');
        } else {
          setStatus('success');
        }
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed. The link may be invalid or expired.');
      });
  }, [token]);

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
          padding: '40px 24px',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <Spinner size={40} className="animate-spin" color="var(--accent-sage)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '20px' }}>
              Verifying your email...
            </h2>
          </>
        )}

        {(status === 'success' || status === 'already') && (
          <>
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                padding: '16px',
                borderRadius: '50%',
                marginBottom: '20px',
              }}
            >
              <CheckCircle size={32} weight="fill" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {status === 'already' ? 'Already Verified' : 'Email Verified!'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              {message}
            </p>
            <Link
              to="/login"
              style={{
                display: 'block',
                width: '100%',
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
                boxShadow: 'var(--shadow-glow-sage)',
                boxSizing: 'border-box',
              }}
            >
              Go to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--accent-rose)',
                color: 'var(--text-inverse)',
                padding: '16px',
                borderRadius: '50%',
                marginBottom: '20px',
              }}
            >
              <XCircle size={32} weight="fill" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Verification Failed
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              {message}
            </p>
            <Link
              to="/register"
              style={{
                display: 'block',
                width: '100%',
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
                boxShadow: 'var(--shadow-glow-sage)',
                boxSizing: 'border-box',
              }}
            >
              Try Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
