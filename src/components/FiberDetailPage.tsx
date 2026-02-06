import { useState } from 'react';
import { gql } from '@apollo/client/core';
import { useQuery } from '@apollo/client/react';
import { FiberStateViewer } from './FiberStateViewer';
import { CopyAddress } from './CopyAddress';

// Helper to extract value from wrapped objects like {value: "REGISTERED"}
const unwrapValue = (val: unknown): string => {
  if (val && typeof val === 'object' && 'value' in val) {
    return String((val as { value: unknown }).value);
  }
  return String(val ?? '');
};

const GET_FIBER = gql`
  query GetFiber($fiberId: String!) {
    fiber(fiberId: $fiberId) {
      fiberId
      workflowType
      currentState
      stateData
      definition
      owners
      sequenceNumber
      createdAt
      updatedAt
      createdOrdinal
      updatedOrdinal
    }
    fiberTransitions(fiberId: $fiberId, limit: 50) {
      id
      eventName
      fromState
      toState
      success
      gasUsed
      payload
      snapshotOrdinal
      createdAt
    }
  }
`;

interface FiberDetailPageProps {
  fiberId: string;
  onClose: () => void;
  onAgentClick?: (address: string) => void;
}

interface FiberData {
  fiberId: string;
  workflowType: string;
  currentState: string;
  stateData: string | Record<string, unknown>;
  definition: string | Record<string, unknown>;
  owners: string[];
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
  createdOrdinal: number;
  updatedOrdinal: number;
}

interface TransitionData {
  id: string;
  eventName: string;
  fromState: string;
  toState: string;
  success: boolean;
  gasUsed: number;
  payload: string;
  snapshotOrdinal: number;
  createdAt: string;
}

interface GetFiberResponse {
  fiber: FiberData | null;
  fiberTransitions: TransitionData[];
}

// Schema-specific renderers
function AgentIdentityView({ stateData, onAgentClick }: { 
  stateData: Record<string, unknown>;
  onAgentClick?: (address: string) => void;
}) {
  const displayName = stateData.displayName as string | undefined;
  const platform = stateData.platform as string | undefined;
  const platformUserId = stateData.platformUserId as string | undefined;
  const reputation = stateData.reputation as number | undefined;
  const completedContracts = stateData.completedContracts as number | undefined;
  const vouches = stateData.vouches as unknown[] | undefined;
  const violations = stateData.violations as unknown[] | undefined;
  const owner = stateData.owner as string | undefined;
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--bg)] rounded-lg">
      <div className="col-span-2 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--green)] flex items-center justify-center text-lg font-bold">
          {displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-medium">{displayName || 'Unnamed Agent'}</div>
          <div className="text-sm text-[var(--text-muted)]">
            {platform}:{platformUserId}
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-[var(--bg-elevated)] rounded">
        <div className="text-2xl font-bold text-[var(--accent)]">{reputation ?? 0}</div>
        <div className="text-xs text-[var(--text-muted)]">Reputation</div>
      </div>
      
      <div className="p-3 bg-[var(--bg-elevated)] rounded">
        <div className="text-2xl font-bold text-[var(--green)]">{completedContracts ?? 0}</div>
        <div className="text-xs text-[var(--text-muted)]">Contracts</div>
      </div>
      
      <div className="p-3 bg-[var(--bg-elevated)] rounded">
        <div className="text-2xl font-bold">{vouches?.length ?? 0}</div>
        <div className="text-xs text-[var(--text-muted)]">Vouches</div>
      </div>
      
      <div className="p-3 bg-[var(--bg-elevated)] rounded">
        <div className="text-2xl font-bold text-[var(--red)]">{violations?.length ?? 0}</div>
        <div className="text-xs text-[var(--text-muted)]">Violations</div>
      </div>
      
      {owner && (
        <div className="col-span-2">
          <div className="text-xs text-[var(--text-muted)] mb-1">Owner</div>
          <button 
            onClick={() => onAgentClick?.(owner)}
            className="text-sm text-[var(--accent)] hover:underline"
          >
            <CopyAddress address={owner} />
          </button>
        </div>
      )}
    </div>
  );
}

function ContractView({ stateData, onAgentClick }: { 
  stateData: Record<string, unknown>;
  onAgentClick?: (address: string) => void;
}) {
  const proposer = stateData.proposer as string | undefined;
  const counterparty = stateData.counterparty as string | undefined;
  const terms = stateData.terms as string | undefined;
  const value = stateData.value as string | undefined;
  const completionCriteria = stateData.completionCriteria;
  
  return (
    <div className="space-y-4 p-4 bg-[var(--bg)] rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">Proposer</div>
          {proposer && (
            <button 
              onClick={() => onAgentClick?.(proposer)}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              <CopyAddress address={proposer} />
            </button>
          )}
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">Counterparty</div>
          {counterparty ? (
            <button 
              onClick={() => onAgentClick?.(counterparty)}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              <CopyAddress address={counterparty} />
            </button>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">Pending</span>
          )}
        </div>
      </div>
      
      {value && (
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">Value</div>
          <div className="text-lg font-medium">{value}</div>
        </div>
      )}
      
      {terms && (
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">Terms</div>
          <div className="text-sm bg-[var(--bg-elevated)] p-3 rounded font-mono">
            {terms}
          </div>
        </div>
      )}
      
      {completionCriteria != null && (
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-1">Completion Criteria</div>
          <pre className="text-xs bg-[var(--bg-elevated)] p-3 rounded overflow-auto">
            {JSON.stringify(completionCriteria, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function GenericStateView({ stateData }: { stateData: Record<string, unknown> }) {
  return (
    <div className="p-4 bg-[var(--bg)] rounded-lg">
      <div className="text-xs text-[var(--text-muted)] mb-2">State Data</div>
      <pre className="text-xs font-mono overflow-auto max-h-64 bg-[var(--bg-elevated)] p-3 rounded">
        {JSON.stringify(stateData, null, 2)}
      </pre>
    </div>
  );
}

export function FiberDetailPage({ fiberId, onClose, onAgentClick }: FiberDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transitions' | 'definition'>('overview');
  
  const { data, loading, error } = useQuery<GetFiberResponse>(GET_FIBER, {
    variables: { fiberId }
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg-card)] rounded-lg p-8">
          <div className="animate-pulse">Loading fiber...</div>
        </div>
      </div>
    );
  }

  if (error || !data?.fiber) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg-card)] rounded-lg p-8">
          <div className="text-[var(--red)]">Fiber not found</div>
          <button onClick={onClose} className="mt-4 btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  const fiber = data.fiber;
  const transitions = data.fiberTransitions || [];
  
  // Safe JSON parsing with fallbacks
  const parseJsonSafely = (data: string | Record<string, unknown>, fallback = {}) => {
    if (typeof data !== 'string') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to parse JSON:', data, e);
      return fallback;
    }
  };
  
  const stateData = parseJsonSafely(fiber.stateData);
  const definition = parseJsonSafely(fiber.definition);

  // Determine which schema-specific view to use
  const renderStateView = () => {
    switch (unwrapValue(fiber.workflowType)) {
      case 'AgentIdentity':
        return <AgentIdentityView stateData={stateData} onAgentClick={onAgentClick} />;
      case 'Contract':
        return <ContractView stateData={stateData} onAgentClick={onAgentClick} />;
      default:
        return <GenericStateView stateData={stateData} />;
    }
  };

  const getWorkflowBadgeColor = (type: string) => {
    switch (type) {
      case 'AgentIdentity': return 'bg-[var(--accent)]/20 text-[var(--accent)]';
      case 'Contract': return 'bg-[var(--green)]/20 text-[var(--green)]';
      default: return 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getWorkflowBadgeColor(unwrapValue(fiber.workflowType))}`}>
              {unwrapValue(fiber.workflowType)}
            </span>
            <div>
              <div className="font-mono text-sm">{fiber.fiberId}</div>
              <div className="text-xs text-[var(--text-muted)]">
                Created at ordinal {fiber.createdOrdinal} • Seq #{fiber.sequenceNumber}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(['overview', 'transitions', 'definition'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'transitions' && ` (${transitions.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* State Machine Visualization */}
              {definition && definition.initialState && definition.states ? (
                <FiberStateViewer 
                  definition={definition} 
                  currentState={unwrapValue(fiber.currentState)}
                />
              ) : definition ? (
                <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
                  <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                    State Machine Definition
                  </div>
                  <pre className="text-xs font-mono overflow-auto max-h-48 bg-[var(--bg)] p-3 rounded">
                    {JSON.stringify(definition, null, 2)}
                  </pre>
                </div>
              ) : null}
              
              {/* Current State Info */}
              <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Current State</h3>
                  <span className="px-2 py-1 bg-[var(--accent)] rounded text-xs font-medium">
                    {unwrapValue(fiber.currentState)}
                  </span>
                </div>
                {renderStateView()}
              </div>
              
              {/* Owners */}
              {fiber.owners?.length > 0 && (
                <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Owners</h3>
                  <div className="space-y-1">
                    {fiber.owners.map((owner: string) => (
                      <button 
                        key={owner}
                        onClick={() => onAgentClick?.(owner)}
                        className="block text-sm text-[var(--accent)] hover:underline font-mono"
                      >
                        {owner}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transitions' && (
            <div className="space-y-2">
              {transitions.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] py-8">
                  No transitions yet
                </div>
              ) : (
                transitions.map((tx: {
                  id: string;
                  eventName: string;
                  fromState: string;
                  toState: string;
                  success: boolean;
                  gasUsed: number;
                  snapshotOrdinal: number;
                  createdAt: string;
                  payload: string;
                }) => (
                  <div 
                    key={tx.id}
                    className={`p-3 rounded-lg border ${
                      tx.success 
                        ? 'bg-[var(--bg-elevated)] border-[var(--border)]' 
                        : 'bg-[var(--red)]/10 border-[var(--red)]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${tx.success ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {tx.success ? '✓' : '✗'}
                        </span>
                        <span className="font-medium">{tx.eventName}</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Ordinal {tx.snapshotOrdinal}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
                      <span className="px-1.5 py-0.5 bg-[var(--bg)] rounded text-xs">{tx.fromState}</span>
                      <span>→</span>
                      <span className="px-1.5 py-0.5 bg-[var(--bg)] rounded text-xs">{tx.toState}</span>
                      {tx.gasUsed > 0 && (
                        <span className="ml-auto text-xs">⛽ {tx.gasUsed}</span>
                      )}
                    </div>
                    {tx.payload && tx.payload !== '{}' && (
                      <details className="mt-2">
                        <summary className="text-xs text-[var(--text-muted)] cursor-pointer">
                          Payload
                        </summary>
                        <pre className="text-xs font-mono bg-[var(--bg)] p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(typeof tx.payload === 'string' ? JSON.parse(tx.payload) : tx.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'definition' && (
            <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
              <pre className="text-xs font-mono overflow-auto max-h-[60vh]">
                {JSON.stringify(definition, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
