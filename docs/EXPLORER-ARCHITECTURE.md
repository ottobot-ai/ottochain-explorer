# OttoChain Explorer Architecture

## Design Principles

1. **Fibers are first-class citizens** — the explorer is a generic fiber browser first
2. **Applications are overlays** — Identity, Governance, etc. are views on top of fibers
3. **Schema-aware but schema-agnostic** — detect known schemas, but handle unknown gracefully
4. **Reusable components** — same building blocks for any fiber type

---

## Data Model

### Layer 1: Generic Fibers (Core)

Everything on OttoChain is a fiber (state machine). The indexer should capture:

```
Fiber
├── fiberId (UUID)
├── workflowType (from definition.metadata.name)
├── workflowDesc (from definition.metadata.description)  
├── currentState
├── stateData (JSON)
├── definition (JSON - full state machine)
├── owners[] (DAG addresses)
├── sequenceNumber
├── createdOrdinal / updatedOrdinal
└── status (ACTIVE / ARCHIVED)

FiberTransition
├── fiberId → Fiber
├── eventName
├── fromState → toState
├── success
├── gasUsed
├── payload (JSON)
├── snapshotOrdinal
└── createdAt
```

This is **complete** — any fiber, any application.

### Layer 2: Application Schemas (Overlays)

When `workflowType` matches a known schema, we can extract structured data:

```
AgentIdentity (workflowType = "AgentIdentity")
├── Parsed from fiber.stateData:
│   ├── displayName
│   ├── platform, platformUserId
│   ├── reputation
│   ├── completedContracts
│   ├── vouches[], violations
│   └── owner (DAG address)
└── Links to: Fiber (fiberId)

Contract (workflowType = "Contract")  
├── Parsed from fiber.stateData:
│   ├── proposer, counterparty
│   ├── terms, value
│   └── state (Proposed/Accepted/Completed/...)
└── Links to: Fiber (fiberId)

Attestation (derived from transitions on AgentIdentity fibers)
├── type (VOUCH, COMPLETION, VIOLATION)
├── from agent → to agent
├── delta (reputation change)
└── transitionId → FiberTransition
```

**Key insight**: Application tables are **materialized views** derived from fibers, not separate data.

---

## Indexer Architecture

```
ML0 Snapshot
    │
    ▼
┌─────────────────────────────────────────────────┐
│                    Indexer                       │
├─────────────────────────────────────────────────┤
│  1. Index ALL fibers generically                │
│     → Fiber table                               │
│     → FiberTransition table                     │
│                                                 │
│  2. Detect known schemas by workflowType        │
│     → "AgentIdentity" → parse into Agent table  │
│     → "Contract" → parse into Contract table    │
│     → Unknown → leave as generic fiber          │
│                                                 │
│  3. Derive attestations from transitions        │
│     → receive_vouch on AgentIdentity            │
│     → receive_completion on AgentIdentity       │
└─────────────────────────────────────────────────┘
```

### Schema Registry

```typescript
// Indexer knows how to parse specific schemas
const SCHEMA_PARSERS: Record<string, (fiber: Fiber) => AppData> = {
  'AgentIdentity': parseAgentIdentity,
  'Contract': parseContract,
  // Future: 'GovernanceProposal': parseProposal,
};

function indexFiber(fiber: RawFiber) {
  // Always index the generic fiber
  await db.fiber.upsert(fiber);
  
  // If known schema, also index application-specific view
  const parser = SCHEMA_PARSERS[fiber.workflowType];
  if (parser) {
    const appData = parser(fiber);
    await indexApplicationData(fiber.workflowType, appData);
  }
}
```

---

## Explorer Architecture

### Navigation Structure

```
┌─────────────────────────────────────────────────┐
│  OttoChain Explorer                             │
├─────────────────────────────────────────────────┤
│  [Home] [Fibers] [Identity] [Contracts] [Docs]  │
└─────────────────────────────────────────────────┘

Home        → Dashboard: network stats, recent activity (all fibers)
Fibers      → Generic fiber browser (any workflow type)
Identity    → Agent Identity app view (filtered to AgentIdentity fibers)
Contracts   → Contract browser (filtered to Contract fibers)
```

### Page Designs

#### Home (Dashboard)
```
┌─────────────────────────────────────────────────┐
│ Network Stats                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ Fibers  │ │ Agents  │ │Contracts│ │ Snapshot││
│ │   142   │ │   66    │ │   23    │ │  #245   ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────┤
│ Recent Activity (ALL fiber transitions)         │
│ ┌───────────────────────────────────────────┐  │
│ │ 🔄 AgentIdentity: activate                │  │
│ │    Agent_12 • Registered → Active • 2m    │  │
│ │ 📝 Contract: accept                       │  │
│ │    Alice ↔ Bob • Proposed → Accepted • 5m │  │
│ │ 🔄 CustomWorkflow: step_2                 │  │
│ │    fiber abc123 • Step1 → Step2 • 8m      │  │
│ └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│ Top Agents          │ Active Contracts          │
│ (Identity app)      │ (Contract app)            │
└─────────────────────────────────────────────────┘
```

**Key**: Recent Activity shows ALL fibers, with schema-aware rendering.

#### Fibers (Generic Browser)
```
┌─────────────────────────────────────────────────┐
│ Fibers                          [Filter ▼]      │
│                                                 │
│ Workflow Types:                                 │
│ [All] [AgentIdentity] [Contract] [Custom...]    │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐│
│ │ fiber: 8184b3f3-ae1e-46b6-8c06-bd5ae1d0c634 ││
│ │ Type: AgentIdentity                         ││
│ │ State: Active                               ││
│ │ Owner: DAG3qU5fBQ...                        ││
│ │ Transitions: 3 │ Created: 2h ago            ││
│ └─────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────┐│
│ │ fiber: 283e1580-6fa8-41a0-9741-be4d20dee133 ││
│ │ Type: Contract                              ││
│ │ State: Proposed                             ││
│ │ Owner: DAG7abc...                           ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

#### Fiber Detail (Generic)
```
┌─────────────────────────────────────────────────┐
│ Fiber: 8184b3f3-ae1e-46b6-8c06-bd5ae1d0c634    │
├─────────────────────────────────────────────────┤
│ Workflow: AgentIdentity                         │
│ Description: Decentralized agent identity...    │
│ Current State: Active                           │
│ Owner: DAG3qU5fBQCx1LYmeDxK4FqWJwQ3ffcgV8dFJHuB│
│ Sequence: 3                                     │
├─────────────────────────────────────────────────┤
│ State Data (JSON viewer)                        │
│ ┌─────────────────────────────────────────────┐│
│ │ {                                           ││
│ │   "displayName": "Agent_0",                 ││
│ │   "reputation": 15,                         ││
│ │   "platform": "discord",                    ││
│ │   ...                                       ││
│ │ }                                           ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ Transition History                              │
│ ┌─────────────────────────────────────────────┐│
│ │ #3 receive_vouch: Active → Active (+2 rep) ││
│ │ #2 activate: Registered → Active           ││
│ │ #1 (created): → Registered                 ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ State Machine Definition (collapsible)          │
│ [View Definition JSON]                          │
└─────────────────────────────────────────────────┘
```

**Note**: This is the GENERIC view. Works for ANY fiber.

#### Identity (Application View)
```
┌─────────────────────────────────────────────────┐
│ Agent Identity                                  │
│                                                 │
│ A specialized view for AgentIdentity fibers     │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐│
│ │ 🤖 Agent_0 (@discord_abc123)               ││
│ │ ⭐ Reputation: 15  │  ✅ 3 contracts        ││
│ │ Platform: Discord  │  Status: Active        ││
│ │ [View Fiber] [Attestations] [Contracts]     ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

**Key**: This is a **filtered, formatted view** of AgentIdentity fibers.
The [View Fiber] link goes to the generic fiber detail page.

---

## Component Reuse

### Shared Components

```
<FiberCard fiber={fiber} />
  → Renders any fiber with schema-aware formatting
  → If AgentIdentity: show agent name, reputation badge
  → If Contract: show parties, state
  → If unknown: show fiberId, workflowType, state

<TransitionList fiberId={id} />
  → Shows transition history for any fiber
  → Schema-aware action descriptions

<StateDataViewer data={json} schema={workflowType} />
  → If known schema: formatted view
  → If unknown: raw JSON viewer

<FiberTimeline fiberId={id} />
  → Visual state machine with current position highlighted
```

### Schema-Aware Rendering

```typescript
// Component decides how to render based on workflowType
function FiberCard({ fiber }: { fiber: Fiber }) {
  switch (fiber.workflowType) {
    case 'AgentIdentity':
      return <AgentIdentityCard fiber={fiber} />;
    case 'Contract':
      return <ContractCard fiber={fiber} />;
    default:
      return <GenericFiberCard fiber={fiber} />;
  }
}
```

---

## API Design

### GraphQL Schema

```graphql
# === CORE (Generic Fibers) ===

type Fiber {
  fiberId: ID!
  workflowType: String!
  workflowDesc: String
  currentState: String!
  stateData: JSON!
  definition: JSON!
  owners: [String!]!
  sequenceNumber: Int!
  status: FiberStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
  transitions: [FiberTransition!]!
}

type FiberTransition {
  id: ID!
  fiber: Fiber!
  eventName: String!
  fromState: String!
  toState: String!
  success: Boolean!
  gasUsed: Int!
  payload: JSON
  snapshotOrdinal: BigInt!
  createdAt: DateTime!
}

type Query {
  # Generic fiber queries
  fiber(fiberId: ID!): Fiber
  fibers(
    workflowType: String
    state: String
    owner: String
    limit: Int
    offset: Int
    orderBy: FiberOrderBy
  ): [Fiber!]!
  
  fiberTransitions(
    fiberId: ID
    eventName: String
    limit: Int
    orderBy: TransitionOrderBy
  ): [FiberTransition!]!
  
  # Activity feed (all fibers)
  recentActivity(limit: Int): [ActivityEvent!]!
  
  # Network stats
  networkStats: NetworkStats!
  
  # Workflow type discovery
  workflowTypes: [WorkflowTypeSummary!]!
}

type ActivityEvent {
  eventType: EventType!  # FIBER_CREATED, TRANSITION, etc.
  timestamp: DateTime!
  fiber: Fiber!
  transition: FiberTransition
  # Schema-specific enrichment (nullable)
  agent: Agent
  contract: Contract
}

# === APPLICATION LAYER (Identity) ===

type Agent {
  # Parsed from AgentIdentity fiber
  address: String!
  displayName: String!
  platform: Platform!
  platformUserId: String!
  reputation: Int!
  state: AgentState!
  completedContracts: Int!
  # Link back to underlying fiber
  fiber: Fiber!
}

type Contract {
  # Parsed from Contract fiber
  contractId: String!
  proposer: Agent!
  counterparty: Agent!
  state: ContractState!
  terms: JSON!
  # Link back to underlying fiber
  fiber: Fiber!
}

type Query {
  # Application-specific queries (convenience, could also use fibers filter)
  agent(address: String!): Agent
  agents(state: AgentState, limit: Int, orderBy: AgentOrderBy): [Agent!]!
  
  contract(contractId: String!): Contract
  contracts(state: ContractState, limit: Int): [Contract!]!
  
  leaderboard(limit: Int): [Agent!]!
}
```

---

## Migration Plan

### Phase 1: Strengthen Generic Fiber Support
- [ ] Ensure indexer captures ALL fiber data (definition, full stateData)
- [ ] Add `workflowTypes` query to discover what's on-chain
- [ ] Build generic Fiber browser page
- [ ] Build generic Fiber detail page with transition history

### Phase 2: Refactor Application Layer
- [ ] Make Agent/Contract tables link back to Fiber (fiberId FK)
- [ ] Derive application data from fiber parsing, not separate indexing
- [ ] Update Identity page to use enriched fiber data

### Phase 3: Unified Activity Feed
- [ ] `recentActivity` returns fiber transitions with optional app enrichment
- [ ] Schema-aware rendering in UI components
- [ ] Filter/facet by workflowType

### Phase 4: Future Applications
- [ ] Add schema parser for new workflow types (Governance, etc.)
- [ ] Auto-discover and render unknown schemas gracefully

---

## Summary

| Layer | Data Source | Explorer Section |
|-------|-------------|------------------|
| **Core** | Fiber + FiberTransition | Home (stats), Fibers tab, any detail page |
| **Identity App** | Agent (derived from AgentIdentity fibers) | Identity tab, leaderboard widget |
| **Contract App** | Contract (derived from Contract fibers) | Contracts tab |
| **Future** | New workflow types | Auto-discovered, generic rendering + optional custom views |

**The fiber is the source of truth. Everything else is a view.**

---

## Additional Improvements

### 1. State Machine Visualization

Render fiber definitions as interactive diagrams:

```
┌────────────┐   activate   ┌────────────┐
│ Registered │─────────────▶│   Active   │◀─┐
└────────────┘              └────────────┘  │
                              │    │        │
                   withdraw   │    │ vouch  │
                              ▼    └────────┘
                         ┌────────────┐
                         │  Withdrawn │
                         └────────────┘
```

- Highlight current state
- Click transitions to see history
- Use Mermaid or D3 for rendering
- **Reusable** across any fiber type

### 2. Real-Time Updates (WebSocket)

Gateway already has subscription scaffolding. Wire it up:

```graphql
subscription {
  fiberUpdated(workflowType: "AgentIdentity") {
    fiber { fiberId currentState }
    transition { eventName }
  }
}
```

- Explorer dashboard auto-updates
- No more manual refresh
- Indexer publishes to Redis pubsub → Gateway → WebSocket

### 3. Observability & Health

After the stale indexer incident:

```
/health endpoints:
  - Indexer: last processed ordinal, lag from ML0
  - Gateway: DB connection, subscription count
  - Bridge: pending transactions, ML0/DL1 connectivity

Dashboard widget:
  ┌─────────────────────────────────┐
  │ System Health                   │
  │ ML0: ✅ ordinal 245            │
  │ Indexer: ✅ ordinal 245 (0 lag)│
  │ Gateway: ✅ 3 subscribers       │
  │ Bridge: ✅ 0 pending            │
  └─────────────────────────────────┘
```

- Alert if indexer falls behind
- Auto-recovery (heartbeat already added)

### 4. Search

Global search across everything:

```
Search: "alice"
─────────────────────────
Agents:
  → Alice_discord (DAG3abc...)
  
Fibers:
  → Contract: alice ↔ bob (fiber 123...)
  
Addresses:
  → DAG3abcAlice... (owner of 3 fibers)
```

- Full-text search on displayName, stateData
- Address lookup
- FiberId prefix search

### 5. Transaction Lifecycle Tracking

Bridge returns a hash, but then what?

```
Transaction: abc123...
─────────────────────────
✅ Submitted to DL1     12:01:00
✅ Validated            12:01:02  
✅ In ML0 snapshot #246 12:01:15
✅ Indexed              12:01:16

Fiber: 8184b3f3-ae1e-46b6...
Transition: activate (Registered → Active)
```

- Track tx hash → fiber transition
- Show in explorer: "View transaction"
- Helps debugging failed submissions

### 6. Data Integrity

Problem: Genesis change left stale data in DB.

Solution: **Metagraph identity check**

```typescript
// On indexer startup
const genesisHash = await getML0GenesisHash();
const storedHash = await db.getStoredGenesisHash();

if (genesisHash !== storedHash) {
  log.warn("Metagraph genesis changed! Wiping stale data...");
  await db.truncateAll();
  await db.setStoredGenesisHash(genesisHash);
}
```

- Store metagraph ID / genesis hash
- Auto-wipe on mismatch
- Prevents mixed data

### 7. Developer Experience

**API Playground** (already have GraphQL, just expose it):
- `/graphql` with GraphiQL or Apollo Studio
- Auto-generated docs

**SDK Examples**:
```
/docs
  /sdk-quickstart.md
  /examples/
    register-agent.ts
    submit-transition.ts
    query-fibers.ts
```

### 8. CI/CD Pipeline

We've been deploying manually. Add:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    - Build Docker images
    - Push to registry
    - SSH to Hetzner
    - docker compose pull && up -d
    - Health check
    - Notify on failure
```

### 9. Multi-Metagraph Support (Future)

If OttoChain hosts multiple metagraphs or apps:

```
┌─────────────────────────────────────────┐
│ Explorer: OttoChain Mainnet             │
│ [Metagraph: Identity ▼]                 │
│                                         │
│ Switch: [Identity] [Governance] [NFTs]  │
└─────────────────────────────────────────┘
```

- Namespace by metagraph ID
- Shared infrastructure, filtered views

---

## Priority Ranking

| # | Improvement | Effort | Impact |
|---|-------------|--------|--------|
| 1 | State Machine Viz | Medium | High (wow factor) |
| 2 | Data Integrity Check | Low | High (prevents bugs) |
| 3 | Transaction Tracking | Medium | High (UX) |
| 4 | Real-Time WebSocket | Medium | Medium |
| 5 | Search | Medium | Medium |
| 6 | Health Dashboard | Low | Medium |
| 7 | CI/CD | Medium | Medium (ops) |
| 8 | SDK Docs | Low | Medium (adoption) |
| 9 | Multi-Metagraph | High | Low (future) |

---

## Immediate Next Steps

1. **Fix indexer** — Add genesis hash check, fiberId FK on Agent/Contract
2. **Refactor recentActivity** — Use fiber transitions properly (PR #5)
3. **Build generic Fiber browser** — New page, reusable components
4. **State machine diagram** — Mermaid integration for fiber detail
