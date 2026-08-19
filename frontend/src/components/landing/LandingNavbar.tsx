import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  List,
  X,
  ArrowRight,
  Sparkle,
  ShieldCheck,
  DeviceMobile,
  ChartPieSlice,
  SignIn,
  UserPlus,
  Key,
} from '@phosphor-icons/react';

export const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change or ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          width: '100%',
          background: scrolled || mobileMenuOpen
            ? 'rgba(19, 21, 31, 0.92)'
            : 'rgba(19, 21, 31, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Campus Badge */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #7fa68a 0%, #5d876a 100%)',
                color: '#ffffff',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                boxShadow: '0 2px 10px rgba(127, 166, 138, 0.3)',
              }}
            >
              <Printer size={20} weight="fill" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                PrintEasy
              </span>
              <span
                style={{
                  background: 'var(--accent-sage-subtle)',
                  color: 'var(--accent-sage)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Campus
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav
            className="desktop-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <button
              onClick={() => scrollToSection('features')}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Features
            </button>

            <button
              onClick={() => scrollToSection('how-it-works')}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              How It Works
            </button>

            <button
              onClick={() => scrollToSection('security')}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Security
            </button>

            <button
              onClick={() => scrollToSection('quotas')}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Quotas
            </button>
          </nav>

          {/* Desktop Right CTAs */}
          <div
            className="desktop-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={() => navigate('/login')}
              style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Sign In
            </button>

            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #7fa68a 0%, #689274 100%)',
                color: 'var(--text-inverse)',
                fontSize: '13px',
                fontWeight: 700,
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(127, 166, 138, 0.25)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>

          {/* Mobile Right Controls: Sign In + Hamburger Toggle */}
          <div
            className="mobile-only"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Sign In
            </button>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              style={{
                background: mobileMenuOpen ? 'var(--accent-sage-subtle)' : 'var(--bg-elevated)',
                border: mobileMenuOpen ? '1px solid var(--accent-sage)' : '1px solid var(--border-subtle)',
                color: mobileMenuOpen ? 'var(--accent-sage)' : 'var(--text-primary)',
                padding: '7px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            COOL MOBILE SLIDE-DOWN DRAWER / MENU
           ══════════════════════════════════════════════════════════════ */}
        {mobileMenuOpen && (
          <div
            className="animate-fade-in"
            style={{
              background: 'linear-gradient(180deg, rgba(23, 26, 38, 0.98) 0%, rgba(19, 21, 31, 0.98) 100%)',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-card)',
              padding: '18px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Quick Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                Explore PrintEasy
              </div>

              <button
                onClick={() => scrollToSection('features')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <div style={{ background: 'var(--accent-sage-subtle)', color: 'var(--accent-sage)', padding: '6px', borderRadius: 'var(--radius-xs)', display: 'flex' }}>
                  <DeviceMobile size={18} weight="duotone" />
                </div>
                <div>
                  <div>Features & Multi-Device</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Upload from phone or laptop</div>
                </div>
              </button>

              <button
                onClick={() => scrollToSection('how-it-works')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <div style={{ background: 'var(--accent-amber-subtle)', color: 'var(--accent-amber)', padding: '6px', borderRadius: 'var(--radius-xs)', display: 'flex' }}>
                  <Key size={18} weight="duotone" />
                </div>
                <div>
                  <div>How It Works & Keypad PIN</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Instant printer release codes</div>
                </div>
              </button>

              <button
                onClick={() => scrollToSection('security')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <div style={{ background: 'var(--accent-blue-subtle)', color: 'var(--accent-blue)', padding: '6px', borderRadius: 'var(--radius-xs)', display: 'flex' }}>
                  <ShieldCheck size={18} weight="duotone" />
                </div>
                <div>
                  <div>Zero Login Persistence</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>Automatic file purge after printing</div>
                </div>
              </button>

              <button
                onClick={() => scrollToSection('quotas')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <div style={{ background: 'rgba(127, 166, 138, 0.12)', color: 'var(--accent-sage)', padding: '6px', borderRadius: 'var(--radius-xs)', display: 'flex' }}>
                  <ChartPieSlice size={18} weight="duotone" />
                </div>
                <div>
                  <div>Campus Quota System</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>400 B&W + 20 Color pages included</div>
                </div>
              </button>
            </div>

            {/* Mobile CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/register');
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #7fa68a 0%, #689274 100%)',
                  color: 'var(--text-inverse)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(127, 166, 138, 0.3)',
                }}
              >
                <UserPlus size={18} weight="bold" />
                <span>Create Student Account</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-primary)',
                  padding: '11px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <SignIn size={18} weight="bold" />
                <span>Sign In to Print Queue</span>
              </button>
            </div>

            {/* Campus Security Note */}
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--accent-sage)" />
              <span>Campus Network Verified • Public PC Safe</span>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
