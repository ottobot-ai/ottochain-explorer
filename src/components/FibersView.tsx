import { useState, useEffect, useMemo } from 'react';
import { exportToCSV, exportToJSON } from '../lib/export';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { FiberDetailPage } from './FiberDetailPage';
import { Pagination, usePagination } from './Pagination';
import { FiberStateViewer } from './FiberStateViewer';
import {
  fiberStatusBadgeClass,
  getDefinitionByWorkflowType,
  agentStateBadgeClass,
  contractStateBadgeClass,
  marketStateBadgeClass,
} from '../lib/sdk-integration';

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
    states: Record<string, { id: string; isFinal: boolean }>;
    transitions: Array<{ from: string; to: string; eventName: string }>;
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
};

const getTypeColor = (type: string) => typeColors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

/**
 * State badge color for a fiber's currentState value.
 * Routes to the SDK-appropriate helper based on the uppercase state string.
 * Falls back gracefully for custom/unknown workflow types.
 */
const getStateColor = (state: string, workflowType?: string): string => {
  const upper = state.toUpperCase();
  // Try routing to app-specific helper based on workflowType
  if (workflowType) {
    const t = workflowType.toLowerCase();
    if (t.includes('identity') || t.includes('agent')) return agentStateBadgeClass(upper);
    if (t.includes('contract')) return contractStateBadgeClass(upper);
    if (t.includes('market')) return marketStateBadgeClass(upper);
  }
  // Generic fallback: try each app's helper and return first non-default hit
  const fallbacks = [agentStateBadgeClass, contractStateBadgeClass, marketStateBadgeClass];
  for (const fn of fallbacks) {
    const cls = fn(upper);
    if (cls !== 'bg-gray-500/20 text-gray-400') return cls;
  }
  return 'bg-gray-500/20 text-gray-400';
};

interface FibersViewProps {
  initialFiberId?: string | null;
}

export function FibersView({ initialFiberId }: FibersViewProps = {}) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentStateFilter, setCurrentStateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFiber, setSelectedFiber] = useState<string | null>(initialFiberId || null);
  const [modalFiber, setModalFiber] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialFiberId ? '' : 'ACTIVE');
  const [ownerFilter, setOwnerFilter] = useState<string>('');

  // Handle external fiber selection (e.g., from global search)
   
  useEffect(() => {
    if (initialFiberId) {
      setSelectedFiber(initialFiberId);
      setStatusFilter(''); // Clear status filter to ensure fiber is visible
    }
  }, [initialFiberId]);

  const { data: typesData, loading: typesLoading } = useQuery<WorkflowTypesData>(WORKFLOW_TYPES_QUERY);
  const { data: fibersData, loading: fibersLoading } = useQuery<FibersData>(FIBERS_QUERY, {
    variables: {
      workflowType: selectedType,
      status: statusFilter || undefined,
      owner: ownerFilter || undefined,
      limit: 50,
    },
  });

  // Client-side filtering
  const filteredFibers = useMemo(() => {
    let result = fibersData?.fibers || [];

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(fiber => new Date(fiber.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      result = result.filter(fiber => new Date(fiber.createdAt) <= to);
    }

    if (currentStateFilter) {
      result = result.filter(fiber => fiber.currentState === currentStateFilter);
    }

    if (searchQuery) {
      result = result.filter(fiber => fiber.fiberId.includes(searchQuery));
    }

    return result;
  }, [fibersData?.fibers, dateFrom, dateTo, currentStateFilter, searchQuery]);
  const { data: fiberDetail } = useQuery<FiberDetailData>(FIBER_DETAIL_QUERY, {
    variables: { fiberId: selectedFiber },
    skip: !selectedFiber,
  });

  const workflowTypes: WorkflowType[] = typesData?.workflowTypes || [];
  const fibers: Fiber[] = filteredFibers;
  const { page: fiberPage, setPage: setFiberPage, totalPages: fiberTotalPages, pagedItems: pagedFibers, totalItems: fiberTotalItems, pageSize: fiberPageSize } = usePagination(fibers, 10);
  const detail: Fiber | null = fiberDetail?.fiber || null;

  const totalFibers = workflowTypes.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workflow Fibers</h1>
            <p className="text-[var(--text-muted)] mt-1 text-sm">
              Browse all state machines on-chain — {totalFibers} total fibers
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="Filter by owner (DAG...)"
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm w-full sm:w-48 placeholder:text-[var(--text-muted)]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm flex-1 sm:flex-none"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="FAILED">Failed</option>
            </select>
            <button onClick={() => exportToCSV(fibers, 'fibers.csv')} className="btn-secondary text-xs">
              📥 CSV
            </button>
            <button onClick={() => exportToJSON(fibers, 'fibers.json')} className="btn-secondary text-xs">
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
          </div>
        </details>
      </div>

      {/* Workflow Type Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => setSelectedType(null)}
          className={`p-4 rounded-xl border transition-all ${
            selectedType === null
              ? 'bg-[var(--accent)]/20 border-[var(--accent)]'
              : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]'
          }`}
        >
          <div className="text-2xl font-bold text-[var(--text-primary)]">{totalFibers}</div>
          <div className="text-sm text-[var(--text-muted)]">All Types</div>
        </button>
        
        {typesLoading ? (
          <div className="col-span-5 flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
          </div>
        ) : (
          workflowTypes.map((type) => (
            <button
              key={type.name}
              onClick={() => setSelectedType(type.name === selectedType ? null : type.name)}
              className={`p-4 rounded-xl border transition-all text-left ${
                selectedType === type.name
                  ? 'bg-[var(--accent)]/20 border-[var(--accent)]'
                  : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent)]'
              }`}
            >
              <div className="text-2xl font-bold text-[var(--text-primary)]">{type.count}</div>
              <div className={`text-xs px-2 py-0.5 rounded-full inline-block border ${getTypeColor(type.name)}`}>
                {type.name}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-2 truncate">
                {type.states.slice(0, 3).join(' → ')}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Main Content: Fiber List + Detail */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Fiber List */}
        <div className="flex-1 min-w-0 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              {selectedType || 'All'} Fibers
            </h2>
          </div>
          
          <div className="divide-y divide-[var(--border)]">
            {fibersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : fibers.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No fibers found
              </div>
            ) : (
              pagedFibers.map((fiber) => (
                <button
                  key={fiber.fiberId}
                  onClick={() => setSelectedFiber(fiber.fiberId)}
                  className={`w-full p-4 text-left hover:bg-[var(--bg-elevated)] transition-all duration-200 ${
                    selectedFiber === fiber.fiberId 
                      ? 'bg-[var(--bg-elevated)] border-l-4 border-l-[var(--accent)] ring-1 ring-[var(--accent)]/30' 
                      : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(String(fiber.workflowType))}`}>
                          {String(fiber.workflowType)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(String(fiber.currentState), String(fiber.workflowType))}`}>
                          {String(fiber.currentState)}
                        </span>
                      </div>
                      <div className="text-sm font-mono text-[var(--text-muted)] mt-1 truncate">
                        {String(fiber.fiberId)}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        Owner: {String(fiber.owners?.[0])?.slice(0, 12)}... • Seq #{fiber.sequenceNumber}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {new Date(fiber.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <Pagination page={fiberPage} totalPages={fiberTotalPages} onPageChange={setFiberPage} totalItems={fiberTotalItems} pageSize={fiberPageSize} />
        </div>

        {/* Fiber Detail Panel */}
        <div className="w-full lg:w-[500px] lg:min-w-[400px] bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">Fiber Details</h2>
          </div>
          
          {!selectedFiber ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              Select a fiber to view details
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
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(String(detail.workflowType) || 'Unknown')}`}>
                            {String(detail.workflowType) || 'Unknown'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(String(detail.currentState) || 'unknown', String(detail.workflowType))}`}>
                            {String(detail.currentState) || 'Unknown'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${fiberStatusBadgeClass(String(detail.status))}`}>
                            {String(detail.status) || 'Unknown'}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-[var(--text-muted)] break-all">
                          {String(detail.fiberId)}
                        </div>
                      </div>

                      {/* Owner */}
                      <div>
                        <div className="text-xs text-[var(--text-muted)] mb-1">Owner</div>
                        <div className="text-sm font-mono text-[var(--text-primary)] break-all">
                          {String(detail.owners?.[0]) || 'Unknown'}
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

                      {/* State Data */}
                      {safeStateData && typeof safeStateData === 'object' && Object.keys(safeStateData).length > 0 && (
                        <div>
                          <div className="text-xs text-[var(--text-muted)] mb-2">State Data</div>
                          <pre className="text-xs bg-[var(--bg-elevated)] p-3 rounded-lg overflow-x-auto">
                            {JSON.stringify(safeStateData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  );
                } catch (error) {
                  console.error('Error rendering fiber detail:', error);
                  return (
                    <div className="p-4 text-center text-[var(--red)]">
                      Error loading fiber details
                      <div className="text-xs text-[var(--text-muted)] mt-2">
                        Check console for details
                      </div>
                    </div>
                  );
                }
              })()}

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

                  // Fall back to SDK definition if the API didn't return one
                  const sdkDefinition = (!safeDefinition || !('initialState' in (safeDefinition || {})))
                    ? getDefinitionByWorkflowType(String(detail.workflowType))
                    : null;
                  const effectiveDefinition = (safeDefinition && 'initialState' in safeDefinition)
                    ? safeDefinition
                    : sdkDefinition;
                  
                  return (
                    <>
                      {/* State Machine Visualization */}
                      {effectiveDefinition && typeof effectiveDefinition === 'object' && 'initialState' in effectiveDefinition && (
                        <FiberStateViewer 
                          definition={effectiveDefinition as any}
                          currentState={String(detail.currentState)}
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
                                  String(detail.currentState) === String(state?.id)
                                    ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]'
                                    : state?.isFinal
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]'
                                }`}
                              >
                                {String(state?.id) || key} {state?.isFinal && '✓'}
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
                                  <span className="text-[var(--text-muted)]">{String(t?.fromState) || 'Unknown'}</span>
                                  <span className="text-[var(--accent)]">→</span>
                                  <span className="text-[var(--text-primary)]">{String(t?.toState) || 'Unknown'}</span>
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
