/**
 * RejectionsView Component Tests
 * 
 * TDD tests for the Rejection Visibility Dashboard feature.
 * Tests define expected behavior for comprehensive rejection transaction visibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectionsView } from '../RejectionsView';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
const mockEnv = {
  VITE_INDEXER_URL: 'http://localhost:3010'
};
vi.stubGlobal('import.meta', { env: mockEnv });

// Sample test data
const mockRejectionData = {
  rejections: [
    {
      id: 1,
      ordinal: 12345,
      timestamp: '2026-02-18T15:30:00Z',
      updateType: 'CreateStateMachine',
      fiberId: 'fiber-uuid-123',
      updateHash: 'hash-abc123def456',
      errors: [
        { code: 'InvalidOwner', message: 'Owner signature validation failed' },
        { code: 'InsufficientFunds', message: 'Insufficient balance for transaction' }
      ],
      signers: ['address1', 'address2'],
      createdAt: '2026-02-18T15:30:00Z'
    },
    {
      id: 2,
      ordinal: 12346,
      timestamp: '2026-02-18T16:00:00Z',
      updateType: 'TransitionStateMachine',
      fiberId: 'fiber-uuid-456',
      updateHash: 'hash-def456abc789',
      errors: [
        { code: 'NotFound', message: 'Fiber not found in state' }
      ],
      signers: ['address3'],
      createdAt: '2026-02-18T16:00:00Z'
    }
  ],
  total: 2,
  hasMore: false
};

const mockEmptyResponse = {
  rejections: [],
  total: 0,
  hasMore: false
};

describe('RejectionsView', () => {
  const mockOnFiberSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockRejectionData
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Load and Display', () => {
    it('should load and display rejected transactions on mount', async () => {
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);

      // Should show loading initially
      expect(screen.getByText('⏳')).toBeInTheDocument();

      // Should make API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rejections?limit=20&offset=0')
      );

      // Should display header
      await waitFor(() => {
        expect(screen.getByText('Rejected Transactions')).toBeInTheDocument();
      });

      // Should display total count
      expect(screen.getByText('Total:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();

      // Should display rejection entries
      expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      expect(screen.getByText('TransitionStateMachine')).toBeInTheDocument();
    });

    it('should display rejection reasons clearly with proper styling', async () => {
      render(<RejectionsView />);

      await waitFor(() => {
        // Should show error codes as badges
        const invalidOwnerBadge = screen.getByText('InvalidOwner');
        const insufficientFundsBadge = screen.getByText('InsufficientFunds');
        const notFoundBadge = screen.getByText('NotFound');

        expect(invalidOwnerBadge).toBeInTheDocument();
        expect(insufficientFundsBadge).toBeInTheDocument();
        expect(notFoundBadge).toBeInTheDocument();

        // Should have appropriate styling classes
        expect(invalidOwnerBadge).toHaveClass('bg-red-500/20', 'text-red-400');
        expect(notFoundBadge).toHaveClass('bg-yellow-500/20', 'text-yellow-400');
      });
    });

    it('should show rejection metadata (ordinals, timestamps, fiber IDs)', async () => {
      render(<RejectionsView />);

      await waitFor(() => {
        // Should show ordinals
        expect(screen.getByText('Ordinal 12,345')).toBeInTheDocument();
        expect(screen.getByText('Ordinal 12,346')).toBeInTheDocument();

        // Should show formatted timestamps
        expect(screen.getByText(/2\/18\/2026/)).toBeInTheDocument();

        // Should show shortened fiber IDs
        expect(screen.getByText('fiber-uu...id-123')).toBeInTheDocument();
        expect(screen.getByText('fiber-uu...id-456')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter Functionality', () => {
    it('should filter by update type', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Select filter by update type
      const typeSelect = screen.getByLabelText('Update Type');
      await user.selectOptions(typeSelect, 'CreateStateMachine');

      // Should make filtered API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('updateType=CreateStateMachine')
        );
      });
    });

    it('should filter by fiber ID', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Type in fiber ID filter
      const fiberIdInput = screen.getByPlaceholderText('Enter fiber UUID...');
      await user.type(fiberIdInput, 'fiber-uuid-123');

      // Should make filtered API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('fiberId=fiber-uuid-123')
        );
      });
    });

    it('should clear filters when Clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Set filters
      const typeSelect = screen.getByLabelText('Update Type');
      const fiberIdInput = screen.getByPlaceholderText('Enter fiber UUID...');
      
      await user.selectOptions(typeSelect, 'CreateStateMachine');
      await user.type(fiberIdInput, 'fiber-uuid-123');

      // Clear filters
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      // Should reset filter values
      expect(typeSelect).toHaveValue('');
      expect(fiberIdInput).toHaveValue('');
    });

    it('should show appropriate message when no results match filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse
      });

      const user = userEvent.setup();
      render(<RejectionsView />);

      // Wait for initial load, then apply filter
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const typeSelect = screen.getByLabelText('Update Type');
      await user.selectOptions(typeSelect, 'ArchiveStateMachine');

      await waitFor(() => {
        expect(screen.getByText('No rejected transactions found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
      });
    });
  });

  describe('Historical Data Access', () => {
    it('should support pagination through historical rejections', async () => {
      const paginatedData = {
        ...mockRejectionData,
        total: 50,
        hasMore: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => paginatedData
      });

      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-20 of 50')).toBeInTheDocument();
      });

      // Should show pagination controls
      const nextButton = screen.getByText('Next →');
      const prevButton = screen.getByText('← Previous');

      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();
      expect(prevButton).toBeDisabled(); // First page

      // Click next page
      await user.click(nextButton);

      // Should fetch next page
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('offset=20')
        );
      });
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        rejections: Array.from({ length: 20 }, (_, i) => ({
          ...mockRejectionData.rejections[0],
          id: i + 1,
          ordinal: 10000 + i,
          fiberId: `fiber-${i}-uuid`
        })),
        total: 10000,
        hasMore: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset
      });

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-20 of 10,000')).toBeInTheDocument();
        expect(screen.getAllByText(/CreateStateMachine/)).toHaveLength(20);
      });
    });

    it('should preserve filters when navigating pages', async () => {
      const paginatedData = {
        ...mockRejectionData,
        total: 50,
        hasMore: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => paginatedData
      });

      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Set a filter
      const typeSelect = screen.getByLabelText('Update Type');
      await user.selectOptions(typeSelect, 'CreateStateMachine');

      // Navigate to next page
      const nextButton = screen.getByText('Next →');
      await user.click(nextButton);

      // Should maintain filter in API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('updateType=CreateStateMachine&limit=20&offset=20')
        );
      });
    });
  });

  describe('Detailed Rejection View', () => {
    it('should open detailed modal when rejection is clicked', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Click on first rejection
      const rejectionCard = screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      expect(rejectionCard).toBeInTheDocument();
      
      await user.click(rejectionCard!);

      // Should open modal with full details
      await waitFor(() => {
        expect(screen.getByText('fiber-uuid-123')).toBeInTheDocument();
        expect(screen.getByText('hash-abc123def456')).toBeInTheDocument();
        expect(screen.getByText('Owner signature validation failed')).toBeInTheDocument();
        expect(screen.getByText('Insufficient balance for transaction')).toBeInTheDocument();
      });
    });

    it('should display all validation errors with full messages in detail view', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      const rejectionCard = screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      await user.click(rejectionCard!);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true }) || 
                     screen.getByText('hash-abc123def456').closest('div[class*="fixed"]');
        
        expect(within(modal!).getByText('Validation Errors (2)')).toBeInTheDocument();
        expect(within(modal!).getByText('InvalidOwner')).toBeInTheDocument();
        expect(within(modal!).getByText('InsufficientFunds')).toBeInTheDocument();
        expect(within(modal!).getByText('Owner signature validation failed')).toBeInTheDocument();
        expect(within(modal!).getByText('Insufficient balance for transaction')).toBeInTheDocument();
      });
    });

    it('should show complete transaction metadata in detail view', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      const rejectionCard = screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      await user.click(rejectionCard!);

      await waitFor(() => {
        const modal = screen.getByText('hash-abc123def456').closest('div[class*="fixed"]');
        
        expect(within(modal!).getByText('12,345')).toBeInTheDocument(); // Ordinal
        expect(within(modal!).getByText('Signers (2)')).toBeInTheDocument();
        expect(within(modal!).getByText('address1')).toBeInTheDocument();
        expect(within(modal!).getByText('address2')).toBeInTheDocument();
      });
    });

    it('should allow navigation to fiber details from rejection modal', async () => {
      const user = userEvent.setup();
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      const rejectionCard = screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      await user.click(rejectionCard!);

      await waitFor(() => {
        const fiberLink = screen.getByText('fiber-uuid-123');
        expect(fiberLink).toBeInTheDocument();
      });

      await user.click(screen.getByText('fiber-uuid-123'));

      expect(mockOnFiberSelect).toHaveBeenCalledWith('fiber-uuid-123');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load rejections')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show retry button on API failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRejectionData
        });

      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Retry'));

      // Should retry the request and show data
      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
        expect(screen.queryByText('Failed to load rejections')).not.toBeInTheDocument();
      });
    });

    it('should handle HTTP error responses properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load rejections')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch: 500')).toBeInTheDocument();
      });
    });

    it('should handle malformed API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }) // Missing required fields
      });

      render(<RejectionsView />);

      await waitFor(() => {
        // Should not crash and show appropriate fallback
        expect(screen.getByText('No rejected transactions found')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Features', () => {
    it('should show appropriate empty state when no rejections exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse
      });

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('✅')).toBeInTheDocument();
        expect(screen.getByText('No rejected transactions found')).toBeInTheDocument();
      });
    });

    it('should display appropriate update type icons', async () => {
      render(<RejectionsView />);

      await waitFor(() => {
        // Should show emoji icons for different update types
        const createIcon = screen.getByText('🆕');
        const transitionIcon = screen.getByText('🔄');
        
        expect(createIcon).toBeInTheDocument();
        expect(transitionIcon).toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation for accessibility', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      const rejectionCard = screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      
      // Should be focusable
      rejectionCard!.focus();
      
      // Should open on Enter key
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('hash-abc123def456')).toBeInTheDocument();
      });
    });

    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      const rejectionCard = screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      await user.click(rejectionCard!);

      await waitFor(() => {
        expect(screen.getByText('hash-abc123def456')).toBeInTheDocument();
      });

      // Click modal backdrop
      const modalBackdrop = screen.getByText('hash-abc123def456').closest('div[class*="fixed"]');
      await user.click(modalBackdrop!);

      await waitFor(() => {
        expect(screen.queryByText('hash-abc123def456')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Notification Preferences', () => {
    // Note: This functionality is not yet implemented in the component
    // These tests define the expected behavior for user notification preferences
    
    it('should display notification preferences settings', async () => {
      render(<RejectionsView />);

      // Should have a settings/preferences button or section
      const settingsButton = screen.queryByText(/settings|preferences|notifications/i);
      expect(settingsButton).toBeInTheDocument();
    });

    it('should allow users to enable/disable rejection notifications', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      // Should have notification toggle
      const notificationToggle = screen.queryByRole('checkbox', { name: /enable rejection notifications/i });
      expect(notificationToggle).toBeInTheDocument();

      if (notificationToggle) {
        await user.click(notificationToggle);
        
        // Should save preference
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/user/notification-preferences'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('rejectionNotifications')
          })
        );
      }
    });

    it('should allow users to set notification frequency', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      // Should have frequency selector
      const frequencySelect = screen.queryByLabelText(/notification frequency/i);
      expect(frequencySelect).toBeInTheDocument();

      if (frequencySelect) {
        await user.selectOptions(frequencySelect, 'daily');
        
        // Should update preference
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/user/notification-preferences'),
            expect.objectContaining({
              method: 'POST'
            })
          );
        });
      }
    });

    it('should show notification history and unread count', async () => {
      render(<RejectionsView />);

      // Should display notification indicators
      const notificationCount = screen.queryByText(/unread|new/i);
      expect(notificationCount).toBeInTheDocument();

      // Should have notification history section
      const notificationHistory = screen.queryByText(/notification history|recent alerts/i);
      expect(notificationHistory).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should debounce filter input to avoid excessive API calls', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1); // Initial load
      });

      const fiberIdInput = screen.getByPlaceholderText('Enter fiber UUID...');
      
      // Type multiple characters quickly
      await user.type(fiberIdInput, 'fiber-uuid-test');

      // Should not make API call for each character
      // Should debounce and make only one call after delay
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + debounced
      }, { timeout: 1000 });
    });

    it('should virtualize large lists for performance', async () => {
      const largeDataset = {
        rejections: Array.from({ length: 1000 }, (_, i) => ({
          ...mockRejectionData.rejections[0],
          id: i + 1,
          ordinal: 10000 + i
        })),
        total: 10000,
        hasMore: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeDataset
      });

      render(<RejectionsView />);

      await waitFor(() => {
        // Should not render all 1000 items, only visible ones
        const renderedItems = screen.getAllByText(/CreateStateMachine/);
        expect(renderedItems.length).toBeLessThan(1000);
        expect(renderedItems.length).toBeGreaterThan(0);
      });
    });
  });
});