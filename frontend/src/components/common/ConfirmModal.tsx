import React from 'react';
import { ShieldCheck, Trash, WarningCircle, Spinner, X } from '@phosphor-icons/react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success' | 'warning';
  loading?: boolean;
  fileName?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  loading = false,
  fileName,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash size={28} weight="duotone" color="var(--accent-rose)" />,
          bg: 'var(--accent-rose-subtle)',
          btnBg: 'var(--accent-rose)',
          btnText: '#fff',
          glow: 'var(--shadow-glow-rose)',
        };
      case 'success':
        return {
          icon: <ShieldCheck size={28} weight="duotone" color="var(--accent-sage)" />,
          bg: 'var(--accent-sage-subtle)',
          btnBg: 'var(--accent-sage)',
          btnText: 'var(--text-inverse)',
          glow: 'var(--shadow-glow-sage)',
        };
      default:
        return {
          icon: <WarningCircle size={28} weight="duotone" color="var(--accent-amber)" />,
          bg: 'var(--accent-amber-subtle)',
          btnBg: 'var(--accent-amber)',
          btnText: 'var(--text-inverse)',
          glow: 'var(--shadow-glow-amber)',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(10, 14, 20, 0.82)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        {!loading && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <div
            style={{
              background: style.bg,
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexShrink: 0,
            }}
          >
            {style.icon}
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {title}
            </h3>
            {fileName && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '260px',
                  marginTop: '2px',
                }}
              >
                {fileName}
              </span>
            )}
          </div>
        </div>

        {/* Description Body */}
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all var(--transition-fast)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: style.btnBg,
              color: style.btnText,
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: style.glow,
              opacity: loading ? 0.7 : 1,
              transition: 'all var(--transition-fast)',
            }}
          >
            {loading ? (
              <>
                <Spinner size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
