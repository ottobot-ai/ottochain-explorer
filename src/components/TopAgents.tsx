import { useState, useMemo } from 'react';
import type { Agent } from '../lib/queries';

interface TopAgentsProps {
  agents: Agent[];
  onAgentClick: (address: string) => void;
}

export function TopAgents({ agents, onAgentClick }: TopAgentsProps) {
  const [sortBy, setSortBy] = useState<'reputation' | 'jobs'>('reputation');

  // Generate consistent avatar colors based on address
  const getAvatarColor = (address: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-cyan-500 to-blue-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-yellow-500 to-amber-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-teal-500 to-cyan-500',
    ];
    const hash = address.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInitials = (name: string | null, address: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase();
    }
    return address.slice(3, 5).toUpperCase();
  };

  // Simulate job counts based on reputation (for demo)
  const getJobCount = (reputation: number) => {
    return Math.floor(reputation * 3.7 + 17);
  };

  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      if (sortBy === 'jobs') {
        return getJobCount(b.reputation) - getJobCount(a.reputation);
      }
      return b.reputation - a.reputation;
    });
  }, [agents, sortBy]);

  const loading = agents.length === 0;

  return (
    <div className="card w-80 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>🏆</span> Top Agents
        </h2>
        <div className="flex gap-1 bg-[var(--bg-elevated)] rounded-lg p-1">
          <button
            onClick={() => setSortBy('reputation')}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              sortBy === 'reputation'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Reputation
          </button>
          <button
            onClick={() => setSortBy('jobs')}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              sortBy === 'jobs'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Jobs
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
          ))
        ) : (
          sortedAgents.slice(0, 8).map((agent, index) => {
            const jobCount = getJobCount(agent.reputation);
            return (
              <div
                key={agent.address}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                onClick={() => onAgentClick(agent.address)}
              >
                <span className="text-sm font-medium text-[var(--text-muted)] w-5">
                  #{index + 1}
                </span>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(agent.address)} flex items-center justify-center text-white text-xs font-bold`}>
                  {getInitials(agent.displayName, agent.address)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {agent.displayName || `${agent.address.slice(0, 10)}...`}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mono">
                    {agent.address.slice(0, 8)}...
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-bold text-sm gradient-text">+{agent.reputation.toLocaleString()}</div>
                  <div className="text-xs text-[var(--text-muted)]">{jobCount} jobs</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
