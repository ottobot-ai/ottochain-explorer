import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { SEARCH_AGENTS, AGENTS_LIST, AGENT_DETAILS } from '../lib/queries';
import type { Agent, PlatformLink, Attestation } from '../lib/queries';
import { CopyAddress } from './CopyAddress';
import { AgentAvatar } from './AgentAvatar';
import { ReputationChart } from './ReputationChart';

interface AgentSearchProps {
  initialSelectedAgent?: string | null;
}

export function AgentSearch({ initialSelectedAgent }: AgentSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(initialSelectedAgent || null);
  
  // Update selection when nav search selects an agent
   
  useEffect(() => {
    if (initialSelectedAgent) {
      setSelectedAgent(initialSelectedAgent);
    }
  }, [initialSelectedAgent]);
  
  const { data: allAgents, loading: loadingAll } = useQuery<{ agents: Agent[] }>(AGENTS_LIST, {
    variables: { limit: 50 },
  });
  
  const { data: searchResults, loading: searching } = useQuery<{ searchAgents: Agent[] }>(SEARCH_AGENTS, {
    variables: { query: activeSearch },
    skip: !activeSearch,
  });
  
  const { data: agentDetails, loading: loadingDetails } = useQuery<{ agent: Agent | null }>(AGENT_DETAILS, {
    variables: { address: selectedAgent },
    skip: !selectedAgent,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  const agents = activeSearch && searchResults ? searchResults.searchAgents : allAgents?.agents;

  // State colors aligned with SDK AgentState enum
  const getStateColor = (state: Agent['state']) => {
    switch (state) {
      case 'ACTIVE': return 'bg-[var(--green)]';
      case 'REGISTERED': return 'bg-yellow-500';
      case 'CHALLENGED': return 'bg-orange-500';
      case 'PROBATION': return 'bg-purple-500';
      case 'SUSPENDED': return 'bg-[var(--red)]';
      case 'WITHDRAWN': return 'bg-gray-600';
      default: return 'bg-[var(--text-muted)]';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {/* Agent List */}
      <div className="lg:col-span-1 card h-full flex flex-col">
        <h2 className="text-xl font-semibold mb-4 flex-shrink-0">🤖 Agents</h2>
        
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4 flex-shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or address..."
            className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </form>
        
        {/* List */}
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {(loadingAll || searching) ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            ))
          ) : agents?.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">No agents found</p>
          ) : (
            agents?.map((agent) => (
              <button
                key={agent.address}
                onClick={() => setSelectedAgent(agent.address)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedAgent === agent.address
                    ? 'bg-[var(--accent)] bg-opacity-20 border border-[var(--accent)]'
                    : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg)] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AgentAvatar address={agent.address} displayName={agent.displayName} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {agent.displayName || `${agent.address.slice(0, 8)}...${agent.address.slice(-6)}`}
                    </div>
                    <div className="mono text-xs text-[var(--text-muted)]">
                      {agent.address.slice(0, 16)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold gradient-text">{agent.reputation}</span>
                    <span className={`w-2 h-2 rounded-full ${getStateColor(agent.state)}`} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Agent Details */}
      <div className="lg:col-span-2 card h-full flex flex-col">
        {!selectedAgent ? (
          <div className="flex items-center justify-center flex-1 text-[var(--text-muted)]">
            Select an agent to view details
          </div>
        ) : loadingDetails ? (
          <div className="space-y-4">
            <div className="h-8 w-48 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-4 w-96 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-32 bg-[var(--bg-elevated)] rounded animate-pulse" />
          </div>
        ) : agentDetails?.agent ? (
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {agentDetails.agent.displayName || 'Anonymous Agent'}
                </h2>
                <CopyAddress address={agentDetails.agent.address} truncate={false} className="text-sm mt-1" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold gradient-text">{agentDetails.agent.reputation}</div>
                <div className={`text-sm ${agentDetails.agent.state === 'ACTIVE' ? 'text-[var(--green)]' : 'text-[var(--orange)]'}`}>
                  {agentDetails.agent.state}
                </div>
              </div>
            </div>
            
            {/* Platform Links */}
            {(agentDetails.agent.platformLinks?.length ?? 0) > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">🔗 Platform Links</h3>
                <div className="flex flex-wrap gap-2">
                  {agentDetails.agent.platformLinks?.map((link: PlatformLink) => (
                    <span
                      key={link.platform}
                      className="px-3 py-1 bg-[var(--bg-elevated)] rounded-full text-sm flex items-center gap-2"
                    >
                      {link.platform === 'DISCORD' && '💬'}
                      {link.platform === 'TELEGRAM' && '📱'}
                      {link.platform === 'TWITTER' && '🐦'}
                      {link.platform === 'GITHUB' && '🐙'}
                      {link.platformUsername || link.platformUserId}
                      {link.verified && <span className="text-[var(--green)]">✓</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Reputation History Chart */}
            {(agentDetails.agent.reputationHistory?.length ?? 0) > 1 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">📈 Reputation History</h3>
                <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
                  <ReputationChart data={agentDetails.agent.reputationHistory!} width={450} height={140} />
                </div>
              </div>
            )}

            {/* Attestations */}
            <div>
              <h3 className="text-lg font-semibold mb-3">✨ Attestations</h3>
              {agentDetails.agent.attestationsReceived?.length === 0 ? (
                <p className="text-[var(--text-muted)]">No attestations yet</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {agentDetails.agent.attestationsReceived?.map((att: Attestation) => (
                    <div key={att.id} className="p-3 bg-[var(--bg-elevated)] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            att.delta > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                          }`}>
                            {att.delta > 0 ? '+' : ''}{att.delta}
                          </span>
                          <span className="text-sm">{att.type}</span>
                        </div>
                        <span className="mono text-xs text-[var(--text-muted)]">
                          {new Date(att.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {att.reason && (
                        <div className="text-sm text-[var(--text-muted)] mt-1">{att.reason}</div>
                      )}
                      {att.issuer && (
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          from {att.issuer.displayName || att.issuer.address.slice(0, 12)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
            Agent not found
          </div>
        )}
      </div>
    </div>
  );
}
