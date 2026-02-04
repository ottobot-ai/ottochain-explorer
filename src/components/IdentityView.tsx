import { useState } from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { AgentAvatar } from './AgentAvatar';

const AGENTS_QUERY = gql`
  query Agents($limit: Int, $orderBy: AgentOrderBy) {
    agents(limit: $limit, orderBy: $orderBy) {
      address
      displayName
      reputation
      state
      createdAt
      platformLinks {
        platform
        platformUserId
        platformUsername
        verified
      }
      reputationHistory(limit: 20) {
        reputation
        delta
        reason
        recordedAt
      }
    }
  }
`;

const AGENT_FIBERS_QUERY = gql`
  query AgentFibers($address: String!) {
    fibersByOwner(address: $address, limit: 10) {
      fiberId
      workflowType
      currentState
      sequenceNumber
      updatedAt
    }
  }
`;

interface Agent {
  address: string;
  displayName: string | null;
  reputation: number;
  state: string;
  createdAt: string;
  platformLinks: Array<{
    platform: string;
    platformUserId: string;
    platformUsername: string | null;
    verified: boolean;
  }>;
  reputationHistory: Array<{
    reputation: number;
    delta: number;
    reason: string | null;
    recordedAt: string;
  }>;
}

interface Fiber {
  fiberId: string;
  workflowType: string;
  currentState: string;
  sequenceNumber: number;
  updatedAt: string;
}

// Query response types
interface AgentsData {
  agents: Agent[];
}

interface AgentFibersData {
  fibersByOwner: Fiber[];
}

const platformIcons: Record<string, string> = {
  DISCORD: '💬',
  TELEGRAM: '✈️',
  TWITTER: '🐦',
  GITHUB: '🐙',
  CUSTOM: '🔗',
};

const stateColors: Record<string, string> = {
  REGISTERED: 'bg-yellow-500/20 text-yellow-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  WITHDRAWN: 'bg-red-500/20 text-red-400',
};

export function IdentityView() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('REPUTATION_DESC');

  const { data: agentsData, loading: agentsLoading } = useQuery<AgentsData>(AGENTS_QUERY, {
    variables: { limit: 50, orderBy: sortBy },
    pollInterval: 10000,
  });

  const { data: fibersData } = useQuery<AgentFibersData>(AGENT_FIBERS_QUERY, {
    variables: { address: selectedAgent },
    skip: !selectedAgent,
  });

  const agents: Agent[] = agentsData?.agents || [];
  const agentFibers: Fiber[] = fibersData?.fibersByOwner || [];
  const selectedAgentData = agents.find(a => a.address === selectedAgent);

  // Stats
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.state === 'ACTIVE').length;
  const totalReputation = agents.reduce((sum, a) => sum + a.reputation, 0);
  const avgReputation = totalAgents > 0 ? Math.round(totalReputation / totalAgents) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">🆔 Agent Identity</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Decentralized reputation and identity on OttoChain
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
          >
            <option value="REPUTATION_DESC">Highest Reputation</option>
            <option value="REPUTATION_ASC">Lowest Reputation</option>
            <option value="CREATED_DESC">Newest</option>
            <option value="CREATED_ASC">Oldest</option>
            <option value="NAME_ASC">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{totalAgents}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Agents</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-3xl font-bold text-green-400">{activeAgents}</div>
          <div className="text-sm text-[var(--text-muted)]">Active</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-3xl font-bold text-purple-400">{totalReputation}</div>
          <div className="text-sm text-[var(--text-muted)]">Total Reputation</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-3xl font-bold text-blue-400">{avgReputation}</div>
          <div className="text-sm text-[var(--text-muted)]">Avg Reputation</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Agent List */}
        <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Agent Leaderboard</h2>
          </div>
          
          <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
            {agentsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : agents.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No agents registered yet
              </div>
            ) : (
              agents.map((agent, index) => (
                <button
                  key={agent.address}
                  onClick={() => setSelectedAgent(agent.address)}
                  className={`w-full p-4 text-left hover:bg-[var(--bg-elevated)] transition-colors ${
                    selectedAgent === agent.address ? 'bg-[var(--bg-elevated)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400' :
                      index === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Avatar */}
                    <AgentAvatar address={agent.address} size={40} />
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {agent.displayName || `Agent ${agent.address.slice(3, 11)}`}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${stateColors[agent.state]}`}>
                          {agent.state}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] font-mono truncate">
                        {agent.address}
                      </div>
                    </div>
                    
                    {/* Reputation */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-[var(--accent)]">{agent.reputation}</div>
                      <div className="text-xs text-[var(--text-muted)]">rep</div>
                    </div>
                  </div>
                  
                  {/* Platform Links */}
                  {agent.platformLinks.length > 0 && (
                    <div className="flex gap-2 mt-2 ml-12">
                      {agent.platformLinks.map((link, i) => (
                        <span key={i} className="text-xs bg-[var(--bg-elevated)] px-2 py-1 rounded-full">
                          {platformIcons[link.platform] || '🔗'} {link.platformUsername || link.platformUserId}
                          {link.verified && ' ✓'}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Agent Detail Panel */}
        <div className="w-96 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Agent Profile</h2>
          </div>
          
          {!selectedAgent ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              Select an agent to view profile
            </div>
          ) : !selectedAgentData ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
              {/* Profile Header */}
              <div className="text-center">
                <AgentAvatar address={selectedAgentData.address} size={80} className="mx-auto" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mt-3">
                  {selectedAgentData.displayName || `Agent ${selectedAgentData.address.slice(3, 11)}`}
                </h3>
                <div className="text-xs font-mono text-[var(--text-muted)] mt-1 break-all">
                  {selectedAgentData.address}
                </div>
                <span className={`inline-block text-xs px-3 py-1 rounded-full mt-2 ${stateColors[selectedAgentData.state]}`}>
                  {selectedAgentData.state}
                </span>
              </div>

              {/* Reputation */}
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-[var(--accent)]">{selectedAgentData.reputation}</div>
                <div className="text-sm text-[var(--text-muted)]">Reputation Score</div>
              </div>

              {/* Platform Links */}
              {selectedAgentData.platformLinks.length > 0 && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">Linked Platforms</div>
                  <div className="space-y-2">
                    {selectedAgentData.platformLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[var(--bg-elevated)] p-3 rounded-lg">
                        <span className="text-xl">{platformIcons[link.platform] || '🔗'}</span>
                        <div className="flex-1">
                          <div className="text-sm text-[var(--text-primary)]">
                            {link.platformUsername || link.platformUserId}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">{link.platform}</div>
                        </div>
                        {link.verified && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reputation History */}
              {selectedAgentData.reputationHistory.length > 0 && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">Reputation History</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedAgentData.reputationHistory.slice(0, 10).map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-[var(--bg-elevated)] p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={entry.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {entry.delta >= 0 ? '+' : ''}{entry.delta}
                          </span>
                          <span className="text-[var(--text-muted)] truncate max-w-[150px]">
                            {entry.reason || 'Unknown'}
                          </span>
                        </div>
                        <span className="text-[var(--text-muted)]">
                          {new Date(entry.recordedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owned Fibers */}
              {agentFibers.length > 0 && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">Owned Fibers</div>
                  <div className="space-y-2">
                    {agentFibers.map((fiber) => (
                      <div key={fiber.fiberId} className="flex items-center justify-between text-xs bg-[var(--bg-elevated)] p-2 rounded-lg">
                        <div>
                          <span className="text-[var(--accent)]">{fiber.workflowType}</span>
                          <span className="text-[var(--text-muted)] ml-2">#{fiber.sequenceNumber}</span>
                        </div>
                        <span className="text-[var(--text-muted)]">{fiber.currentState}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Member Since */}
              <div className="text-center text-xs text-[var(--text-muted)]">
                Member since {new Date(selectedAgentData.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
