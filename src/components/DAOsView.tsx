import { useState, useMemo } from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { exportToCSV, exportToJSON } from '../lib/export';
import { DAODetail } from './DAODetail';
import type { DAOType } from './DAODetail';
import { AgentAvatar } from './AgentAvatar';

// GraphQL query for DAOs list
const DAOS_QUERY = gql`
  query DAOs($daoType: DAOType, $limit: Int, $offset: Int) {
    daos(daoType: $daoType, limit: $limit, offset: $offset) {
      id
      daoId
      name
      description
      daoType
      memberCount
      activeProposals
      createdAt
    }
  }
`;

interface DAOListItem {
  id: string;
  daoId: string;
  name: string;
  description: string;
  daoType: DAOType;
  memberCount: number;
  activeProposals: number;
  createdAt: string;
}

interface DAOsData {
  daos: DAOListItem[];
}

// DAO type styling
const daoTypeStyles: Record<DAOType, { color: string; icon: string; label: string }> = {
  TOKEN: { 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: '🪙',
    label: 'Token'
  },
  MULTISIG: { 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: '🔐',
    label: 'Multisig'
  },
  THRESHOLD: { 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: '⚖️',
    label: 'Threshold'
  },
  SIMPLE: { 
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: '✋',
    label: 'Simple'
  },
};

interface DAOsViewProps {
  initialDaoId?: string | null;
  onAgentClick?: (address: string) => void;
}

export function DAOsView({ initialDaoId, onAgentClick }: DAOsViewProps) {
  const [selectedType, setSelectedType] = useState<DAOType | null>(null);
  const [selectedDAO, setSelectedDAO] = useState<string | null>(initialDaoId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, loading } = useQuery<DAOsData>(DAOS_QUERY, {
    variables: {
      daoType: selectedType,
      limit: 50,
    },
    pollInterval: 10000,
  });

  const daos = data?.daos || [];

  // Filter by search
  const filteredDAOs = useMemo(() => {
    if (!searchQuery) return daos;
    const q = searchQuery.toLowerCase();
    return daos.filter(dao => 
      dao.name.toLowerCase().includes(q) ||
      dao.description.toLowerCase().includes(q) ||
      dao.daoId.toLowerCase().includes(q)
    );
  }, [daos, searchQuery]);

  // Count by type
  const typeCounts = useMemo(() => {
    const counts: Record<DAOType, number> = { TOKEN: 0, MULTISIG: 0, THRESHOLD: 0, SIMPLE: 0 };
    daos.forEach(dao => {
      if (dao.daoType in counts) counts[dao.daoType]++;
    });
    return counts;
  }, [daos]);

  const types: DAOType[] = ['TOKEN', 'MULTISIG', 'THRESHOLD', 'SIMPLE'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* DAO List */}
      <div className="lg:col-span-2 card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>🏛️</span> DAOs
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm w-40"
            />
            <button onClick={() => exportToCSV(daos, 'daos.csv')} className="btn-secondary text-xs">
              📥 CSV
            </button>
            <button onClick={() => exportToJSON(daos, 'daos.json')} className="btn-secondary text-xs">
              📥 JSON
            </button>
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedType === null
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            All ({daos.length})
          </button>
          {types.map(type => {
            const style = daoTypeStyles[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedType === type
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {style.icon} {style.label} ({typeCounts[type]})
              </button>
            );
          })}
        </div>

        {/* DAO List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            ))
          ) : filteredDAOs.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              No DAOs found
            </div>
          ) : (
            filteredDAOs.map(dao => {
              const style = daoTypeStyles[dao.daoType] || daoTypeStyles.SIMPLE;
              return (
                <button
                  key={dao.id}
                  onClick={() => setSelectedDAO(dao.daoId)}
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    selectedDAO === dao.daoId
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${style.color} border flex items-center justify-center text-lg flex-shrink-0`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {dao.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${style.color}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] truncate">
                        {dao.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                        <span>👥 {dao.memberCount} members</span>
                        {dao.activeProposals > 0 && (
                          <span className="text-green-400">🗳️ {dao.activeProposals} active</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar: Quick Stats or Selected DAO Preview */}
      <div className="card h-fit p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          {selectedDAO ? 'DAO Preview' : 'Overview'}
        </h3>
        
        {!selectedDAO ? (
          <div className="space-y-4">
            {types.map(type => {
              const style = daoTypeStyles[type];
              const count = typeCounts[type];
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{style.icon}</span>
                    <span className="text-[var(--text-muted)]">{style.label}</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{count}</span>
                </div>
              );
            })}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Total DAOs</span>
                <span className="text-2xl font-bold text-[var(--accent)]">{daos.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <DAOPreview 
            daoId={selectedDAO} 
            onViewDetails={() => setSelectedDAO(selectedDAO)}
            onAgentClick={onAgentClick}
          />
        )}
      </div>

      {/* DAO Detail Modal */}
      {selectedDAO && (
        <DAODetail
          daoId={selectedDAO}
          onClose={() => setSelectedDAO(null)}
          onAgentClick={onAgentClick}
        />
      )}
    </div>
  );
}

// Lightweight preview component
function DAOPreview({ 
  daoId, 
  onAgentClick 
}: { 
  daoId: string; 
  onViewDetails: () => void;
  onAgentClick?: (address: string) => void;
}) {
  const DAO_PREVIEW_QUERY = gql`
    query DAOPreview($daoId: String!) {
      dao(daoId: $daoId) {
        name
        daoType
        memberCount
        activeProposals
        members(limit: 5) {
          address
          displayName
          votingPower
        }
      }
    }
  `;

  const { data, loading } = useQuery<{ dao: {
    name: string;
    daoType: DAOType;
    memberCount: number;
    activeProposals: number;
    members: Array<{ address: string; displayName: string | null; votingPower: number }>;
  } | null }>(DAO_PREVIEW_QUERY, {
    variables: { daoId },
  });

  if (loading) {
    return <div className="animate-pulse h-32 bg-[var(--bg-elevated)] rounded-lg" />;
  }

  const dao = data?.dao;
  if (!dao) {
    return <div className="text-[var(--text-muted)]">DAO not found</div>;
  }

  const style = daoTypeStyles[dao.daoType] || daoTypeStyles.SIMPLE;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{style.icon}</span>
        <span className="font-semibold text-[var(--text-primary)]">{dao.name}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)]">{dao.memberCount}</div>
          <div className="text-xs text-[var(--text-muted)]">Members</div>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-400">{dao.activeProposals}</div>
          <div className="text-xs text-[var(--text-muted)]">Active</div>
        </div>
      </div>

      {dao.members.length > 0 && (
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-2">Top Members</div>
          <div className="space-y-2">
            {dao.members.map(member => (
              <button
                key={member.address}
                onClick={() => onAgentClick?.(member.address)}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)] hover:border-[var(--accent)] border border-transparent transition-colors text-left"
              >
                <AgentAvatar address={member.address} size={24} />
                <span className="text-sm text-[var(--text-primary)] truncate flex-1">
                  {member.displayName || `${member.address.slice(0, 10)}...`}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{member.votingPower}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
