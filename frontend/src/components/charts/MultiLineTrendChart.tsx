import React, { useState, useMemo, useRef } from 'react';
import * as d3Shape from 'd3-shape';
import * as d3Scale from 'd3-scale';
import { PrintTrendPoint } from '../../api/superadmin';
import { Spinner } from '@phosphor-icons/react';

interface MultiLineTrendChartProps {
  data: PrintTrendPoint[];
  period: 'daily' | 'weekly' | 'monthly';
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly') => void;
  loading?: boolean;
}

export const MultiLineTrendChart: React.FC<MultiLineTrendChartProps> = ({
  data,
  period,
  onPeriodChange,
  loading = false,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Totals for the current interval
  const totalBwPages = useMemo(() => data.reduce((acc, d) => acc + d.bw_pages, 0), [data]);
  const totalColorPages = useMemo(() => data.reduce((acc, d) => acc + d.color_pages, 0), [data]);
  const totalAllPages = totalBwPages + totalColorPages;

  // Chart dimensions
  const width = 800;
  const height = 300;
  const margin = { top: 24, right: 30, bottom: 40, left: 45 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const { xScale, yScale, yMax, yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        xScale: () => 0,
        yScale: () => 0,
        yMax: 10,
        yTicks: [0, 5, 10],
      };
    }

    const maxVal = Math.max(
      ...data.map((d) => Math.max(d.bw_pages, d.color_pages)),
      5
    );
    // Round yMax to a nice number
    const calculatedYMax = Math.ceil(maxVal * 1.15);

    const x = d3Scale
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    const y = d3Scale
      .scaleLinear()
      .domain([0, calculatedYMax])
      .range([innerHeight, 0]);

    const ticks = y.ticks(5);

    return { xScale: x, yScale: y, yMax: calculatedYMax, yTicks: ticks };
  }, [data, innerWidth, innerHeight]);

  // Generators for B&W
  const bwLine = useMemo(() => {
    if (!data || data.length === 0) return '';
    return (
      d3Shape
        .line<PrintTrendPoint>()
        .x((_, i) => xScale(i))
        .y((d) => yScale(d.bw_pages))
        .curve(d3Shape.curveMonotoneX)(data) || ''
    );
  }, [data, xScale, yScale]);

  const bwArea = useMemo(() => {
    if (!data || data.length === 0) return '';
    return (
      d3Shape
        .area<PrintTrendPoint>()
        .x((_, i) => xScale(i))
        .y0(innerHeight)
        .y1((d) => yScale(d.bw_pages))
        .curve(d3Shape.curveMonotoneX)(data) || ''
    );
  }, [data, xScale, yScale, innerHeight]);

  // Generators for Color
  const colorLine = useMemo(() => {
    if (!data || data.length === 0) return '';
    return (
      d3Shape
        .line<PrintTrendPoint>()
        .x((_, i) => xScale(i))
        .y((d) => yScale(d.color_pages))
        .curve(d3Shape.curveMonotoneX)(data) || ''
    );
  }, [data, xScale, yScale]);

  const colorArea = useMemo(() => {
    if (!data || data.length === 0) return '';
    return (
      d3Shape
        .area<PrintTrendPoint>()
        .x((_, i) => xScale(i))
        .y0(innerHeight)
        .y1((d) => yScale(d.color_pages))
        .curve(d3Shape.curveMonotoneX)(data) || ''
    );
  }, [data, xScale, yScale, innerHeight]);

  // Handle pointer tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!data || data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    const chartX = svgX - margin.left;

    if (chartX < 0 || chartX > innerWidth) {
      setHoverIndex(null);
      return;
    }

    const step = innerWidth / (data.length - 1 || 1);
    const index = Math.min(
      data.length - 1,
      Math.max(0, Math.round(chartX / step))
    );
    setHoverIndex(index);
  };

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        position: 'relative',
      }}
    >
      {/* Header & Interval Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Print Volume Trends (Color vs. B&W)
            </h3>
            {loading && <Spinner size={18} className="animate-spin" color="var(--accent-sage)" />}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
            System-wide printed pages comparison over time
          </p>
        </div>

        {/* Interval Selector Switcher */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            gap: '2px',
          }}
        >
          {(['daily', 'weekly', 'monthly'] as const).map((p) => {
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  background: isActive ? 'var(--accent-sage)' : 'transparent',
                  color: isActive ? '#0f141c' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {p === 'daily' ? 'Daily (14D)' : p === 'weekly' ? 'Weekly (12W)' : 'Monthly (12M)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'var(--accent-sage, #7fa382)',
              boxShadow: '0 0 8px rgba(127, 163, 130, 0.4)',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Black & White:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalBwPages.toLocaleString()} pages</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'var(--accent-amber, #e5a93c)',
              boxShadow: '0 0 8px rgba(229, 169, 60, 0.4)',
            }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Color Prints:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalColorPages.toLocaleString()} pages</strong>
          </span>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
          Total in timeframe:{' '}
          <strong style={{ color: 'var(--accent-blue)' }}>{totalAllPages.toLocaleString()} pages</strong>
        </div>
      </div>

      {/* Main SVG Multi-Line Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* B&W Line Gradient Area */}
            <linearGradient id="bwGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7fa382" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#7fa382" stopOpacity="0.0" />
            </linearGradient>

            {/* Color Line Gradient Area */}
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e5a93c" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#e5a93c" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Horizontal Gridlines */}
            {yTicks.map((t) => {
              const y = yScale(t);
              return (
                <g key={t} opacity={0.35}>
                  <line
                    x1={0}
                    x2={innerWidth}
                    y1={y}
                    y2={y}
                    stroke="var(--border-card)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={-10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--text-muted)"
                    fontWeight={500}
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {bwArea && <path d={bwArea} fill="url(#bwGradient)" />}
            {colorArea && <path d={colorArea} fill="url(#colorGradient)" />}

            {/* B&W Stroke Line */}
            {bwLine && (
              <path
                d={bwLine}
                fill="none"
                stroke="#7fa382"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Color Stroke Line */}
            {colorLine && (
              <path
                d={colorLine}
                fill="none"
                stroke="#e5a93c"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Dots */}
            {data.map((d, i) => {
              const cx = xScale(i);
              const bwCy = yScale(d.bw_pages);
              const colorCy = yScale(d.color_pages);
              const isHovered = hoverIndex === i;

              return (
                <g key={i}>
                  {/* B&W Point */}
                  <circle
                    cx={cx}
                    cy={bwCy}
                    r={isHovered ? 6 : 3.5}
                    fill="#7fa382"
                    stroke="var(--bg-card)"
                    strokeWidth={2}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {/* Color Point */}
                  <circle
                    cx={cx}
                    cy={colorCy}
                    r={isHovered ? 6 : 3.5}
                    fill="#e5a93c"
                    stroke="var(--bg-card)"
                    strokeWidth={2}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                </g>
              );
            })}

            {/* Crosshair & Tooltip Overlay */}
            {activePoint && hoverIndex !== null && (
              <g>
                <line
                  x1={xScale(hoverIndex)}
                  x2={xScale(hoverIndex)}
                  y1={0}
                  y2={innerHeight}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              </g>
            )}

            {/* X-Axis Labels */}
            {data.map((d, i) => {
              // Only show alternate labels if data is large
              const stepInterval = data.length > 10 ? 2 : 1;
              if (i % stepInterval !== 0 && i !== data.length - 1) return null;

              const x = xScale(i);
              return (
                <text
                  key={i}
                  x={x}
                  y={innerHeight + 24}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--text-muted)"
                  fontWeight={500}
                >
                  {d.date_label}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Floating Dynamic Tooltip */}
      {activePoint && hoverIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: `${Math.min(
              Math.max(
                margin.left + xScale(hoverIndex) - 90,
                24
              ),
              width - 200
            )}px`,
            background: 'var(--bg-elevated, #1a202c)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: '170px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {activePoint.date_label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: '#7fa382', marginBottom: '4px' }}>
            <span>● B&W Pages:</span>
            <strong>{activePoint.bw_pages} ({activePoint.bw_jobs} jobs)</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '12px', color: '#e5a93c', marginBottom: '4px' }}>
            <span>● Color Pages:</span>
            <strong>{activePoint.color_pages} ({activePoint.color_jobs} jobs)</strong>
          </div>
          <div
            style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <span>Total Pages:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {activePoint.bw_pages + activePoint.color_pages}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};
