/**
 * RejectionsView — Filter Extension Tests (Part A)
 *
 * Tests for signer filter (AC8–AC9), date range filters (AC10–AC12),
 * URL state persistence (AC13–AC14), clear button (AC15),
 * pagination reset (AC16), and empty state with filters (AC17).
 *
 * Uses the same test infrastructure as RejectionsView.test.tsx:
 * vi.stubGlobal('fetch', mockFetch) + setupFetch() pattern.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectionsView } from './RejectionsView';

// ---------------------------------------------------------------------------
// Helpers & mock data (same pattern as RejectionsView.test.tsx)
// ---------------------------------------------------------------------------

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

const makeResponse = (
  rejections: RejectedTransaction[],
  total?: number,
  hasMore = false,
) => ({
  rejections,
  total: total ?? rejections.length,
  hasMore,
});

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  // Reset URL state
  window.history.pushState(null, '', window.location.pathname);
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

/** Get all fetch URLs called so far */
function fetchUrls(): string[] {
  return mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
}

// ---------------------------------------------------------------------------
// Group 4 — Signer Filter (AC8–AC9)
// ---------------------------------------------------------------------------

describe('RejectionsView — Signer Filter', () => {
  it('adds ?signer=<address> to the fetch URL when typed (AC8)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // after filter

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
    await userEvent.type(signerInput, 'DAGtestAddress123');

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('signer=DAGtestAddress123'))).toBe(true);
    });
  });

  it('removes signer param when input is cleared (AC9)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // with signer
    setupFetch(makeResponse([])); // after clear

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
    await userEvent.type(signerInput, 'DAGsomeAddress');

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('signer=DAGsomeAddress'))).toBe(true);
    });

    await userEvent.clear(signerInput);

    await waitFor(() => {
      const lastUrl = fetchUrls().at(-1) ?? '';
      expect(lastUrl).not.toContain('signer=');
    });
  });
});

// ---------------------------------------------------------------------------
// Group 5 — Date Range Filter (AC10–AC12)
// ---------------------------------------------------------------------------

describe('RejectionsView — Date Range Filter', () => {
  it('adds timestamp_from param when From date is set (AC10)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // after filter

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const fromInput = screen.getByTestId('filter-date-from') as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '2026-03-01T00:00' } });

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('timestamp_from='))).toBe(true);
    });
  });

  it('adds timestamp_to param when To date is set (AC11)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // after filter

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const toInput = screen.getByTestId('filter-date-to') as HTMLInputElement;
    fireEvent.change(toInput, { target: { value: '2026-03-15T23:59' } });

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('timestamp_to='))).toBe(true);
    });
  });

  it('sends both timestamp params when both dates set (AC10+AC11)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // after from
    setupFetch(makeResponse([])); // after to

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const fromInput = screen.getByTestId('filter-date-from') as HTMLInputElement;
    const toInput = screen.getByTestId('filter-date-to') as HTMLInputElement;

    fireEvent.change(fromInput, { target: { value: '2026-03-01T00:00' } });
    fireEvent.change(toInput, { target: { value: '2026-03-15T23:59' } });

    await waitFor(() => {
      const lastUrl = fetchUrls().at(-1) ?? '';
      expect(lastUrl).toContain('timestamp_from=');
      expect(lastUrl).toContain('timestamp_to=');
    });
  });

  it('removes timestamp_from when From date is cleared (AC12)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // with date
    setupFetch(makeResponse([])); // after clear

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const fromInput = screen.getByTestId('filter-date-from') as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '2026-03-01T00:00' } });

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('timestamp_from='))).toBe(true);
    });

    fireEvent.change(fromInput, { target: { value: '' } });

    await waitFor(() => {
      const lastUrl = fetchUrls().at(-1) ?? '';
      expect(lastUrl).not.toContain('timestamp_from=');
    });
  });
});

// ---------------------------------------------------------------------------
// Group 6 — URL State Persistence (AC13–AC17)
// ---------------------------------------------------------------------------

describe('RejectionsView — URL State Persistence', () => {
  it('syncs filter values to URL query string (AC13)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeResponse([]),
    });

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
    await userEvent.type(signerInput, 'DAGmyAddress');

    await waitFor(() => {
      const calls = replaceStateSpy.mock.calls;
      const lastQs = calls.at(-1)?.[2]?.toString() ?? '';
      expect(lastQs).toContain('signer=DAGmyAddress');
    });

    replaceStateSpy.mockRestore();
  });

  it('pre-populates filters from URL params on mount (AC14)', async () => {
    // Set URL params before rendering
    window.history.replaceState(null, '', '?signer=DAGfromUrl&updateType=TransitionStateMachine');

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeResponse([]),
    });

    render(<RejectionsView />);

    await waitFor(() => {
      // Signer input should be pre-populated
      const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
      expect(signerInput.value).toBe('DAGfromUrl');
    });

    // Initial fetch should include the URL params
    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('signer=DAGfromUrl'))).toBe(true);
    });
  });

  it('Clear button resets all filters and URL params (AC15)', async () => {
    setupFetch(makeResponse([])); // initial
    setupFetch(makeResponse([])); // with filter
    setupFetch(makeResponse([])); // after clear

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
    await userEvent.type(signerInput, 'DAGsomeAddr');

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('signer='))).toBe(true);
    });

    const clearBtn = screen.getByRole('button', { name: /clear/i });
    await userEvent.click(clearBtn);

    await waitFor(() => {
      const lastUrl = fetchUrls().at(-1) ?? '';
      expect(lastUrl).not.toContain('signer=');
      expect(signerInput.value).toBe('');
    });
  });

  it('filter change resets offset to 0 (AC16)', async () => {
    // Page 1 with hasMore
    const rejections = Array.from({ length: 20 }, (_, i) =>
      makeRejection({ id: i + 1, ordinal: i + 1 })
    );
    setupFetch(makeResponse(rejections, 25, true)); // initial
    setupFetch(makeResponse([], 25, false));         // page 2
    // userEvent.type fires per-character, use mockResolvedValue for remaining
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeResponse([], 0, false),
    });

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/showing 1.20 of 25/i));

    // Navigate to page 2
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchUrls().some(u => u.includes('offset=20'))).toBe(true);
    });

    // Apply a filter — should reset offset to 0
    const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
    await userEvent.type(signerInput, 'DAGreset');

    await waitFor(() => {
      const filterUrls = fetchUrls().filter(u => u.includes('signer=DAGreset'));
      expect(filterUrls.length).toBeGreaterThan(0);
      expect(filterUrls[0]).toContain('offset=0');
    });
  });

  it('empty results with active filters shows help text (AC17)', async () => {
    // userEvent.type fires per-character, each may trigger a fetch
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeResponse([]),
    });

    render(<RejectionsView />);
    await waitFor(() => screen.getByText(/no rejected transactions found/i));

    const signerInput = screen.getByTestId('filter-signer') as HTMLInputElement;
    await userEvent.type(signerInput, 'DAG');

    await waitFor(() => {
      expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
    });
  });
});
