import { gql } from '@apollo/client/core';

// ============ QUERIES ============

export const NETWORK_STATS = gql`
  query NetworkStats {
    networkStats {
      totalAgents
      activeAgents
      totalContracts
      completedContracts
      totalAttestations
      totalFibers
      lastSnapshotOrdinal
    }
  }
`;

export const CLUSTER_STATS = gql`
  query ClusterStats {
    clusterStats {
      gl0Nodes
      ml0Nodes
      dl1Nodes
      tps
      epoch
    }
  }
`;

export const STATS_TRENDS = gql`
  query StatsTrends {
    statsTrends {
      oneHour {
        agentsDelta
        contractsDelta
        fibersDelta
        successRatePct
        avgSnapshotsPerHour
        computedAt
      }
      twentyFourHour {
        agentsDelta
        contractsDelta
        fibersDelta
        agentsPct
        contractsPct
        successRatePct
        computedAt
      }
    }
  }
`;

export const AGENTS_LIST = gql`
  query AgentsList($limit: Int, $offset: Int) {
    agents(limit: $limit, offset: $offset) {
      address
      publicKey
      displayName
      reputation
      state
      createdAt
    }
  }
`;

export const AGENT_DETAILS = gql`
  query AgentDetails($address: String!) {
    agent(address: $address) {
      address
      publicKey
      displayName
      reputation
      state
      createdAt
      platformLinks {
        platform
        platformUserId
        platformUsername
        verified
        linkedAt
      }
      attestationsReceived(limit: 20) {
        id
        type
        issuer {
          address
          displayName
        }
        delta
        reason
        createdAt
        txHash
      }
      contractsAsProposer {
        id
        contractId
        counterparty {
          address
          displayName
        }
        state
        proposedAt
        completedAt
      }
      contractsAsCounterparty {
        id
        contractId
        proposer {
          address
          displayName
        }
        state
        proposedAt
        completedAt
      }
      reputationHistory(limit: 50) {
        reputation
        delta
        reason
        recordedAt
      }
    }
    fibersByOwner(address: $address, limit: 10) {
      fiberId
      workflowType
      currentState
      status
      sequenceNumber
      updatedAt
    }
  }
`;

export const LEADERBOARD = gql`
  query Leaderboard($limit: Int) {
    leaderboard(limit: $limit) {
      address
      displayName
      reputation
      state
    }
  }
`;

export const CONTRACTS_LIST = gql`
  query ContractsList($limit: Int, $state: ContractState) {
    contracts(limit: $limit, state: $state) {
      id
      contractId
      proposer {
        address
        displayName
      }
      counterparty {
        address
        displayName
      }
      state
      proposedAt
      acceptedAt
      completedAt
    }
  }
`;

export const CONTRACT_DETAILS = gql`
  query ContractDetails($contractId: String!) {
    contract(contractId: $contractId) {
      id
      contractId
      proposer {
        address
        displayName
        reputation
      }
      counterparty {
        address
        displayName
        reputation
      }
      state
      terms
      proposedAt
      acceptedAt
      completedAt
    }
  }
`;

export const RECENT_ACTIVITY = gql`
  query RecentActivity($limit: Int) {
    recentActivity(limit: $limit) {
      eventType
      timestamp
      agent {
        address
        displayName
      }
      action
      reputationDelta
      relatedAgent {
        address
        displayName
      }
      fiberId
    }
  }
`;

export const SEARCH_AGENTS = gql`
  query SearchAgents($query: String!) {
    searchAgents(query: $query) {
      address
      displayName
      reputation
      state
    }
  }
`;

// ============ SUBSCRIPTIONS ============

export const ACTIVITY_FEED_SUB = gql`
  subscription ActivityFeed {
    activityFeed {
      eventType
      timestamp
      agent {
        address
        displayName
      }
      action
      reputationDelta
      relatedAgent {
        address
        displayName
      }
    }
  }
`;

export const STATS_UPDATED_SUB = gql`
  subscription StatsUpdated {
    statsUpdated {
      totalAgents
      activeAgents
      totalContracts
      completedContracts
      totalAttestations
      lastSnapshotOrdinal
    }
  }
`;

export const AGENT_UPDATED_SUB = gql`
  subscription AgentUpdated($address: String!) {
    agentUpdated(address: $address) {
      address
      reputation
      state
    }
  }
`;

// ============ TYPES ============
// Types aligned with ottochain-sdk protobuf definitions (source of truth)

/**
 * Agent lifecycle states - matches AgentState enum from SDK
 * @see ottochain-sdk/src/generated/ottochain/apps/identity/v1/agent_pb.ts
 */
export type AgentState = 
  | 'UNSPECIFIED'
  | 'REGISTERED'   // Initial state after registration (was incorrectly 'PENDING')
  | 'ACTIVE'       // Activated and participating
  | 'CHALLENGED'   // Under dispute/challenge
  | 'SUSPENDED'    // Challenge upheld, temporarily suspended
  | 'PROBATION'    // Recovering from suspension
  | 'WITHDRAWN';   // Voluntarily exited (terminal)

/**
 * Contract lifecycle states - matches ContractState enum from SDK
 * @see ottochain-sdk/src/generated/ottochain/apps/contracts/v1/contract_pb.ts
 */
export type ContractState =
  | 'UNSPECIFIED'
  | 'PROPOSED'     // Awaiting counterparty acceptance
  | 'ACTIVE'       // Both parties agreed, in progress
  | 'COMPLETED'    // Successfully fulfilled (terminal)
  | 'REJECTED'     // Counterparty declined (terminal)
  | 'DISPUTED'     // Under dispute resolution
  | 'CANCELLED';   // Cancelled by proposer before acceptance (terminal)

/**
 * Fiber lifecycle status - matches FiberStatus enum from SDK
 * @see ottochain-sdk/src/generated/ottochain/v1/fiber_pb.ts
 */
export type FiberStatus =
  | 'UNSPECIFIED'
  | 'ACTIVE'       // Fiber is live and processing
  | 'ARCHIVED'     // Fiber is archived (terminal state reached)
  | 'FAILED';      // Fiber encountered a fatal error

export interface NetworkStats {
  totalAgents: number;
  activeAgents: number;
  totalContracts: number;
  completedContracts: number;
  totalAttestations: number;
  totalFibers: number;
  lastSnapshotOrdinal: number;
}

export interface ClusterStats {
  gl0Nodes: number;
  ml0Nodes: number;
  dl1Nodes: number;
  tps: number;
  epoch: number;
}

export interface StatsDelta {
  agentsDelta: number;
  contractsDelta: number;
  fibersDelta: number;
  agentsPct: number;
  contractsPct: number;
  successRatePct: number;
  avgSnapshotsPerHour: number;
  computedAt: string;
}

export interface StatsTrends {
  oneHour: StatsDelta | null;
  twentyFourHour: StatsDelta | null;
  sevenDay: StatsDelta | null;
}

export interface ReputationPoint {
  reputation: number;
  delta: number;
  reason: string | null;
  recordedAt: string;
}

export interface AgentContract {
  id: string;
  contractId: string;
  proposer?: { address: string; displayName: string | null };
  counterparty?: { address: string; displayName: string | null };
  state: ContractState;
  proposedAt: string;
  completedAt: string | null;
}

export interface AgentFiber {
  fiberId: string;
  workflowType: string;
  currentState: string;
  status: FiberStatus;
  sequenceNumber: number;
  updatedAt: string;
}

export interface Agent {
  address: string;
  publicKey: string;
  displayName: string | null;
  reputation: number;
  state: AgentState;
  createdAt: string;
  platformLinks?: PlatformLink[];
  attestationsReceived?: Attestation[];
  contractsAsProposer?: AgentContract[];
  contractsAsCounterparty?: AgentContract[];
  reputationHistory?: ReputationPoint[];
}

export interface PlatformLink {
  platform: 'DISCORD' | 'TELEGRAM' | 'TWITTER' | 'GITHUB' | 'CUSTOM';
  platformUserId: string;
  platformUsername: string | null;
  verified: boolean;
  linkedAt: string;
}

export interface Attestation {
  id: string;
  type: 'VOUCH' | 'BEHAVIORAL' | 'COMPLETION' | 'VIOLATION';
  issuer: { address: string; displayName: string | null } | null;
  issuerPlatform: string | null;
  delta: number;
  reason: string | null;
  createdAt: string;
  txHash: string;
}

export interface Contract {
  id: string;
  contractId: string;
  proposer: Agent;
  counterparty: Agent;
  state: ContractState;
  terms: Record<string, unknown>;
  proposedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

export interface ActivityEvent {
  eventType: string;
  timestamp: string;
  agent: { address: string; displayName: string | null } | null;
  action: string;
  reputationDelta: number | null;
  relatedAgent: { address: string; displayName: string | null } | null;
  fiberId: string | null;
}
