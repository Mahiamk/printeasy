import React, { useEffect, useRef, useState } from 'react';
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
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onError?: (msg: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onError,
  text = 'continue_with',
}) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hiddenBtnRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // 1. Fetch Google Client ID from backend or Vite env
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
        // Fallback silently if unavailable
      }
    };

    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load Google GSI script and bind native transparent trigger
  useEffect(() => {
    if (!clientId) return;

    const handleCredentialResponse = async (response: any) => {
      if (!response.credential) {
        if (onError) onError('Google Sign-In failed: No credential received.');
        return;
      }

      setLoading(true);
      try {
        const authRes = await authApi.googleLogin(response.credential);
        await login(authRes.access_token);
        navigate('/dashboard');
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Google authentication failed.';
        if (onError) onError(msg);
      } finally {
        setLoading(false);
      }
    };

    const initGsi = () => {
      if (!window.google?.accounts?.id || !hiddenBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render native button inside invisible container to capture click safely
      window.google.accounts.id.renderButton(hiddenBtnRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'rectangular',
        width: 380,
      });
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initGsi();
    document.head.appendChild(script);
  }, [clientId, onError, login, navigate]);

  const buttonLabel =
    text === 'signup_with'
      ? 'Sign up with Google'
      : text === 'signin_with'
      ? 'Sign in with Google'
      : 'Continue with Google';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Sleek Custom Button matching Login button aesthetic */}
      <button
        type="button"
        disabled={loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          background: isHovered ? 'var(--bg-card-hover, #242938)' : 'var(--bg-elevated, #1e2230)',
          border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.2)' : 'var(--border-subtle)'}`,
          color: 'var(--text-primary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '15px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-sm)',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition-fast)',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <Spinner size={20} className="animate-spin" color="var(--accent-sage)" />
        ) : (
          /* Clean transparent Google G logo with no white box container */
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
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
        )}
        <span>{loading ? 'Signing in...' : buttonLabel}</span>
      </button>

      {/* Invisible overlay capturing clicks to trigger Google One-Tap / Identity popup */}
      <div
        ref={hiddenBtnRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.001,
          overflow: 'hidden',
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </div>
  );
};
