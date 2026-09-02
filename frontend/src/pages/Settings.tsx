import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  UserCircle,
  ShieldCheck,
  Palette,
  FileText,
  Clock,
  Trash,
  CheckCircle,
  Gear,
  QrCode,
} from '@phosphor-icons/react';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats } = useData();

  return (
    <AppLayout>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Account Settings & Preferences
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Manage your student profile, quota allocations, and privacy policies
          </p>
        </div>

        {/* Student Profile Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UserCircle size={22} weight="duotone" color="var(--accent-blue)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Student Account Profile
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Email Address
              </label>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  marginTop: '4px',
                }}
              >
                {user?.email}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Account ID
              </label>
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '12px',
                  marginTop: '4px',
                }}
              >
                {user?.id}
              </div>
            </div>
          </div>
        </div>

        {/* Linked Devices & QR Login Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={22} weight="duotone" color="var(--accent-sage)" />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Linked Devices & QR Login
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/link-device')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent-sage)',
                color: 'var(--text-inverse)',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow-sage)',
              }}
            >
              <QrCode size={16} />
              <span>Link New Device</span>
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            Instantly log in to library workstations, secondary computers, or tablet screens by scanning the QR code displayed on their login screen.
          </p>
        </div>

        {/* Quota Policy Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Gear size={22} weight="duotone" color="var(--accent-sage)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Library Quota Allowances
            </h3>
          </div>

          <div className="grid-2col" style={{ marginBottom: '14px' }}>
            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Palette size={18} weight="duotone" color="var(--accent-rose)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Color Printing</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-rose)' }}>
                {stats?.color_quota_remaining ?? 20} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 20 pages remaining</span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <FileText size={18} weight="duotone" color="var(--accent-sage)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>B&W Printing</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-sage)' }}>
                {stats?.bw_quota_remaining ?? 400} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 400 pages remaining</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Quotas are assigned per semester. Contact library administration if you require additional allocations for thesis or coursework printing.
          </p>
        </div>

        {/* Automatic Privacy & Cleanup Card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={22} weight="duotone" color="var(--accent-blue)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Privacy & Auto-Purge Policies
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <CheckCircle size={18} weight="duotone" color="var(--accent-sage)" />
              <span><strong>24-Hour File Expiry:</strong> All uploaded documents auto-delete after 24 hours.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <CheckCircle size={18} weight="duotone" color="var(--accent-sage)" />
              <span><strong>Immediate Purge:</strong> Files are wiped from cloud storage immediately upon clicking "Mark as Printed".</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <CheckCircle size={18} weight="duotone" color="var(--accent-sage)" />
              <span><strong>Client Isolation:</strong> Sessions are authenticated via signed JWTs with zero shared computer file caching.</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
