import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileBottomBar } from './MobileBottomBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        background: 'var(--bg-app)',
        position: 'relative',
      }}
    >
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="main-content-wrapper">
        <Navbar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="responsive-main">
          {children}
        </main>
        <MobileBottomBar />
      </div>
    </div>
  );
};
