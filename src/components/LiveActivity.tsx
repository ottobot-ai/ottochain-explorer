import type { ActivityEvent } from '../lib/queries';

interface AttestationModalData {
  id: string;
  type: string;
  delta: number;
  reason: string | null;
  createdAt: string;
  txHash: string;
  agent: { address: string; displayName: string | null };
  issuer?: { address: string; displayName: string | null } | null;
}

interface LiveActivityProps {
  activity: ActivityEvent[];
  onAgentClick: (address: string) => void;
  onAttestationClick?: (attestation: AttestationModalData) => void;
  onFiberClick?: (fiberId: string) => void;
}

export function LiveActivity({ activity, onAgentClick, onAttestationClick, onFiberClick }: LiveActivityProps) {
  const getEventStyle = (eventType: string, action: string) => {
    if (action?.includes('complete') || eventType === 'CONTRACT_COMPLETED') {
      return { icon: '💰', bg: 'bg-green-500/20', border: 'border-green-500/30', label: 'Payment released' };
    }
    if (action?.includes('vouch') || eventType === 'VOUCH') {
      return { icon: '⭐', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'Reputation earned' };
    }
    if (action?.includes('propose') || eventType === 'CONTRACT_PROPOSED') {
      return { icon: '📄', bg: 'bg-purple-500/20', border: 'border-purple-500/30', label: 'Workflow started' };
    }
    if (action?.includes('accept') || eventType === 'CONTRACT_ACCEPTED') {
      return { icon: '🎯', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', label: 'Milestone reached' };
    }
    if (eventType === 'ATTESTATION' || action?.includes('attest')) {
      return { icon: '✨', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Attestation' };
    }
    if (eventType === 'AGENT_REGISTERED') {
      return { icon: '🤖', bg: 'bg-blue-500/20', border: 'border-blue-500/30', label: 'Agent registered' };
    }
    return { icon: '📌', bg: 'bg-gray-500/20', border: 'border-gray-500/30', label: 'Activity' };
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const loading = activity.length === 0;

  return (
    <div className="card w-80 flex-shrink-0 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live Activity
        </h2>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
          ))
        ) : (
          activity.slice(0, 10).map((event, index) => {
            const style = getEventStyle(event.eventType, event.action);
            const agentLabel = event.agent 
              ? (event.agent.displayName || `${event.agent.address.slice(0, 12)}...`)
              : event.action || 'System event';
            const fiberId = event.fiberId;
            
            return (
              <div
                key={`${event.timestamp}-${index}`}
                className={`p-3 rounded-lg border ${style.bg} ${style.border} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{style.label}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate">
                      {event.agent ? (
                        <button 
                          onClick={() => {
                            if (event.eventType === 'ATTESTATION' && onAttestationClick) {
                              onAttestationClick({
                                id: `${event.timestamp}-${index}`,
                                type: event.action?.toUpperCase() || 'BEHAVIORAL',
                                delta: event.reputationDelta || 0,
                                reason: null,
                                createdAt: event.timestamp,
                                txHash: `tx_${event.timestamp.replace(/\D/g, '').slice(0, 16)}`,
                                agent: event.agent!,
                                issuer: event.relatedAgent,
                              });
                            } else {
                              onAgentClick(event.agent!.address);
                            }
                          }}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {agentLabel}
                        </button>
                      ) : (
                        <span>{agentLabel}</span>
                      )}
                      {event.reputationDelta && (
                        <span className={`ml-2 ${event.reputationDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {event.reputationDelta > 0 ? '+' : ''}{event.reputationDelta} rep
                        </span>
                      )}
                    </div>
                    {/* Fiber link */}
                    {fiberId && onFiberClick && (
                      <button
                        onClick={() => onFiberClick(fiberId)}
                        className="text-xs text-purple-400 hover:text-purple-300 mt-1 flex items-center gap-1"
                      >
                        <span>→</span> View Fiber
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
