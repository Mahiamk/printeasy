import React from 'react';
import { NavLink } from 'react-router-dom';
import { House, Key, Gear } from '@phosphor-icons/react';

export const MobileBottomBar: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <House size={22} weight="duotone" /> },
    { to: '/code', label: 'Printing Code', icon: <Key size={22} weight="duotone" /> },
    { to: '/settings', label: 'Settings', icon: <Gear size={22} weight="duotone" /> },
  ];

  return (
    <div
      className="mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'var(--bg-sidebar)',
        borderTop: '1px solid var(--border-subtle)',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        padding: '0 8px',
      }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: isActive ? 'var(--accent-sage)' : 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: isActive ? 600 : 500,
            textDecoration: 'none',
            flex: 1,
            height: '100%',
            transition: 'color var(--transition-fast)',
          })}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
};
