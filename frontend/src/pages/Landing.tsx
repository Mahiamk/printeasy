import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  ShieldCheck,
  Key,
  DeviceMobile,
  ArrowRight,
  Sparkle,
} from '@phosphor-icons/react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>PrintEasy</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              padding: '8px 12px',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'var(--accent-sage)',
              color: 'var(--text-inverse)',
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Get Started</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '56px 20px 48px',
          textAlign: 'center',
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
            fontWeight: 500,
            marginBottom: '20px',
          }}
        >
          <Sparkle size={16} weight="duotone" />
          <span>School Library Printing Solved</span>
        </div>

        <h1
          className="responsive-hero-title"
          style={{
            fontSize: '48px',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
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
          Students often log into WhatsApp or Telegram on public lab computers to print documents, risking privacy breaches.
          PrintEasy gives you an isolated, encrypted print queue with your school keypad code ready on release.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'var(--accent-sage)',
              color: 'var(--text-inverse)',
              fontSize: '15px',
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-glow-sage)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition-fast)',
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
              fontWeight: 500,
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Access My Queue
          </button>
        </div>
      </section>

      {/* Feature Grid */}
      <section
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '32px 24px 96px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}
      >
        <div
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
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <DeviceMobile size={24} weight="duotone" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Upload from Any Device</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Upload PDFs, DOCX, and images from your smartphone, tablet, or home laptop. Files wait in your queue for 24 hours.
          </p>
        </div>

        <div
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
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <Key size={24} weight="duotone" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Saved School Release Code</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Never forget your physical printer PIN. PrintEasy encrypts it with AES-256-GCM and displays it clearly on the print screen.
          </p>
        </div>

        <div
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
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <ShieldCheck size={24} weight="duotone" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Zero Leftover Traces</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Marking a file as printed immediately purges the document from cloud storage. Auto-cleanup deletes expired files after 24 hours.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '28px 48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        PrintEasy — Student Privacy & Library Print Queue System
      </footer>
    </div>
  );
};
