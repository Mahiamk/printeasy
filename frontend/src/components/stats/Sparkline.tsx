import React, { useId, useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { area, line, curveMonotoneX } from 'd3-shape';

interface SparklineProps {
  data: number[];
  color?: string;
  fillColor?: string;
  width?: number;
  height?: number;
  labels?: string[];
  unit?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#7fa68a',
  fillColor,
  width = 120,
  height = 36,
  labels = [],
  unit = '',
}) => {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Compute smooth geometry with D3
  const { linePath, areaPath, points } = useMemo(() => {
    if (!data || data.length === 0) {
      return { linePath: '', areaPath: '', points: [] };
    }

    const padding = 3;
    const effectiveWidth = width;
    const effectiveHeight = height - padding * 2;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const domainMin = minVal === maxVal ? minVal - 1 : minVal;
    const domainMax = minVal === maxVal ? maxVal + 1 : maxVal;

    const xScale = scaleLinear()
      .domain([0, Math.max(data.length - 1, 1)])
      .range([padding, effectiveWidth - padding]);

    const yScale = scaleLinear()
      .domain([domainMin, domainMax])
      .range([effectiveHeight + padding, padding]);

    const lineGen = line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(curveMonotoneX);

    const areaGen = area<number>()
      .x((_, i) => xScale(i))
      .y0(height)
      .y1((d) => yScale(d))
      .curve(curveMonotoneX);

    const pts = data.map((d, i) => ({
      x: xScale(i),
      y: yScale(d),
      val: d,
      label: labels[i] || `Day ${i + 1}`,
    }));

    return {
      linePath: lineGen(data) || '',
      areaPath: areaGen(data) || '',
      points: pts,
    };
  }, [data, width, height, labels]);

  if (!data || data.length === 0) {
    return <div style={{ width, height }} />;
  }

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block', width, height }}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor || color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={fillColor || color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Filled Area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Stroke Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover interactive invisible columns */}
        {points.map((pt, i) => {
          const colWidth = width / points.length;
          return (
            <rect
              key={i}
              x={pt.x - colWidth / 2}
              y={0}
              width={colWidth}
              height={height}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {/* Active Point Highlight */}
        {activePoint && (
          <g>
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4"
              fill={color}
              stroke="#13151f"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {activePoint && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: `${activePoint.x}px`,
            transform: 'translateX(-50%) translateY(-4px)',
            background: '#1d2130',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#eceff4',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          <span style={{ color: '#9aa5b9', marginRight: '3px' }}>{activePoint.label}:</span>
          <strong>
            {activePoint.val}
            {unit}
          </strong>
        </div>
      )}
    </div>
  );
};
