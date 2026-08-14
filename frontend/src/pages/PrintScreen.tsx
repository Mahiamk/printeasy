import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { jobsApi, PrintJob } from '../api/jobs';
import { codeApi } from '../api/code';
import {
  Printer,
  ArrowLeft,
  CheckCircle,
  FilePdf,
  FileDoc,
  FileImage,
  FileText,
  Key,
  Copy,
  Check,
  ArrowSquareOut,
  Spinner,
} from '@phosphor-icons/react';

import { ConfirmModal } from '../components/common/ConfirmModal';

export const PrintScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<PrintJob | null>(null);
  const [printingCode, setPrintingCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [marking, setMarking] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    const fetchJobAndCode = async () => {
      try {
        const [jobData, codeData] = await Promise.all([
          jobsApi.get(id),
          codeApi.get(),
        ]);
        setJob(jobData);
        setPrintingCode(codeData.code);
      } catch (err) {
        console.error('Failed to load print job', err);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchJobAndCode();
  }, [id, navigate]);

  const handleDirectPrint = () => {
    if (!job) return;

    // Direct browser print trigger
    const existingFrame = document.getElementById('print-target-iframe');
    if (existingFrame) {
      existingFrame.remove();
    }

    // Try iframe print for PDFs and images
    const iframe = document.createElement('iframe');
    iframe.id = 'print-target-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = job.blob_url;

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        // Fallback: Open in dedicated print tab and invoke print
        const printWindow = window.open(job.blob_url, '_blank');
        printWindow?.focus();
        setTimeout(() => printWindow?.print(), 500);
      }
    };

    document.body.appendChild(iframe);
  };

  // Keyboard shortcut Ctrl+P / Cmd+P listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleDirectPrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job]);

  const handleOpenFile = () => {
    if (!job) return;
    window.open(job.blob_url, '_blank');
  };

  const handleConfirmMarkPrinted = async () => {
    if (!job) return;
    setMarking(true);
    try {
      await jobsApi.markPrinted(job.id);
      setShowConfirmModal(false);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to mark job as printed.');
    } finally {
      setMarking(false);
    }
  };

  const handleCopyCode = () => {
    if (!printingCode) return;
    navigator.clipboard.writeText(printingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string, name: string) => {
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return <FilePdf size={36} weight="duotone" color="var(--accent-rose)" />;
    }
    if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
      return <FileDoc size={36} weight="duotone" color="var(--accent-blue)" />;
    }
    if (mime.startsWith('image/') || name.match(/\.(png|jpe?g|gif|webp)$/i)) {
      return <FileImage size={36} weight="duotone" color="var(--accent-sage)" />;
    }
    return <FileText size={36} weight="duotone" color="var(--text-secondary)" />;
  };

  if (loading || !job) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <Spinner size={36} className="animate-spin" color="var(--accent-sage)" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Back link */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-muted)',
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Print Queue</span>
      </button>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Large Printing Code Screen Focus */}
        <div
          className="pulse-code-glow responsive-card"
          style={{
            background: 'var(--bg-card)',
            border: '2px solid rgba(212, 163, 89, 0.4)',
            borderRadius: 'var(--radius-xl)',
            padding: '36px 20px',
            textAlign: 'center',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-glow-amber)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Key size={22} weight="duotone" color="var(--accent-amber)" />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-amber)' }}>
              Printer Release Keypad Code
            </span>
          </div>

          <div
            className="responsive-pin-code"
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: '56px',
              fontWeight: 800,
              color: 'var(--accent-amber)',
              letterSpacing: '0.18em',
              margin: '10px 0 14px',
              textShadow: '0 0 25px rgba(212, 163, 89, 0.3)',
              wordBreak: 'break-all',
            }}
          >
            {printingCode || 'NO CODE SET'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {printingCode ? (
              <button
                onClick={handleCopyCode}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {copied ? <Check size={16} color="var(--accent-sage)" /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy PIN'}</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/code')}
                style={{
                  background: 'var(--accent-amber)',
                  color: 'var(--text-inverse)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                Save Code in Printing Code
              </button>
            )}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px' }}>
            Type these digits on the printer's physical keypad when prompted.
          </p>
        </div>

        {/* Document Details Card */}
        <div
          className="responsive-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                background: 'var(--bg-elevated)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getFileIcon(job.file_type, job.file_name)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {job.file_name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span
                  style={{
                    background: job.color_mode === 'color' ? 'var(--accent-rose-subtle)' : 'var(--accent-sage-subtle)',
                    color: job.color_mode === 'color' ? 'var(--accent-rose)' : 'var(--accent-sage)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 600,
                    fontSize: '11px',
                  }}
                >
                  {job.color_mode === 'color' ? '🎨 Color' : '📄 Black & White'} • {job.page_count || 1} {(job.page_count || 1) === 1 ? 'page' : 'pages'}
                </span>
                <span>{formatSize(job.file_size)}</span>
                <span>•</span>
                <span>Uploaded: {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Primary: Direct Print Dialog */}
          <button
            onClick={handleDirectPrint}
            style={{
              width: '100%',
              background: 'var(--accent-sage)',
              color: 'var(--text-inverse)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-glow-sage)',
            }}
          >
            <Printer size={22} weight="bold" />
            <span>Send to Connected Printer (Ctrl + P)</span>
          </button>

          {/* Secondary Options */}
          <div className="grid-2col">
            <button
              onClick={handleOpenFile}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ArrowSquareOut size={18} weight="duotone" />
              <span>View in New Tab</span>
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={marking}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--accent-sage)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {marking ? (
                <Spinner size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={18} weight="duotone" />
                  <span>Done / Remove File</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmMarkPrinted}
          loading={marking}
          variant="success"
          fileName={job?.file_name}
          title="Mark as Printed & Purge"
          description="Mark this document as printed? For your security and privacy on shared library lab PCs, this file will be permanently deleted from cloud storage immediately."
          confirmLabel="Yes, Purge & Finish"
          cancelLabel="Keep in Queue"
        />
      </div>
    </AppLayout>
  );
};
