import { useQuery } from '@apollo/client/react';
import { AGENT_DETAILS } from '../lib/queries';
import type { Agent } from '../lib/queries';
import { CopyAddress } from './CopyAddress';
import { AgentAvatar } from './AgentAvatar';
import { ReputationChart } from './ReputationChart';

interface AgentModalProps {
  address: string;
  onClose: () => void;
}

export function AgentModal({ address, onClose }: AgentModalProps) {
  const { data, loading } = useQuery<{ agent: Agent | null }>(AGENT_DETAILS, {
    variables: { address },
  });

  const agent = data?.agent;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE': return 'text-[var(--green)]';
      case 'REGISTERED': return 'text-[var(--orange)]';
      case 'WITHDRAWN': return 'text-[var(--red)]';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white text-2xl"
        >
          ×
        </button>
        
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-8 w-48 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-4 w-96 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-32 bg-[var(--bg-elevated)] rounded animate-pulse" />
          </div>
        ) : !agent ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            Agent not found
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pr-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <AgentAvatar address={agent.address} displayName={agent.displayName} size={48} />
                  {agent.displayName || 'Anonymous Agent'}
                </h2>
                <CopyAddress address={agent.address} truncate={false} className="text-sm mt-1" />
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-sm font-medium ${getStateColor(agent.state)}`}>
                    {agent.state}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    since {new Date(agent.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold gradient-text">{agent.reputation}</div>
                <div className="text-sm text-[var(--text-muted)]">reputation</div>
              </div>
            </div>
            
            {/* Platform Links */}
            {(agent.platformLinks?.length ?? 0) > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>🔗</span> Connected Platforms
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.platformLinks?.map((link) => (
                    <span
                      key={link.platform}
                      className="px-4 py-2 bg-[var(--bg-elevated)] rounded-lg text-sm flex items-center gap-2 border border-[var(--border)]"
                    >
                      {link.platform === 'DISCORD' && '💬'}
                      {link.platform === 'TELEGRAM' && '📱'}
                      {link.platform === 'TWITTER' && '🐦'}
                      {link.platform === 'GITHUB' && '🐙'}
                      <span>{link.platformUsername || link.platformUserId}</span>
                      {link.verified && <span className="text-[var(--green)]">✓</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Reputation History Chart */}
            {(agent.reputationHistory?.length ?? 0) > 1 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span>📈</span> Reputation History
                </h3>
                <div className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] p-4">
                  <ReputationChart data={agent.reputationHistory!} width={550} height={160} />
                </div>
              </div>
            )}

            {/* Attestations */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>✨</span> Recent Attestations
              </h3>
              {(agent.attestationsReceived?.length ?? 0) === 0 ? (
                <p className="text-[var(--text-muted)] py-4">No attestations yet</p>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {agent.attestationsReceived?.slice(0, 10).map((att) => (
                    <div key={att.id} className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${
                            att.delta > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                          }`}>
                            {att.delta > 0 ? '+' : ''}{att.delta}
                          </span>
                          <span className="px-2 py-0.5 bg-[var(--bg)] rounded text-xs font-medium">
                            {att.type}
                          </span>
                        </div>
                        <span className="mono text-xs text-[var(--text-muted)]">
                          {new Date(att.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {att.reason && (
                        <div className="text-sm text-[var(--text-muted)] mt-2">{att.reason}</div>
                      )}
                      {att.issuer && (
                        <div className="text-xs text-[var(--accent)] mt-1">
                          from {att.issuer.displayName || `${att.issuer.address.slice(0, 12)}...`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
