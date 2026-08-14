import React, { useRef, useState } from 'react';
import { CloudArrowUp, Spinner, WarningCircle, CheckCircle, Palette, FileText } from '@phosphor-icons/react';
import { jobsApi, PrintJob } from '../../api/jobs';

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

    // Check quota
    const quotaLeft = colorMode === 'color' ? colorQuotaRemaining : bwQuotaRemaining;
    if (pageCount > quotaLeft) {
      setError(
        `Insufficient ${colorMode === 'color' ? 'Color' : 'B&W'} quota! Need ${pageCount} pgs, have ${quotaLeft} left.`
      );
      return;
    }

    setUploading(true);
    try {
      const job = await jobsApi.upload(file, colorMode, pageCount);
      setSuccess(`"${file.name}" queued (${colorMode.toUpperCase()}, ${pageCount} pgs)!`);
      onUploaded(job);
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
          Select print type & page count before uploading
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
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Print Type:
          </span>
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
              }}
            >
              <FileText size={16} weight="duotone" />
              <span>B&W (400)</span>
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
              }}
            >
              <Palette size={16} weight="duotone" />
              <span>Color (20)</span>
            </button>
          </div>
        </div>

        {/* Page Count Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pages:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setPageCount((p) => Math.max(1, p - 1))}
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={pageCount}
                onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '44px',
                  height: '30px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  textAlign: 'center',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setPageCount((p) => p + 1)}
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ({colorMode === 'color' ? colorQuotaRemaining : bwQuotaRemaining} left)
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-rose-subtle)',
            border: '1px solid rgba(196, 132, 122, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--accent-rose)',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          <WarningCircle size={16} weight="duotone" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-sage-subtle)',
            border: '1px solid rgba(127, 166, 138, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            color: 'var(--accent-sage)',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          <CheckCircle size={16} weight="duotone" style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent-sage)' : 'rgba(255, 255, 255, 0.12)'}`,
          background: isDragging ? 'var(--accent-sage-subtle)' : 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 14px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition-normal)',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
          style={{ display: 'none' }}
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Spinner size={28} weight="bold" color="var(--accent-sage)" className="animate-spin" />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Uploading document ({pageCount} pgs)...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: colorMode === 'color' ? 'var(--accent-rose-subtle)' : 'var(--accent-sage-subtle)',
                color: colorMode === 'color' ? 'var(--accent-rose)' : 'var(--accent-sage)',
                padding: '12px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
              }}
            >
              <CloudArrowUp size={28} weight="duotone" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Tap to <span style={{ color: colorMode === 'color' ? 'var(--accent-rose)' : 'var(--accent-sage)' }}>browse file</span>
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Queue as <strong>{colorMode === 'color' ? '🎨 Color' : '📄 B&W'}</strong> • {pageCount} {pageCount === 1 ? 'page' : 'pages'} (PDF, DOCX, PNG, JPG ≤ 20MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
