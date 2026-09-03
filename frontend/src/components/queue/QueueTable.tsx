import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PrintJob, jobsApi } from '../../api/jobs';
import { codeApi } from '../../api/code';
import { useData } from '../../context/DataContext';
import {
  FilePdf,
  FileDoc,
  FileImage,
  FileText,
  Printer,
  Trash,
  Clock,
  Tray,
  Key,
  Copy,
  Check,
  X,
  Spinner,
  WarningCircle,
  Eye,
  EyeSlash,
  CheckCircle,
  ArrowSquareOut,
  Plus,
  Minus,
  Sparkle,
  ChartPieSlice,
  Question,
  PaperPlaneTilt,
  Buildings,
  WifiHigh,
} from '@phosphor-icons/react';

import { CampusPrinter, RelayStatusResponse, printersApi } from '../../api/printers';
import { ConfirmModal } from '../common/ConfirmModal';

interface QueueTableProps {
  jobs: PrintJob[];
  onJobDeleted: (id: string) => void;
  onJobPrinted?: (id: string) => void;
}

export const QueueTable: React.FC<QueueTableProps> = ({ jobs, onJobDeleted, onJobPrinted }) => {
  const { stats, refreshStats } = useData();
  const [deletingJob, setDeletingJob] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Print modal state
  const [printingJob, setPrintingJob] = useState<PrintJob | null>(null);
  const [printingCode, setPrintingCode] = useState<string>('');
  const [codeRevealed, setCodeRevealed] = useState<boolean>(false);
  const [codeCountdown, setCodeCountdown] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<'idle' | 'loading' | 'printing' | 'error' | 'done'>('idle');
  const [printError, setPrintError] = useState<string>('');
  const [isMarkingPrinted, setIsMarkingPrinted] = useState<boolean>(false);

  // Campus Printer Destination & Relay State
  const [printers, setPrinters] = useState<CampusPrinter[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('toshiba-library-3525ac');
  const [isSpoolingNetwork, setIsSpoolingNetwork] = useState<boolean>(false);
  const [networkSpoolSuccessMsg, setNetworkSpoolSuccessMsg] = useState<string>('');
  const [userPinInput, setUserPinInput] = useState<string>('');
  const [relayStatus, setRelayStatus] = useState<RelayStatusResponse | null>(null);

  // Fetch campus printers list and relay status on mount
  useEffect(() => {
    printersApi.list().then((list) => {
      if (list && list.length > 0) {
        setPrinters(list);
        const def = list.find((p) => p.is_default) || list[0];
        setSelectedPrinterId(def.id);
      }
    }).catch(() => {});

    printersApi.getRelayStatus().then(setRelayStatus).catch(() => {});
    const interval = setInterval(() => {
      printersApi.getRelayStatus().then(setRelayStatus).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Preloaded blob URL for zero-delay synchronous print
  const preloadedBlobUrlRef = useRef<string | null>(null);

  // Interactive Quota / Print Settings
  const [selectedColorMode, setSelectedColorMode] = useState<'bw' | 'color'>('bw');
  const [selectedPages, setSelectedPages] = useState<number>(1);
  const [selectedCopies, setSelectedCopies] = useState<number>(1);

  // Auto-hide timer countdown for code
  useEffect(() => {
    if (codeCountdown <= 0) {
      if (codeRevealed) setCodeRevealed(false);
      return;
    }
    const interval = setInterval(() => {
      setCodeCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [codeCountdown, codeRevealed]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const getFileIcon = (mime: string, name: string, size: number = 22) => {
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return <FilePdf size={size} weight="duotone" color="var(--accent-rose)" />;
    }
    if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
      return <FileDoc size={size} weight="duotone" color="var(--accent-blue)" />;
    }
    if (mime.startsWith('image/') || name.match(/\.(png|jpe?g|gif|webp)$/i)) {
      return <FileImage size={size} weight="duotone" color="var(--accent-sage)" />;
    }
    return <FileText size={size} weight="duotone" color="var(--text-secondary)" />;
  };

  const isDocx = (job: PrintJob) => {
    return job.file_type.includes('word') || job.file_name.endsWith('.docx') || job.file_name.endsWith('.doc');
  };

  const resolveFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    return baseUrl ? `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}` : url;
  };

  const fetchFileBlob = async (url: string) => {
    const targetUrl = resolveFileUrl(url);
    const token = localStorage.getItem('printeasy_token');
    return await fetch(targetUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  // Pre-load document blob stream when modal opens
  const preloadBlob = useCallback(async (job: PrintJob) => {
    if (preloadedBlobUrlRef.current) {
      URL.revokeObjectURL(preloadedBlobUrlRef.current);
      preloadedBlobUrlRef.current = null;
    }
    if (job.status === 'printed') return; // File already purged from storage

    try {
      const response = await fetchFileBlob(job.blob_url);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          preloadedBlobUrlRef.current = URL.createObjectURL(blob);
        }
      }
    } catch {
      // Direct fallback handles it on click
    }
  }, []);

  const triggerIframePrint = useCallback(async (job: PrintJob) => {
    setPrintStatus('loading');
    setPrintError('');

    if (job.status === 'printed') {
      setPrintStatus('error');
      setPrintError('This document was already printed and its file stream was purged for privacy.');
      return;
    }

    // Clean up previous print iframe
    const existingFrame = document.getElementById('print-target-iframe');
    if (existingFrame) existingFrame.remove();

    try {
      let localUrl = preloadedBlobUrlRef.current;
      if (!localUrl) {
        const response = await fetchFileBlob(job.blob_url);
        if (response.status === 404) {
          throw new Error('Document file not found in storage (it may have expired or been purged after printing).');
        }
        if (!response.ok) {
          throw new Error(`Storage error (${response.status}): Could not load file stream.`);
        }
        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Retrieved document is empty.');
        }
        localUrl = URL.createObjectURL(blob);
        preloadedBlobUrlRef.current = localUrl;
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'print-target-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.src = localUrl;

      iframe.onload = () => {
        setPrintStatus('printing');
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.open(localUrl, '_blank')?.print();
        }

        setTimeout(() => {
          iframe.remove();
        }, 4000);
      };

      iframe.onerror = () => {
        setPrintStatus('error');
        setPrintError('Browser blocked iframe rendering. Try opening the document in a new tab.');
        iframe.remove();
      };

      document.body.appendChild(iframe);
    } catch (err: any) {
      setPrintStatus('error');
      setPrintError(err?.message || 'Failed to prepare document for printing.');
    }
  }, []);

  const handlePrintClick = useCallback(
    async (job: PrintJob) => {
      setPrintingJob(job);
      setPrintStatus('idle');
      setPrintError('');
      setCodeRevealed(false);
      setCodeCountdown(0);
      setCopied(false);

      // Initialize interactive settings from job metadata
      setSelectedColorMode(job.color_mode === 'color' ? 'color' : 'bw');
      setSelectedPages(job.page_count || 1);
      setSelectedCopies(1);

      // Preload blob stream in background for zero-delay printing
      if (!isDocx(job)) {
        preloadBlob(job);
      }

      // Fetch user's release keypad code
      try {
        const codeData = await codeApi.get();
        const initialPin = codeData.code || '';
        setPrintingCode(initialPin);
        setUserPinInput(initialPin);
      } catch {
        setPrintingCode('');
        setUserPinInput('');
      }
    },
    [preloadBlob]
  );

  const handleRevealCode = () => {
    setCodeRevealed(true);
    setCodeCountdown(12); // auto hide in 12s on shared PC
  };

  const handleHideCode = () => {
    setCodeRevealed(false);
    setCodeCountdown(0);
  };

  const handleCopyCode = () => {
    const codeToCopy = userPinInput || printingCode;
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quota calculation
  const totalPagesToPrint = selectedPages * selectedCopies;
  const currentBwRemaining = stats?.bw_quota_remaining ?? 400;
  const currentColorRemaining = stats?.color_quota_remaining ?? 20;
  const isQuotaExceeded =
    selectedColorMode === 'color'
      ? totalPagesToPrint > currentColorRemaining
      : totalPagesToPrint > currentBwRemaining;

  const handleMarkPrinted = async (purgeFile: boolean = true) => {
    if (!printingJob) return;
    setIsMarkingPrinted(true);
    try {
      await jobsApi.markPrinted(printingJob.id, {
        color_mode: selectedColorMode,
        page_count: selectedPages,
        copies: selectedCopies,
        purge_file: purgeFile,
      });
      await refreshStats();
      onJobPrinted?.(printingJob.id);
      closePrintModal();
    } catch (err: any) {
      setPrintError(err?.response?.data?.detail || 'Failed to update print status in database.');
    } finally {
      setIsMarkingPrinted(false);
    }
  };

  const handleDirectNetworkSpool = async () => {
    if (!printingJob || !selectedPrinterId) return;
    setIsSpoolingNetwork(true);
    setPrintError('');
    setNetworkSpoolSuccessMsg('');
    try {
      const pinToSend = (userPinInput || printingCode || '').trim();
      const res = await printersApi.spoolJob(printingJob.id, {
        printer_id: selectedPrinterId,
        pin_code: pinToSend,
        color_mode: selectedColorMode,
        page_count: selectedPages,
        copies: selectedCopies,
        purge_file: false, // Keep document in queue so user can reprint if desired
      });
      setNetworkSpoolSuccessMsg(res.message);
      setPrintStatus('done');
      await refreshStats();
      onJobPrinted?.(printingJob.id);
    } catch (err: any) {
      setPrintError(err?.response?.data?.detail || 'Failed to send document to campus printer over network.');
      setPrintStatus('error');
    } finally {
      setIsSpoolingNetwork(false);
    }
  };

  const closePrintModal = () => {
    setPrintingJob(null);
    setPrintStatus('idle');
    setPrintError('');
    setNetworkSpoolSuccessMsg('');
    setCodeRevealed(false);
    setCodeCountdown(0);
    setCopied(false);
    if (preloadedBlobUrlRef.current) {
      URL.revokeObjectURL(preloadedBlobUrlRef.current);
      preloadedBlobUrlRef.current = null;
    }
    const frame = document.getElementById('print-target-iframe');
    if (frame) frame.remove();
  };

  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    setIsDeleting(true);
    try {
      await jobsApi.delete(deletingJob.id);
      onJobDeleted(deletingJob.id);
      setDeletingJob(null);
    } catch {
      alert('Failed to delete print job');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="responsive-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Active Print Queue
          </h3>
          <span
            style={{
              background: 'var(--accent-sage-subtle)',
              color: 'var(--accent-sage)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {jobs.length} {jobs.length === 1 ? 'file' : 'files'}
          </span>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div
          style={{
            padding: '36px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-elevated)',
              padding: '14px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <Tray size={32} weight="duotone" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              No documents in queue
            </p>
            <p style={{ fontSize: '12px', marginTop: '2px' }}>
              Upload your documents above from your phone or laptop to print them at the library.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                width: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              {/* File Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 180px' }}>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  {getFileIcon(job.file_type, job.file_name)}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={job.file_name}
                  >
                    {job.file_name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    <span
                      style={{
                        background: job.color_mode === 'color' ? 'var(--accent-rose-subtle)' : 'var(--accent-sage-subtle)',
                        color: job.color_mode === 'color' ? 'var(--accent-rose)' : 'var(--accent-sage)',
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-xs)',
                        fontWeight: 600,
                        fontSize: '10px',
                      }}
                    >
                      {job.color_mode === 'color' ? '🎨 Color' : '📄 B&W'} • {job.page_count || 1} pg
                    </span>
                    {job.status === 'printed' && (
                      <span
                        style={{
                          background: 'rgba(127, 166, 138, 0.15)',
                          color: 'var(--accent-sage)',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-xs)',
                          fontWeight: 700,
                          fontSize: '10px',
                        }}
                      >
                        ✓ Printed
                      </span>
                    )}
                    <span>{formatSize(job.file_size)}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} weight="duotone" />
                      {formatExpiry(job.expires_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>
                <button
                  onClick={() => handlePrintClick(job)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: job.status === 'printed' ? 'var(--bg-elevated)' : 'var(--accent-sage)',
                    border: job.status === 'printed' ? '1px solid var(--border-subtle)' : 'none',
                    color: job.status === 'printed' ? 'var(--text-primary)' : 'var(--text-inverse)',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 700,
                    boxShadow: job.status === 'printed' ? 'none' : '0 2px 8px rgba(127, 166, 138, 0.25)',
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={15} weight={job.status === 'printed' ? 'regular' : 'bold'} />
                  <span>{job.status === 'printed' ? 'Reprint' : 'Print'}</span>
                </button>

                <button
                  onClick={() => setDeletingJob({ id: job.id, name: job.file_name })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--accent-rose-subtle)',
                    color: 'var(--accent-rose)',
                    padding: '7px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer',
                  }}
                  title="Remove from queue"
                >
                  <Trash size={15} weight="duotone" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ELEGANT PRINT CONFIRMATION MODAL
          "This webpage is trying to print. Do you want to print this webpage?"
         ══════════════════════════════════════════════════════════════ */}
      {printingJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 12, 18, 0.84)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePrintModal();
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '94vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, #1e2232 0%, #151824 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 28px 70px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.1) inset',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Elegant Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 22px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #7fa68a 0%, #5d876a 100%)',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    boxShadow: '0 0 16px rgba(127, 166, 138, 0.35)',
                  }}
                >
                  <Printer size={22} weight="bold" />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.01em',
                      margin: 0,
                    }}
                  >
                    Print Document Confirmation
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                    Library Station Direct Output
                  </p>
                </div>
              </div>

              <button
                onClick={closePrintModal}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
                title="Cancel & Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px' }}>
              {/* Prominent Confirmation Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(127, 166, 138, 0.12) 0%, rgba(127, 166, 138, 0.04) 100%)',
                  border: '1.5px solid rgba(127, 166, 138, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    background: 'var(--accent-sage)',
                    color: 'var(--text-inverse)',
                    padding: '8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Question size={18} weight="bold" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                    Print Destination & Settings
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Select your campus printer to print directly over network, or open the local browser print dialog.
                  </div>
                </div>
              </div>

              {/* Destination Campus Printer Selector */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Buildings size={16} weight="duotone" color="var(--accent-sage)" />
                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      Destination Campus Printer
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: relayStatus?.is_relay_active ? 'var(--accent-sage)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: relayStatus?.is_relay_active ? '#4ade80' : '#94a3b8',
                        display: 'inline-block',
                      }}
                    />
                    {relayStatus?.is_relay_active ? 'Library Relay Online' : 'Cloud Dispatch Ready'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {printers.map((p) => {
                    const isSelected = selectedPrinterId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPrinterId(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '1.5px solid var(--accent-sage)' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(127, 166, 138, 0.1)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              background: isSelected ? 'var(--accent-sage)' : 'var(--bg-elevated)',
                              color: isSelected ? 'var(--text-inverse)' : 'var(--text-muted)',
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                            }}
                          >
                            <Printer size={18} weight={isSelected ? 'fill' : 'regular'} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {p.location} • <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-sage)' }}>{p.host}:{p.port}</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ background: 'var(--accent-sage)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-full)', padding: '3px', display: 'flex' }}>
                            <Check size={12} weight="bold" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Print Settings & Quota Deductor */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ChartPieSlice size={16} weight="duotone" color="var(--accent-sage)" />
                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                      Print Configuration & Quota
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Match your print dialog settings
                  </span>
                </div>

                {/* 1. Color Mode Toggle */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Color Mode
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedColorMode('bw')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '9px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: selectedColorMode === 'bw' ? '1.5px solid var(--accent-sage)' : '1px solid var(--border-subtle)',
                        background: selectedColorMode === 'bw' ? 'var(--accent-sage-subtle)' : 'var(--bg-card)',
                        color: selectedColorMode === 'bw' ? 'var(--accent-sage)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>📄 Black & White</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedColorMode('color')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '9px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: selectedColorMode === 'color' ? '1.5px solid var(--accent-rose)' : '1px solid var(--border-subtle)',
                        background: selectedColorMode === 'color' ? 'var(--accent-rose-subtle)' : 'var(--bg-card)',
                        color: selectedColorMode === 'color' ? 'var(--accent-rose)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span>🎨 Full Color</span>
                    </button>
                  </div>
                </div>

                {/* 2. Pages & Copies Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  {/* Pages */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Pages to Print
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPages((p) => Math.max(1, p - 1))}
                        style={{ padding: '8px 10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={selectedPages}
                        onChange={(e) => setSelectedPages(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedPages((p) => p + 1)}
                        style={{ padding: '8px 10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Copies */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Copies
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCopies((c) => Math.max(1, c - 1))}
                        style={{ padding: '8px 10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={selectedCopies}
                        onChange={(e) => setSelectedCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedCopies((c) => c + 1)}
                        style={{ padding: '8px 10px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Live Quota Breakdown */}
                <div
                  style={{
                    background: isQuotaExceeded ? 'rgba(196, 132, 122, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: isQuotaExceeded ? '1px solid rgba(196, 132, 122, 0.35)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isQuotaExceeded ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                      Total to Deduct: {totalPagesToPrint} {selectedColorMode === 'color' ? 'Color' : 'B&W'} pages
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ({selectedPages} pages × {selectedCopies} {selectedCopies === 1 ? 'copy' : 'copies'})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Remaining Balance</div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isQuotaExceeded ? 'var(--accent-rose)' : 'var(--accent-sage)',
                      }}
                    >
                      {selectedColorMode === 'color'
                        ? `${currentColorRemaining} left`
                        : `${currentBwRemaining} left`}
                    </div>
                  </div>
                </div>

                {isQuotaExceeded && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--accent-rose)', fontSize: '11px' }}>
                    <WarningCircle size={14} weight="duotone" />
                    <span>Exceeds remaining quota balance! Please lower copies/pages.</span>
                  </div>
                )}
              </div>

              {/* School Department Code Card */}
              <div
                style={{
                  background: 'linear-gradient(145deg, rgba(212, 163, 89, 0.12) 0%, rgba(212, 163, 89, 0.04) 100%)',
                  border: '1.5px solid rgba(212, 163, 89, 0.35)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Key size={16} weight="duotone" color="var(--accent-amber)" />
                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-amber)' }}>
                      Your School Department Code
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Auto-authenticates on printer
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={codeRevealed ? 'text' : 'password'}
                      value={userPinInput}
                      onChange={(e) => setUserPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
                      placeholder="Enter your Department Code (e.g. 12345)"
                      style={{
                        width: '100%',
                        background: 'var(--bg-card)',
                        border: '1.5px solid rgba(212, 163, 89, 0.4)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 42px 10px 14px',
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'var(--accent-amber)',
                        letterSpacing: codeRevealed ? '0.18em' : '0.25em',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCodeRevealed(!codeRevealed)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                      }}
                      title={codeRevealed ? 'Hide Code' : 'Reveal Code'}
                    >
                      {codeRevealed ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {userPinInput && (
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        padding: '11px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {copied ? <Check size={14} color="var(--accent-sage)" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, textAlign: 'left' }}>
                  ⚡ <strong>Direct Output:</strong> PrintEasy embeds your Department Code into the print stream. The Toshiba printer authenticates it automatically so your physical pages print immediately without any popup on the computer!
                </div>
              </div>

              {/* Network Spool Success Banner */}
              {networkSpoolSuccessMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    background: 'rgba(127, 166, 138, 0.15)',
                    border: '1.5px solid var(--accent-sage)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '14px',
                  }}
                >
                  <CheckCircle size={20} weight="fill" color="var(--accent-sage)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-sage)', marginBottom: '2px' }}>
                      Document Sent to Campus Printer!
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {networkSpoolSuccessMsg}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              {printStatus === 'loading' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'rgba(127, 166, 138, 0.08)',
                    border: '1px solid rgba(127, 166, 138, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '14px',
                  }}
                >
                  <Spinner size={16} className="animate-spin" color="var(--accent-sage)" />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {isSpoolingNetwork ? 'Spooling document to campus printer over socket...' : 'Preparing print stream...'}
                  </span>
                </div>
              )}

              {printStatus === 'printing' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'rgba(127, 166, 138, 0.12)',
                    border: '1px solid rgba(127, 166, 138, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '14px',
                  }}
                >
                  <Sparkle size={16} weight="fill" color="var(--accent-sage)" />
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    Print dialog opened! When finished, click the button below to deduct quota and purge.
                  </span>
                </div>
              )}

              {printStatus === 'error' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: 'var(--accent-rose-subtle)',
                    border: '1px solid rgba(196, 132, 122, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    marginBottom: '14px',
                  }}
                >
                  <WarningCircle size={16} weight="duotone" color="var(--accent-rose)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--accent-rose)' }}>{printError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Direct Network Spool Button (No Lab PC Needed) */}
                <button
                  type="button"
                  onClick={handleDirectNetworkSpool}
                  disabled={isSpoolingNetwork || printStatus === 'loading' || isQuotaExceeded}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #7fa68a 0%, #5d876a 100%)',
                    color: 'var(--text-inverse)',
                    padding: '13px 18px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(127, 166, 138, 0.35)',
                    border: 'none',
                    cursor: isSpoolingNetwork || printStatus === 'loading' || isQuotaExceeded ? 'not-allowed' : 'pointer',
                    opacity: isSpoolingNetwork || printStatus === 'loading' || isQuotaExceeded ? 0.6 : 1,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isSpoolingNetwork ? (
                    <Spinner size={18} className="animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={18} weight="bold" />
                  )}
                  <span>
                    {isSpoolingNetwork
                      ? 'Spooling to Printer...'
                      : `Send to ${printers.find((p) => p.id === selectedPrinterId)?.name || 'Toshiba 3525AC'} (Direct Network)`}
                  </span>
                </button>

                {/* 2. Secondary Row: Browser Print Dialog & View in Tab */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isDocx(printingJob) && (
                    <button
                      type="button"
                      onClick={() => triggerIframePrint(printingJob)}
                      disabled={printStatus === 'loading' || isQuotaExceeded}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: printStatus === 'loading' || isQuotaExceeded ? 'not-allowed' : 'pointer',
                        opacity: printStatus === 'loading' || isQuotaExceeded ? 0.6 : 1,
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <Printer size={16} weight="duotone" />
                      <span>Open Browser Print Dialog</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => window.open(resolveFileUrl(printingJob.blob_url), '_blank')}
                    style={{
                      flex: isDocx(printingJob) ? 1 : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowSquareOut size={16} weight="duotone" />
                    <span>View in Tab</span>
                  </button>
                </div>

                {/* 1. Complete & Purge File */}
                <button
                  type="button"
                  onClick={() => handleMarkPrinted(true)}
                  disabled={isMarkingPrinted || isQuotaExceeded}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'rgba(127, 166, 138, 0.15)',
                    border: '1px solid rgba(127, 166, 138, 0.35)',
                    color: 'var(--accent-sage)',
                    padding: '11px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isMarkingPrinted || isQuotaExceeded ? 'not-allowed' : 'pointer',
                    opacity: isMarkingPrinted || isQuotaExceeded ? 0.5 : 1,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isMarkingPrinted ? (
                    <Spinner size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} weight="duotone" />
                  )}
                  <span>
                    Print Completed — Deduct {totalPagesToPrint} {selectedColorMode === 'color' ? 'Color' : 'B&W'} pg & Purge
                  </span>
                </button>

                {/* 2. Keep in Queue / Reprint Later */}
                <button
                  type="button"
                  onClick={() => handleMarkPrinted(false)}
                  disabled={isMarkingPrinted || isQuotaExceeded}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    padding: '9px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isMarkingPrinted || isQuotaExceeded ? 'not-allowed' : 'pointer',
                    opacity: isMarkingPrinted || isQuotaExceeded ? 0.5 : 1,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span>Keep in Queue (Check Layout / Reprint Later)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingJob)}
        onClose={() => setDeletingJob(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        fileName={deletingJob?.name}
        title="Remove Document from Queue"
        description="Are you sure you want to remove this document from your queue? It will be deleted from cloud storage immediately."
        confirmLabel="Remove File"
        cancelLabel="Keep in Queue"
      />
    </div>
  );
};
