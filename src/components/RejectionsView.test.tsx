/**
 * TDD Test Suite: Explorer UI - Rejection History Filters
 * Tests new signer and date range filter inputs for RejectionsView component
 * 
 * These tests MUST FAIL until the filter features are implemented.
 * Covers Acceptance Criteria AC8-AC17 from rejection-history-filters-spec.md
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RejectionsView } from './RejectionsView';

// Mock the config module
vi.mock('../config', () => ({
  default: {
    INDEXER_URL: 'http://localhost:3001'
  }
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock history API for URL state persistence tests
const mockPushState = vi.fn();
Object.defineProperty(window, 'history', {
  writable: true,
  value: {
    pushState: mockPushState,
  }
});

// Sample rejection data for tests
const mockRejectionResponse = {
  rejections: [
    {
      id: 1,
      ordinal: 1000,
      timestamp: '2026-02-20T10:00:00Z',
      updateType: 'CreateStateMachine',
      fiberId: 'fiber-123',
      updateHash: 'hash-123',
      errors: [{ code: 'NotSignedByOwner', message: 'Missing signature' }],
      signers: ['DAGsigner123'],
      createdAt: '2026-02-20T10:00:00Z'
    }
  ],
  total: 1,
  hasMore: false
};

describe('RejectionsView - Signer Filter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPushState.mockReset();
    
    // Default successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRejectionResponse)
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Group 4: Signer Filter Input', () => {
    it('T12: Typing in signer input triggers API call with signer=<value> in URL (AC8)', async () => {
      render(<RejectionsView />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      // Find the signer input (this will fail until implemented)
      const signerInput = screen.getByLabelText(/signer address/i);
      expect(signerInput).toBeInTheDocument();
      
      // Type in the signer input
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: 'DAGtestSigner123' } });
      });
      
      // Wait for debounced API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      // Verify the API was called with signer parameter
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.get('signer')).toBe('DAGtestSigner123');
    });

    it('T13: Clearing signer input triggers re-fetch without signer param (AC9)', async () => {
      render(<RejectionsView />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      const signerInput = screen.getByLabelText(/signer address/i);
      
      // Set a value first
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: 'DAGtestSigner123' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      // Clear the input
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: '' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
      
      // Verify the API was called without signer parameter
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.has('signer')).toBe(false);
    });

    it('T14: signer param persisted in URL after input (AC13)', async () => {
      render(<RejectionsView />);
      
      const signerInput = screen.getByLabelText(/signer address/i);
      
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: 'DAGtestSigner123' } });
      });
      
      // Verify history.pushState was called with signer parameter
      await waitFor(() => {
        expect(mockPushState).toHaveBeenCalled();
      });
      
      const pushStateCall = mockPushState.mock.calls[mockPushState.mock.calls.length - 1];
      const urlWithParams = pushStateCall[2];
      expect(urlWithParams).toMatch(/[?&]signer=DAGtestSigner123/);
    });
  });
});

describe('RejectionsView - Date Range Filter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPushState.mockReset();
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRejectionResponse)
    });
  });

  describe('Group 5: Date Range Filter Inputs', () => {
    it('T15: Setting "From" date input triggers API call with timestamp_from=<ISO> (AC10)', async () => {
      render(<RejectionsView />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      // Find the "From" date input (this will fail until implemented)
      const fromDateInput = screen.getByLabelText(/from/i);
      expect(fromDateInput).toHaveAttribute('type', 'datetime-local');
      
      // Set a date value
      await act(async () => {
        fireEvent.change(fromDateInput, { target: { value: '2026-02-01T00:00' } });
      });
      
      // Wait for API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      // Verify the API was called with timestamp_from parameter as ISO string
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.get('timestamp_from')).toBe('2026-02-01T00:00:00.000Z');
    });

    it('T16: Setting "To" date input triggers API call with timestamp_to=<ISO> (AC11)', async () => {
      render(<RejectionsView />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      // Find the "To" date input (this will fail until implemented)
      const toDateInput = screen.getByLabelText(/to/i);
      expect(toDateInput).toHaveAttribute('type', 'datetime-local');
      
      // Set a date value
      await act(async () => {
        fireEvent.change(toDateInput, { target: { value: '2026-02-28T23:59' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      // Verify the API was called with timestamp_to parameter
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.get('timestamp_to')).toBe('2026-02-28T23:59:00.000Z');
    });

    it('T17: Both from+to set triggers API call with both params (AC10 + AC11)', async () => {
      render(<RejectionsView />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      const fromDateInput = screen.getByLabelText(/from/i);
      const toDateInput = screen.getByLabelText(/to/i);
      
      // Set both dates
      await act(async () => {
        fireEvent.change(fromDateInput, { target: { value: '2026-02-01T00:00' } });
        fireEvent.change(toDateInput, { target: { value: '2026-02-28T23:59' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + from + to
      });
      
      // Verify both parameters are in the last API call
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.get('timestamp_from')).toBe('2026-02-01T00:00:00.000Z');
      expect(url.searchParams.get('timestamp_to')).toBe('2026-02-28T23:59:00.000Z');
    });

    it('T18: Clearing "From" input triggers re-fetch without timestamp_from param (AC12)', async () => {
      render(<RejectionsView />);
      
      const fromDateInput = screen.getByLabelText(/from/i);
      
      // Set a value first
      await act(async () => {
        fireEvent.change(fromDateInput, { target: { value: '2026-02-01T00:00' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      // Clear the input
      await act(async () => {
        fireEvent.change(fromDateInput, { target: { value: '' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
      
      // Verify timestamp_from param is not present
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.has('timestamp_from')).toBe(false);
    });

    it('T19: from/to params reflected in URL query string after input (AC13)', async () => {
      render(<RejectionsView />);
      
      const fromDateInput = screen.getByLabelText(/from/i);
      const toDateInput = screen.getByLabelText(/to/i);
      
      await act(async () => {
        fireEvent.change(fromDateInput, { target: { value: '2026-02-01T00:00' } });
        fireEvent.change(toDateInput, { target: { value: '2026-02-28T23:59' } });
      });
      
      // Verify history.pushState was called with date parameters
      await waitFor(() => {
        expect(mockPushState).toHaveBeenCalled();
      });
      
      const pushStateCall = mockPushState.mock.calls[mockPushState.mock.calls.length - 1];
      const urlWithParams = pushStateCall[2];
      expect(urlWithParams).toMatch(/[?&]from=2026-02-01T00%3A00/);
      expect(urlWithParams).toMatch(/[?&]to=2026-02-28T23%3A59/);
    });
  });
});

describe('RejectionsView - URL State Persistence', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPushState.mockReset();
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRejectionResponse)
    });
  });

  describe('Group 6: URL State Persistence', () => {
    it('T20: Render with URL params pre-populates filter inputs and triggers initial fetch (AC14)', async () => {
      // Mock window.location.search
      const originalSearch = window.location.search;
      delete (window as any).location;
      (window as any).location = {
        ...window.location,
        search: '?type=CreateStateMachine&signer=DAGabc&from=2026-02-01T00%3A00'
      };
      
      render(<RejectionsView />);
      
      // Check that inputs are pre-populated (this will fail until implemented)
      const typeSelect = screen.getByDisplayValue('CreateStateMachine');
      const signerInput = screen.getByDisplayValue('DAGabc');
      const fromInput = screen.getByDisplayValue('2026-02-01T00:00');
      
      expect(typeSelect).toBeInTheDocument();
      expect(signerInput).toBeInTheDocument();
      expect(fromInput).toBeInTheDocument();
      
      // Verify initial API call includes URL params
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      const apiCall = mockFetch.mock.calls[0];
      const url = new URL(apiCall[0]);
      expect(url.searchParams.get('updateType')).toBe('CreateStateMachine');
      expect(url.searchParams.get('signer')).toBe('DAGabc');
      expect(url.searchParams.get('timestamp_from')).toBe('2026-02-01T00:00:00.000Z');
      
      // Cleanup
      (window as any).location = { ...window.location, search: originalSearch };
    });

    it('T21: Clear button click empties all filter inputs and clears URL params (AC15)', async () => {
      render(<RejectionsView />);
      
      // Set some filter values first
      const signerInput = screen.getByLabelText(/signer address/i);
      const fromInput = screen.getByLabelText(/from/i);
      
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: 'DAGtestSigner' } });
        fireEvent.change(fromInput, { target: { value: '2026-02-01T00:00' } });
      });
      
      // Find and click the Clear button (this will fail until implemented)
      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      await act(async () => {
        fireEvent.click(clearButton);
      });
      
      // Verify all inputs are cleared
      expect(signerInput).toHaveValue('');
      expect(fromInput).toHaveValue('');
      
      // Verify history.pushState was called to clear URL params
      await waitFor(() => {
        expect(mockPushState).toHaveBeenCalledWith(
          null, 
          '', 
          expect.not.stringMatching(/[?&](signer|from|to|type|fiberId)=/)
        );
      });
    });

    it('T22: Filter change resets offset to 0, API called with offset=0 (AC16)', async () => {
      render(<RejectionsView />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      // Simulate being on a later page (offset > 0) - this would need to be set up
      // For now, just verify that when a filter changes, offset=0 in API call
      
      const signerInput = screen.getByLabelText(/signer address/i);
      
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: 'DAGtestSigner' } });
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      // Verify the API call has offset=0
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const url = new URL(lastCall[0]);
      expect(url.searchParams.get('offset')).toBe('0');
    });

    it('T23: Empty result set with active filters shows "Try adjusting your filters" message (AC17)', async () => {
      // Mock empty response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rejections: [],
          total: 0,
          hasMore: false
        })
      });
      
      render(<RejectionsView />);
      
      // Set a filter to make it "active filters" state
      const signerInput = screen.getByLabelText(/signer address/i);
      
      await act(async () => {
        fireEvent.change(signerInput, { target: { value: 'DAGnonexistentSigner' } });
      });
      
      // Wait for API response
      await waitFor(() => {
        expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
      });
    });
  });
});