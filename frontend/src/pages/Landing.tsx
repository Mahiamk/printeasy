import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  ShieldCheck,
  Key,
  DeviceMobile,
  ArrowRight,
  Sparkle,
  ChartPieSlice,
  CheckCircle,
  LockKey,
} from '@phosphor-icons/react';
import { LandingNavbar } from '../components/landing/LandingNavbar';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Glassmorphic Navbar with Mobile Hamburger Drawer */}
      <LandingNavbar />

      {/* Hero Section */}
      <section
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '52px 20px 48px',
          textAlign: 'center',
          flex: '1 0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-sage-subtle)',
            color: 'var(--accent-sage)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(127, 166, 138, 0.15)',
          }}
        >
          <Sparkle size={16} weight="duotone" />
          <span>School Library Printing Solved</span>
        </div>

        <h1
          className="responsive-hero-title"
          style={{
            fontSize: '56px',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.035em',
            marginBottom: '22px',
            color: 'var(--text-primary)',
          }}
        >
          Print securely at the library, <br />
          <span style={{ color: 'var(--accent-sage)' }}>without leaving your personal accounts logged in.</span>
        </h1>

        <p
          className="responsive-hero-p"
          style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            maxWidth: '660px',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}
        >
          Students often log into WhatsApp or personal email on public lab computers to print documents, risking privacy breaches.
          PrintEasy gives you an isolated, encrypted print queue with your school keypad PIN ready on release.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'linear-gradient(135deg, #7fa68a 0%, #689274 100%)',
              color: 'var(--text-inverse)',
              fontSize: '15px',
              fontWeight: 700,
              padding: '13px 26px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 16px rgba(127, 166, 138, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
            }}
          >
            <span>Create Student Account</span>
            <ArrowRight size={18} weight="bold" />
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 600,
              padding: '13px 22px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Access My Queue
          </button>
        </div>
      </section>

      {/* Feature Grid */}
      <section
        id="features"
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '24px 20px 48px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Engineered for Campus Privacy
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Built specifically to prevent account hijacking on shared lab PCs
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Card 1 */}
          <div
            id="how-it-works"
            className="responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
            }}
          >
            <div
              style={{
                background: 'var(--accent-sage-subtle)',
                color: 'var(--accent-sage)',
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <DeviceMobile size={24} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Upload from Any Device
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Upload PDFs, Word files, and images from your smartphone, tablet, or laptop. Page counts are detected automatically.
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
            }}
          >
            <div
              style={{
                background: 'var(--accent-amber-subtle)',
                color: 'var(--accent-amber)',
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Key size={24} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Encrypted Release PIN Code
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Never forget your physical printer PIN. PrintEasy encrypts it with AES-256-GCM and displays it clearly with auto-hide protection.
            </p>
          </div>

          {/* Card 3 */}
          <div
            id="security"
            className="responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
            }}
          >
            <div
              style={{
                background: 'var(--accent-blue-subtle)',
                color: 'var(--accent-blue)',
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={24} weight="duotone" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Zero Leftover Traces
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Marking a file as printed immediately purges the document stream from cloud storage. Auto-cleanup wipes expired files after 24h.
            </p>
          </div>
        </div>
      </section>

      {/* Quotas Section */}
      <section
        id="quotas"
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '16px 20px 64px',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(38, 44, 64, 0.6) 0%, rgba(29, 33, 48, 0.8) 100%)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <div style={{ background: 'rgba(127, 166, 138, 0.15)', color: 'var(--accent-sage)', padding: '10px', borderRadius: 'var(--radius-full)', display: 'flex' }}>
            <ChartPieSlice size={28} weight="duotone" />
          </div>

          <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Transparent Campus Quota Tracking
          </h3>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '580px', lineHeight: 1.6 }}>
            Every registered student receives <strong>400 Black & White</strong> pages and <strong>20 Color</strong> pages per semester with real-time 7-day usage trends.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
            <div style={{ background: 'var(--bg-card)', padding: '12px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-sage)' }}>400 pgs</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Black & White Quota</div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '12px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-rose)' }}>20 pgs</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Color Print Quota</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
          background: 'var(--bg-sidebar)',
        }}
      >
        PrintEasy — Student Privacy & Library Print Queue System • AIU Campus
      </footer>
    </div>
  );
};
