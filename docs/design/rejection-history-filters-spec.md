# Rejection History Filters — Part A Spec

**Card:** 🖥️ Explorer: Rejection history page and user notification preferences  
**Trello ID:** `6996294951a67b1c3d4c914f`  
**Author:** @think  
**Date:** 2026-02-25  
**Status:** Specification → Test Definition  

---

## 1. Problem Statement

The Rejection History page (`/rejections`) currently supports two filters: **Update Type** and **Fiber ID**. Two high-value filters are missing:

1. **Signer filter** — developers debugging `NotSignedByOwner` errors need to find all rejections for a specific DAG address, but the indexer already supports this query; only the UI is missing.
2. **Date range filter** — the rejection log grows continuously; without a date range, debugging a specific incident means scrolling through unrelated records.

Additionally, filter state is not reflected in the URL, so users cannot bookmark or share a filtered view, and the browser Back button loses filter context.

**Out of scope (Part B):** User notification preferences (email/webhook subscription to rejection alerts). Requires James decision on backend notification infrastructure. Separate card to be created after Part A ships.

---

## 2. Architecture

### Repos Touched

| Repo | Changes |
|------|---------|
| `ottochain-explorer` | UI: signer + date range filters, URL state persistence |
| `ottochain-services` | Indexer API: `timestamp_from` / `timestamp_to` params; Prisma migration |

### Current State

**Indexer API** (`packages/indexer/src/routes/rejections.ts`):
- Supports: `fiberId`, `updateType`, `signer` (exact match, `has` operator), `errorCode`, `fromOrdinal`, `toOrdinal`, `limit`, `offset`
- **Missing:** `timestamp_from` / `timestamp_to` datetime range params

**Prisma schema** (`prisma/schema.prisma` — `RejectedTransaction`):
- Existing indexes: `@@index([fiberId])`, `@@index([ordinal(sort: Desc)])`, `@@index([updateType])`, `@@index([createdAt(sort: Desc)])`
- **Missing:** `@@index([timestamp(sort: Desc)])` — required for efficient date-range queries

**Explorer UI** (`src/components/RejectionsView.tsx`):
- Fully implemented: updateType dropdown, fiberId text input, pagination, detail modal
- **Missing:** signer input, date range inputs, URL param persistence

---

## 3. API Contract Changes (ottochain-services)

### 3.1 New Query Parameters — `GET /api/rejections`

Two new optional parameters added to the existing endpoint (no breaking changes):

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `timestamp_from` | ISO 8601 string | `2026-02-01T00:00:00Z` | Inclusive lower bound on `timestamp` field |
| `timestamp_to` | ISO 8601 string | `2026-02-25T23:59:59Z` | Inclusive upper bound on `timestamp` field |

**Behavior:**
- If only `timestamp_from` is provided: returns records with `timestamp >= timestamp_from`
- If only `timestamp_to` is provided: returns records with `timestamp <= timestamp_to`
- Both provided: returns records in the closed interval `[timestamp_from, timestamp_to]`
- Invalid ISO string: returns `400 Bad Request` with `{ error: "Invalid timestamp_from: must be ISO 8601" }`
- Both params may be combined freely with all existing filters (`fiberId`, `signer`, `updateType`, etc.)
- `total` in response reflects the filtered count (unchanged behavior)

**Sort order:** unchanged — `orderBy: { createdAt: 'desc' }` (insertion order). Timestamp index supports the WHERE clause; sort remains on `createdAt`.

### 3.2 Implementation Details

```typescript
// In GET /api/rejections handler — add after existing ordinal range block:

const timestampFrom = req.query.timestamp_from as string | undefined;
const timestampTo   = req.query.timestamp_to   as string | undefined;

// Validate and parse
if (timestampFrom !== undefined) {
  const d = new Date(timestampFrom);
  if (isNaN(d.getTime())) {
    res.status(400).json({ error: 'Invalid timestamp_from: must be ISO 8601' });
    return;
  }
  timestampFilter = { ...timestampFilter, gte: d };
}
if (timestampTo !== undefined) {
  const d = new Date(timestampTo);
  if (isNaN(d.getTime())) {
    res.status(400).json({ error: 'Invalid timestamp_to: must be ISO 8601' });
    return;
  }
  timestampFilter = { ...timestampFilter, lte: d };
}
if (timestampFrom !== undefined || timestampTo !== undefined) {
  where.timestamp = timestampFilter;
}
```

### 3.3 Prisma Migration

New migration file: `prisma/migrations/<timestamp>_rejection_timestamp_index/migration.sql`

```sql
-- Add index for efficient date-range queries on rejection timestamp
CREATE INDEX "RejectedTransaction_timestamp_idx" ON "RejectedTransaction"("timestamp" DESC);
```

Schema addition to `prisma/schema.prisma`:

```prisma
model RejectedTransaction {
  // ... existing fields unchanged ...
  @@index([fiberId])
  @@index([ordinal(sort: Desc)])
  @@index([updateType])
  @@index([createdAt(sort: Desc)])
  @@index([timestamp(sort: Desc)])  // NEW
}
```

---

## 4. Explorer UI Changes (ottochain-explorer)

### 4.1 New Filter Inputs

The existing filter row in `RejectionsView.tsx` gains two new inputs:

**Signer Filter** (text input):
- Label: `Signer Address`
- Placeholder: `DAG address (exact match)...`
- State: `filterSigner: string`
- API param: `signer` (passes directly to existing indexer `has` filter)
- Triggers refetch with `reset=true` on change (same pattern as existing filters)

**Date Range Filters** (two `datetime-local` inputs):
- Label: `From` / `To`
- State: `filterDateFrom: string`, `filterDateTo: string`
- Value format: HTML `datetime-local` string (`YYYY-MM-DDTHH:MM`) — convert to ISO 8601 for API call
- API params: `timestamp_from` / `timestamp_to`
- Both inputs trigger refetch with `reset=true` on change
- `To` date defaults to end-of-day if only date is set: `filterDateTo + ':59'` if seconds omitted

**Clear button** behavior: clears all 4 new fields in addition to existing `filterType` + `filterFiberId`.

### 4.2 URL State Persistence

Filter state and offset are synced with the URL query string using the browser History API. No router library changes required.

**URL params mirrored:**

| URL Param | State Field | Notes |
|-----------|-------------|-------|
| `type` | `filterType` | updateType dropdown |
| `fiberId` | `filterFiberId` | fiber UUID input |
| `signer` | `filterSigner` | signer address input |
| `from` | `filterDateFrom` | ISO 8601 datetime |
| `to` | `filterDateTo` | ISO 8601 datetime |

**Offset is NOT persisted** — page reloads always start at offset 0.

**Implementation pattern:**

```typescript
// Read initial state from URL on mount
const params = new URLSearchParams(window.location.search);
const [filterType,     setFilterType]     = useState(params.get('type')     ?? '');
const [filterFiberId,  setFilterFiberId]  = useState(params.get('fiberId')  ?? '');
const [filterSigner,   setFilterSigner]   = useState(params.get('signer')   ?? '');
const [filterDateFrom, setFilterDateFrom] = useState(params.get('from')     ?? '');
const [filterDateTo,   setFilterDateTo]   = useState(params.get('to')       ?? '');

// Sync URL on filter changes (in useEffect watching all filters)
const syncUrl = useCallback(() => {
  const p = new URLSearchParams();
  if (filterType)     p.set('type',     filterType);
  if (filterFiberId)  p.set('fiberId',  filterFiberId);
  if (filterSigner)   p.set('signer',   filterSigner);
  if (filterDateFrom) p.set('from',     filterDateFrom);
  if (filterDateTo)   p.set('to',       filterDateTo);
  const qs = p.toString();
  history.pushState(null, '', qs ? `?${qs}` : window.location.pathname);
}, [filterType, filterFiberId, filterSigner, filterDateFrom, filterDateTo]);
```

### 4.3 API Request Construction

Updated `fetchRejections` params block:

```typescript
const params = new URLSearchParams();
params.set('limit',  String(limit));
params.set('offset', String(currentOffset));
if (filterType)     params.set('updateType',      filterType);
if (filterFiberId)  params.set('fiberId',          filterFiberId);
if (filterSigner)   params.set('signer',           filterSigner);
if (filterDateFrom) params.set('timestamp_from',   new Date(filterDateFrom).toISOString());
if (filterDateTo)   params.set('timestamp_to',     new Date(filterDateTo).toISOString());
```

### 4.4 UI Layout (Filter Row)

Existing 2-column row expands to a 2-row responsive grid:

```
Row 1: [Update Type ▾] [Fiber ID input        ] [Signer Address input]
Row 2: [From: datetime-local] [To: datetime-local] [Clear]
```

On mobile (sm breakpoint): single-column stack. All existing styles preserved.

---

## 5. Acceptance Criteria

### ottochain-services (Indexer API + Migration)

| # | Criterion |
|---|-----------|
| AC1 | `GET /api/rejections?timestamp_from=<ISO>` returns only records with `timestamp >= timestamp_from` |
| AC2 | `GET /api/rejections?timestamp_to=<ISO>` returns only records with `timestamp <= timestamp_to` |
| AC3 | Combined `timestamp_from` + `timestamp_to` returns only records in the closed interval |
| AC4 | Invalid ISO string for either param returns `400 Bad Request` with descriptive error |
| AC5 | Empty range (no records match) returns `{rejections: [], total: 0, hasMore: false}` |
| AC6 | Prisma migration file exists and `@@index([timestamp(sort: Desc)])` is in schema |
| AC7 | Existing filters (`signer`, `fiberId`, `updateType`, etc.) continue to work unchanged |

### ottochain-explorer (Explorer UI)

| # | Criterion |
|---|-----------|
| AC8  | Signer input sends `signer=<value>` to indexer API on change |
| AC9  | Empty signer input omits `signer` param from API call |
| AC10 | `From` datetime input sends `timestamp_from=<ISO>` to indexer API |
| AC11 | `To` datetime input sends `timestamp_to=<ISO>` to indexer API |
| AC12 | Empty date inputs omit timestamp params from API call |
| AC13 | All filters (type, fiberId, signer, from, to) are reflected in URL query string |
| AC14 | Reloading page with URL params pre-populates filter inputs and triggers initial fetch |
| AC15 | Clear button resets all filters (type, fiberId, signer, from, to) and clears URL params |
| AC16 | Filter changes reset offset to 0 (pagination resets on filter change) |
| AC17 | Empty state message shown when all filters combined yield no results |

---

## 6. TDD Test Cases

### Group 1: Indexer — Timestamp Range Filter (ottochain-services)
*File: `packages/indexer/test/rejections-timestamp-filter.test.ts`*

```typescript
T1: GET /api/rejections?timestamp_from=2026-02-01T00:00:00Z
    → returns only records where timestamp >= 2026-02-01 (AC1)

T2: GET /api/rejections?timestamp_to=2026-02-10T23:59:59Z
    → returns only records where timestamp <= 2026-02-10 (AC2)

T3: GET /api/rejections?timestamp_from=2026-02-01T00:00:00Z&timestamp_to=2026-02-10T23:59:59Z
    → returns only records in closed interval [Feb 1, Feb 10] (AC3)

T4: GET /api/rejections?timestamp_from=not-a-date
    → 400 Bad Request: { error: "Invalid timestamp_from: must be ISO 8601" } (AC4)

T5: GET /api/rejections?timestamp_to=also-not-a-date
    → 400 Bad Request: { error: "Invalid timestamp_to: must be ISO 8601" } (AC4)

T6: GET /api/rejections?timestamp_from=2030-01-01T00:00:00Z
    → { rejections: [], total: 0, hasMore: false } (AC5)
```

### Group 2: Indexer — Signer Filter (verify existing behavior)
*File: `packages/indexer/test/rejections-signer-filter.test.ts`*

```typescript
T7: GET /api/rejections?signer=DAGknownSigner123
    → returns only records where signers[] contains "DAGknownSigner123" exactly (existing AC7)

T8: GET /api/rejections?signer=DAGunknownSigner999
    → { rejections: [], total: 0, hasMore: false } (AC7)

T9: GET /api/rejections?signer=DAGsigner&updateType=TransitionStateMachine
    → combined filters applied: signer AND updateType (AC7)
```

### Group 3: Prisma Migration
*File: `packages/indexer/test/rejections-migration.test.ts`*

```typescript
T10: prisma migration files list contains a migration with "rejection_timestamp_index" in name (AC6)
T11: RejectedTransaction Prisma schema includes @@index([timestamp(sort: Desc)]) (AC6 — schema file check)
```

### Group 4: Explorer UI — Signer Filter
*File: `src/components/RejectionsView.test.tsx` (additions to existing)*

```typescript
T12: Typing in signer input → API called with signer=<value> in URL (AC8)
T13: Clearing signer input → re-fetch without signer param (AC9)
T14: signer param persisted in URL after input (AC13)
```

### Group 5: Explorer UI — Date Range Filter
*File: `src/components/RejectionsView.test.tsx` (additions)*

```typescript
T15: Setting "From" date input → API called with timestamp_from=<ISO> (AC10)
T16: Setting "To" date input → API called with timestamp_to=<ISO> (AC11)
T17: Both from+to set → API called with both params (AC10 + AC11)
T18: Clearing "From" input → re-fetch without timestamp_from param (AC12)
T19: from/to params reflected in URL query string after input (AC13)
```

### Group 6: Explorer UI — URL State Persistence
*File: `src/components/RejectionsView.test.tsx` (additions)*

```typescript
T20: Render with ?type=CreateStateMachine&signer=DAGabc&from=2026-02-01T00%3A00 in URL
     → filter inputs pre-populated and initial fetch includes those params (AC14)
T21: Clear button click → all filter inputs empty, URL cleared of filter params (AC15)
T22: Filter change → offset resets to 0, API called with offset=0 (AC16)
T23: Empty result set with active filters → "Try adjusting your filters" shown (AC17)
```

**Total: 23 failing tests** (9 in services, 14 in explorer)  
**Estimated implementation time: ~1.5h** (@code)

---

## 7. Dependencies & Prerequisites

| Dependency | Status |
|------------|--------|
| `RejectedTransaction` Prisma model + migration | ✅ Existing model, new index only |
| Signer filter in indexer API | ✅ Already implemented (`has` operator) |
| `RejectionsView.tsx` base component | ✅ Fully implemented |
| Part B (notification prefs) | ⏳ Blocked on James Q&A — separate card |

---

## 8. Out of Scope (Part B)

Part B requires separate investigation and James input:
- Email/webhook subscription to rejection alerts per fiber
- User preference storage (which fibers to watch)
- Notification delivery infrastructure (email provider, webhook retry logic)

A new card will be created for Part B after James confirms the notification delivery approach.

---

## 9. Open Questions (None Blocking)

All Part A questions answered by @research feasibility. No open questions for James.

---

*Spec author: @think | Feasibility: @research (2026-02-24) | Impl owner: @code*
