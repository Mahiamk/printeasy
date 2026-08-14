import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  House,
  Key,
  Gear,
  SignOut,
  Printer,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <House size={20} weight="duotone" /> },
    { to: '/code', label: 'Printing Code', icon: <Key size={20} weight="duotone" /> },
    { to: '/settings', label: 'Settings', icon: <Gear size={20} weight="duotone" /> },
  ];

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '24px 16px',
      }}
    >
      <div>
        {/* Brand & Mobile Close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div
            onClick={() => {
              navigate('/dashboard');
              if (onCloseMobile) onCloseMobile();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                padding: '7px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
            >
              <Printer size={22} weight="fill" />
            </div>
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                PrintEasy
              </h1>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
                Library Queue
              </span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="mobile-only"
              style={{
                color: 'var(--text-muted)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-sage)' : '3px solid transparent',
                transition: 'all var(--transition-fast)',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout button */}
      <div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent-rose)';
            e.currentTarget.style.background = 'var(--accent-rose-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <SignOut size={20} weight="duotone" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="desktop-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="mobile-only"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(10, 14, 20, 0.75)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={onCloseMobile}
        >
          <div
            style={{
              width: '280px',
              maxWidth: '80vw',
              height: '100%',
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
