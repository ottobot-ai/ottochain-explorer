import { useState, useMemo, useCallback } from 'react';
import type { Contract, ActivityEvent } from '../lib/queries';

interface TransactionsTableProps {
  contracts: Contract[];
  activity: ActivityEvent[];
  onAgentClick: (address: string) => void;
}

type FilterType = 'all' | 'workflows' | 'payments' | 'attestations';

interface ContractTerms {
  value?: number;
  [key: string]: unknown;
}

export function TransactionsTable({ contracts, activity, onAgentClick }: TransactionsTableProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      WORKFLOW: 'bg-purple-600 text-white',
      PAYMENT: 'bg-green-600 text-white',
      DISPUTE: 'bg-red-600 text-white',
      ATTEST: 'bg-cyan-600 text-white',
      PROPOSED: 'bg-orange-500 text-black',
      ACTIVE: 'bg-purple-600 text-white',
      COMPLETED: 'bg-green-600 text-white',
    };
    return styles[type] || 'bg-gray-600 text-white';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') return { bg: 'bg-green-500/20 text-green-400', icon: '✓', text: 'Confirmed' };
    if (status === 'ACTIVE') return { bg: 'bg-yellow-500/20 text-yellow-400', icon: '◐', text: 'Pending' };
    if (status === 'PROPOSED') return { bg: 'bg-orange-500/20 text-orange-400', icon: '○', text: 'Proposed' };
    return { bg: 'bg-gray-500/20 text-gray-400', icon: '–', text: status };
  };

  const formatTime = useCallback((ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, []);

  // Merge contracts and activity into unified transactions
  const transactions = useMemo(() => {
    const contractTxs = contracts.map((c) => ({
      id: c.id,
      type: c.state === 'COMPLETED' ? 'PAYMENT' : 'WORKFLOW',
      parties: `${c.proposer?.displayName || c.proposer?.address?.slice(0,12) || '?'}... → ${c.counterparty?.displayName || c.counterparty?.address?.slice(0,12) || '?'}...`,
      amount: (c.terms as ContractTerms)?.value ? `${(c.terms as ContractTerms).value} OTTO` : '–',
      status: c.state,
      time: c.proposedAt,
      clickAddress: c.proposer?.address,
    }));

    const activityTxs = activity
      .map((a, i) => {
        if (a.eventType === 'ATTESTATION') {
          return {
            id: `att-${i}`,
            type: 'ATTEST',
            parties: `${a.agent?.displayName || a.agent?.address?.slice(0,12) || '?'}...`,
            amount: a.reputationDelta ? `${a.reputationDelta > 0 ? '+' : ''}${a.reputationDelta} rep` : '–',
            status: 'COMPLETED',
            time: a.timestamp,
            clickAddress: a.agent?.address,
          };
        }
        // Show transitions as workflow events
        return {
          id: `tx-${i}`,
          type: 'WORKFLOW',
          parties: a.agent?.displayName || a.action || 'Agent',
          amount: '–',
          status: 'COMPLETED',
          time: a.timestamp,
          clickAddress: a.agent?.address,
        };
      });

    return [...contractTxs, ...activityTxs]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 15);
  }, [contracts, activity]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'workflows', label: 'Workflows' },
    { key: 'payments', label: 'Payments' },
    { key: 'attestations', label: 'Attestations' },
  ];

  const filteredTxs = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'workflows') return tx.type === 'WORKFLOW';
    if (filter === 'payments') return tx.type === 'PAYMENT';
    if (filter === 'attestations') return tx.type === 'ATTEST';
    return true;
  });

  const loading = contracts.length === 0 && activity.length === 0;

  return (
    <div className="card flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>📋</span> Recent Transactions
        </h2>
        <div className="flex gap-1 bg-[var(--bg-elevated)] rounded-lg p-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-sm h-full">
          <thead className="sticky top-0 bg-[var(--bg-card)]">
            <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider">
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-left py-2 px-3">Parties</th>
              <th className="text-right py-2 px-3">Amount</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="py-3">
                    <div className="h-8 bg-[var(--bg-elevated)] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filteredTxs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--text-muted)]">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTxs.map((tx) => {
                const status = getStatusBadge(tx.status);
                return (
                  <tr
                    key={tx.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    onClick={() => {
                      if (tx.clickAddress) {
                        onAgentClick(tx.clickAddress);
                      }
                    }}
                  >
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getTypeBadge(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-sm">{tx.parties}</td>
                    <td className="py-3 px-3 text-right font-medium text-[var(--accent-2)]">
                      {tx.amount}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${status.bg}`}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-[var(--text-muted)]">
                      {formatTime(tx.time)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
