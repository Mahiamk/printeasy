import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrintJob, jobsApi } from '../../api/jobs';
import {
  FilePdf,
  FileDoc,
  FileImage,
  FileText,
  Printer,
  Trash,
  Clock,
  Tray,
} from '@phosphor-icons/react';

import { ConfirmModal } from '../common/ConfirmModal';

interface QueueTableProps {
  jobs: PrintJob[];
  onJobDeleted: (id: string) => void;
}

export const QueueTable: React.FC<QueueTableProps> = ({ jobs, onJobDeleted }) => {
  const navigate = useNavigate();
  const [deletingJob, setDeletingJob] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  const getFileIcon = (mime: string, name: string) => {
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return <FilePdf size={22} weight="duotone" color="var(--accent-rose)" />;
    }
    if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
      return <FileDoc size={22} weight="duotone" color="var(--accent-blue)" />;
    }
    if (mime.startsWith('image/') || name.match(/\.(png|jpe?g|gif|webp)$/i)) {
      return <FileImage size={22} weight="duotone" color="var(--accent-sage)" />;
    }
    return <FileText size={22} weight="duotone" color="var(--text-secondary)" />;
  };

  const handleConfirmDelete = async () => {
    if (!deletingJob) return;
    setIsDeleting(true);
    try {
      await jobsApi.delete(deletingJob.id);
      onJobDeleted(deletingJob.id);
      setDeletingJob(null);
    } catch (err) {
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
                  onClick={() => navigate(`/print/${job.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--accent-sage)',
                    color: 'var(--text-inverse)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Printer size={15} weight="bold" />
                  <span>Print</span>
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
