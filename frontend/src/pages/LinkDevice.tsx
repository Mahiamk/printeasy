import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Spinner,
  DeviceMobile,
  Monitor,
  Camera,
  ArrowLeft,
  WarningCircle,
  QrCode,
} from '@phosphor-icons/react';
import { authApi, QRInfoResponse } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';

export const LinkDevice: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const tokenParam = searchParams.get('token') || '';
  const [activeToken, setActiveToken] = useState<string>(tokenParam);

  // Session info & state
  const [sessionInfo, setSessionInfo] = useState<QRInfoResponse | null>(null);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<'approved' | 'rejected' | null>(null);

  // Camera scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // If user is not logged in, redirect to login page with redirect param
  useEffect(() => {
    if (!authLoading && !user) {
      const currentUrl = activeToken
        ? `/login?redirect=${encodeURIComponent(`/link-device?token=${activeToken}`)}`
        : '/login';
      navigate(currentUrl, { replace: true });
    }
  }, [authLoading, user, activeToken, navigate]);

  // Load session info when activeToken changes
  const loadSessionInfo = useCallback(async (tokenToLoad: string) => {
    if (!tokenToLoad) return;
    setLoadingInfo(true);
    setError(null);
    try {
      const info = await authApi.qrGetInfo(tokenToLoad);
      setSessionInfo(info);
      if (info.status === 'expired') {
        setError('This login request has expired. Please refresh the QR code on the target device.');
      } else if (info.status === 'consumed' || info.status === 'approved') {
        setError('This login request has already been used.');
      } else if (info.status === 'rejected') {
        setError('This login request was previously rejected.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired login request.');
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  useEffect(() => {
    if (activeToken && user) {
      loadSessionInfo(activeToken);
    }
  }, [activeToken, user, loadSessionInfo]);

  // Handle Approve / Reject
  const handleAuthorize = async (action: 'approve' | 'reject') => {
    if (!activeToken) return;
    setActionLoading(true);
    setError(null);
    try {
      await authApi.qrAuthorize(activeToken, action);
      setActionResult(action === 'approve' ? 'approved' : 'rejected');
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${action} login request.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Extract token from scanned string (could be full URL or raw token)
  const extractTokenFromScan = (decodedText: string): string => {
    try {
      if (decodedText.includes('token=')) {
        const url = new URL(decodedText);
        return url.searchParams.get('token') || decodedText;
      }
    } catch {
      // Not a full URL, fallback
    }
    return decodedText.trim();
  };

  // Start in-app camera scanner
  const startScanner = async () => {
    setScannerError(null);
    setIsScanning(true);

    // Wait a tick for container element to mount
    setTimeout(async () => {
      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(scannerContainerId);
        }

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            const extracted = extractTokenFromScan(decodedText);
            if (extracted) {
              stopScanner();
              setActiveToken(extracted);
            }
          },
          () => {
            // Ignore scan errors between frames
          }
        );
      } catch (err: any) {
        console.error('Camera start error:', err);
        setScannerError(
          'Unable to access camera. Please check camera permissions, or enter the code manually below.'
        );
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      setActiveToken(extractTokenFromScan(manualCode.trim()));
    }
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
        }}
      >
        <Spinner size={36} className="animate-spin" color="var(--accent-sage)" />
      </div>
    );
  }

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
          maxWidth: '440px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px 24px',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}
      >
        {/* Navigation / Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Link Device</span>
        </div>

        {/* State 1: Action Result (Approved or Rejected) */}
        {actionResult && (
          <div className="animate-fade-in" style={{ padding: '20px 0' }}>
            {actionResult === 'approved' ? (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    background: 'var(--accent-sage-subtle)',
                    color: 'var(--accent-sage)',
                    padding: '16px',
                    borderRadius: '50%',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle size={52} weight="fill" />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Login Approved!
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
                  Your other device is now securely logged in to PrintEasy. You can safely close this tab or return to your dashboard.
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: 'inline-flex',
                    background: 'var(--accent-rose-subtle)',
                    color: 'var(--accent-rose)',
                    padding: '16px',
                    borderRadius: '50%',
                    marginBottom: '16px',
                  }}
                >
                  <XCircle size={52} weight="fill" />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Request Denied
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
                  The login request on the other device has been rejected.
                </p>
              </>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'var(--accent-sage)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow-sage)',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* State 2: Confirmation Screen with Active Token */}
        {!actionResult && activeToken && (
          <div className="animate-fade-in">
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
              }}
            >
              <Monitor size={32} weight="fill" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Authorize Device Login
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              A new device is requesting access to your PrintEasy account
            </p>

            {loadingInfo ? (
              <div style={{ padding: '30px 0' }}>
                <Spinner size={32} className="animate-spin" color="var(--accent-sage)" />
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Verifying device request...
                </p>
              </div>
            ) : error ? (
              <div
                style={{
                  background: 'var(--accent-rose-subtle)',
                  border: '1px solid rgba(196, 132, 122, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <WarningCircle size={20} weight="duotone" />
                <span>{error}</span>
              </div>
            ) : (
              sessionInfo && (
                <>
                  {/* Device Info Card */}
                  <div
                    style={{
                      background: 'var(--bg-card-subtle, rgba(255, 255, 255, 0.03))',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                      marginBottom: '24px',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Monitor size={22} weight="duotone" color="var(--accent-sage)" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {sessionInfo.device_info || 'Unknown Device'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Target Device Request
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Signed in as:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAuthorize('reject')}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '1px solid var(--border-card)',
                        color: 'var(--accent-rose)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Deny
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleAuthorize('approve')}
                      style={{
                        flex: 2,
                        background: 'var(--accent-sage)',
                        color: 'var(--text-inverse)',
                        border: 'none',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: 'var(--shadow-glow-sage)',
                        opacity: actionLoading ? 0.7 : 1,
                      }}
                    >
                      {actionLoading ? <Spinner size={18} className="animate-spin" /> : 'Approve Login'}
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        )}

        {/* State 3: No Active Token — Camera Scanner or Manual Entry */}
        {!actionResult && !activeToken && (
          <div className="animate-fade-in">
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
              }}
            >
              <QrCode size={32} weight="fill" />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Scan QR Code
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Point your camera at the QR code shown on your other screen
            </p>

            {/* In-app Camera Viewport */}
            <div
              id={scannerContainerId}
              style={{
                width: '100%',
                minHeight: isScanning ? '260px' : '0px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#000',
                marginBottom: '16px',
                display: isScanning ? 'block' : 'none',
              }}
            />

            {scannerError && (
              <div
                style={{
                  background: 'var(--accent-rose-subtle)',
                  border: '1px solid rgba(196, 132, 122, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}
              >
                {scannerError}
              </div>
            )}

            {!isScanning ? (
              <button
                type="button"
                onClick={startScanner}
                style={{
                  width: '100%',
                  background: 'var(--accent-sage)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  padding: '13px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow-sage)',
                  marginBottom: '20px',
                }}
              >
                <Camera size={20} weight="fill" />
                <span>Open Camera Scanner</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                }}
              >
                Stop Camera
              </button>
            )}

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '18px 0',
                color: 'var(--text-muted)',
                fontSize: '12px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ padding: '0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or enter code manually
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Manual Code Input */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Paste code or device link"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                style={{
                  background: 'var(--accent-sage)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: !manualCode.trim() ? 0.6 : 1,
                }}
              >
                Go
              </button>
            </form>
          </div>
        )}

        {/* Footer Security Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '24px',
          }}
        >
          <ShieldCheck size={14} weight="duotone" color="var(--accent-sage)" />
          <span>Secured with end-to-end device cryptographic authorization</span>
        </div>
      </div>
    </div>
  );
};
