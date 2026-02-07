import { useState } from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { Proposals, ProposalDetail } from './Proposals';
import type { Proposal } from './Proposals';
import { AgentAvatar } from './AgentAvatar';

export type DAOType = 'TOKEN' | 'MULTISIG' | 'THRESHOLD' | 'SIMPLE';

// GraphQL query for DAO details
const DAO_DETAIL_QUERY = gql`
  query DAODetail($daoId: String!) {
    dao(daoId: $daoId) {
      id
      daoId
      name
      description
      daoType
      memberCount
      activeProposals
      executedProposals
      createdAt
      members {
        address
        displayName
        role
        votingPower
        joinedAt
      }
    }
    proposals(daoId: $daoId, limit: 20) {
      id
      daoId
      title
      description
      proposer
      status
      votesFor
      votesAgainst
      votesAbstain
      quorum
      deadline
      createdAt
      executedAt
    }
  }
`;

interface DAOMember {
  address: string;
  displayName: string | null;
  role: string;
  votingPower: number;
  joinedAt: string;
}

interface DAO {
  id: string;
  daoId: string;
  name: string;
  description: string;
  daoType: DAOType;
  memberCount: number;
  activeProposals: number;
  executedProposals: number;
  createdAt: string;
  members: DAOMember[];
}

interface DAODetailData {
  dao: DAO | null;
  proposals: Proposal[];
}

// Styling
const daoTypeStyles: Record<DAOType, { color: string; icon: string; label: string }> = {
  TOKEN: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🪙', label: 'Token' },
  MULTISIG: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '🔐', label: 'Multisig' },
  THRESHOLD: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⚖️', label: 'Threshold' },
  SIMPLE: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '✋', label: 'Simple' },
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400',
  MEMBER: 'bg-blue-500/20 text-blue-400',
  PROPOSER: 'bg-purple-500/20 text-purple-400',
};

interface DAODetailProps {
  daoId: string;
  onClose: () => void;
  onAgentClick?: (address: string) => void;
}

export function DAODetail({ daoId, onClose, onAgentClick }: DAODetailProps) {
  const [activeTab, setActiveTab] = useState<'proposals' | 'members'>('proposals');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const { data, loading, error } = useQuery<DAODetailData>(DAO_DETAIL_QUERY, {
    variables: { daoId },
    pollInterval: 10000,
  });

  const dao = data?.dao;
  const proposals = data?.proposals || [];

  if (loading && !dao) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-8">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !dao) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-8 text-center">
          <p className="text-red-400 mb-4">Failed to load DAO</p>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  const style = daoTypeStyles[dao.daoType] || daoTypeStyles.SIMPLE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${style.color} border flex items-center justify-center text-2xl`}>
                {style.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[var(--text-primary)]">{dao.name}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${style.color}`}>
                    {style.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{dao.description}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-white transition-colors text-xl p-1"
            >
              ✕
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[var(--text-primary)]">{dao.memberCount}</div>
              <div className="text-xs text-[var(--text-muted)]">Members</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-400">{dao.activeProposals}</div>
              <div className="text-xs text-[var(--text-muted)]">Active Proposals</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-400">{dao.executedProposals}</div>
              <div className="text-xs text-[var(--text-muted)]">Executed</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-[var(--bg-elevated)] p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('proposals')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'proposals'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              🗳️ Proposals ({proposals.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              👥 Members ({dao.memberCount})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'proposals' && (
            <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
              {proposals.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  No proposals yet
                </div>
              ) : (
                <Proposals
                  proposals={proposals}
                  onProposalClick={(id) => {
                    const p = proposals.find(p => p.id === id);
                    if (p) setSelectedProposal(p);
                  }}
                  compact
                />
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-2">
              {dao.members.map(member => (
                <button
                  key={member.address}
                  onClick={() => onAgentClick?.(member.address)}
                  className="w-full flex items-center gap-3 bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-left"
                >
                  <AgentAvatar address={member.address} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {member.displayName || `${member.address.slice(0, 12)}...`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[member.role] || roleColors.MEMBER}`}>
                        {member.role}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[var(--text-muted)] truncate">
                      {member.address}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-[var(--accent)]">{member.votingPower}</div>
                    <div className="text-xs text-[var(--text-muted)]">votes</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
          Created {new Date(dao.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Proposal Detail */}
      {selectedProposal && (
        <ProposalDetail
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
        />
      )}
    </div>
  );
}
