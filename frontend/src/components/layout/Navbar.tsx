import React from 'react';
import { UserCircle, ShieldCheck, List, Printer } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { user } = useAuth();

  return (
    <header
      style={{
        height: '60px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: Mobile hamburger & Brand / Encrypted badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button
          onClick={onOpenMobileMenu}
          className="mobile-only"
          style={{
            color: 'var(--text-primary)',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-label="Open navigation menu"
        >
          <List size={22} weight="bold" />
        </button>

        {/* Mobile brand logo */}
        <div className="mobile-only" style={{ alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div
            style={{
              background: 'var(--accent-sage)',
              color: 'var(--text-inverse)',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
            }}
          >
            <Printer size={16} weight="fill" />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            PrintEasy
          </span>
        </div>

        {/* Desktop badge */}
        <div className="desktop-only">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--accent-sage-subtle)',
              color: 'var(--accent-sage)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={16} weight="duotone" />
            <span>Encrypted Session</span>
          </span>
        </div>
      </div>

      {/* Right: User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 1, minWidth: 0 }}>
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              maxWidth: '160px',
              minWidth: 0,
            }}
            title={user.email}
          >
            <UserCircle size={18} weight="duotone" color="var(--accent-blue)" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {user.email.split('@')[0]}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
