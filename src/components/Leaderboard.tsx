import type { Agent } from '../lib/queries';
import { AgentAvatar } from './AgentAvatar';

interface LeaderboardProps {
  agents?: Agent[];
  loading: boolean;
  onAgentClick?: (address: string) => void;
}

export function Leaderboard({ agents, loading, onAgentClick }: LeaderboardProps) {
  // State colors aligned with SDK AgentState enum
  const getStateColor = (state: Agent['state']) => {
    switch (state) {
      case 'ACTIVE': return 'text-[var(--green)]';
      case 'REGISTERED': return 'text-yellow-400';
      case 'CHALLENGED': return 'text-orange-400';
      case 'PROBATION': return 'text-purple-400';
      case 'SUSPENDED': return 'text-[var(--red)]';
      case 'WITHDRAWN': return 'text-gray-500';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 flex-shrink-0">
        <span>🏆</span>
        <span>Reputation Leaderboard</span>
      </h2>
      
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : agents?.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-8">No agents registered yet</p>
      ) : (
        <div className="space-y-2">
          {agents?.map((agent, index) => (
            <div
              key={agent.address}
              onClick={() => onAgentClick?.(agent.address)}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg)] hover:border-[var(--accent)] border border-transparent transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-center font-medium">{getMedal(index)}</span>
                <AgentAvatar address={agent.address} displayName={agent.displayName} size={32} />
                <div>
                  <div className="font-medium">
                    {agent.displayName || `${agent.address.slice(0, 8)}...${agent.address.slice(-6)}`}
                  </div>
                  <div className="mono text-xs text-[var(--text-muted)]">
                    {agent.address.slice(0, 12)}...
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold gradient-text">{agent.reputation}</div>
                <div className={`text-xs ${getStateColor(agent.state)}`}>{agent.state}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
