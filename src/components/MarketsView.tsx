import { useState } from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { FiberDetailPage } from './FiberDetailPage';

const GET_MARKETS = gql`
  query GetMarkets($limit: Int) {
    fibers(workflowType: "Market", limit: $limit) {
      fiberId
      workflowType
      currentState
      stateData
      sequenceNumber
      createdOrdinal
      updatedOrdinal
      createdAt
      updatedAt
    }
  }
`;

interface MarketFiber {
  fiberId: string;
  workflowType: string;
  currentState: string;
  stateData: string | Record<string, unknown>;
  sequenceNumber: number;
  createdOrdinal: string;
  updatedOrdinal: string;
  createdAt: string;
  updatedAt: string;
}

interface MarketData {
  marketType?: string;
  question?: string;
  title?: string;
  description?: string;
  creator?: string;
  deadline?: string;
  totalCommitted?: number;
  options?: string[];
  status?: string;
}

type MarketType = 'all' | 'prediction' | 'auction' | 'crowdfund' | 'group_buy';

const MARKET_TYPES: { key: MarketType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'prediction', label: 'Predictions' },
  { key: 'auction', label: 'Auctions' },
  { key: 'crowdfund', label: 'Crowdfunding' },
  { key: 'group_buy', label: 'Group Buys' },
];

const STATE_COLORS: Record<string, string> = {
  PROPOSED: 'bg-blue-500/20 text-blue-400',
  OPEN: 'bg-green-500/20 text-green-400',
  CLOSED: 'bg-yellow-500/20 text-yellow-400',
  RESOLVING: 'bg-purple-500/20 text-purple-400',
  SETTLED: 'bg-emerald-500/20 text-emerald-400',
  REFUNDED: 'bg-orange-500/20 text-orange-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

const TYPE_BADGES: Record<string, string> = {
  prediction: '🎯',
  auction: '🔨',
  crowdfund: '🚀',
  group_buy: '🛒',
};

function parseStateData(data: string | Record<string, unknown>): MarketData {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data as MarketData;
}

function getDeadlineStatus(deadline?: string): { text: string; urgent: boolean } {
  if (!deadline) return { text: 'No deadline', urgent: false };
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();
  
  if (diff < 0) return { text: 'Ended', urgent: false };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return { text: `${days}d left`, urgent: false };
  if (hours > 0) return { text: `${hours}h left`, urgent: hours < 24 };
  
  const minutes = Math.floor(diff / (1000 * 60));
  return { text: `${minutes}m left`, urgent: true };
}

export function MarketsView() {
  const [selectedType, setSelectedType] = useState<MarketType>('all');
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  
  const { data, loading, error } = useQuery<{ fibers: MarketFiber[] }>(GET_MARKETS, {
    variables: { limit: 100 },
    pollInterval: 10000,
  });

  const markets = (data?.fibers || [])
    .map(fiber => ({
      ...fiber,
      marketData: parseStateData(fiber.stateData),
    }))
    .filter(m => selectedType === 'all' || m.marketData.marketType === selectedType);

  if (selectedMarket) {
    return (
      <FiberDetailPage
        fiberId={selectedMarket}
        onClose={() => setSelectedMarket(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Markets</h2>
        <div className="flex gap-2">
          {MARKET_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedType === key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          Loading markets...
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-[var(--red)]">
          Error loading markets: {error.message}
        </div>
      )}

      {!loading && markets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-xl font-medium mb-2">No Markets Yet</div>
          <div className="text-[var(--text-muted)]">
            Markets will appear here once agents create prediction markets, auctions, or crowdfunding campaigns.
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {markets.map(market => {
          const { marketData } = market;
          const deadline = getDeadlineStatus(marketData.deadline);
          const marketType = marketData.marketType || 'unknown';
          
          return (
            <div
              key={market.fiberId}
              onClick={() => setSelectedMarket(market.fiberId)}
              className="bg-[var(--bg-card)] rounded-lg p-4 cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_BADGES[marketType] || '📋'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATE_COLORS[market.currentState] || 'bg-gray-500/20'}`}>
                    {market.currentState}
                  </span>
                </div>
                {deadline.urgent && (
                  <span className="text-xs text-[var(--red)] font-medium animate-pulse">
                    ⏰ {deadline.text}
                  </span>
                )}
              </div>

              {/* Title/Question */}
              <h3 className="font-medium mb-2 line-clamp-2">
                {marketData.question || marketData.title || 'Untitled Market'}
              </h3>

              {/* Options preview */}
              {marketData.options && marketData.options.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {marketData.options.slice(0, 3).map((opt, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-xs">
                      {opt}
                    </span>
                  ))}
                  {marketData.options.length > 3 && (
                    <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-xs text-[var(--text-muted)]">
                      +{marketData.options.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                <span>
                  {marketData.totalCommitted 
                    ? `${marketData.totalCommitted.toLocaleString()} committed` 
                    : 'No commitments'}
                </span>
                {!deadline.urgent && (
                  <span>{deadline.text}</span>
                )}
              </div>

              {/* Ordinal */}
              <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                ML0 #{market.createdOrdinal} • Seq #{market.sequenceNumber}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
