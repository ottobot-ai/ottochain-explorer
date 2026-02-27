# Explorer Rejection Display — Component Test Spec

**Card:** 🧪 E2E Test: Full rejection notification pipeline (699629490)  
**Status:** Specification Writing → Test Definition  
**Author:** @think (2026-02-22)  
**Repo:** `ottobot-ai/ottochain-explorer`  
**Updated:** 2026-02-27 — Addressed review feedback

---

## Summary

The rejection notification pipeline backend is tested by PR #119 (E2E, 20 assertions, in Code Review). This spec covers the Explorer UI layer: verifying `RejectionsView.tsx` correctly renders rejection data, handles edge cases, and integrates with the rest of the Explorer.

**PR #119 covers (do not duplicate):** ML0 rejection → bridge webhook → indexer storage → API query (20 assertions, all scenarios 1-4)

**This spec covers:** Explorer UI component tests for `src/components/RejectionsView.tsx`

---

## Background

### Component Overview

`RejectionsView.tsx` is a fully-implemented React component that:
- Fetches from `${INDEXER_URL}/rejections?limit=20&offset=N&updateType=...&fiberId=...`
- Displays a paginated list of rejected transactions
- Filters by updateType (dropdown) and fiberId (text input, **300ms debounce**)
- Shows a detail modal on row click: fiberId, updateHash, ordinal, timestamp, signers, errors
- Error badge colors: `*NotSigned*|*Owner*` → red; `*NotFound*|*Nothing*` → yellow; `*Invalid*` → orange; other → purple
- Has loading, empty (two variants), and error states with retry
- Pagination via Previous/Next with offset arithmetic

### API Contract (Live on main — do not change)

```
GET ${INDEXER_URL}/rejections
  ?limit=20         required
  ?offset=N         required (0-based)
  ?updateType=...   optional
  ?fiberId=...      optional

Response:
{
  rejections: RejectedTransaction[];
  total: number;
  hasMore: boolean;
}

interface RejectedTransaction {
  id: number;
  ordinal: number;
  timestamp: string;        // ISO 8601
  updateType: string;       // 'CreateStateMachine' | 'TransitionStateMachine' | etc.
  fiberId: string;          // UUID
  updateHash: string;       // hex hash
  errors: { code: string; message: string }[];
  signers: string[];        // DAG wallet addresses (DAG prefix, NOT 0x)
  createdAt: string;        // ISO 8601
}
```

### Test Infrastructure

- **Framework:** vitest + React Testing Library
- **Config:** `vitest.config.ts` (existing)
- **Setup:** `src/test/setup.ts` (existing — imports vitest matchers)
- **Mocks:** Use `vi.spyOn(global, 'fetch')` — no MSW currently configured
- **Existing tests:** `AgentAvatar.test.tsx`, `CopyAddress.test.tsx`, `Sparkline.test.tsx`

---

## Test File

**New file:** `src/components/RejectionsView.test.tsx`

---

## Test Data Fixtures

```typescript
const mockRejection: RejectedTransaction = {
  id: 1,
  ordinal: 42,
  timestamp: '2026-02-22T20:00:00.000Z',
  updateType: 'TransitionStateMachine',
  fiberId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  updateHash: 'abc123def456abc123def456abc123de',
  errors: [
    { code: 'UpdateNotSignedByOwner', message: 'Transaction not signed by fiber owner' }
  ],
  signers: ['DAG4test1234abcd5678efgh9012ijkl3456mnop'],  // Constellation DAG address format
  createdAt: '2026-02-22T20:00:00.000Z'
};

const mockResponse: RejectionsResponse = {
  rejections: [mockRejection],
  total: 1,
  hasMore: false
};

const emptyResponse: RejectionsResponse = {
  rejections: [],
  total: 0,
  hasMore: false
};
```

---

## Test Cases (18 total, TDD-First — write BEFORE implementation)

### Group 1: Loading & Error States (3 tests)

```
1. Shows loading spinner when fetch is in-flight and rejections list is empty
   - Use vi.useFakeTimers() to control async timing
   - Mock fetch to return a Promise that doesn't resolve during the test
   - Render <RejectionsView />
   - Expect: spinner element visible immediately (loading state is synchronous on mount)
   - Expect: rejection rows NOT in document
   - Note: Use { timeout: 1000 } on the test to avoid hanging — RTL render is
     synchronous so spinner should be visible before any fetch resolves

2. Shows error state with Retry button when fetch fails
   - Mock fetch to reject with Error('Network error')
   - Render <RejectionsView />
   - Expect: "Failed to load rejections" text visible
   - Expect: Retry button visible
   - Click Retry → expect fetch called again (second call)

3. Shows empty state when API returns no rejections (no active filters)
   - Mock fetch to return emptyResponse
   - Render <RejectionsView />
   - Expect: "No rejected transactions found" text visible
   - Expect: "Try adjusting your filters" text NOT visible (no active filters)
```

### Group 2: Data Display (4 tests)

```
4. Renders rejection list with updateType, shortened fiberId, error badges
   - Mock fetch to return mockResponse
   - Render <RejectionsView />
   - Expect: "TransitionStateMachine" text visible
   - Expect: shortened fiberId ('f47ac10b...c3d479') visible
   - Expect: 'UpdateNotSignedByOwner' badge visible

5. Error badge severity — uses data-testid for semantic testing (not CSS classes)
   - Mock fetch with rejection { errors: [{ code: 'UpdateNotSignedByOwner', ... }] }
   - Expect: getByTestId('error-badge-critical') exists OR aria-label contains 'critical'
   - Mock fetch with rejection { errors: [{ code: 'FiberNotFound', ... }] }
   - Expect: getByTestId('error-badge-warning') exists OR aria-label contains 'warning'
   - Mock fetch with rejection { errors: [{ code: 'InvalidTransition', ... }] }
   - Expect: getByTestId('error-badge-error') exists OR aria-label contains 'error'
   
   **Implementation note:** If RejectionsView.tsx currently uses CSS classes without
   test IDs, add data-testid="error-badge-{severity}" as part of implementing this test.
   Do NOT test CSS class names directly (e.g., 'red', 'yellow') — they are brittle.

6. Purple badge fallback for unknown error codes
   - Mock fetch with rejection { errors: [{ code: 'SequenceNumberMismatch', ... }] }
   - Expect: getByTestId('error-badge-info') exists OR aria-label contains 'info'
   - This tests the "other → purple" default branch

7. Shows "+N more" badge when rejection has more than 3 errors
   - Mock fetch with rejection having 5 errors
   - Expect: first 3 error code badges visible
   - Expect: "+2 more" text visible
   - Expect: 4th and 5th error codes NOT individually visible
```

### Group 3: Filters (3 tests)

```
8. updateType dropdown filter adds query param to API request
   - Mock fetch to capture request URL
   - Render <RejectionsView />
   - Select 'TransitionStateMachine' from dropdown
   - Expect: second fetch called with URL containing 'updateType=TransitionStateMachine'
   - Expect: offset reset to 0 on filter change

9. fiberId text input filter adds query param to API request (with debounce)
   - Use vi.useFakeTimers()
   - Render <RejectionsView />
   - Type 'f47ac10b' into fiberId input
   - Advance timers by 350ms (debounce is 300ms): vi.advanceTimersByTime(350)
   - Expect: fetch called with URL containing 'fiberId=f47ac10b'
   
   **Note:** The component debounces fiberId input by 300ms. Tests MUST use fake
   timers and advance past the debounce threshold, or the fetch won't fire.

10. Filtered empty state shows secondary message
    - Set filterType = 'TransitionStateMachine'
    - Mock fetch to return emptyResponse
    - Expect: "No rejected transactions found" visible
    - Expect: "Try adjusting your filters" also visible (secondary hint)
```

### Group 4: Detail Modal (4 tests)

```
11. Clicking a rejection row opens the detail modal
    - Mock fetch to return mockResponse
    - Render <RejectionsView />
    - Click on the rejection row
    - Expect: modal visible with full fiberId ('f47ac10b-58cc-4372-a567-0e02b2c3d479')
    - Expect: updateHash visible
    - Expect: 'UpdateNotSignedByOwner' error code visible in modal
    - Expect: error message 'Transaction not signed by fiber owner' visible

12. Clicking ✕ button closes the detail modal
    - Open modal (click rejection row)
    - Click ✕ button (getByRole('button', { name: /close/i }) or getByLabelText('Close'))
    - Expect: modal no longer visible

13. Pressing Escape key closes the detail modal
    - Open modal (click rejection row)
    - fireEvent.keyDown(document, { key: 'Escape' })
    - Expect: modal no longer visible

14. Clicking fiberId in detail modal fires onFiberSelect callback (if prop exists)
    - Mock fetch to return mockResponse
    - Render <RejectionsView onFiberSelect={mockCallback} />
    - Open modal
    - Click the fiberId link in the modal
    - Expect: mockCallback called with 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    - Expect: modal closes after callback fires
    
    **Implementation note:** If RejectionsView.tsx does not currently accept an
    `onFiberSelect` prop, this test requires adding the prop to the component interface:
    
    ```tsx
    interface RejectionsViewProps {
      onFiberSelect?: (fiberId: string) => void;
    }
    ```
    
    Add this prop as part of implementing the test. If the prop is omitted,
    the fiberId link should still be rendered but clicking it does nothing.
```

### Group 5: Pagination (3 tests)

```
15. Next button advances offset by 20 and triggers re-fetch
    - Mock fetch to return { rejections: [...20 items], total: 45, hasMore: true }
    - Render <RejectionsView />
    - Expect: "Next →" button enabled
    - Click "Next →"
    - Expect: second fetch called with offset=20 in URL

16. Previous button disabled at offset=0; enabled after advancing
    - Initial render: Expect "← Previous" button disabled (offset === 0)
    - Click "Next →" (advance to offset=20)
    - Expect "← Previous" button enabled
    - Click "← Previous"
    - Expect: fetch called with offset=0

17. Pagination shows correct count text
    - Mock fetch: total=45, hasMore=true, 20 rejections returned, offset=0
    - Expect: "Showing 1-20 of 45" visible
    - After clicking Next (offset=20): "Showing 21-40 of 45" visible
```

### Bonus: Nav Integration (1 test — in Nav.test.tsx or App.test.tsx)

```
18. Nav renders a Rejections link/button that triggers view change
    - Render <Nav setView={mockSetView} />
    - Find element containing text "Rejections" or aria-label containing "rejections"
    - Click it
    - Expect: mockSetView called with 'rejections'
```

---

## Mock Setup

Use `vi.spyOn(global, 'fetch')` — no MSW currently configured in this project.

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,  // Include status for components that check response.status
    json: async () => mockResponse,
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

For the error state test:
```typescript
vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
```

For loading state test (never-resolving):
```typescript
vi.useFakeTimers();
vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
// Render immediately checks loading state — no need to advance timers
// Clean up: vi.useRealTimers() in afterEach
```

---

## Implementation Order

1. **Branch:** `test/rejection-visibility-explorer` (this branch)
2. **Write failing tests:** All 18 tests MUST fail first before any implementation changes
3. **Add data-testid attributes:** If error badges lack test IDs, add `data-testid="error-badge-{severity}"` to RejectionsView.tsx
4. **Add onFiberSelect prop:** If test 14 requires it, add the optional prop to the component interface
5. **Fix Nav if needed:** If test 18 fails because no nav button exists, add the button (1-line change)
6. **Commit tests:** All 18 tests passing
7. **PR:** Target `develop`, reviewer `@scasplte2`
8. **Reference PR #119** in PR description as the companion backend E2E

---

## Error Cases

| Scenario | Expected |
|----------|----------|
| Fetch returns non-200 status | Error thrown: `Failed to fetch: ${status}` → error state shown |
| Fetch resolves but json() throws | Error state shown with generic message |
| Retry after error | Calls fetchRejections again; clears error state while loading |
| fiberId filter with non-UUID text | Passed through as-is (no client-side UUID validation) |
| `total=0` but `rejections.length > 0` | Shows rejections (trust rejections array, not total) |

---

## Out of Scope

- User notification preferences (email/push subscriptions) — separate card 6996294951
- Full Playwright browser visual testing — vitest component tests are sufficient
- Testing the indexer API directly — covered by PR #119
- Backend pipeline (ML0 rejection, webhook, indexer) — PR #119
