import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { StatsPanel } from '../components/stats/StatsPanel';
import { DropZone } from '../components/upload/DropZone';
import { QueueTable } from '../components/queue/QueueTable';
import { PrintJob, jobsApi } from '../api/jobs';
import { StatsResponse, statsApi } from '../api/stats';
import { codeApi } from '../api/code';
import { useData } from '../context/DataContext';
import { Key, Gear, Copy, Check, QrCode } from '@phosphor-icons/react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, stats, printingCode, initialLoaded, addJob, removeJob } = useData();
  const [copied, setCopied] = useState<boolean>(false);

  const handleUploaded = (newJob: PrintJob) => {
    addJob(newJob);
  };

  const handleJobDeleted = (id: string) => {
    removeJob(id);
  };

  const handleCopyCode = () => {
    if (!printingCode) return;
    navigator.clipboard.writeText(printingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Library Print Queue
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Upload files from your device, then retrieve & print them at the library lab PC.
        </p>
      </div>

      {/* Sparkline Stats Panel */}
      <StatsPanel stats={stats} loading={!initialLoaded && !stats} />

      {/* Main Grid: Upload & Queue (left), Printing Code (right) */}
      <div className="dashboard-grid">
        {/* Left Column: Dropzone & Queue List */}
        <div>
          <DropZone
            onUploaded={handleUploaded}
            colorQuotaRemaining={stats?.color_quota_remaining ?? 20}
            bwQuotaRemaining={stats?.bw_quota_remaining ?? 400}
          />
          <QueueTable jobs={jobs} onJobDeleted={handleJobDeleted} onJobPrinted={handleJobDeleted} />
        </div>

        {/* Right Column: Printing Code Card & Quick Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
          {/* Printing Code Card */}
          <div
            className="responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Your Printing Code
                </h3>
              </div>
              <button
                onClick={() => navigate('/code')}
                style={{ color: 'var(--text-muted)', padding: '4px' }}
                title="Edit Printing Code"
              >
                <Gear size={16} weight="duotone" />
              </button>
            </div>

            {printingCode ? (
              <div
                style={{
                  background: 'var(--accent-amber-subtle)',
                  border: '1px solid rgba(212, 163, 89, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 12px',
                  textAlign: 'center',
                  marginBottom: '14px',
                }}
              >
                <span
                  className="responsive-pin-code"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--accent-amber)',
                    letterSpacing: '0.12em',
                    marginBottom: '10px',
                    wordBreak: 'break-all',
                  }}
                >
                  {printingCode}
                </span>

                <button
                  onClick={handleCopyCode}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {copied ? <Check size={14} color="var(--accent-sage)" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px dashed rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 14px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  No school printing code saved yet.
                </p>
                <button
                  onClick={() => navigate('/code')}
                  style={{
                    background: 'var(--accent-sage)',
                    color: 'var(--text-inverse)',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  Set Printing Code
                </button>
              </div>
            )}

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
              Type this code on the printer's keypad to release queued print jobs. Decrypted securely for your session.
            </p>
          </div>

          {/* Link Lab PC / Quick Login */}
          <div
            className="responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    background: 'var(--accent-sage-subtle)',
                    color: 'var(--accent-sage)',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                  }}
                >
                  <QrCode size={18} weight="duotone" />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Log In on Lab PC
                </h4>
              </div>
              <button
                onClick={() => navigate('/link-device')}
                style={{
                  background: 'var(--accent-sage)',
                  color: 'var(--text-inverse)',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: 'var(--shadow-glow-sage)',
                }}
              >
                <span>Scan QR</span>
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              At a library lab computer? Select <strong>Scan QR</strong> on its login screen and scan it with your phone to log in instantly.
            </p>
          </div>

          {/* Library Lab Quick Tips */}
          <div
            className="responsive-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 16px',
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              How Printing Works
            </h4>
            <ol style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>Log in to this site on any library lab PC.</li>
              <li>Click <strong>Print</strong> next to your queued file.</li>
              <li>Read your code on the screen and enter it on the physical printer keypad.</li>
              <li>File is printed and automatically wiped from storage.</li>
            </ol>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
