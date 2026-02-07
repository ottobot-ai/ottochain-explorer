import { useQuery } from '@apollo/client/react';
import { CLUSTER_STATS } from '../lib/queries';
import type { ClusterStats } from '../lib/queries';

interface StatusBarProps {
  snapshotOrdinal: number | null;
}

export function StatusBar({ snapshotOrdinal }: StatusBarProps) {
  // Fetch real cluster stats from GraphQL
  const { data } = useQuery<{ clusterStats: ClusterStats }>(CLUSTER_STATS, {
    pollInterval: 10000, // Poll every 10 seconds
    fetchPolicy: 'cache-and-network',
  });

  const cluster = data?.clusterStats;
  const gl0Nodes = cluster?.gl0Nodes ?? 0;
  const ml0Nodes = cluster?.ml0Nodes ?? 0;
  const dl1Nodes = cluster?.dl1Nodes ?? 0;
  const tps = cluster?.tps?.toFixed(1) ?? '0.0';
  const epoch = cluster?.epoch ?? Math.floor((snapshotOrdinal || 0) / 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border)] py-2 px-6 z-40">
      <div className="container mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          {/* Node status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${gl0Nodes > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[var(--text-muted)]">GL0:</span>
              <span className="font-medium">{gl0Nodes} nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${ml0Nodes > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[var(--text-muted)]">ML0:</span>
              <span className="font-medium">{ml0Nodes} nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dl1Nodes > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[var(--text-muted)]">DL1:</span>
              <span className="font-medium">{dl1Nodes} nodes</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Keyboard hints */}
          <div className="flex items-center gap-2 text-[var(--text-muted)] opacity-60">
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-mono">⌘K</kbd>
            <span>search</span>
            <span className="mx-1">·</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-mono">1-4</kbd>
            <span>nav</span>
            <span className="mx-1">·</span>
            <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-mono">R</kbd>
            <span>refresh</span>
          </div>
          
          <div className="w-px h-4 bg-[var(--border)]" />
          
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Block</span>
            <span className="font-mono font-medium text-[var(--accent-2)]">
              #{snapshotOrdinal?.toLocaleString() || '...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">TPS:</span>
            <span className="font-medium">{tps}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Epoch:</span>
            <span className="font-medium">{epoch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
