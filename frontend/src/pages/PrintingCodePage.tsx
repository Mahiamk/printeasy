import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { codeApi } from '../api/code';
import { Key, ShieldCheck, Spinner, CheckCircle, WarningCircle, Lock, Copy, Check } from '@phosphor-icons/react';

export const PrintingCodePage: React.FC = () => {
  const [printingCode, setPrintingCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await codeApi.get();
        setPrintingCode(res.code || '');
      } catch (err) {
        console.error('Failed to load code', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCode();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await codeApi.save(printingCode);
      setSuccess('Printing code encrypted and saved successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save printing code.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!printingCode) return;
    navigator.clipboard.writeText(printingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            School Printing Code
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Save and manage your school-issued keypad PIN for printer job release
          </p>
        </div>

        {/* Live Code Preview Card */}
        {printingCode && !loading && (
          <div
            className="pulse-code-glow responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '2px solid rgba(212, 163, 89, 0.35)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px 16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Decrypted PIN
            </span>
            <div
              className="responsive-pin-code"
              style={{
                fontFamily: 'var(--font-family-mono)',
                fontSize: '44px',
                fontWeight: 800,
                color: 'var(--accent-amber)',
                letterSpacing: '0.15em',
                margin: '8px 0 14px',
                wordBreak: 'break-all',
              }}
            >
              {printingCode}
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {copied ? <Check size={16} color="var(--accent-sage)" /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy PIN'}</span>
            </button>
          </div>
        )}

        {/* Update Form */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                background: 'var(--accent-amber-subtle)',
                color: 'var(--accent-amber)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
            >
              <Key size={18} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Set or Update Keypad PIN
            </h3>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            Enter the printing PIN code issued by your institution. It will be encrypted at rest and decrypted on the library PC print screen.
          </p>

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
                marginBottom: '16px',
              }}
            >
              <WarningCircle size={18} weight="duotone" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent-sage-subtle)',
                border: '1px solid rgba(127, 166, 138, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                color: 'var(--accent-sage)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <CheckCircle size={18} weight="duotone" />
              <span>{success}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Spinner size={24} className="animate-spin" color="var(--accent-sage)" />
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '20px' }}>
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
                  Keypad Release Code / PIN
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={printingCode}
                  onChange={(e) => setPrintingCode(e.target.value)}
                  placeholder="e.g. 98210"
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    color: 'var(--accent-amber)',
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'var(--accent-sage)',
                  color: 'var(--text-inverse)',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow-sage)',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <>
                    <Spinner size={16} className="animate-spin" />
                    <span>Encrypting & Saving...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} weight="bold" />
                    <span>Save Encrypted Code</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security Info Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldCheck size={20} weight="duotone" color="var(--accent-blue)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Encryption Architecture
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your printing code is encrypted using <strong>AES-256-GCM</strong> with a 256-bit key derived via <strong>PBKDF2 (100,000 iterations)</strong> from your account password.
            Even if the database is exposed, the plaintext code is mathematically unrecoverable without your password.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};
