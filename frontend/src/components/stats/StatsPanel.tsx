import React from 'react';
import { StatsResponse } from '../../api/stats';
import { Sparkline } from './Sparkline';
import { Palette, FileText, UploadSimple, HardDrives } from '@phosphor-icons/react';

interface StatsPanelProps {
  stats: StatsResponse | null;
  loading?: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              height: '130px',
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    );
  }

  // Quota computations
  const colorUsed = stats.color_quota_used ?? 0;
  const colorTotal = stats.color_quota_total || 20;
  const colorRemaining = stats.color_quota_remaining ?? (colorTotal - colorUsed);
  const colorPercent = Math.min(100, Math.round((colorUsed / colorTotal) * 100));

  const bwUsed = stats.bw_quota_used ?? 0;
  const bwTotal = stats.bw_quota_total || 400;
  const bwRemaining = stats.bw_quota_remaining ?? (bwTotal - bwUsed);
  const bwPercent = Math.min(100, Math.round((bwUsed / bwTotal) * 100));

  // Sparkline data
  const colorSparkData = (stats.color_pages_per_day || []).map((d) => d.count);
  const colorSparkLabels = (stats.color_pages_per_day || []).map((d) => d.date);

  const bwSparkData = (stats.bw_pages_per_day || []).map((d) => d.count);
  const bwSparkLabels = (stats.bw_pages_per_day || []).map((d) => d.date);

  const uploadSparkData = (stats.uploads_per_day || []).map((d) => d.count);
  const uploadSparkLabels = (stats.uploads_per_day || []).map((d) => d.date);

  return (
    <div className="stats-grid">
      {/* Card 1: Color Printing Quota (20 Pages) */}
      <div
        className="responsive-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: 'var(--accent-rose-subtle)',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                }}
              >
                <Palette size={20} weight="duotone" color="var(--accent-rose)" />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Color Quota
              </span>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                background: colorRemaining <= 3 ? 'var(--accent-rose-subtle)' : 'var(--bg-elevated)',
                color: colorRemaining <= 3 ? 'var(--accent-rose)' : 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {colorRemaining} left
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {colorUsed}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {colorTotal} pages</span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: `${colorPercent}%`,
                height: '100%',
                background: colorPercent > 80 ? 'var(--accent-rose)' : 'var(--accent-rose)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>7-day Color trend</span>
          <Sparkline
            data={colorSparkData}
            labels={colorSparkLabels}
            unit=" pgs"
            color="var(--accent-rose)"
            width={90}
            height={26}
          />
        </div>
      </div>

      {/* Card 2: Black & White Quota (400 Pages) */}
      <div
        className="responsive-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  background: 'var(--accent-sage-subtle)',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                }}
              >
                <FileText size={20} weight="duotone" color="var(--accent-sage)" />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                B&W Quota
              </span>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--bg-elevated)',
                color: 'var(--accent-sage)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {bwRemaining} left
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {bwUsed}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {bwTotal} pages</span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: `${bwPercent}%`,
                height: '100%',
                background: 'var(--accent-sage)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>7-day B&W trend</span>
          <Sparkline
            data={bwSparkData}
            labels={bwSparkLabels}
            unit=" pgs"
            color="var(--accent-sage)"
            width={90}
            height={26}
          />
        </div>
      </div>

      {/* Card 3: Total Uploads & Queue Activity */}
      <div
        className="responsive-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div
              style={{
                background: 'var(--accent-blue-subtle)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
            >
              <UploadSimple size={20} weight="duotone" color="var(--accent-blue)" />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Upload Activity
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.total_uploads}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>total files</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            <span>⚡ {stats.total_printed} printed</span>
            <span>•</span>
            <span>⏳ {stats.total_queued} in queue</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daily uploads</span>
          <Sparkline
            data={uploadSparkData}
            labels={uploadSparkLabels}
            unit=" files"
            color="var(--accent-blue)"
            width={90}
            height={26}
          />
        </div>
      </div>

      {/* Card 4: Active Cloud Storage */}
      <div
        className="responsive-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div
              style={{
                background: 'var(--accent-amber-subtle)',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
              }}
            >
              <HardDrives size={20} weight="duotone" color="var(--accent-amber)" />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Queue Storage
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.storage_mb}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>MB active</span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '10px' }}>
            Auto-purged after 24h or immediately upon printing
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Encrypted storage</span>
          <span style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 600 }}>Active</span>
        </div>
      </div>
    </div>
  );
};
