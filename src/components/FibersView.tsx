import { useState } from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { FiberDetailPage } from './FiberDetailPage';
import { FiberStateViewer } from './FiberStateViewer';

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

export function FibersView() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFiber, setSelectedFiber] = useState<string | null>(null);
  const [modalFiber, setModalFiber] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const { data: typesData, loading: typesLoading } = useQuery<WorkflowTypesData>(WORKFLOW_TYPES_QUERY);
  const { data: fibersData, loading: fibersLoading } = useQuery<FibersData>(FIBERS_QUERY, {
    variables: {
      workflowType: selectedType,
      status: statusFilter || undefined,
      limit: 50,
    },
    pollInterval: 10000,
  });
  const { data: fiberDetail } = useQuery<FiberDetailData>(FIBER_DETAIL_QUERY, {
    variables: { fiberId: selectedFiber },
    skip: !selectedFiber,
  });

  const workflowTypes: WorkflowType[] = typesData?.workflowTypes || [];
  const fibers: Fiber[] = fibersData?.fibers || [];
  const detail: Fiber | null = fiberDetail?.fiber || null;

  const totalFibers = workflowTypes.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workflow Fibers</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Browse all state machines on-chain — {totalFibers} total fibers
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
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
      <div className="flex gap-6">
        {/* Fiber List */}
        <div className="flex-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              {selectedType || 'All'} Fibers
            </h2>
          </div>
          
          <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
            {fibersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : fibers.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                No fibers found
              </div>
            ) : (
              fibers.map((fiber) => (
                <button
                  key={fiber.fiberId}
                  onClick={() => setSelectedFiber(fiber.fiberId)}
                  className={`w-full p-4 text-left hover:bg-[var(--bg-elevated)] transition-colors ${
                    selectedFiber === fiber.fiberId ? 'bg-[var(--bg-elevated)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(fiber.workflowType)}`}>
                          {fiber.workflowType}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(fiber.currentState)}`}>
                          {fiber.currentState}
                        </span>
                      </div>
                      <div className="text-sm font-mono text-[var(--text-muted)] mt-1 truncate">
                        {fiber.fiberId}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        Owner: {fiber.owners[0]?.slice(0, 12)}... • Seq #{fiber.sequenceNumber}
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
        </div>

        {/* Fiber Detail Panel */}
        <div className="w-96 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
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
              {/* Type & State */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(detail.workflowType)}`}>
                    {detail.workflowType}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStateColor(detail.currentState)}`}>
                    {detail.currentState}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    detail.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {detail.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-[var(--text-muted)] break-all">
                  {detail.fiberId}
                </div>
              </div>

              {/* Owner */}
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Owner</div>
                <div className="text-sm font-mono text-[var(--text-primary)] break-all">
                  {detail.owners[0]}
                </div>
              </div>

              {/* Sequence & Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">Sequence</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">#{detail.sequenceNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">Created</div>
                  <div className="text-sm text-[var(--text-primary)]">
                    {new Date(detail.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* State Data */}
              {detail.stateData && Object.keys(detail.stateData).length > 0 && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">State Data</div>
                  <pre className="text-xs bg-[var(--bg-elevated)] p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(detail.stateData, null, 2)}
                  </pre>
                </div>
              )}

              {/* State Machine Visualization */}
              {detail.definition && 'initialState' in detail.definition && (
                <FiberStateViewer 
                  definition={detail.definition as unknown as {
                    metadata?: { name?: string; description?: string };
                    initialState: string;
                    states: Record<string, {
                      name: string;
                      metadata?: { description?: string };
                      actions?: Array<{ eventName: string; target: string; guards?: unknown[] }>;
                    }>;
                  }}
                  currentState={detail.currentState}
                  className="max-h-48"
                />
              )}

              {/* State Machine Diagram (fallback for old format) */}
              {detail.definition?.states && !('initialState' in detail.definition) && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-2">States</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detail.definition.states).map(([key, state]) => (
                      <span
                        key={key}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          detail.currentState === state.id.value
                            ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]'
                            : state.isFinal
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]'
                        }`}
                      >
                        {state.id.value} {state.isFinal && '✓'}
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
                    {detail.transitions.map((t, i) => (
                      <div key={i} className="text-xs bg-[var(--bg-elevated)] p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--text-muted)]">{t.fromState}</span>
                          <span className="text-[var(--accent)]">→</span>
                          <span className="text-[var(--text-primary)]">{t.toState}</span>
                        </div>
                        <div className="text-[var(--text-muted)] mt-1">
                          {t.eventName} • {t.success ? '✓' : '✗'} • {t.gasUsed} gas
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
