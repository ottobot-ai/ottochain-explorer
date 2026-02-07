import { useState } from 'react';
import { exportToCSV, exportToJSON } from '../lib/export';
import { useQuery } from '@apollo/client/react';
import { CONTRACTS_LIST, CONTRACT_DETAILS } from '../lib/queries';
import type { Contract } from '../lib/queries';
import { CopyAddress } from './CopyAddress';

interface ContractsViewProps {
  onAgentClick: (address: string) => void;
}

export function ContractsView({ onAgentClick }: ContractsViewProps) {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  
  const { data, loading } = useQuery<{ contracts: Contract[] }>(CONTRACTS_LIST, {
    variables: { limit: 50, state: stateFilter },
    pollInterval: 5000,
  });

  const { data: detailData, loading: detailLoading } = useQuery<{ contract: Contract | null }>(CONTRACT_DETAILS, {
    variables: { contractId: selectedContract },
    skip: !selectedContract,
  });

  const getStateColor = (state: string) => {
    switch (state) {
      case 'COMPLETED': return 'bg-[var(--green)] text-white';
      case 'ACTIVE': return 'bg-[var(--accent)] text-white';
      case 'PROPOSED': return 'bg-[var(--orange)] text-black';
      case 'REJECTED': return 'bg-[var(--red)] text-white';
      case 'DISPUTED': return 'bg-[var(--red)] text-white';
      default: return 'bg-[var(--text-muted)] text-white';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'COMPLETED': return '✅';
      case 'ACTIVE': return '🔄';
      case 'PROPOSED': return '📝';
      case 'REJECTED': return '❌';
      case 'DISPUTED': return '⚠️';
      default: return '📄';
    }
  };

  const states = ['PROPOSED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'DISPUTED'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {/* Contract List */}
      <div className="lg:col-span-1 card h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 flex-shrink-0">
            <span>📄</span> Contracts
          </h2>
          <div className="flex gap-2">
            <button onClick={() => exportToCSV(data?.contracts || [], 'contracts.csv')} className="btn-secondary text-xs">
              📥 CSV
            </button>
            <button onClick={() => exportToJSON(data?.contracts || [], 'contracts.json')} className="btn-secondary text-xs">
              📥 JSON
            </button>
          </div>
        </div>
        
        {/* State Filter */}
        <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setStateFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              stateFilter === null 
                ? 'bg-[var(--accent)] text-white' 
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            All
          </button>
          {states.map(state => (
            <button
              key={state}
              onClick={() => setStateFilter(state)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                stateFilter === state 
                  ? 'bg-[var(--accent)] text-white' 
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
        
        {/* List */}
        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            ))
          ) : data?.contracts.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">No contracts found</p>
          ) : (
            data?.contracts.map((contract) => (
              <button
                key={contract.contractId}
                onClick={() => setSelectedContract(contract.contractId)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedContract === contract.contractId
                    ? 'bg-[var(--accent)] bg-opacity-20 border border-[var(--accent)]'
                    : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg)] border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <CopyAddress address={contract.contractId} className="text-xs" />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStateColor(contract.state)}`}>
                    {getStateIcon(contract.state)} {contract.state}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--accent)]">{contract.proposer.displayName || 'Agent'}</span>
                  <span className="text-[var(--text-muted)]"> → </span>
                  <span className="text-[var(--accent-2)]">{contract.counterparty.displayName || 'Agent'}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Contract Details */}
      <div className="lg:col-span-2 card h-full flex flex-col">
        {!selectedContract ? (
          <div className="flex items-center justify-center flex-1 text-[var(--text-muted)]">
            <div className="text-center">
              <span className="text-4xl mb-4 block">📄</span>
              Select a contract to view details
            </div>
          </div>
        ) : detailLoading ? (
          <div className="space-y-4">
            <div className="h-8 w-48 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-4 w-96 bg-[var(--bg-elevated)] rounded animate-pulse" />
            <div className="h-32 bg-[var(--bg-elevated)] rounded animate-pulse" />
          </div>
        ) : detailData?.contract ? (
          <div>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getStateIcon(detailData.contract.state)}</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStateColor(detailData.contract.state)}`}>
                    {detailData.contract.state}
                  </span>
                </div>
                <CopyAddress address={detailData.contract.contractId} truncate={false} className="text-sm" />
              </div>
            </div>
            
            {/* Parties */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div 
                className="p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--accent)] transition-colors"
                onClick={() => onAgentClick(detailData.contract!.proposer.address)}
              >
                <div className="text-xs text-[var(--text-muted)] mb-1">PROPOSER</div>
                <div className="font-medium text-[var(--accent)]">
                  {detailData.contract.proposer.displayName || 'Anonymous'}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Rep: {detailData.contract.proposer.reputation}
                </div>
              </div>
              <div 
                className="p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--accent-2)] transition-colors"
                onClick={() => onAgentClick(detailData.contract!.counterparty.address)}
              >
                <div className="text-xs text-[var(--text-muted)] mb-1">COUNTERPARTY</div>
                <div className="font-medium text-[var(--accent-2)]">
                  {detailData.contract.counterparty.displayName || 'Anonymous'}
                </div>
                <div className="text-sm text-[var(--text-muted)]">
                  Rep: {detailData.contract.counterparty.reputation}
                </div>
              </div>
            </div>
            
            {/* Terms */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">📋 Terms</h3>
              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] mono text-sm">
                <pre className="whitespace-pre-wrap text-[var(--text-muted)]">
                  {JSON.stringify(detailData.contract.terms, null, 2)}
                </pre>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">📅 Timeline</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[var(--orange)]">📝</span>
                  <span className="text-[var(--text-muted)]">Proposed:</span>
                  <span>{new Date(detailData.contract.proposedAt).toLocaleString()}</span>
                </div>
                {detailData.contract.acceptedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--accent)]">🤝</span>
                    <span className="text-[var(--text-muted)]">Accepted:</span>
                    <span>{new Date(detailData.contract.acceptedAt).toLocaleString()}</span>
                  </div>
                )}
                {detailData.contract.completedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--green)]">✅</span>
                    <span className="text-[var(--text-muted)]">Completed:</span>
                    <span>{new Date(detailData.contract.completedAt).toLocaleString()}</span>
                  </div>
                )}
                {detailData.contract.rejectedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[var(--red)]">❌</span>
                    <span className="text-[var(--text-muted)]">Rejected:</span>
                    <span>{new Date(detailData.contract.rejectedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Attestations */}
            {detailData.contract.attestations && detailData.contract.attestations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">🏆 Attestations</h3>
                <div className="space-y-2">
                  {detailData.contract.attestations.map((attestation) => (
                    <div 
                      key={attestation.id}
                      className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            attestation.type === 'COMPLETION' ? 'bg-green-500/20 text-green-400' :
                            attestation.type === 'VOUCH' ? 'bg-blue-500/20 text-blue-400' :
                            attestation.type === 'VIOLATION' ? 'bg-red-500/20 text-red-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {attestation.type}
                          </span>
                          <span className={`font-medium ${attestation.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {attestation.delta >= 0 ? '+' : ''}{attestation.delta} rep
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(attestation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {attestation.issuer && (
                        <div className="text-sm text-[var(--text-muted)]">
                          By: <button 
                            onClick={() => onAgentClick(attestation.issuer!.address)}
                            className="text-[var(--accent)] hover:underline"
                          >
                            {attestation.issuer.displayName || attestation.issuer.address.slice(0, 12) + '...'}
                          </button>
                        </div>
                      )}
                      {attestation.reason && (
                        <div className="text-sm text-[var(--text-muted)] mt-1 italic">
                          "{attestation.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Dispute Information */}
            {detailData.contract.dispute && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">⚠️ Dispute</h3>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm px-2 py-0.5 rounded-full ${
                      detailData.contract.dispute.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-400' :
                      detailData.contract.dispute.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {detailData.contract.dispute.status}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Opened: {new Date(detailData.contract.dispute.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-[var(--text-muted)]">Initiated by: </span>
                    <button 
                      onClick={() => onAgentClick(detailData.contract!.dispute!.initiator.address)}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      {detailData.contract.dispute.initiator.displayName || 
                       detailData.contract.dispute.initiator.address.slice(0, 12) + '...'}
                    </button>
                  </div>
                  <div className="text-sm mb-2">
                    <span className="text-[var(--text-muted)]">Reason: </span>
                    <span className="text-[var(--text-primary)]">{detailData.contract.dispute.reason}</span>
                  </div>
                  {detailData.contract.dispute.resolution && (
                    <div className="text-sm pt-2 border-t border-red-500/30">
                      <span className="text-[var(--text-muted)]">Resolution: </span>
                      <span className="text-green-400">{detailData.contract.dispute.resolution}</span>
                      {detailData.contract.dispute.resolvedAt && (
                        <span className="text-xs text-[var(--text-muted)] ml-2">
                          ({new Date(detailData.contract.dispute.resolvedAt).toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
            Contract not found
          </div>
        )}
      </div>
    </div>
  );
}
