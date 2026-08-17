import React, { useRef, useState } from 'react';
import {
  CloudArrowUp,
  Spinner,
  WarningCircle,
  CheckCircle,
  Palette,
  FileText,
  Sparkle,
  Plus,
  Minus,
} from '@phosphor-icons/react';
import { jobsApi, PrintJob } from '../../api/jobs';
import { detectClientPageCount } from '../../utils/pageDetector';

interface DropZoneProps {
  onUploaded: (job: PrintJob) => void;
  colorQuotaRemaining?: number;
  bwQuotaRemaining?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onUploaded,
  colorQuotaRemaining = 20,
  bwQuotaRemaining = 400,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [pageCount, setPageCount] = useState<number>(1);
  const [detectedInfo, setDetectedInfo] = useState<{ name: string; pages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);

    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError(`"${file.name}" exceeds 20MB limit.`);
      return;
    }

    // Automatically determine page count from file
    let detected = 1;
    try {
      detected = await detectClientPageCount(file);
      setDetectedInfo({ name: file.name, pages: detected });
      setPageCount(detected);
    } catch {
      detected = pageCount;
    }

    // Check quota against detected page count
    const quotaLeft = colorMode === 'color' ? colorQuotaRemaining : bwQuotaRemaining;
    if (detected > quotaLeft) {
      setError(
        `Insufficient ${colorMode === 'color' ? 'Color' : 'B&W'} quota! Document has ${detected} pgs, but you only have ${quotaLeft} remaining.`
      );
      return;
    }

    setUploading(true);
    try {
      const job = await jobsApi.upload(file, colorMode, detected);
      setSuccess(`"${file.name}" queued (${job.page_count} ${job.page_count === 1 ? 'page' : 'pages'}, ${colorMode.toUpperCase()})!`);
      onUploaded(job);
      setDetectedInfo(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
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
        marginBottom: '20px',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Upload Document to Queue
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Page count is automatically detected from your file upon upload
        </p>
      </div>

      {/* Quota & Print Type Configuration Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          marginBottom: '14px',
        }}
      >
        {/* Color Mode Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Print Type:
            </span>
            <span style={{ fontSize: '11px', color: 'var(--accent-sage)', fontWeight: 600 }}>
              ✨ Auto page detection enabled
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-app)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              gap: '4px',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => setColorMode('bw')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12px',
                fontWeight: 600,
                background: colorMode === 'bw' ? 'var(--accent-sage)' : 'transparent',
                color: colorMode === 'bw' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <FileText size={16} weight="duotone" />
              <span>B&W ({bwQuotaRemaining} left)</span>
            </button>

            <button
              type="button"
              onClick={() => setColorMode('color')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '7px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '12px',
                fontWeight: 600,
                background: colorMode === 'color' ? 'var(--accent-rose)' : 'transparent',
                color: colorMode === 'color' ? 'var(--text-inverse)' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <Palette size={16} weight="duotone" />
              <span>Color ({colorQuotaRemaining} left)</span>
            </button>
          </div>
        </div>

        {/* Auto-detected Info Pill if file selected */}
        {detectedInfo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(127, 166, 138, 0.1)',
              border: '1px solid rgba(127, 166, 138, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
              📄 {detectedInfo.name}
            </span>
            <span style={{ color: 'var(--accent-sage)', fontWeight: 700 }}>
              {detectedInfo.pages} {detectedInfo.pages === 1 ? 'page' : 'pages'} detected
            </span>
          </div>
        )}
      </div>

      {/* Drop Zone Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging
            ? '2px dashed var(--accent-sage)'
            : '2px dashed rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-md)',
          padding: '28px 16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: isDragging ? 'var(--accent-sage-subtle)' : 'var(--bg-elevated)',
          transition: 'all var(--transition-fast)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Spinner size={32} className="animate-spin" color="var(--accent-sage)" />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Detecting pages & uploading to cloud storage...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '12px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--accent-sage)',
                display: 'flex',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <CloudArrowUp size={28} weight="duotone" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Click to upload or drag and drop
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                PDF, Word (DOCX), or Images (PNG, JPG, WEBP) • Up to 20MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Success Banner */}
      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-sage-subtle)',
            border: '1px solid rgba(127, 166, 138, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--accent-sage)',
            fontSize: '13px',
            marginTop: '12px',
          }}
        >
          <CheckCircle size={18} weight="fill" />
          <span>{success}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-rose-subtle)',
            border: '1px solid rgba(196, 132, 122, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            marginTop: '12px',
          }}
        >
          <WarningCircle size={18} weight="duotone" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
