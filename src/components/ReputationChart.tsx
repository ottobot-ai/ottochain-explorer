import { useMemo } from 'react';

interface ReputationPoint {
  reputation: number;
  delta: number;
  reason: string | null;
  recordedAt: string;
}

interface ReputationChartProps {
  data: ReputationPoint[];
  width?: number;
  height?: number;
  showTooltip?: boolean;
}

export function ReputationChart({ 
  data, 
  width = 400, 
  height = 150,
  showTooltip = true 
}: ReputationChartProps) {
  const chartData = useMemo(() => {
    if (data.length < 2) return null;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.reputation);
    const minVal = Math.min(...values) - 5;
    const maxVal = Math.max(...values) + 5;
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.reputation - minVal) / range) * chartHeight,
      ...d,
    }));

    // Create smooth path
    const linePath = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
    ).join(' ');

    // Create area fill path
    const areaPath = [
      `M ${padding.left},${padding.top + chartHeight}`,
      ...points.map((p, i) => `${i === 0 ? 'L' : ''} ${p.x},${p.y}`),
      `L ${padding.left + chartWidth},${padding.top + chartHeight}`,
      'Z'
    ].join(' ');

    // Y-axis ticks
    const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map(val => ({
      y: padding.top + chartHeight - ((val - minVal) / range) * chartHeight,
      label: Math.round(val),
    }));

    // X-axis labels (first, middle, last)
    const xLabels = [0, Math.floor(data.length / 2), data.length - 1].map(i => ({
      x: points[i].x,
      label: new Date(data[i].recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    return { points, linePath, areaPath, yTicks, xLabels, padding, chartWidth, chartHeight };
  }, [data, width, height]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        Not enough data for chart
      </div>
    );
  }

  const { points, linePath, areaPath, yTicks, xLabels, padding, chartHeight } = chartData;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="rep-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={tick.y}
          x2={width - padding.right}
          y2={tick.y}
          stroke="var(--border)"
          strokeDasharray="4 4"
          opacity={0.5}
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#rep-gradient)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill={p.delta > 0 ? 'var(--green)' : p.delta < 0 ? 'var(--red)' : 'var(--accent)'}
            stroke="var(--bg-card)"
            strokeWidth="2"
          />
          {showTooltip && (
            <title>
              {new Date(p.recordedAt).toLocaleDateString()}
              {'\n'}Rep: {p.reputation} ({p.delta > 0 ? '+' : ''}{p.delta})
              {p.reason && `\n${p.reason}`}
            </title>
          )}
        </g>
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={i}
          x={padding.left - 8}
          y={tick.y}
          textAnchor="end"
          dominantBaseline="middle"
          fill="var(--text-muted)"
          fontSize="10"
        >
          {tick.label}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={padding.top + chartHeight + 16}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="10"
        >
          {label.label}
        </text>
      ))}

      {/* Current value badge */}
      {points.length > 0 && (
        <g>
          <rect
            x={points[points.length - 1].x + 8}
            y={points[points.length - 1].y - 10}
            width={30}
            height={20}
            rx={4}
            fill="var(--accent)"
          />
          <text
            x={points[points.length - 1].x + 23}
            y={points[points.length - 1].y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
          >
            {points[points.length - 1].reputation}
          </text>
        </g>
      )}
    </svg>
  );
}
