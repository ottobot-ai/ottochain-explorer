/**
 * SDK Integration — OttoChain Explorer
 *
 * Single source of truth for:
 *   - State machine definitions (from @ottochain/sdk)
 *   - State display helpers: colors, icons, labels
 *   - Valid next-state lookups
 *
 * All helpers are keyed by the short-form state strings that the
 * GraphQL / indexer API returns (e.g. "ACTIVE", "PROPOSED") which
 * match the SDK state machine definition state names directly.
 */

// ─── SDK imports ────────────────────────────────────────────────────────────
import { getIdentityDefinition } from '@ottochain/sdk/apps/identity';
import { getContractDefinition } from '@ottochain/sdk/apps/contracts';
import { getMarketDefinition } from '@ottochain/sdk/apps/markets';
import { getGovernanceDefinition, getDAODefinition } from '@ottochain/sdk/apps/governance';
import type { StateMachineDefinition } from '@ottochain/sdk';

// ─── Re-export SDK definitions ───────────────────────────────────────────────

/** Agent identity state machine definition */
export const agentStateMachineDefinition: StateMachineDefinition =
  getIdentityDefinition('agent') as unknown as StateMachineDefinition;

/**
 * Agreement contract state machine definition.
 * Use 'agreement' (not 'universal') as it includes DISPUTED and REJECTED states
 * that agents encounter in practice.
 */
export const contractStateMachineDefinition: StateMachineDefinition =
  getContractDefinition('agreement') as unknown as StateMachineDefinition;

/** Universal market state machine definition */
export const marketStateMachineDefinition: StateMachineDefinition =
  getMarketDefinition('universal') as unknown as StateMachineDefinition;

/** Universal DAO governance state machine definition */
export const governanceStateMachineDefinition: StateMachineDefinition | null = (() => {
  try {
    return getGovernanceDefinition('universal') as unknown as StateMachineDefinition;
  } catch {
    return null;
  }
})();

/** DAO state machine definition */
export const daoStateMachineDefinition: StateMachineDefinition | null = (() => {
  try {
    return getDAODefinition('Single') as unknown as StateMachineDefinition;
  } catch {
    return null;
  }
})();

/**
 * Look up a state machine definition by workflow type name.
 * Falls back to null for unknown types.
 */
export function getDefinitionByWorkflowType(
  workflowType: string,
): StateMachineDefinition | null {
  const t = workflowType.toLowerCase();
  if (t.includes('identity') || t.includes('agent')) return agentStateMachineDefinition;
  if (t.includes('contract')) return contractStateMachineDefinition;
  if (t.includes('market')) return marketStateMachineDefinition;
  if (t.includes('governance') || t.includes('gov')) return governanceStateMachineDefinition;
  if (t.includes('dao')) return daoStateMachineDefinition;
  return null;
}

// ─── Valid next-state helpers ─────────────────────────────────────────────────

/**
 * Return the list of event names (transition actions) valid from the given
 * state, using a state machine definition's transitions array.
 */
export function getValidTransitions(
  definition: StateMachineDefinition,
  currentState: string,
): Array<{ eventName: string; toState: string }> {
  if (!definition.transitions) return [];
  return definition.transitions
    .filter((t) => String(t.from) === currentState)
    .map((t) => ({ eventName: t.eventName, toState: String(t.to) }));
}

// ─── Agent state display helpers ─────────────────────────────────────────────

export type AgentStateKey =
  | 'UNSPECIFIED'
  | 'UNREGISTERED'
  | 'REGISTERED'
  | 'ACTIVE'
  | 'CHALLENGED'
  | 'SUSPENDED'
  | 'PROBATION'
  | 'SLASHED'
  | 'INACTIVE'
  | 'WITHDRAWN';

const AGENT_STATE_COLOR: Record<string, string> = {
  UNSPECIFIED:  'bg-gray-500/20 text-gray-400',
  UNREGISTERED: 'bg-gray-500/20 text-gray-400',
  REGISTERED:   'bg-yellow-500/20 text-yellow-400',
  ACTIVE:       'bg-green-500/20 text-green-400',
  CHALLENGED:   'bg-orange-500/20 text-orange-400',
  SUSPENDED:    'bg-red-500/20 text-red-400',
  PROBATION:    'bg-purple-500/20 text-purple-400',
  SLASHED:      'bg-red-600/20 text-red-500',
  INACTIVE:     'bg-gray-600/20 text-gray-500',
  WITHDRAWN:    'bg-gray-600/20 text-gray-500',
};

const AGENT_STATE_TEXT_COLOR: Record<string, string> = {
  UNSPECIFIED:  'text-gray-400',
  UNREGISTERED: 'text-gray-400',
  REGISTERED:   'text-yellow-400',
  ACTIVE:       'text-[var(--green)]',
  CHALLENGED:   'text-orange-400',
  SUSPENDED:    'text-[var(--red)]',
  PROBATION:    'text-purple-400',
  SLASHED:      'text-red-500',
  INACTIVE:     'text-gray-500',
  WITHDRAWN:    'text-gray-500',
};

const AGENT_STATE_ICON: Record<string, string> = {
  UNSPECIFIED:  '❓',
  UNREGISTERED: '👤',
  REGISTERED:   '📝',
  ACTIVE:       '✅',
  CHALLENGED:   '⚠️',
  SUSPENDED:    '🚫',
  PROBATION:    '⏳',
  SLASHED:      '🔴',
  INACTIVE:     '😴',
  WITHDRAWN:    '🚪',
};

const AGENT_STATE_LABEL: Record<string, string> = {
  UNSPECIFIED:  'Unknown',
  UNREGISTERED: 'Unregistered',
  REGISTERED:   'Registered',
  ACTIVE:       'Active',
  CHALLENGED:   'Challenged',
  SUSPENDED:    'Suspended',
  PROBATION:    'Probation',
  SLASHED:      'Slashed',
  INACTIVE:     'Inactive',
  WITHDRAWN:    'Withdrawn',
};

/** Tailwind bg+text badge class for an agent state string. */
export function agentStateBadgeClass(state: string): string {
  return AGENT_STATE_COLOR[state] ?? 'bg-gray-500/20 text-gray-400';
}

/** Tailwind text-only class for an agent state string. */
export function agentStateTextClass(state: string): string {
  return AGENT_STATE_TEXT_COLOR[state] ?? 'text-gray-400';
}

const AGENT_STATE_DOT_COLOR: Record<string, string> = {
  UNSPECIFIED:  'bg-gray-400',
  UNREGISTERED: 'bg-gray-400',
  REGISTERED:   'bg-yellow-500',
  ACTIVE:       'bg-[var(--green)]',
  CHALLENGED:   'bg-orange-500',
  SUSPENDED:    'bg-[var(--red)]',
  PROBATION:    'bg-purple-500',
  SLASHED:      'bg-red-600',
  INACTIVE:     'bg-gray-600',
  WITHDRAWN:    'bg-gray-600',
};

/** Tailwind bg-only class for an agent state dot/indicator. */
export function agentStateDotClass(state: string): string {
  return AGENT_STATE_DOT_COLOR[state] ?? 'bg-gray-400';
}

/** Emoji icon for an agent state string. */
export function agentStateIcon(state: string): string {
  return AGENT_STATE_ICON[state] ?? '❓';
}

const AGENT_STATE_HEX: Record<string, string> = {
  UNSPECIFIED:  '#9ca3af',
  UNREGISTERED: '#9ca3af',
  REGISTERED:   '#eab308',
  ACTIVE:       '#22c55e',
  CHALLENGED:   '#f97316',
  SUSPENDED:    '#ef4444',
  PROBATION:    '#a855f7',
  SLASHED:      '#dc2626',
  INACTIVE:     '#6b7280',
  WITHDRAWN:    '#6b7280',
};

/** Hex colour string for an agent state (for canvas/SVG drawing). */
export function agentStateHexColor(state: string): string {
  return AGENT_STATE_HEX[state] ?? '#9ca3af';
}

/** Human-readable label for an agent state string. */
export function agentStateLabel(state: string): string {
  return AGENT_STATE_LABEL[state] ?? state;
}

// ─── Contract state display helpers ──────────────────────────────────────────

const CONTRACT_STATE_BADGE: Record<string, string> = {
  UNSPECIFIED: 'bg-gray-500/20 text-gray-400',
  PROPOSED:    'bg-[var(--orange)] text-black',
  ACTIVE:      'bg-[var(--accent)] text-white',
  COMPLETED:   'bg-[var(--green)] text-white',
  REJECTED:    'bg-[var(--red)] text-white',
  DISPUTED:    'bg-[var(--red)] text-white',
  CANCELLED:   'bg-gray-500/20 text-gray-400',
};

const CONTRACT_STATE_SOFT_BADGE: Record<string, string> = {
  UNSPECIFIED: 'bg-gray-500/20 text-gray-400',
  PROPOSED:    'bg-yellow-500/20 text-yellow-400',
  ACTIVE:      'bg-blue-500/20 text-blue-400',
  COMPLETED:   'bg-green-500/20 text-green-400',
  REJECTED:    'bg-red-500/20 text-red-400',
  DISPUTED:    'bg-red-500/20 text-red-400',
  CANCELLED:   'bg-gray-500/20 text-gray-400',
};

const CONTRACT_STATE_ICON: Record<string, string> = {
  UNSPECIFIED: '📄',
  PROPOSED:    '📝',
  ACTIVE:      '🔄',
  COMPLETED:   '✅',
  REJECTED:    '❌',
  DISPUTED:    '⚠️',
  CANCELLED:   '🚫',
};

/** Tailwind bg+text badge class for a contract state string. */
export function contractStateBadgeClass(state: string): string {
  return CONTRACT_STATE_BADGE[state] ?? 'bg-gray-500/20 text-gray-400';
}

/** Soft (transparent bg) Tailwind badge class for a contract state string. */
export function contractStateSoftBadgeClass(state: string): string {
  return CONTRACT_STATE_SOFT_BADGE[state] ?? 'bg-gray-500/20 text-gray-400';
}

/** Emoji icon for a contract state string. */
export function contractStateIcon(state: string): string {
  return CONTRACT_STATE_ICON[state] ?? '📄';
}

/** Ordered list of contract states from the SDK definition. */
export const CONTRACT_STATES: string[] = Object.keys(
  contractStateMachineDefinition.states ?? {},
).filter((s) => s !== 'UNSPECIFIED');

// ─── Market state display helpers ────────────────────────────────────────────

const MARKET_STATE_BADGE: Record<string, string> = {
  UNSPECIFIED: 'bg-gray-500/20 text-gray-400',
  PROPOSED:    'bg-yellow-500/20 text-yellow-400',
  OPEN:        'bg-green-500/20 text-green-400',
  CLOSED:      'bg-blue-500/20 text-blue-400',
  SETTLED:     'bg-purple-500/20 text-purple-400',
  CANCELLED:   'bg-gray-500/20 text-gray-400',
};

const MARKET_STATE_ICON: Record<string, string> = {
  UNSPECIFIED: '❓',
  PROPOSED:    '📝',
  OPEN:        '🟢',
  CLOSED:      '🔒',
  SETTLED:     '✅',
  CANCELLED:   '🚫',
};

/** Tailwind badge class for a market state string. */
export function marketStateBadgeClass(state: string): string {
  return MARKET_STATE_BADGE[state] ?? 'bg-gray-500/20 text-gray-400';
}

/** Emoji icon for a market state string. */
export function marketStateIcon(state: string): string {
  return MARKET_STATE_ICON[state] ?? '❓';
}

/** Ordered list of market states from the SDK definition. */
export const MARKET_STATES: string[] = Object.keys(
  marketStateMachineDefinition?.states ?? {},
).filter((s) => s !== 'UNSPECIFIED');

// ─── Fiber status display helpers ─────────────────────────────────────────────

const FIBER_STATUS_BADGE: Record<string, string> = {
  UNSPECIFIED: 'bg-gray-500/20 text-gray-400',
  ACTIVE:      'bg-green-500/20 text-green-400',
  ARCHIVED:    'bg-blue-500/20 text-blue-400',
  FAILED:      'bg-red-500/20 text-red-400',
};

const FIBER_STATUS_ICON: Record<string, string> = {
  UNSPECIFIED: '❓',
  ACTIVE:      '▶️',
  ARCHIVED:    '📦',
  FAILED:      '💥',
};

/** Tailwind badge class for a fiber status string. */
export function fiberStatusBadgeClass(status: string): string {
  return FIBER_STATUS_BADGE[status] ?? 'bg-gray-500/20 text-gray-400';
}

/** Emoji icon for a fiber status string. */
export function fiberStatusIcon(status: string): string {
  return FIBER_STATUS_ICON[status] ?? '❓';
}

// ─── DAO / Governance display helpers ─────────────────────────────────────────

const DAO_STATUS_BADGE: Record<string, string> = {
  UNSPECIFIED: 'bg-gray-500/20 text-gray-400',
  ACTIVE:      'bg-green-500/20 text-green-400',
  VOTING:      'bg-blue-500/20 text-blue-400',
  DISSOLVED:   'bg-gray-600/20 text-gray-500',
};

const PROPOSAL_STATUS_BADGE: Record<string, string> = {
  UNSPECIFIED: 'bg-gray-500/20 text-gray-400',
  OPEN:        'bg-yellow-500/20 text-yellow-400',
  PASSED:      'bg-green-500/20 text-green-400',
  REJECTED:    'bg-red-500/20 text-red-400',
  EXECUTED:    'bg-blue-500/20 text-blue-400',
  EXPIRED:     'bg-gray-500/20 text-gray-400',
  CANCELLED:   'bg-gray-600/20 text-gray-500',
  ACTIVE:      'bg-green-500/20 text-green-400',
  DRAFT:       'bg-gray-500/20 text-gray-400',
  PENDING:     'bg-yellow-500/20 text-yellow-400',
  VETOED:      'bg-red-500/20 text-red-400',
  FAILED:      'bg-orange-500/20 text-orange-400',
};

/** Tailwind badge class for a DAO status string. */
export function daoStatusBadgeClass(status: string): string {
  return DAO_STATUS_BADGE[status] ?? 'bg-gray-500/20 text-gray-400';
}

/** Tailwind badge class for a proposal status string. */
export function proposalStatusBadgeClass(status: string): string {
  return PROPOSAL_STATUS_BADGE[status] ?? 'bg-gray-500/20 text-gray-400';
}
