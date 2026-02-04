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
      attestationsReceived {
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
      reputationHistory(limit: 50) {
        reputation
        delta
        reason
        recordedAt
      }
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

export interface NetworkStats {
  totalAgents: number;
  activeAgents: number;
  totalContracts: number;
  completedContracts: number;
  totalAttestations: number;
  totalFibers: number;
  lastSnapshotOrdinal: number;
}

export interface ReputationPoint {
  reputation: number;
  delta: number;
  reason: string | null;
  recordedAt: string;
}

export interface Agent {
  address: string;
  publicKey: string;
  displayName: string | null;
  reputation: number;
  state: 'PENDING' | 'ACTIVE' | 'PROBATION' | 'SUSPENDED';
  createdAt: string;
  platformLinks?: PlatformLink[];
  attestationsReceived?: Attestation[];
  reputationHistory?: ReputationPoint[];
}

export interface PlatformLink {
  platform: 'DISCORD' | 'TELEGRAM' | 'TWITTER' | 'GITHUB';
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
  state: 'PROPOSED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'DISPUTED';
  terms: Record<string, unknown>;
  proposedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

export interface ActivityEvent {
  eventType: string;
  timestamp: string;
  agent: { address: string; displayName: string | null };
  action: string;
  reputationDelta: number | null;
  relatedAgent: { address: string; displayName: string | null } | null;
}
