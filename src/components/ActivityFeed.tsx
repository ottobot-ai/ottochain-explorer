import type { ActivityEvent } from '../lib/queries';

interface ActivityFeedProps {
  events?: ActivityEvent[];
  loading: boolean;
  onAgentClick?: (address: string) => void;
}

export function ActivityFeed({ events, loading, onAgentClick }: ActivityFeedProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'AGENT_REGISTERED': return '🎉';
      case 'VOUCH_RECEIVED': return '🤝';
      case 'CONTRACT_PROPOSED': return '📝';
      case 'CONTRACT_ACCEPTED': return '✅';
      case 'CONTRACT_COMPLETED': return '🎊';
      case 'CONTRACT_REJECTED': return '❌';
      case 'ATTESTATION': return '✨';
      default: return '📌';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getDeltaColor = (delta: number | null) => {
    if (delta === null) return '';
    return delta > 0 ? 'text-[var(--green)]' : delta < 0 ? 'text-[var(--red)]' : '';
  };

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 flex-shrink-0">
        <span>⚡</span>
        <span>Recent Activity</span>
      </h2>
      
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : events?.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {events?.map((event, index) => (
            <div
              key={`${event.timestamp}-${index}`}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg)] transition-colors"
            >
              <span className="text-lg">{getEventIcon(event.eventType)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span 
                    className="font-medium truncate text-[var(--accent)] hover:underline cursor-pointer"
                    onClick={() => onAgentClick?.(event.agent.address)}
                  >
                    {event.agent.displayName || `${event.agent.address.slice(0, 8)}...`}
                  </span>
                  {event.reputationDelta !== null && (
                    <span className={`text-sm font-mono ${getDeltaColor(event.reputationDelta)}`}>
                      {event.reputationDelta > 0 ? '+' : ''}{event.reputationDelta}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{event.action}</div>
              </div>
              <div className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {formatTime(event.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
