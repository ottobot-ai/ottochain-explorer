interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  color = 'var(--accent)',
  className = ''
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  
  // Create gradient fill path
  const fillPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(' L ');
  const fillD = `M ${fillPoints} Z`;

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={fillD}
        fill={`url(#sparkline-gradient-${color.replace(/[^a-z0-9]/gi, '')})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        fill={color}
      />
    </svg>
  );
}

// Generate mock trend data for demo
export function generateTrendData(base: number, volatility: number = 0.1, points: number = 12): number[] {
  const data: number[] = [];
  let current = base * 0.7; // Start lower
  
  for (let i = 0; i < points; i++) {
    const trend = (base - current) * 0.15; // Trend toward base
    const noise = (Math.random() - 0.5) * base * volatility;
    current = Math.max(0, current + trend + noise);
    data.push(Math.round(current));
  }
  
  // Ensure last point is close to base
  data[data.length - 1] = base;
  return data;
}
