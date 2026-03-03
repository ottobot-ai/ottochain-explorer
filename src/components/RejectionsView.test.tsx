import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { RejectionsView } from './RejectionsView';
import { Nav } from './Nav';

// ---------------------------------------------------------------------------
// Helpers & mock data
// ---------------------------------------------------------------------------

const makeRejection = (overrides: Partial<RejectedTransaction> = {}): RejectedTransaction => ({
  id: 1,
  ordinal: 42,
  timestamp: '2026-03-01T12:00:00Z',
  updateType: 'CreateStateMachine',
  fiberId: 'aaaa-bbbb-cccc-dddd-eeee',
  updateHash: 'deadbeefdeadbeef01234567',
  errors: [{ code: 'NotSignedByOwner', message: 'Transaction not signed by the fiber owner' }],
  signers: ['DAGsigner1', 'DAGsigner2'],
  createdAt: '2026-03-01T12:00:01Z',
  ...overrides,
});

interface ValidationError {
  code: string;
  message: string;
}

interface RejectedTransaction {
  id: number;
  ordinal: number;
  timestamp: string;
  updateType: string;
  fiberId: string;
  updateHash: string;
  errors: ValidationError[];
  signers: string[];
  createdAt: string;
}

const makeResponse = (
  rejections: RejectedTransaction[],
  total?: number,
  hasMore = false
) => ({
  rejections,
  total: total ?? rejections.length,
  hasMore,
});

// Mock global.fetch
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function setupFetch(response: object, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => response,
  });
}

// ---------------------------------------------------------------------------
// Nav integration test
// ---------------------------------------------------------------------------

describe('Nav — Rejections button', () => {
  it('renders a ⛔ Rejections button that switches view to "rejections"', async () => {
    const setView = vi.fn();
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <Nav view="dashboard" setView={setView} />
      </MockedProvider>
    );

    const btn = screen.getByRole('button', { name: /rejections/i });
    expect(btn).toBeInTheDocument();

    await userEvent.click(btn);
    expect(setView).toHaveBeenCalledWith('rejections');
  });
});

// ---------------------------------------------------------------------------
// Group 1 — Loading / Empty / Error States
// ---------------------------------------------------------------------------

describe('RejectionsView — Loading / Empty / Error States', () => {
  it('shows spinner when loading is true and no rejections are present', async () => {
    // Never resolves — stays in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { container } = render(<RejectionsView />);

    // The spinner element uses animate-spin
    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).not.toBeNull();
    });
  });

  it('shows "No rejected transactions found" when API returns empty array', async () => {
    setupFetch(makeResponse([]));

    render(<RejectionsView />);

    await waitFor(() => {
      expect(screen.getByText(/no rejected transactions found/i)).toBeInTheDocument();
    });
  });

  it('shows error message with Retry button when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));

    render(<RejectionsView />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load rejections/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Group 2 — Data Display
// ---------------------------------------------------------------------------

describe('RejectionsView — Data Display', () => {
  it('renders rejection list with updateType, shortened fiberId, and error code badges', async () => {
    const rejection = makeRejection({
      fiberId: 'aaaa-bbbb-cccc-dddd-eeee',
      updateType: 'TransitionStateMachine',
      errors: [{ code: 'NotSignedByOwner', message: 'Owner must sign' }],
    });
    setupFetch(makeResponse([rejection]));

    render(<RejectionsView />);

    await waitFor(() => {
      // updateType appears in both the dropdown option AND the list item span — use getAllByText
      const allMatches = screen.getAllByText('TransitionStateMachine');
      const spanMatch = allMatches.find(el => el.tagName === 'SPAN');
      expect(spanMatch).toBeTruthy();
      // fiberId shortened: first 8 + "..." + last 8
      // "aaaa-bbbb-cccc-dddd-eeee" → "aaaa-bbb...ddd-eeee"
      expect(screen.getByText(/aaaa-bbb\.\.\.ddd-eeee/i)).toBeInTheDocument();
      expect(screen.getByText('NotSignedByOwner')).toBeInTheDocument();
    });
  });

  it('assigns correct error badge colors for each error code category', async () => {
    const rejection = makeRejection({
      errors: [
        { code: 'NotSignedByOwner', message: 'red' },
        { code: 'FiberNotFound', message: 'yellow' },
        { code: 'InvalidState', message: 'orange' },
      ],
    });
    setupFetch(makeResponse([rejection]));

    const { container } = render(<RejectionsView />);

    await waitFor(() => {
      // NotSigned → red
      const redBadge = container.querySelector('.bg-red-500\\/20');
      expect(redBadge).not.toBeNull();
      expect(redBadge?.textContent).toContain('NotSignedByOwner');

      // NotFound → yellow
      const yellowBadge = container.querySelector('.bg-yellow-500\\/20');
      expect(yellowBadge).not.toBeNull();
      expect(yellowBadge?.textContent).toContain('FiberNotFound');

      // Invalid → orange
      const orangeBadge = container.querySelector('.bg-orange-500\\/20');
      expect(orangeBadge).not.toBeNull();
      expect(orangeBadge?.textContent).toContain('InvalidState');
    });
  });

  it('displays ordinal and timestamp on each rejection row', async () => {
    const rejection = makeRejection({ ordinal: 1234 });
    setupFetch(makeResponse([rejection]));

    render(<RejectionsView />);

    await waitFor(() => {
      expect(screen.getByText(/ordinal 1,234/i)).toBeInTheDocument();
      // Timestamp rendered via toLocaleString — just verify something date-like is present
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Group 3 — Filters
// ---------------------------------------------------------------------------

describe('RejectionsView — Filters', () => {
  it('adds ?updateType=TransitionStateMachine to the fetch URL when selected', async () => {
    setupFetch(makeResponse([])); // initial load
    setupFetch(makeResponse([])); // after filter change

    render(<RejectionsView />);

    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'TransitionStateMachine');

    await waitFor(() => {
      const urls: string[] = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(urls.some(u => u.includes('updateType=TransitionStateMachine'))).toBe(true);
    });
  });

  it('adds ?fiberId=<uuid> to the fetch URL when typed', async () => {
    setupFetch(makeResponse([])); // initial load
    setupFetch(makeResponse([])); // after filter input

    render(<RejectionsView />);

    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const input = screen.getByPlaceholderText(/enter fiber uuid/i);
    await userEvent.type(input, 'test-fiber-id');

    await waitFor(() => {
      const urls: string[] = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(urls.some(u => u.includes('fiberId=test-fiber-id'))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Group 4 — Detail Modal
// ---------------------------------------------------------------------------

describe('RejectionsView — Detail Modal', () => {
  it('clicking a rejection row opens detail modal showing fiberId, updateHash, signers, and errors', async () => {
    const rejection = makeRejection({
      fiberId: 'full-fiber-uuid-value',
      updateHash: 'hash1234567890abcdef',
      signers: ['DAGsigner1', 'DAGsigner2'],
      errors: [{ code: 'NotSignedByOwner', message: 'Owner must sign the transaction' }],
    });
    setupFetch(makeResponse([rejection]));

    render(<RejectionsView />);

    // Wait for the list to load — updateType appears in dropdown option AND list item span
    await waitFor(() => {
      const allMatches = screen.getAllByText('CreateStateMachine');
      expect(allMatches.some(el => el.tagName === 'SPAN')).toBe(true);
    });

    // Click the rejection row (the cursor-pointer div)
    const allMatches = screen.getAllByText('CreateStateMachine');
    const spanInRow = allMatches.find(el => el.tagName === 'SPAN')!;
    const row = spanInRow.closest('[class*="cursor-pointer"]');
    expect(row).not.toBeNull();
    fireEvent.click(row!);

    // Modal should show full details
    await waitFor(() => {
      expect(screen.getByText('full-fiber-uuid-value')).toBeInTheDocument();
      expect(screen.getByText('hash1234567890abcdef')).toBeInTheDocument();
      expect(screen.getByText('DAGsigner1')).toBeInTheDocument();
      expect(screen.getByText('DAGsigner2')).toBeInTheDocument();
      expect(screen.getByText('Owner must sign the transaction')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('RejectionsView — Pagination', () => {
  it('"Next" button increments offset by 20 and triggers a new fetch', async () => {
    // Initial load: 25 total, hasMore = true
    const rejections = Array.from({ length: 20 }, (_, i) =>
      makeRejection({ id: i + 1, ordinal: i + 1 })
    );
    setupFetch(makeResponse(rejections, 25, true));
    // Page 2 fetch
    setupFetch(makeResponse([], 25, false));

    render(<RejectionsView />);

    await waitFor(() => screen.getByText(/showing 1-20 of 25/i));

    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();

    await userEvent.click(nextBtn);

    await waitFor(() => {
      const urls: string[] = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(urls.some(u => u.includes('offset=20'))).toBe(true);
    });
  });

  it('"Previous" button is disabled at offset 0 and enabled after navigating forward', async () => {
    const rejections = Array.from({ length: 20 }, (_, i) =>
      makeRejection({ id: i + 1, ordinal: i + 1 })
    );
    setupFetch(makeResponse(rejections, 25, true)); // initial
    setupFetch(makeResponse([], 25, false));          // page 2

    render(<RejectionsView />);

    await waitFor(() => screen.getByText(/showing 1-20 of 25/i));

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    expect(prevBtn).toBeDisabled();

    // Navigate forward
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextBtn);

    await waitFor(() => {
      // After going to page 2, previous should be enabled
      expect(prevBtn).not.toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// E2E integration reference (documentation, not a test)
// ---------------------------------------------------------------------------
// Backend E2E pipeline (scenarios 1-4): PR #119 — ML0 → webhook → indexer → query API
// Explorer UI tests (scenario 5): This file — RejectionsView.test.tsx
// Connection: the indexer GET /rejections endpoint (tested in PR #119) is called by
// RejectionsView via fetch; these tests mock that call.
