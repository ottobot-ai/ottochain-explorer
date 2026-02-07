import { useState, useEffect, useMemo } from 'react';
import { exportToCSV, exportToJSON } from '../lib/export';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { FiberDetailPage } from './FiberDetailPage';
import { FiberStateViewer } from './FiberStateViewer';

// Helper to extract value from wrapped objects like {value: "REGISTERED"}
const unwrapValue = (val: unknown): string => {
  if (val && typeof val === 'object' && 'value' in val) {
    return String((val as { value: unknown }).value);
  }
  return String(val ?? '');
};

const WORKFLOW_TYPES_QUERY = gql`
  query WorkflowTypes {
    workflowTypes {
      name
      description
      count
      states
    }
  }
`;

const FIBERS_QUERY = gql`
  query Fibers($workflowType: String, $status: FiberStatus, $limit: Int, $offset: Int) {
    fibers(workflowType: $workflowType, status: $status, limit: $limit, offset: $offset) {
      fiberId
      workflowType
      workflowDesc
      currentState
      status
      owners
      sequenceNumber
      createdAt
      updatedAt
      stateData
    }
  }
`;

const FIBER_DETAIL_QUERY = gql`
  query FiberDetail($fiberId: String!) {
    fiber(fiberId: $fiberId) {
      fiberId
      workflowType
      workflowDesc
      currentState
      status
      owners
      stateData
      definition
      sequenceNumber
      createdAt
      updatedAt
      transitions(limit: 10) {
        eventName
        fromState
        toState
        success
        gasUsed
        createdAt
      }
    }
  }
`;

interface WorkflowType {
  name: string;
  description: string | null;
  count: number;
  states: string[];
}

interface Fiber {
  fiberId: string;
  workflowType: string;
  workflowDesc: string | null;
  currentState: string;
  status: string;
  owners: string[];
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
  stateData?: Record<string, unknown>;
  definition?: {
    states: Record<string, { id: { value: string }; isFinal: boolean }>;
    transitions: Array<{ from: { value: string }; to: { value: string }; eventName: string }>;
  };
  transitions?: Array<{
    eventName: string;
    fromState: string;
    toState: string;
    success: boolean;
    gasUsed: number;
    createdAt: string;
  }>;
}

// Query response types
interface WorkflowTypesData {
  workflowTypes: WorkflowType[];
}

interface FibersData {
  fibers: Fiber[];
}

interface FiberDetailData {
  fiber: Fiber | null;
}

// Color mapping for workflow types
const typeColors: Record<string, string> = {
  AgentIdentity: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Contract: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TicTacToeLifecycle: 'bg-green-500/20 text-green-400 border-green-500/30',
  TokenEscrow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Voting: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  ApprovalWorkflow: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  SimpleOrderStateMachine: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Market: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const getTypeColor = (type: string) => typeColors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

// State badge colors
const stateColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  finished: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  registered: 'bg-purple-500/20 text-purple-400',
  setup: 'bg-gray-500/20 text-gray-400',
  playing: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  rejected: 'bg-red-500/20 text-red-400',
  disputed: 'bg-orange-500/20 text-orange-400',
};

const getStateColor = (state: string) => stateColors[state.toLowerCase()] || 'bg-gray-500/20 text-gray-400';

// Market type badges
const marketTypeColors: Record<string, string> = {
  Prediction: 'bg-blue-500/20 text-blue-400',
  Auction: 'bg-purple-500/20 text-purple-400',
  Crowdfund: 'bg-green-500/20 text-green-400',
  GroupBuy: 'bg-yellow-500/20 text-yellow-400',
};

const getMarketTypeColor = (type: string) => marketTypeColors[type] || 'bg-gray-500/20 text-gray-400';

interface MarketsViewProps {
  initialFiberId?: string | null;
  onFiberClick?: (fiberId: string) => void;
}

export function MarketsView({ initialFiberId, onFiberClick }: MarketsViewProps = {}) {
  // For Markets view, selectedType is always 'Market'
  const selectedType = 'Market';
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentStateFilter, setCurrentStateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFiber, setSelectedFiber] = useState<string | null>(initialFiberId || null);
  const [modalFiber, setModalFiber] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialFiberId ? '' : 'ACTIVE');
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'ending'>('newest');
  const [marketTypeFilter, setMarketTypeFilter] = useState<string>('All');

  // Handle external fiber selection (e.g., from global search)
  useEffect(() => {
    if (initialFiberId) {
      setSelectedFiber(initialFiberId);
      setStatusFilter(''); // Clear status filter to ensure fiber is visible
      onFiberClick?.(initialFiberId);
    }
  }, [initialFiberId, onFiberClick]);

  const { data: typesData, loading: typesLoading } = useQuery<WorkflowTypesData>(WORKFLOW_TYPES_QUERY);
  const { data: fibersData, loading: fibersLoading } = useQuery<FibersData>(FIBERS_QUERY, {
    variables: {
      workflowType: 'Market',
      status: statusFilter || undefined,
      owner: ownerFilter || undefined,
      limit: 50,
    },
  });

  // Client-side filtering
  const filteredFibers = useMemo(() => {
    let result = fibersData?.fibers || [];

    // Filter by market type
    if (marketTypeFilter !== 'All' && marketTypeFilter !== '') {
      result = result.filter(fiber => {
        const stateData = fiber.stateData as Record<string, unknown> | undefined;
        const marketType = stateData?.marketType as string | undefined;
        return marketType === marketTypeFilter;
      });
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(fiber => new Date(fiber.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      result = result.filter(fiber => new Date(fiber.createdAt) <= to);
    }

    // Filter by current state
    if (currentStateFilter) {
      result = result.filter(fiber => fiber.currentState === currentStateFilter);
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter(fiber => fiber.fiberId.includes(searchQuery));
    }

    // Sort results
    if (sortOption === 'ending') {
      result = [...result].sort((a, b) => {
        const aDeadline = (a.stateData as Record<string, unknown> | undefined)?.deadline as string | undefined;
        const bDeadline = (b.stateData as Record<string, unknown> | undefined)?.deadline as string | undefined;
        
        if (!aDeadline && !bDeadline) return 0;
        if (!aDeadline) return 1;
        if (!bDeadline) return -1;
        
        return new Date(aDeadline).getTime() - new Date(bDeadline).getTime();
      });
    } else {
      result = [...result].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return result;
  }, [fibersData?.fibers, dateFrom, dateTo, currentStateFilter, searchQuery, sortOption, marketTypeFilter]);

  const { data: fiberDetail } = useQuery<FiberDetailData>(FIBER_DETAIL_QUERY, {
    variables: { fiberId: selectedFiber },
    skip: !selectedFiber,
  });

  const workflowTypes: WorkflowType[] = typesData?.workflowTypes || [];
  const fibers: Fiber[] = filteredFibers;
  const detail: Fiber | null = fiberDetail?.fiber || null;

  const totalFibers = workflowTypes.reduce((sum, t) => sum + t.count, 0);
  const marketTypeData = workflowTypes.find(t => t.name === 'Market');

  // Extract unique market types for filter tabs
  const marketTypes = useMemo(() => {
    const types = new Set<string>();
    fibers.forEach(fiber => {
      const stateData = fiber.stateData as Record<string, unknown> | undefined;
      const marketType = stateData?.marketType as string | undefined;
      if (marketType) {
        types.add(marketType);
      }
    });
    return Array.from(types).sort();
  }, [fibers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Markets</h1>
            <p className="text-[var(--text-muted)] mt-1">
              {typesLoading ? (
                <span className="animate-pulse">Loading markets...</span>
              ) : (
                <>Browse all markets on-chain — {marketTypeData?.count ?? fibers.length} total ({totalFibers} fibers across all types)</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="Filter by owner (DAG...)"
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm w-48 placeholder:text-[var(--text-muted)]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="FAILED">Failed</option>
            </select>
            <button onClick={() => exportToCSV(fibers, 'markets.csv')} className="btn-secondary text-xs">
              📥 CSV
            </button>
            <button onClick={() => exportToJSON(fibers, 'markets.json')} className="btn-secondary text-xs">
              📥 JSON
            </button>
          </div>
        </div>

        {/* Advanced Filters - collapsible, on its own row */}
        <details className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-3">
          <summary className="cursor-pointer font-semibold text-[var(--text-primary)] text-sm">
            Advanced Filters
          </summary>
          <div className="flex flex-wrap gap-3 mt-3">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Created after"
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Created before"
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
            />
            <select
              value={currentStateFilter}
              onChange={(e) => setCurrentStateFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="">All States</option>
              {selectedType && workflowTypes.find(type => type.name === selectedType)?.states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Fiber ID"
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm w-48"
            />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'newest' | 'ending')}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="newest">Sort by Newest</option>
              <option value="ending">Sort by Ending Soon</option>
            </select>
          </div>
        </details>
      </div>

      {/* Market Type Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMarketTypeFilter('All')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            marketTypeFilter === 'All' 
              ? 'bg-[var(--accent)] text-white' 
              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
          }`}
        >
          All
        </button>
        {marketTypes.map(type => (
          <button
            key={type}
            onClick={() => setMarketTypeFilter(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              marketTypeFilter === type 
                ? 'bg-[var(--accent)] text-white' 
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Main Content: Market List + Detail */}
      <div className="flex gap-6">
        {/* Market List */}
        <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Markets
            </h2>
          </div>
          
          <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
            {fibersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : fibers.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No markets found
              </div>
            ) : (
              fibers.map((fiber) => {
                const stateData = fiber.stateData as Record<string, unknown> | undefined;
                const question = stateData?.question as string | undefined;
                const marketType = stateData?.marketType as string | undefined;
                const deadline = stateData?.deadline as string | undefined;
                const totalCommitted = stateData?.totalCommitted as number | undefined;
                
                // Calculate time until deadline
                let timeUntilDeadline = '';
                if (deadline) {
                  const now = new Date();
                  const deadlineDate = new Date(deadline);
                  const diff = deadlineDate.getTime() - now.getTime();
                  
                  if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (days > 0) {
                      timeUntilDeadline = `${days}d ${hours}h`;
                    } else if (hours > 0) {
                      timeUntilDeadline = `${hours}h ${minutes}m`;
                    } else {
                      timeUntilDeadline = `${minutes}m`;
                    }
                  } else {
                    timeUntilDeadline = 'Ended';
                  }
                }

                return (
                  <button
                    key={fiber.fiberId}
                    onClick={() => {
                      setSelectedFiber(fiber.fiberId);
                      onFiberClick?.(fiber.fiberId);
                    }}
                    className={`w-full p-4 text-left hover:bg-[var(--bg-elevated)] transition-all duration-200 ${
                      selectedFiber === fiber.fiberId 
                        ? 'bg-[var(--bg-elevated)] border-l-4 border-l-[var(--accent)] ring-1 ring-[var(--accent)]/30' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(unwrapValue(fiber.workflowType))}`}>
                            {unwrapValue(fiber.workflowType)}
                          </span>
                          {marketType && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getMarketTypeColor(marketType)}`}>
                              {marketType}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(unwrapValue(fiber.currentState))}`}>
                            {unwrapValue(fiber.currentState)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {question || 'No question'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          Owner: {unwrapValue(fiber.owners?.[0])?.slice(0, 12)}... • Seq #{fiber.sequenceNumber}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          {deadline && (
                            <div className="flex items-center gap-1">
                              <span className="text-[var(--text-muted)]">⏰</span>
                              <span className={timeUntilDeadline === 'Ended' ? 'text-red-400' : ''}>
                                {timeUntilDeadline}
                              </span>
                            </div>
                          )}
                          {totalCommitted !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-[var(--text-muted)]">💰</span>
                              <span>{totalCommitted.toLocaleString()} DAG</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {new Date(fiber.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Market Detail Panel */}
        <div className="w-[500px] min-w-[400px] bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Market Details</h2>
          </div>
          
          {!selectedFiber ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              Select a market to view details
            </div>
          ) : !detail ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {(() => {
                try {
                  // Safe JSON parsing for detail data
                  const parseJsonSafely = (data: any, fallback = {}) => {
                    if (typeof data !== 'string') return data;
                    try {
                      return JSON.parse(data);
                    } catch (e) {
                      console.warn('Failed to parse JSON:', data, e);
                      return fallback;
                    }
                  };
                  
                  const safeStateData = parseJsonSafely(detail.stateData);
                  
                  return (
                    <>
                      {/* Type & State */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(unwrapValue(detail.workflowType) || 'Market')}`}>
                            {unwrapValue(detail.workflowType) || 'Market'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(unwrapValue(detail.currentState) || 'unknown')}`}>
                            {unwrapValue(detail.currentState) || 'Unknown'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            unwrapValue(detail.status) === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {unwrapValue(detail.status) || 'Unknown'}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-[var(--text-muted)] break-all">
                          {unwrapValue(detail.fiberId)}
                        </div>
                      </div>

                      {/* Owner */}
                      <div>
                        <div className="text-xs text-[var(--text-muted)] mb-1">Owner</div>
                        <div className="text-sm font-mono text-[var(--text-primary)] break-all">
                          {unwrapValue(detail.owners?.[0]) || 'Unknown'}
                        </div>
                      </div>

                      {/* Sequence & Timestamps */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-[var(--text-muted)] mb-1">Sequence</div>
                          <div className="text-lg font-bold text-[var(--text-primary)]">#{detail.sequenceNumber || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--text-muted)] mb-1">Created</div>
                          <div className="text-sm text-[var(--text-primary)]">
                            {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'Unknown'}
                          </div>
                        </div>
                      </div>

                      {/* Market Details */}
                      {safeStateData && typeof safeStateData === 'object' && Object.keys(safeStateData).length > 0 && (
                        <div>
                          <div className="text-xs text-[var(--text-muted)] mb-2">Market Details</div>
                          <div className="space-y-2">
                            {safeStateData.question && (
                              <div>
                                <div className="text-xs text-[var(--text-muted)]">Question</div>
                                <div className="text-sm text-[var(--text-primary)]">{safeStateData.question}</div>
                              </div>
                            )}
                            {safeStateData.marketType && (
                              <div>
                                <div className="text-xs text-[var(--text-muted)]">Type</div>
                                <div className={`text-xs px-2 py-0.5 rounded-full ${getMarketTypeColor(safeStateData.marketType)}`}>
                                  {safeStateData.marketType}
                                </div>
                              </div>
                            )}
                            {safeStateData.deadline && (
                              <div>
                                <div className="text-xs text-[var(--text-muted)]">Deadline</div>
                                <div className="text-sm text-[var(--text-primary)]">
                                  {new Date(safeStateData.deadline).toLocaleString()}
                                </div>
                              </div>
                            )}
                            {safeStateData.totalCommitted !== undefined && (
                              <div>
                                <div className="text-xs text-[var(--text-muted)]">Total Committed</div>
                                <div className="text-sm text-[var(--text-primary)]">
                                  {safeStateData.totalCommitted.toLocaleString()} DAG
                                </div>
                              </div>
                            )}
                            {safeStateData.options && (
                              <div>
                                <div className="text-xs text-[var(--text-muted)]">Options</div>
                                <div className="text-sm text-[var(--text-primary)]">
                                  {Array.isArray(safeStateData.options) 
                                    ? safeStateData.options.join(', ') 
                                    : JSON.stringify(safeStateData.options)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* State Machine Visualization and other sections now handled in try-catch above */}
                      {(() => {
                        try {
                          const parseJsonSafely = (data: any, fallback = {}) => {
                            if (typeof data !== 'string') return data;
                            try {
                              return JSON.parse(data);
                            } catch (e) {
                              console.warn('Failed to parse JSON:', data, e);
                              return fallback;
                            }
                          };
                          
                          const safeDefinition = parseJsonSafely(detail.definition);
                          
                          return (
                            <>
                              {/* State Machine Visualization */}
                              {safeDefinition && typeof safeDefinition === 'object' && 'initialState' in safeDefinition && (
                                <FiberStateViewer 
                                  definition={safeDefinition as any}
                                  currentState={unwrapValue(detail.currentState)}
                                  className="max-h-48"
                                />
                              )}

                              {/* State Machine Diagram (fallback for old format) */}
                              {safeDefinition?.states && !('initialState' in safeDefinition) && (
                                <div>
                                  <div className="text-xs text-[var(--text-muted)] mb-2">States</div>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(safeDefinition.states).map(([key, state]: [string, any]) => (
                                      <span
                                        key={key}
                                        className={`text-xs px-2 py-1 rounded-full border ${
                                          unwrapValue(detail.currentState) === unwrapValue(state?.id)
                                            ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]'
                                            : state?.isFinal
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                            : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]'
                                        }`}
                                      >
                                        {unwrapValue(state?.id) || key} {state?.isFinal && '✓'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recent Transitions */}
                              {detail.transitions && detail.transitions.length > 0 && (
                                <div>
                                  <div className="text-xs text-[var(--text-muted)] mb-2">Recent Transitions</div>
                                  <div className="space-y-2">
                                    {detail.transitions.map((t: any, i: number) => (
                                      <div key={i} className="text-xs bg-[var(--bg-elevated)] p-2 rounded-lg">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[var(--text-muted)]">{unwrapValue(t?.fromState) || 'Unknown'}</span>
                                          <span className="text-[var(--accent)]">→</span>
                                          <span className="text-[var(--text-primary)]">{unwrapValue(t?.toState) || 'Unknown'}</span>
                                        </div>
                                        <div className="text-[var(--text-muted)] mt-1">
                                          {t?.eventName || 'Unknown'} • {t?.success ? '✓' : '✗'} • {t?.gasUsed || 0} gas
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Expand Button */}
                              <button
                                onClick={() => setModalFiber(detail.fiberId)}
                                className="w-full py-2 mt-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-sm font-medium transition-colors"
                              >
                                View Full Details →
                              </button>
                            </>
                          );
                        } catch (error) {
                          console.error('Error rendering fiber state visualization:', error);
                          return (
                            <div className="text-xs text-[var(--red)]">
                              Error loading state visualization
                            </div>
                          );
                        }
                      })()}
                    </>
                  );
                } catch (error) {
                  console.error('Error rendering fiber detail:', error);
                  return (
                    <div className="p-4 text-center text-[var(--red)]">
                      Error loading market details
                      <div className="text-xs text-[var(--text-muted)] mt-2">
                        Check console for details
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Full Detail Modal */}
      {modalFiber && (
        <FiberDetailPage
          fiberId={modalFiber}
          onClose={() => setModalFiber(null)}
        />
      )}
    </div>
  );
}
