import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import type { NetworkStats, StatsTrends } from '../lib/queries';
import { STATS_TRENDS } from '../lib/queries';
import { Sparkline, generateTrendData } from './Sparkline';

interface StatsCardsProps {
  stats?: NetworkStats;
  loading: boolean;
}

// Format delta for display (e.g., "+5" or "-3")
function formatDelta(value: number | undefined, suffix: string = ''): string {
  if (value === undefined || value === 0) return suffix ? `0${suffix}` : '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

// Format percentage delta (e.g., "↑ 2.1%")
function formatPctDelta(value: number | undefined): { text: string; color: string } {
  if (value === undefined || Math.abs(value) < 0.01) {
    return { text: '— no change', color: 'text-[var(--text-muted)]' };
  }
  const arrow = value > 0 ? '↑' : '↓';
  const color = value > 0 ? 'text-green-400' : 'text-red-400';
  return { text: `${arrow} ${Math.abs(value).toFixed(1)}%`, color };
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  // Fetch real trend data from API
  const { data: trendsData } = useQuery<{ statsTrends: StatsTrends }>(STATS_TRENDS, {
    pollInterval: 60000, // Refresh every minute
    fetchPolicy: 'cache-and-network',
  });

  const trends = trendsData?.statsTrends;
  const hourly = trends?.oneHour;
  const daily = trends?.twentyFourHour;

  // Generate sparkline data based on current values (visual only)
  const trendData = useMemo(() => {
    const agents = stats?.totalAgents ?? 0;
    const workflows = stats?.totalFibers ?? 0;
    const contracts = stats?.totalContracts ?? 0;
    
    return {
      fibers: generateTrendData(workflows, 0.15),
      agents: generateTrendData(agents, 0.15),
      contracts: generateTrendData(contracts, 0.2),
      snapshots: generateTrendData(stats?.lastSnapshotOrdinal ?? 0, 0.05),
      throughput: generateTrendData(hourly?.avgSnapshotsPerHour ?? 10, 0.3),
      success: generateTrendData(
        stats?.totalContracts ? (stats.completedContracts / stats.totalContracts) * 100 : 50,
        0.02
      ),
    };
  }, [stats, hourly?.avgSnapshotsPerHour]);

  // Calculate success rate
  const successRate = stats?.completedContracts && stats?.totalContracts 
    ? ((stats.completedContracts / stats.totalContracts) * 100).toFixed(1)
    : '0.0';

  // Calculate throughput (snapshots per minute as proxy for settlement speed)
  const throughput = hourly?.avgSnapshotsPerHour 
    ? (hourly.avgSnapshotsPerHour / 60).toFixed(1) 
    : '—';

  const successDelta = formatPctDelta(daily?.successRatePct);

  const cards = [
    { 
      label: 'TOTAL FIBERS', 
      value: stats?.totalFibers, 
      icon: '🧬',
      delta: hourly ? formatDelta(hourly.fibersDelta, ' (1h)') : 'All workflows',
      deltaColor: hourly?.fibersDelta && hourly.fibersDelta > 0 ? 'text-green-400' : 'text-blue-400',
      trend: trendData.fibers,
      trendColor: '#3b82f6',
    },
    { 
      label: 'AGENTS', 
      value: stats?.totalAgents, 
      icon: '🆔',
      delta: hourly ? formatDelta(hourly.agentsDelta, ' (1h)') : `${stats?.activeAgents || 0} active`,
      deltaColor: hourly?.agentsDelta && hourly.agentsDelta > 0 ? 'text-green-400' : 'text-purple-400',
      trend: trendData.agents,
      trendColor: '#a855f7',
    },
    { 
      label: 'CONTRACTS', 
      value: stats?.totalContracts, 
      icon: '📝',
      delta: hourly ? formatDelta(hourly.contractsDelta, ' (1h)') : `${stats?.completedContracts || 0} completed`,
      deltaColor: hourly?.contractsDelta && hourly.contractsDelta > 0 ? 'text-green-400' : 'text-green-400',
      trend: trendData.contracts,
      trendColor: '#22c55e',
    },
    { 
      label: 'SNAPSHOT', 
      value: `#${stats?.lastSnapshotOrdinal || 0}`,
      icon: '📸',
      delta: 'Latest ordinal',
      deltaColor: 'text-yellow-400',
      isString: true,
      trend: trendData.snapshots,
      trendColor: '#eab308',
    },
    { 
      label: 'THROUGHPUT', 
      value: `${throughput}/m`,
      icon: '⚡',
      delta: hourly ? `${hourly.avgSnapshotsPerHour?.toFixed(1) ?? '—'}/hr avg` : 'Snapshots/min',
      deltaColor: 'text-orange-400',
      isString: true,
      trend: trendData.throughput,
      trendColor: '#f97316',
    },
    { 
      label: 'SUCCESS RATE', 
      value: `${successRate}%`,
      icon: '✅',
      delta: successDelta.text,
      deltaColor: successDelta.color,
      isString: true,
      trend: trendData.success,
      trendColor: '#22c55e',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div 
          key={card.label} 
          className="card group hover:glow-purple transition-all duration-300 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">
                {card.label}
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <span className={`text-2xl font-bold ${card.isString ? 'text-[var(--accent-2)]' : 'gradient-text'}`}>
                {loading ? '...' : (card.isString ? card.value : card.value?.toLocaleString() ?? '0')}
              </span>
              <div className={`text-xs mt-1 ${card.deltaColor}`}>
                {card.delta}
              </div>
            </div>
            <Sparkline 
              data={card.trend} 
              color={card.trendColor}
              width={50}
              height={24}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
