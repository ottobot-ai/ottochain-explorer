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
      transitions(limit: 20) {
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

// Oracle state badge colors
const oracleStateColors: Record<string, string> = {
  REGISTERED: 'bg-purple-500/20 text-purple-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  ASSIGNED: 'bg-blue-500/20 text-blue-400',
  SUBMITTED: 'bg-cyan-500/20 text-cyan-400',
  CHALLENGED: 'bg-orange-500/20 text-orange-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
  SLASHED: 'bg-red-500/20 text-red-400',
  WITHDRAWN: 'bg-gray-500/20 text-gray-400',
};

const getOracleStateColor = (state: string) => 
  oracleStateColors[state.toUpperCase()] || 'bg-gray-500/20 text-gray-400';

// Reputation tier colors
const getReputationColor = (accuracy: number) => {
  if (accuracy >= 95) return 'text-green-400';
  if (accuracy >= 80) return 'text-yellow-400';
  if (accuracy >= 60) return 'text-orange-400';
  return 'text-red-400';
};

const getReputationBadge = (accuracy: number) => {
  if (accuracy >= 95) return { label: 'Elite', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (accuracy >= 80) return { label: 'Trusted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  if (accuracy >= 60) return { label: 'Standard', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'Low Trust', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
};

interface OraclesViewProps {
  initialFiberId?: string | null;
  onFiberClick?: (fiberId: string) => void;
  onAgentClick?: (address: string) => void;
}

export function OraclesView({ initialFiberId, onFiberClick, onAgentClick }: OraclesViewProps = {}) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOracle, setSelectedOracle] = useState<string | null>(initialFiberId || null);
  const [modalFiber, setModalFiber] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialFiberId ? '' : 'ACTIVE');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [sortOption, setSortOption] = useState<'reputation' | 'stake' | 'newest'>('reputation');
  const [activeTab, setActiveTab] = useState<'overview' | 'attestations' | 'pending'>('overview');

  // Handle external fiber selection
  useEffect(() => {
    if (initialFiberId) {
      setSelectedOracle(initialFiberId);
      setStatusFilter('');
      onFiberClick?.(initialFiberId);
    }
  }, [initialFiberId, onFiberClick]);

  const { data: typesData, loading: typesLoading } = useQuery<WorkflowTypesData>(WORKFLOW_TYPES_QUERY);
  const { data: fibersData, loading: fibersLoading } = useQuery<FibersData>(FIBERS_QUERY, {
    variables: {
      workflowType: 'Oracle',
      status: statusFilter || undefined,
      limit: 100,
    },
  });

  // Client-side filtering and sorting
  const filteredOracles = useMemo(() => {
    let result = fibersData?.fibers || [];

    // Filter by state
    if (stateFilter) {
      result = result.filter(fiber => 
        unwrapValue(fiber.currentState).toUpperCase() === stateFilter.toUpperCase()
      );
    }

    // Filter by search query (address or fiber ID)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(fiber => {
        const stateData = fiber.stateData as Record<string, unknown> | undefined;
        const address = (stateData?.address as string) || '';
        return fiber.fiberId.toLowerCase().includes(query) || 
               address.toLowerCase().includes(query);
      });
    }

    // Sort results
    result = [...result].sort((a, b) => {
      const aData = a.stateData as Record<string, unknown> | undefined;
      const bData = b.stateData as Record<string, unknown> | undefined;

      if (sortOption === 'reputation') {
        const aRep = (aData?.reputation as { accuracy?: number })?.accuracy ?? 0;
        const bRep = (bData?.reputation as { accuracy?: number })?.accuracy ?? 0;
        return bRep - aRep;
      }
      if (sortOption === 'stake') {
        const aStake = (aData?.stake as number) ?? 0;
        const bStake = (bData?.stake as number) ?? 0;
        return bStake - aStake;
      }
      // newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [fibersData?.fibers, stateFilter, searchQuery, sortOption]);

  const { data: oracleDetail } = useQuery<FiberDetailData>(FIBER_DETAIL_QUERY, {
    variables: { fiberId: selectedOracle },
    skip: !selectedOracle,
  });

  const workflowTypes: WorkflowType[] = typesData?.workflowTypes || [];
  const oracles: Fiber[] = filteredOracles;
  const detail: Fiber | null = oracleDetail?.fiber || null;

  const totalFibers = workflowTypes.reduce((sum, t) => sum + t.count, 0);
  const oracleTypeData = workflowTypes.find(t => t.name === 'Oracle');

  // Calculate stats
  const stats = useMemo(() => {
    const allOracles = fibersData?.fibers || [];
    let totalResolutions = 0;
    let totalStake = 0;
    let activeCount = 0;
    let pendingCount = 0;

    allOracles.forEach(oracle => {
      const stateData = oracle.stateData as Record<string, unknown> | undefined;
      const reputation = stateData?.reputation as { totalResolutions?: number } | undefined;
      totalResolutions += reputation?.totalResolutions ?? 0;
      totalStake += (stateData?.stake as number) ?? 0;
      
      const state = unwrapValue(oracle.currentState).toUpperCase();
      if (state === 'ACTIVE') activeCount++;
      if (state === 'ASSIGNED') pendingCount++;
    });

    return { totalResolutions, totalStake, activeCount, pendingCount, total: allOracles.length };
  }, [fibersData?.fibers]);

  // Extract attestation history from oracle's transitions
  const attestationHistory = useMemo(() => {
    if (!detail?.transitions) return [];
    return detail.transitions.filter(t => 
      t.eventName === 'record_resolution' || 
      t.eventName === 'submit_attestation' ||
      t.eventName === 'resolve'
    );
  }, [detail?.transitions]);

  // Unique states for filter
  const oracleStates = useMemo(() => {
    const states = new Set<string>();
    (fibersData?.fibers || []).forEach(fiber => {
      states.add(unwrapValue(fiber.currentState).toUpperCase());
    });
    return Array.from(states).sort();
  }, [fibersData?.fibers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">🔮 Oracles</h1>
            <p className="text-[var(--text-muted)] mt-1">
              {typesLoading ? (
                <span className="animate-pulse">Loading oracles...</span>
              ) : (
                <>Truth providers for market resolutions — {oracleTypeData?.count ?? oracles.length} registered ({totalFibers} fibers total)</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address or ID..."
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm w-56 placeholder:text-[var(--text-muted)]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button onClick={() => exportToCSV(oracles, 'oracles.csv')} className="btn-secondary text-xs">
              📥 CSV
            </button>
            <button onClick={() => exportToJSON(oracles, 'oracles.json')} className="btn-secondary text-xs">
              📥 JSON
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Total Oracles</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Active Oracles</div>
          <div className="text-2xl font-bold text-green-400">{stats.activeCount}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Pending Resolutions</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pendingCount}</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Total Stake</div>
          <div className="text-2xl font-bold text-[var(--accent)]">{stats.totalStake.toLocaleString()} DAG</div>
        </div>
      </div>

      {/* State Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStateFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            stateFilter === '' 
              ? 'bg-[var(--accent)] text-white' 
              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
          }`}
        >
          All States
        </button>
        {oracleStates.map(state => (
          <button
            key={state}
            onClick={() => setStateFilter(state)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              stateFilter === state 
                ? 'bg-[var(--accent)] text-white' 
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            {state}
          </button>
        ))}
        <div className="flex-1" />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as 'reputation' | 'stake' | 'newest')}
          className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="reputation">Sort by Reputation</option>
          <option value="stake">Sort by Stake</option>
          <option value="newest">Sort by Newest</option>
        </select>
      </div>

      {/* Main Content: Oracle List + Detail */}
      <div className="flex gap-6">
        {/* Oracle List */}
        <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Registered Oracles ({oracles.length})
            </h2>
          </div>
          
          <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
            {fibersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : oracles.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No oracles found
              </div>
            ) : (
              oracles.map((oracle) => {
                const stateData = oracle.stateData as Record<string, unknown> | undefined;
                const address = stateData?.address as string | undefined;
                const stake = stateData?.stake as number | undefined;
                const reputation = stateData?.reputation as { 
                  accuracy?: number; 
                  totalResolutions?: number;
                  disputesWon?: number;
                  disputesLost?: number;
                } | undefined;
                const domains = stateData?.domains as string[] | undefined;
                const currentState = unwrapValue(oracle.currentState);
                const repBadge = getReputationBadge(reputation?.accuracy ?? 0);

                return (
                  <button
                    key={oracle.fiberId}
                    onClick={() => {
                      setSelectedOracle(oracle.fiberId);
                      onFiberClick?.(oracle.fiberId);
                    }}
                    className={`w-full p-4 text-left hover:bg-[var(--bg-elevated)] transition-all duration-200 ${
                      selectedOracle === oracle.fiberId 
                        ? 'bg-[var(--bg-elevated)] border-l-4 border-l-[var(--accent)] ring-1 ring-[var(--accent)]/30' 
                        : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getOracleStateColor(currentState)}`}>
                            {currentState}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${repBadge.color}`}>
                            {repBadge.label}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-[var(--text-primary)] font-mono truncate">
                          {address?.slice(0, 20)}...{address?.slice(-8)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                          <span className={getReputationColor(reputation?.accuracy ?? 0)}>
                            {reputation?.accuracy ?? 0}% accuracy
                          </span>
                          <span>•</span>
                          <span>{reputation?.totalResolutions ?? 0} resolutions</span>
                          <span>•</span>
                          <span>{stake?.toLocaleString() ?? 0} DAG staked</span>
                        </div>
                        {domains && domains.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {domains.slice(0, 3).map((domain, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--text-muted)]">
                                {domain}
                              </span>
                            ))}
                            {domains.length > 3 && (
                              <span className="text-xs text-[var(--text-muted)]">+{domains.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-[var(--text-muted)]">
                          {new Date(oracle.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          Seq #{oracle.sequenceNumber}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Oracle Detail Panel */}
        <div className="w-[500px] min-w-[400px] bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Oracle Details</h2>
          </div>
          
          {!selectedOracle ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              Select an oracle to view details
            </div>
          ) : !detail ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Detail Tabs */}
              <div className="flex border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('attestations')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'attestations'
                      ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  Attestation History
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'pending'
                      ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  Pending
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[520px] overflow-y-auto">
                {(() => {
                  try {
                    const parseJsonSafely = (data: unknown, fallback = {}) => {
                      if (typeof data !== 'string') return data;
                      try {
                        return JSON.parse(data as string);
                      } catch {
                        return fallback;
                      }
                    };
                    
                    const safeStateData = parseJsonSafely(detail.stateData) as Record<string, unknown>;
                    const address = safeStateData?.address as string | undefined;
                    const stake = safeStateData?.stake as number | undefined;
                    const minStake = safeStateData?.minStake as number | undefined;
                    const reputation = safeStateData?.reputation as {
                      accuracy?: number;
                      totalResolutions?: number;
                      disputesWon?: number;
                      disputesLost?: number;
                    } | undefined;
                    const domains = safeStateData?.domains as string[] | undefined;
                    const slashingHistory = safeStateData?.slashingHistory as Array<{
                      amount: number;
                      reason: string;
                      marketId?: string;
                      timestamp?: string;
                    }> | undefined;
                    const currentState = unwrapValue(detail.currentState);
                    const repBadge = getReputationBadge(reputation?.accuracy ?? 0);

                    if (activeTab === 'overview') {
                      return (
                        <>
                          {/* State & Status */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getOracleStateColor(currentState)}`}>
                                {currentState}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${repBadge.color}`}>
                                {repBadge.label}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                unwrapValue(detail.status) === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {unwrapValue(detail.status)}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-[var(--text-muted)] break-all">
                              {detail.fiberId}
                            </div>
                          </div>

                          {/* Oracle Address */}
                          <div>
                            <div className="text-xs text-[var(--text-muted)] mb-1">Oracle Address</div>
                            <button
                              onClick={() => address && onAgentClick?.(address)}
                              className="text-sm font-mono text-[var(--accent)] hover:underline break-all text-left"
                            >
                              {address || 'Unknown'}
                            </button>
                          </div>

                          {/* Reputation Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Accuracy</div>
                              <div className={`text-2xl font-bold ${getReputationColor(reputation?.accuracy ?? 0)}`}>
                                {reputation?.accuracy ?? 0}%
                              </div>
                            </div>
                            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Total Resolutions</div>
                              <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {reputation?.totalResolutions ?? 0}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Disputes Won</div>
                              <div className="text-2xl font-bold text-green-400">
                                {reputation?.disputesWon ?? 0}
                              </div>
                            </div>
                            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Disputes Lost</div>
                              <div className="text-2xl font-bold text-red-400">
                                {reputation?.disputesLost ?? 0}
                              </div>
                            </div>
                          </div>

                          {/* Stake Info */}
                          <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-xs text-[var(--text-muted)]">Staked Amount</div>
                              <div className="text-lg font-bold text-[var(--accent)]">
                                {stake?.toLocaleString() ?? 0} DAG
                              </div>
                            </div>
                            {minStake && (
                              <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                                <span>Minimum Required</span>
                                <span>{minStake.toLocaleString()} DAG</span>
                              </div>
                            )}
                          </div>

                          {/* Domains */}
                          {domains && domains.length > 0 && (
                            <div>
                              <div className="text-xs text-[var(--text-muted)] mb-2">Specialization Domains</div>
                              <div className="flex flex-wrap gap-2">
                                {domains.map((domain, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                                    {domain}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Slashing History */}
                          {slashingHistory && slashingHistory.length > 0 && (
                            <div>
                              <div className="text-xs text-[var(--text-muted)] mb-2">Slashing History</div>
                              <div className="space-y-2">
                                {slashingHistory.map((slash, i) => (
                                  <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="text-sm font-medium text-red-400">-{slash.amount} DAG</div>
                                        <div className="text-xs text-[var(--text-muted)]">{slash.reason}</div>
                                      </div>
                                      {slash.timestamp && (
                                        <div className="text-xs text-[var(--text-muted)]">
                                          {new Date(slash.timestamp).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          <div>
                            <div className="text-xs text-[var(--text-muted)] mb-2">Timeline</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-green-400">●</span>
                                <span className="text-[var(--text-muted)]">Registered</span>
                                <span className="text-[var(--text-primary)]">{new Date(detail.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400">●</span>
                                <span className="text-[var(--text-muted)]">Last Activity</span>
                                <span className="text-[var(--text-primary)]">{new Date(detail.updatedAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* State Machine Visualization */}
                          {(() => {
                            const safeDefinition = parseJsonSafely(detail.definition);
                            if (safeDefinition && typeof safeDefinition === 'object' && 'initialState' in (safeDefinition as Record<string, unknown>)) {
                              return (
                                <FiberStateViewer 
                                  definition={safeDefinition as Parameters<typeof FiberStateViewer>[0]['definition']}
                                  currentState={currentState}
                                  className="max-h-48"
                                />
                              );
                            }
                            return null;
                          })()}
                        </>
                      );
                    }

                    if (activeTab === 'attestations') {
                      return (
                        <>
                          <div className="text-xs text-[var(--text-muted)] mb-2">
                            Attestation & Resolution History ({attestationHistory.length})
                          </div>
                          {attestationHistory.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                              No attestation history yet
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {attestationHistory.map((t, i) => (
                                <div key={i} className="bg-[var(--bg-elevated)] rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                      {t.eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      t.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {t.success ? '✓ Success' : '✗ Failed'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                    <span>{unwrapValue(t.fromState)}</span>
                                    <span className="text-[var(--accent)]">→</span>
                                    <span>{unwrapValue(t.toState)}</span>
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)] mt-1">
                                    {new Date(t.createdAt).toLocaleString()} • {t.gasUsed} gas
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* All Transitions */}
                          {detail.transitions && detail.transitions.length > attestationHistory.length && (
                            <>
                              <div className="text-xs text-[var(--text-muted)] mt-4 mb-2">
                                All Transitions ({detail.transitions.length})
                              </div>
                              <div className="space-y-2">
                                {detail.transitions.filter(t => !attestationHistory.includes(t)).map((t, i) => (
                                  <div key={i} className="bg-[var(--bg-elevated)] rounded-lg p-2 text-xs">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[var(--text-muted)]">{unwrapValue(t.fromState)}</span>
                                      <span className="text-[var(--accent)]">→</span>
                                      <span className="text-[var(--text-primary)]">{unwrapValue(t.toState)}</span>
                                      <span className="text-[var(--text-muted)] ml-auto">{t.eventName}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      );
                    }

                    if (activeTab === 'pending') {
                      const isPending = currentState.toUpperCase() === 'ASSIGNED';
                      return (
                        <>
                          <div className="text-xs text-[var(--text-muted)] mb-2">Pending Resolution Requests</div>
                          {!isPending ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                              No pending resolution requests
                            </div>
                          ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-yellow-400">⏳</span>
                                <span className="text-sm font-medium text-yellow-400">Assigned for Resolution</span>
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                This oracle is currently assigned to resolve a market or dispute.
                                Check the market details for more information.
                              </div>
                              {Boolean(safeStateData?.assignedMarketId) && (
                                <div className="mt-2">
                                  <div className="text-xs text-[var(--text-muted)]">Assigned Market</div>
                                  <div className="text-sm font-mono text-[var(--accent)]">
                                    {String(safeStateData.assignedMarketId)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    }

                    return null;
                  } catch (error) {
                    console.error('Error rendering oracle detail:', error);
                    return (
                      <div className="p-4 text-center text-[var(--red)]">
                        Error loading oracle details
                        <div className="text-xs text-[var(--text-muted)] mt-2">
                          Check console for details
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Expand Button */}
                <button
                  onClick={() => setModalFiber(detail.fiberId)}
                  className="w-full py-2 mt-2 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-sm font-medium transition-colors"
                >
                  View Full Details →
                </button>
              </div>
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
