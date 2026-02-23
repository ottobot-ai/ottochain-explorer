import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RejectionsView } from './RejectionsView';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RejectionsView', () => {
  const mockOnFiberSelect = vi.fn();

  // Mock data for tests
  const mockRejection = {
    id: 1,
    ordinal: 1000,
    timestamp: '2026-02-23T10:00:00Z',
    updateType: 'TransitionStateMachine',
    fiberId: 'abc123-def456-ghi789',
    updateHash: 'hash123456789',
    errors: [
      { code: 'NotSignedByOwner', message: 'Transaction not signed by fiber owner' },
      { code: 'InvalidSequenceNumber', message: 'Sequence number mismatch' }
    ],
    signers: ['DAG1signer123', 'DAG1signer456'],
    createdAt: '2026-02-23T10:00:00Z'
  };

  const mockRejectionsResponse = {
    rejections: [mockRejection],
    total: 1,
    hasMore: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRejectionsResponse)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Group 1: Loading/Empty/Error States', () => {
    it('shows loading state with spinner when loading=true and rejections empty', async () => {
      // Mock delayed response to capture loading state
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      // Should show loading spinner/text
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText(/no rejected transactions/i)).not.toBeInTheDocument();
    });

    it('shows empty state message when API returns empty array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rejections: [],
          total: 0,
          hasMore: false
        })
      });
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no rejected transactions found/i)).toBeInTheDocument();
      });
    });

    it('shows error state with retry button when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load rejections/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
      
      // Test retry functionality
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRejectionsResponse)
      });
      
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Group 2: Data Display', () => {
    it('renders rejection list with updateType, shortened fiberId, and error code badges', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        // Check updateType is displayed
        expect(screen.getByText('TransitionStateMachine')).toBeInTheDocument();
        
        // Check shortened fiberId (should truncate long fiber IDs)
        expect(screen.getByText(/abc123.*ghi789/)).toBeInTheDocument();
        
        // Check error code badges
        expect(screen.getByText('NotSignedByOwner')).toBeInTheDocument();
        expect(screen.getByText('InvalidSequenceNumber')).toBeInTheDocument();
      });
    });

    it('displays correct error badge colors based on error type', async () => {
      const multiErrorRejection = {
        ...mockRejection,
        errors: [
          { code: 'NotSignedByOwner', message: 'Not signed by owner' }, // Should be red
          { code: 'FiberNotFound', message: 'Fiber not found' }, // Should be yellow
          { code: 'InvalidTransition', message: 'Invalid transition' } // Should be orange
        ]
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rejections: [multiErrorRejection],
          total: 1,
          hasMore: false
        })
      });
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        const notSignedBadge = screen.getByText('NotSignedByOwner');
        const notFoundBadge = screen.getByText('FiberNotFound');
        const invalidBadge = screen.getByText('InvalidTransition');
        
        // Check red color for ownership errors (*NotSigned*, *Owner*)
        expect(notSignedBadge).toHaveClass('bg-red-500/20', 'text-red-400');
        
        // Check yellow color for not found errors (*NotFound*, *Nothing*)
        expect(notFoundBadge).toHaveClass('bg-yellow-500/20', 'text-yellow-400');
        
        // Check orange color for invalid errors (*Invalid*)
        expect(invalidBadge).toHaveClass('bg-orange-500/20', 'text-orange-400');
      });
    });

    it('displays ordinal and timestamp on each rejection row', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('1000')).toBeInTheDocument(); // ordinal
        expect(screen.getByText(/Feb 23, 2026/)).toBeInTheDocument(); // formatted timestamp
      });
    });
  });

  describe('Group 3: Filters', () => {
    it('adds updateType filter to API request', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Filter input
      });
      
      // Find and use the updateType filter dropdown
      const typeFilter = screen.getByDisplayValue('All Types'); // Or however it's implemented
      fireEvent.change(typeFilter, { target: { value: 'TransitionStateMachine' } });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('updateType=TransitionStateMachine')
        );
      });
    });

    it('adds fiberId filter to API request', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        const fiberIdInput = screen.getByPlaceholderText(/fiber id/i);
        fireEvent.change(fiberIdInput, { target: { value: 'test-fiber-123' } });
      });
      
      // Should debounce and then make request with fiberId filter
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('fiberId=test-fiber-123')
        );
      }, { timeout: 2000 });
    });
  });

  describe('Group 4: Detail Modal', () => {
    it('opens detail modal when clicking a rejection row', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        const rejectionRow = screen.getByText('TransitionStateMachine').closest('div');
        expect(rejectionRow).toBeInTheDocument();
      });
      
      // Click on the rejection row
      const rejectionRow = screen.getByText('TransitionStateMachine').closest('div');
      fireEvent.click(rejectionRow!);
      
      // Modal should open and show detailed information
      await waitFor(() => {
        expect(screen.getByText(/rejection details/i)).toBeInTheDocument();
        expect(screen.getByText('abc123-def456-ghi789')).toBeInTheDocument(); // Full fiberId
        expect(screen.getByText('hash123456789')).toBeInTheDocument(); // updateHash
        expect(screen.getByText('DAG1signer123')).toBeInTheDocument(); // signers
        expect(screen.getByText('DAG1signer456')).toBeInTheDocument();
        expect(screen.getByText('Transaction not signed by fiber owner')).toBeInTheDocument(); // error message
      });
    });
  });

  describe('Pagination', () => {
    it('changes offset by +20 and triggers new fetch when clicking Next', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rejections: [mockRejection],
          total: 50,
          hasMore: true
        })
      });
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      });
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('offset=20')
        );
      });
    });

    it('disables Previous button when offset === 0, enables when offset > 0', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rejections: [mockRejection],
          total: 50,
          hasMore: true
        })
      });
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeDisabled();
      });
      
      // Click next to move to offset=20
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /previous/i });
        expect(prevButton).toBeEnabled();
      });
    });
  });

  describe('API Integration', () => {
    it('makes correct API call with default parameters', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/rejections\?limit=20&offset=0$/)
        );
      });
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load rejections/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('handles non-200 HTTP responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load rejections/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        // Check that interactive elements have proper roles
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);
      
      await waitFor(() => {
        const rejectionRow = screen.getByText('TransitionStateMachine').closest('div');
        expect(rejectionRow).toBeInTheDocument();
      });
      
      // Test keyboard interaction (Enter key should open modal)
      const rejectionRow = screen.getByText('TransitionStateMachine').closest('div');
      fireEvent.keyDown(rejectionRow!, { key: 'Enter', code: 'Enter' });
      
      // Modal should open
      await waitFor(() => {
        expect(screen.getByText(/rejection details/i)).toBeInTheDocument();
      });
    });
  });
});