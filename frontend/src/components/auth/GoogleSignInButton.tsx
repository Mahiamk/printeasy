import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Spinner, WarningCircle } from '@phosphor-icons/react';

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
  const btnRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

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
        if (mounted) {
          if (cfg.client_id) {
            setClientId(cfg.client_id);
          } else {
            setInitError('Google Client ID is not configured in backend .env.');
          }
        }
      } catch (err) {
        if (mounted) setInitError('Unable to load Google authentication config.');
      }
    };

    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load Google GSI script and render button
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
      if (!window.google?.accounts?.id || !btnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: btnRef.current.parentElement?.clientWidth || 360,
      });
    };

    // If script already loaded
    if (window.google?.accounts?.id) {
      initGsi();
      return;
    }

    // Otherwise load script dynamically
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => initGsi();
    document.head.appendChild(script);

    return () => {
      // cleanup if needed
    };
  }, [clientId, text]);

  if (initError && !clientId) {
    return (
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '8px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <span>Google Sign-In requires CLIENT_ID in environment variables</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-sage)',
            fontSize: '13px',
            marginBottom: '10px',
          }}
        >
          <Spinner size={18} className="animate-spin" />
          <span>Verifying Google account...</span>
        </div>
      )}
      <div
        ref={btnRef}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '44px',
        }}
      />
    </div>
  );
};
