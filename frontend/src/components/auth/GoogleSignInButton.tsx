import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '@phosphor-icons/react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: any) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onError?: (msg: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

// Global script loading promise to avoid duplicate tags and race conditions
let gsiScriptPromise: Promise<void> | null = null;
function loadGoogleGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google GSI')));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google GSI'));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onError,
  text = 'continue_with',
}) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 1. Fetch Google Client ID
  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      try {
        const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (envClientId) {
          if (mounted) setClientId(envClientId);
          return;
        }
        const cfg = await authApi.getGoogleConfig();
        if (mounted && cfg.client_id) {
          setClientId(cfg.client_id);
        }
      } catch {
        // Fallback silently
      }
    };

    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Handle Google Credential Response
  const handleCredentialResponse = useCallback(
    async (response: any) => {
      if (!response.credential) {
        if (onError) onError('Google Sign-In failed: No credential received.');
        return;
      }

      setLoading(true);
      try {
        const authRes = await authApi.googleLogin(response.credential);
        await login(authRes.access_token, authRes.user);
        navigate('/dashboard');
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Google authentication failed.';
        if (onError) onError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onError, login, navigate]
  );

  // 3. Initialize and Render Official Google Button
  useEffect(() => {
    if (!clientId) return;
    let mounted = true;

    loadGoogleGsiScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Clear container to avoid duplicate iframes on re-renders
        containerRef.current.innerHTML = '';

        // Calculate responsive width matching the container
        const measuredWidth = containerRef.current.offsetWidth || 340;
        const targetWidth = Math.min(Math.max(measuredWidth, 240), 400);

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: text,
          logo_alignment: 'left',
          width: targetWidth,
        });

        setReady(true);
      })
      .catch((err) => {
        console.error('[Google GSI Error]', err);
      });

    return () => {
      mounted = false;
    };
  }, [clientId, text, handleCredentialResponse]);

  // Re-render button on window resize / orientation change so width stays 100%
  useEffect(() => {
    if (!ready || !clientId || !containerRef.current || !window.google?.accounts?.id) return;

    let resizeTimer: any;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!containerRef.current || !window.google?.accounts?.id) return;
        containerRef.current.innerHTML = '';
        const measuredWidth = containerRef.current.offsetWidth || 340;
        const targetWidth = Math.min(Math.max(measuredWidth, 240), 400);

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: text,
          logo_alignment: 'left',
          width: targetWidth,
        });
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [ready, clientId, text]);

  const buttonLabel =
    text === 'signup_with'
      ? 'Sign up with Google'
      : text === 'signin_with'
      ? 'Sign in with Google'
      : 'Continue with Google';

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '44px' }}>
      {/* Loading Overlay when processing authentication */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            background: 'var(--bg-card, #1c1f2e)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <Spinner size={20} className="animate-spin" color="var(--accent-sage)" />
          <span>Signing in with Google...</span>
        </div>
      )}

      {/* Placeholder skeleton before Google script finishes loading */}
      {!ready && (
        <div
          style={{
            width: '100%',
            height: '44px',
            background: 'var(--bg-elevated, #1e2230)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>{buttonLabel}</span>
        </div>
      )}

      {/* Official Native Google Button Container - Zero Dead Zones on Mobile */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          display: ready ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '44px',
        }}
      />
    </div>
  );
};
