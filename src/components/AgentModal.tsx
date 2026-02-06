import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { AGENT_DETAILS } from '../lib/queries';
import type { Agent, AgentFiber } from '../lib/queries';
import { CopyAddress } from './CopyAddress';
import { AgentAvatar } from './AgentAvatar';
import { ReputationChart } from './ReputationChart';
import { Sparkline } from './Sparkline';

interface AgentModalProps {
  address: string;
  onClose: () => void;
  onFiberClick?: (fiberId: string) => void;
}

export function AgentModal({ address, onClose, onFiberClick }: AgentModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'fibers' | 'attestations'>('overview');
  
  const { data, loading } = useQuery<{ agent: Agent | null; fibersByOwner: AgentFiber[] }>(AGENT_DETAILS, {
    variables: { address },
  });

  const agent = data?.agent;
  const fibers = data?.fibersByOwner || [];
  
  // Combine contracts where agent is proposer or counterparty
  const allContracts = [
    ...(agent?.contractsAsProposer?.map(c => ({ ...c, role: 'proposer' as const })) || []),
    ...(agent?.contractsAsCounterparty?.map(c => ({ ...c, role: 'counterparty' as const })) || []),
  ].sort((a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime());
  
  const completedContracts = allContracts.filter(c => c.state === 'COMPLETED').length;
  const activeContracts = allContracts.filter(c => c.state === 'ACTIVE' || c.state === 'PROPOSED').length;

  // State colors aligned with SDK AgentState enum
  const getStateColor = (state: string) => {
    switch (state) {
      case 'ACTIVE': return 'text-[var(--green)]';
      case 'REGISTERED': return 'text-yellow-400';
      case 'CHALLENGED': return 'text-orange-400';
      case 'SUSPENDED': return 'text-[var(--red)]';
      case 'PROBATION': return 'text-purple-400';
      case 'WITHDRAWN': return 'text-gray-500';
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
            <div className="flex items-start justify-between mb-4 pr-8">
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
                {(agent.reputationHistory?.length ?? 0) > 3 && (
                  <Sparkline 
                    data={agent.reputationHistory!.slice(0, 20).map(p => p.reputation).reverse()} 
                    width={80} 
                    height={24}
                    className="mt-1 ml-auto"
                  />
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--green)]">{completedContracts}</div>
                <div className="text-xs text-[var(--text-muted)]">Completed</div>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--accent)]">{activeContracts}</div>
                <div className="text-xs text-[var(--text-muted)]">Active</div>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-purple-400">{fibers.length}</div>
                <div className="text-xs text-[var(--text-muted)]">Fibers</div>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center border border-[var(--border)]">
                <div className="text-2xl font-bold text-yellow-400">{agent.attestationsReceived?.length || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Attestations</div>
              </div>
            </div>
            
            {/* Platform Links */}
            {(agent.platformLinks?.length ?? 0) > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {agent.platformLinks?.map((link) => (
                    <span
                      key={link.platform}
                      className="px-3 py-1.5 bg-[var(--bg-elevated)] rounded-lg text-sm flex items-center gap-2 border border-[var(--border)]"
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

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
              {(['overview', 'contracts', 'fibers', 'attestations'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab 
                      ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'contracts' && ` (${allContracts.length})`}
                  {tab === 'fibers' && ` (${fibers.length})`}
                  {tab === 'attestations' && ` (${agent.attestationsReceived?.length || 0})`}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="max-h-[300px] overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Reputation History Chart */}
                  {(agent.reputationHistory?.length ?? 0) > 1 && (
                    <div className="bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] p-4">
                      <h4 className="text-sm font-medium mb-2">📈 Reputation History</h4>
                      <ReputationChart data={agent.reputationHistory!} width={550} height={140} />
                    </div>
                  )}
                  
                  {/* Recent Activity Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    {allContracts.slice(0, 2).map(contract => (
                      <div key={contract.id} className="bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            contract.state === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                            contract.state === 'ACTIVE' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>{contract.state}</span>
                          <span className="text-xs text-[var(--text-muted)]">{contract.role}</span>
                        </div>
                        <div className="text-sm font-mono truncate text-[var(--text-muted)]">
                          {contract.contractId.slice(0, 16)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'contracts' && (
                <div className="space-y-2">
                  {allContracts.length === 0 ? (
                    <p className="text-[var(--text-muted)] py-4 text-center">No contracts yet</p>
                  ) : (
                    allContracts.map(contract => (
                      <div key={contract.id} className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              contract.state === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                              contract.state === 'ACTIVE' ? 'bg-blue-500/20 text-blue-400' :
                              contract.state === 'PROPOSED' ? 'bg-yellow-500/20 text-yellow-400' :
                              contract.state === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>{contract.state}</span>
                            <span className="text-xs bg-[var(--bg)] px-2 py-0.5 rounded">{contract.role}</span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {new Date(contract.proposedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm font-mono text-[var(--text-muted)] truncate">
                          {contract.contractId}
                        </div>
                        <div className="text-xs text-[var(--accent)] mt-1">
                          with {contract.role === 'proposer' 
                            ? (contract.counterparty?.displayName || contract.counterparty?.address?.slice(0, 12) + '...')
                            : (contract.proposer?.displayName || contract.proposer?.address?.slice(0, 12) + '...')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'fibers' && (
                <div className="space-y-2">
                  {fibers.length === 0 ? (
                    <p className="text-[var(--text-muted)] py-4 text-center">No fibers owned</p>
                  ) : (
                    fibers.map(fiber => {
                      // Fiber status colors aligned with SDK FiberStatus enum
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'ACTIVE': return 'bg-green-500/20 text-green-400';
                          case 'ARCHIVED': return 'bg-blue-500/20 text-blue-400';
                          case 'FAILED': return 'bg-red-500/20 text-red-400';
                          default: return 'bg-gray-500/20 text-gray-400';
                        }
                      };
                      return (
                        <button
                          key={fiber.fiberId}
                          onClick={() => onFiberClick?.(fiber.fiberId)}
                          className="w-full p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] text-left hover:border-[var(--accent)] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                              {fiber.workflowType}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(fiber.status)}`}>
                                {fiber.status}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">
                                {fiber.currentState}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-mono text-[var(--text-muted)] truncate">
                            {fiber.fiberId}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-1">
                            Seq #{fiber.sequenceNumber} • {new Date(fiber.updatedAt).toLocaleDateString()}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'attestations' && (
                <div className="space-y-2">
                  {(agent.attestationsReceived?.length ?? 0) === 0 ? (
                    <p className="text-[var(--text-muted)] py-4 text-center">No attestations yet</p>
                  ) : (
                    agent.attestationsReceived?.map((att) => (
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
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
