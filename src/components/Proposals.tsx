import { useMemo } from 'react';

export interface Proposal {
  id: string;
  daoId: string;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  quorum: number;
  deadline: string;
  createdAt: string;
  executedAt: string | null;
}

export type ProposalStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'PENDING'
  | 'EXECUTED'
  | 'VETOED'
  | 'FAILED'
  | 'CANCELLED';

const statusStyles: Record<ProposalStatus, { color: string; icon: string }> = {
  DRAFT: { color: 'bg-gray-500/20 text-gray-400', icon: '📝' },
  ACTIVE: { color: 'bg-green-500/20 text-green-400', icon: '🗳️' },
  PENDING: { color: 'bg-yellow-500/20 text-yellow-400', icon: '⏳' },
  EXECUTED: { color: 'bg-blue-500/20 text-blue-400', icon: '✅' },
  VETOED: { color: 'bg-red-500/20 text-red-400', icon: '🚫' },
  FAILED: { color: 'bg-orange-500/20 text-orange-400', icon: '❌' },
  CANCELLED: { color: 'bg-gray-600/20 text-gray-500', icon: '🗑️' },
};

interface ProposalsProps {
  proposals: Proposal[];
  loading?: boolean;
  onProposalClick?: (proposalId: string) => void;
  compact?: boolean;
}

export function Proposals({ proposals, loading, onProposalClick, compact = false }: ProposalsProps) {
  const proposalsWithStats = useMemo(() => {
    return proposals.map(p => {
      const total = p.votesFor + p.votesAgainst + p.votesAbstain;
      const forPct = total > 0 ? Math.round((p.votesFor / total) * 100) : 0;
      const againstPct = total > 0 ? Math.round((p.votesAgainst / total) * 100) : 0;
      const quorumMet = total >= p.quorum;
      return { ...p, total, forPct, againstPct, quorumMet };
    });
  }, [proposals]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-muted)]">
        No proposals
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {proposalsWithStats.map(p => {
        const style = statusStyles[p.status] || statusStyles.DRAFT;
        return (
          <button
            key={p.id}
            onClick={() => onProposalClick?.(p.id)}
            className="w-full p-4 text-left hover:bg-[var(--bg-card)] transition-colors"
          >
            {/* Title row */}
            <div className="flex items-center gap-2 mb-2">
              <span>{style.icon}</span>
              <span className="font-medium text-[var(--text-primary)] truncate flex-1">
                {p.title}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${style.color}`}>
                {p.status}
              </span>
            </div>

            {/* Vote bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 bg-[var(--bg-card)] rounded-full overflow-hidden flex">
                <div className="h-full bg-green-500" style={{ width: `${p.forPct}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${p.againstPct}%` }} />
              </div>
              <span className="text-xs text-[var(--text-muted)] w-16 text-right">{p.total} votes</span>
            </div>

            {/* Details row */}
            {!compact && (
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="text-green-400">✓ {p.votesFor}</span>
                <span className="text-red-400">✗ {p.votesAgainst}</span>
                <span className={p.quorumMet ? 'text-green-400' : 'text-yellow-400'}>
                  Quorum: {p.quorumMet ? '✓' : `${p.total}/${p.quorum}`}
                </span>
                {p.status === 'ACTIVE' && (
                  <span className="ml-auto">{getTimeLeft(p.deadline)}</span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function getTimeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

// Proposal detail modal
interface ProposalDetailProps {
  proposal: Proposal;
  onClose: () => void;
}

export function ProposalDetail({ proposal, onClose }: ProposalDetailProps) {
  const total = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
  const forPct = total > 0 ? Math.round((proposal.votesFor / total) * 100) : 0;
  const againstPct = total > 0 ? Math.round((proposal.votesAgainst / total) * 100) : 0;
  const abstainPct = total > 0 ? Math.round((proposal.votesAbstain / total) * 100) : 0;
  const quorumPct = proposal.quorum > 0 ? Math.min(100, Math.round((total / proposal.quorum) * 100)) : 0;
  const style = statusStyles[proposal.status] || statusStyles.DRAFT;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] w-full max-w-lg max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{style.icon}</span>
            <h2 className="font-semibold text-[var(--text-primary)]">{proposal.title}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white">✕</button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          <p className="text-[var(--text-primary)]">{proposal.description}</p>

          {/* Vote breakdown */}
          <div className="space-y-3">
            <div className="h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: `${forPct}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${againstPct}%` }} />
              <div className="h-full bg-gray-500" style={{ width: `${abstainPct}%` }} />
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <div className="text-lg font-bold text-green-400">{proposal.votesFor}</div>
                <div className="text-xs text-green-400">For ({forPct}%)</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <div className="text-lg font-bold text-red-400">{proposal.votesAgainst}</div>
                <div className="text-xs text-red-400">Against ({againstPct}%)</div>
              </div>
              <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-400">{proposal.votesAbstain}</div>
                <div className="text-xs text-gray-400">Abstain ({abstainPct}%)</div>
              </div>
            </div>

            {/* Quorum */}
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--text-muted)]">Quorum</span>
                <span className={quorumPct >= 100 ? 'text-green-400' : 'text-yellow-400'}>
                  {total} / {proposal.quorum}
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${quorumPct >= 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${quorumPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[var(--text-muted)]">Proposer</div>
              <div className="font-mono text-[var(--text-primary)] truncate">{proposal.proposer}</div>
            </div>
            <div>
              <div className="text-[var(--text-muted)]">Deadline</div>
              <div className="text-[var(--text-primary)]">{new Date(proposal.deadline).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
