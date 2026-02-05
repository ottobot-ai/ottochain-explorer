import { useMemo } from 'react';

interface Transition {
  id: string;
  eventName: string;
  fromState: string;
  toState: string;
  success: boolean;
  gasUsed: number;
  payload?: string | Record<string, unknown>;
  snapshotOrdinal: number;
  createdAt: string;
}

interface TransitionTimelineProps {
  transitions: Transition[];
  initialState?: string;
  className?: string;
  maxItems?: number;
  onTransitionClick?: (transition: Transition) => void;
}

export function TransitionTimeline({ 
  transitions, 
  initialState,
  className = '',
  maxItems = 20,
  onTransitionClick 
}: TransitionTimelineProps) {
  const displayTransitions = useMemo(() => {
    const sorted = [...transitions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return sorted.slice(-maxItems);
  }, [transitions, maxItems]);

  if (displayTransitions.length === 0) {
    return (
      <div className={`text-center text-[var(--text-muted)] py-4 ${className}`}>
        No transitions yet
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--border)]" />

      <div className="space-y-3 pl-10">
        {/* Initial state marker */}
        {initialState && (
          <div className="relative">
            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[var(--green)] ring-2 ring-[var(--bg)]" />
            <div className="text-xs text-[var(--text-muted)]">
              Started in <span className="font-medium text-[var(--green)]">{initialState}</span>
            </div>
          </div>
        )}

        {displayTransitions.map((tx, idx) => (
          <div 
            key={tx.id}
            onClick={() => onTransitionClick?.(tx)}
            className={`relative group ${onTransitionClick ? 'cursor-pointer' : ''}`}
          >
            {/* Timeline dot */}
            <div className={`absolute -left-6 top-2 w-3 h-3 rounded-full ring-2 ring-[var(--bg)] transition-colors ${
              tx.success 
                ? 'bg-[var(--accent)] group-hover:bg-[var(--accent)]' 
                : 'bg-[var(--red)] group-hover:bg-[var(--red)]'
            }`} />
            
            {/* Transition card */}
            <div className={`p-3 rounded-lg border transition-all ${
              tx.success
                ? 'bg-[var(--bg-elevated)] border-[var(--border)] group-hover:border-[var(--accent)]'
                : 'bg-[var(--red)]/5 border-[var(--red)]/30 group-hover:border-[var(--red)]'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 flex items-center justify-center text-xs ${
                    tx.success ? 'text-[var(--green)]' : 'text-[var(--red)]'
                  }`}>
                    {tx.success ? '✓' : '✗'}
                  </span>
                  <span className="font-medium text-sm">{tx.eventName}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  <span title={new Date(tx.createdAt).toISOString()}>
                    {formatDate(tx.createdAt)} {formatTime(tx.createdAt)}
                  </span>
                </div>
              </div>

              {/* State change */}
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs text-[var(--text-muted)]">
                  {tx.fromState}
                </span>
                <span className="text-[var(--accent)]">→</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  tx.success 
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)]' 
                    : 'bg-[var(--red)]/20 text-[var(--red)]'
                }`}>
                  {tx.toState}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                <span>Ordinal #{tx.snapshotOrdinal}</span>
                {tx.gasUsed > 0 && <span>⛽ {tx.gasUsed}</span>}
              </div>

              {/* Payload preview on hover */}
              {tx.payload && onTransitionClick && (
                <div className="hidden group-hover:block mt-2 text-xs text-[var(--text-muted)]">
                  Click to view payload →
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Show more indicator */}
        {transitions.length > maxItems && (
          <div className="relative">
            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[var(--border)]" />
            <div className="text-xs text-[var(--text-muted)]">
              +{transitions.length - maxItems} more transitions
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
