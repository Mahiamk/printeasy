import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Spinner,
  ArrowClockwise,
  CheckCircle,
  XCircle,
  DeviceMobile,
  Copy,
  Check,
  ShieldCheck,
} from '@phosphor-icons/react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const QRCodeLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [status, setStatus] = useState<'loading' | 'active' | 'approved' | 'expired' | 'rejected'>('loading');
  const [copied, setCopied] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate new QR session
  const initiateSession = useCallback(async () => {
    setStatus('loading');
    setToken(null);
    try {
      const res = await authApi.qrInitiate();
      setToken(res.token);
      setExpiresAt(new Date(res.expires_at));
      setSecondsRemaining(res.expires_in_seconds || 180);
      setStatus('active');
    } catch (err) {
      console.error('Failed to initiate QR login session:', err);
      setStatus('expired');
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initiateSession();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [initiateSession]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'active' || !expiresAt) return;

    countdownTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setStatus('expired');
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [status, expiresAt]);

  // Polling for authorization status
  useEffect(() => {
    if (status !== 'active' || !token) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await authApi.qrCheckStatus(token);
        if (res.status === 'approved' && res.access_token) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('approved');
          // Short delay to show success state before redirect
          setTimeout(async () => {
            await login(res.access_token!, res.user);
            navigate('/dashboard');
          }, 800);
        } else if (res.status === 'expired') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('expired');
        } else if (res.status === 'rejected') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('rejected');
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setStatus('expired');
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status, token, login, navigate]);

  const qrUrl = token ? `${window.location.origin}/link-device?token=${encodeURIComponent(token)}` : '';

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* QR Code Container */}
      <div
        style={{
          position: 'relative',
          width: '210px',
          height: '210px',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          overflow: 'hidden',
          border: '2px solid var(--accent-sage-subtle)',
        }}
      >
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Spinner size={32} className="animate-spin" color="var(--accent-sage)" />
            <span style={{ fontSize: '12px', color: '#666' }}>Generating code...</span>
          </div>
        )}

        {status === 'approved' && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'center',
              color: 'var(--accent-sage)',
            }}
          >
            <CheckCircle size={56} weight="fill" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Login Approved!
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Redirecting to dashboard...</span>
          </div>
        )}

        {status === 'rejected' && (
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'center',
            }}
          >
            <XCircle size={48} weight="fill" color="var(--accent-rose)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Login Request Denied
            </span>
            <button
              onClick={initiateSession}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent-sage)',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowClockwise size={14} /> Try Again
            </button>
          </div>
        )}

        {(status === 'active' || status === 'expired') && token && (
          <>
            <QRCodeSVG
              value={qrUrl}
              size={186}
              level="M"
              includeMargin={false}
              style={{
                filter: status === 'expired' ? 'blur(4px) opacity(0.3)' : 'none',
                transition: 'filter 0.3s ease',
              }}
            />

            {/* Laser scanning beam animation when active */}
            {status === 'active' && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, var(--accent-sage), transparent)',
                  boxShadow: '0 0 8px var(--accent-sage)',
                  animation: 'qr-scan-beam 2.4s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Expired Overlay */}
            {status === 'expired' && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  QR Code Expired
                </span>
                <button
                  onClick={initiateSession}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-sage)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <ArrowClockwise size={16} /> Refresh Code
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Expiry countdown indicator */}
      {status === 'active' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: secondsRemaining < 30 ? 'var(--accent-rose)' : 'var(--text-muted)',
            marginBottom: '16px',
            fontWeight: 500,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: secondsRemaining < 30 ? 'var(--accent-rose)' : 'var(--accent-sage)',
              boxShadow: `0 0 6px ${secondsRemaining < 30 ? 'var(--accent-rose)' : 'var(--accent-sage)'}`,
            }}
          />
          <span>Expires in {formatTime(secondsRemaining)}</span>
          <button
            onClick={initiateSession}
            title="Refresh code"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              marginLeft: '4px',
              padding: '2px',
            }}
          >
            <ArrowClockwise size={14} />
          </button>
        </div>
      )}

      {/* Step Instructions */}
      <div
        style={{
          width: '100%',
          background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginBottom: '14px',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
        >
          <DeviceMobile size={16} weight="duotone" color="var(--accent-sage)" />
          <span>How to log in with QR:</span>
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: '18px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          <li>Open your phone's camera app or PrintEasy</li>
          <li>Point camera at this screen to scan the code</li>
          <li>Tap <strong>Approve</strong> on your phone to log in here</li>
        </ol>
      </div>

      {/* Copy link option */}
      {status === 'active' && token && (
        <button
          type="button"
          onClick={handleCopyLink}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {copied ? <Check size={14} color="var(--accent-sage)" /> : <Copy size={14} />}
          <span>{copied ? 'Link copied!' : 'Copy device link'}</span>
        </button>
      )}

      {/* Security note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          marginTop: '12px',
        }}
      >
        <ShieldCheck size={14} weight="duotone" color="var(--accent-sage)" />
        <span>Encrypted end-to-end with 3-minute single-use token</span>
      </div>

      {/* Inline styles for beam animation */}
      <style>{`
        @keyframes qr-scan-beam {
          0% { top: 6px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 202px; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
