import { useMemo } from 'react';

interface StatusBarProps {
  snapshotOrdinal: number | null;
}

export function StatusBar({ snapshotOrdinal }: StatusBarProps) {
  // Simulate node status - in production would come from metagraph API
  const nodes = {
    gl0: { count: 3, healthy: 3 },
    ml0: { count: 3, healthy: 3 },
    dl1: { count: 3, healthy: 3 },
  };

  // Mock TPS - stable across re-renders (in production would come from API)
  const tps = useMemo(() => (Math.random() * 50 + 100).toFixed(1), []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border)] py-2 px-6 z-40">
      <div className="container mx-auto flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          {/* Node status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[var(--text-muted)]">GL0:</span>
              <span className="font-medium">{nodes.gl0.healthy} nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[var(--text-muted)]">ML0:</span>
              <span className="font-medium">{nodes.ml0.healthy} nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[var(--text-muted)]">DL1:</span>
              <span className="font-medium">{nodes.dl1.healthy} nodes</span>
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
            <span className="font-medium">{Math.floor((snapshotOrdinal || 0) / 100)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
