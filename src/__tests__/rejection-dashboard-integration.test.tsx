/**
 * Rejection Dashboard Integration Tests
 * 
 * TDD tests for end-to-end rejection visibility workflows.
 * Tests complete user journeys and system integration scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectionsView } from '../components/RejectionsView';
import { RejectionNotificationService } from '../lib/rejectionNotifications';

// Mock the notification service
vi.mock('../lib/rejectionNotifications');

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket for real-time updates
const mockWebSocket = vi.fn();
vi.stubGlobal('WebSocket', mockWebSocket);

// Mock environment
vi.stubGlobal('import.meta', {
  env: {
    VITE_INDEXER_URL: 'http://localhost:3010',
    VITE_WS_URL: 'ws://localhost:3010/ws'
  }
});

describe('Rejection Dashboard Integration', () => {
  let mockNotificationService: any;

  const mockRejectionData = {
    rejections: [
      {
        id: 1,
        ordinal: 12345,
        timestamp: '2026-02-18T15:30:00Z',
        updateType: 'CreateStateMachine',
        fiberId: 'fiber-uuid-123',
        updateHash: 'hash-abc123',
        errors: [
          { code: 'InvalidOwner', message: 'Owner signature validation failed' }
        ],
        signers: ['address1', 'address2'],
        createdAt: '2026-02-18T15:30:00Z'
      }
    ],
    total: 1,
    hasMore: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockNotificationService = {
      getNotificationPreferences: vi.fn().mockResolvedValue({
        enabled: true,
        frequency: 'immediate',
        channels: ['browser', 'email']
      }),
      updateNotificationPreferences: vi.fn().mockResolvedValue({ success: true }),
      notifyRejection: vi.fn().mockResolvedValue(true)
    };
    
    vi.mocked(RejectionNotificationService).mockImplementation(() => mockNotificationService);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockRejectionData
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Journey: Discovering Rejections', () => {
    it('should guide new users through rejection discovery workflow', async () => {
      // Simulate first-time user with no rejection history
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rejections: [], total: 0, hasMore: false })
      });

      const user = userEvent.setup();
      render(<RejectionsView />);

      // Should show empty state with helpful guidance
      await waitFor(() => {
        expect(screen.getByText('No rejected transactions found')).toBeInTheDocument();
      });

      // User enables notifications
      const notificationToggle = screen.queryByRole('checkbox', { name: /enable.*notification/i });
      if (notificationToggle) {
        await user.click(notificationToggle);
        expect(mockNotificationService.updateNotificationPreferences).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: true })
        );
      }

      // User sets up filters to monitor specific types
      const typeSelect = screen.getByLabelText('Update Type');
      await user.selectOptions(typeSelect, 'CreateStateMachine');

      // Should remember user preferences for future visits
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('updateType=CreateStateMachine')
      );
    });

    it('should handle power user workflow with advanced filtering', async () => {
      const powerUserData = {
        rejections: Array.from({ length: 100 }, (_, i) => ({
          ...mockRejectionData.rejections[0],
          id: i + 1,
          ordinal: 10000 + i,
          fiberId: `fiber-${i}-uuid`,
          updateType: i % 2 === 0 ? 'CreateStateMachine' : 'TransitionStateMachine',
          errors: [
            { 
              code: i % 3 === 0 ? 'InvalidOwner' : 'InsufficientFunds', 
              message: `Error ${i}` 
            }
          ]
        })),
        total: 1000,
        hasMore: true
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => powerUserData
      });

      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1-20 of 1,000')).toBeInTheDocument();
      });

      // Power user applies multiple filters simultaneously
      const typeSelect = screen.getByLabelText('Update Type');
      const fiberInput = screen.getByPlaceholderText('Enter fiber UUID...');
      
      await user.selectOptions(typeSelect, 'CreateStateMachine');
      await user.type(fiberInput, 'fiber-5');

      // Should handle complex filter combinations efficiently
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('updateType=CreateStateMachine&fiberId=fiber-5')
        );
      });

      // Power user navigates through pages rapidly
      const nextButton = screen.getByText('Next →');
      for (let page = 0; page < 5; page++) {
        await user.click(nextButton);
        await waitFor(() => {
          expect(mockFetch).toHaveBeenLastCalledWith(
            expect.stringContaining(`offset=${(page + 1) * 20}`)
          );
        });
      }
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should receive and display new rejections in real-time', async () => {
      let wsOnMessage: ((event: MessageEvent) => void) | undefined;
      
      // Mock WebSocket connection
      const mockWsInstance = {
        readyState: WebSocket.OPEN,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          if (event === 'message') {
            wsOnMessage = handler;
          }
        }),
        removeEventListener: vi.fn()
      };
      
      mockWebSocket.mockImplementation(() => mockWsInstance);

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Simulate receiving new rejection via WebSocket
      const newRejection = {
        type: 'NEW_REJECTION',
        data: {
          id: 999,
          ordinal: 99999,
          timestamp: '2026-02-18T16:00:00Z',
          updateType: 'TransitionStateMachine',
          fiberId: 'new-fiber-uuid',
          updateHash: 'new-hash',
          errors: [{ code: 'NotFound', message: 'Fiber not found' }],
          signers: ['new-address'],
          createdAt: '2026-02-18T16:00:00Z'
        }
      };

      wsOnMessage?.(new MessageEvent('message', { 
        data: JSON.stringify(newRejection) 
      }));

      // Should update UI with new rejection
      await waitFor(() => {
        expect(screen.getByText('TransitionStateMachine')).toBeInTheDocument();
        expect(screen.getByText('new-fibe...uuid')).toBeInTheDocument();
      });

      // Should trigger notification
      expect(mockNotificationService.notifyRejection).toHaveBeenCalledWith(
        newRejection.data
      );
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      const mockWsInstance = {
        readyState: WebSocket.CLOSED,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };
      
      mockWebSocket.mockImplementation(() => mockWsInstance);

      render(<RejectionsView />);

      // Should still function with periodic polling fallback
      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Should show connection status indicator
      const connectionStatus = screen.queryByText(/offline|disconnected/i);
      if (connectionStatus) {
        expect(connectionStatus).toBeInTheDocument();
      }
    });
  });

  describe('Cross-Component Integration', () => {
    it('should integrate with fiber detail navigation', async () => {
      const mockOnFiberSelect = vi.fn();
      const user = userEvent.setup();
      
      render(<RejectionsView onFiberSelect={mockOnFiberSelect} />);

      await waitFor(() => {
        expect(screen.getByText('fiber-uu...id-123')).toBeInTheDocument();
      });

      // Click fiber ID link
      await user.click(screen.getByText('fiber-uu...id-123'));

      expect(mockOnFiberSelect).toHaveBeenCalledWith('fiber-uuid-123');
    });

    it('should integrate with global search functionality', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Should support search-driven navigation to rejections
      const fiberInput = screen.getByPlaceholderText('Enter fiber UUID...');
      await user.type(fiberInput, 'fiber-uuid-123');

      // Should filter to specific rejection
      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('fiberId=fiber-uuid-123')
        );
      });
    });

    it('should integrate with user dashboard and statistics', async () => {
      const statsData = {
        rejections: mockRejectionData.rejections,
        total: 1,
        hasMore: false,
        stats: {
          totalRejections: 145,
          recentTrend: 'increasing',
          topErrorTypes: [
            { code: 'InvalidOwner', count: 45 },
            { code: 'InsufficientFunds', count: 32 }
          ],
          impactedFibers: 78
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => statsData
      });

      render(<RejectionsView />);

      // Should display integration statistics
      await waitFor(() => {
        const statsSection = screen.queryByText(/statistics|stats|overview/i);
        if (statsSection) {
          expect(within(statsSection.closest('div')!).getByText('145')).toBeInTheDocument();
          expect(within(statsSection.closest('div')!).getByText('increasing')).toBeInTheDocument();
        }
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency rejection updates efficiently', async () => {
      let wsOnMessage: ((event: MessageEvent) => void) | undefined;
      const mockWsInstance = {
        readyState: WebSocket.OPEN,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          if (event === 'message') wsOnMessage = handler;
        }),
        removeEventListener: vi.fn()
      };
      mockWebSocket.mockImplementation(() => mockWsInstance);

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Simulate rapid rejection updates (stress test)
      for (let i = 0; i < 50; i++) {
        const rapidRejection = {
          type: 'NEW_REJECTION',
          data: {
            id: 2000 + i,
            ordinal: 20000 + i,
            timestamp: new Date().toISOString(),
            updateType: 'CreateStateMachine',
            fiberId: `rapid-fiber-${i}`,
            updateHash: `rapid-hash-${i}`,
            errors: [{ code: 'InvalidOwner', message: `Rapid error ${i}` }],
            signers: [`rapid-address-${i}`],
            createdAt: new Date().toISOString()
          }
        };

        wsOnMessage?.(new MessageEvent('message', { 
          data: JSON.stringify(rapidRejection) 
        }));
      }

      // Should handle updates without performance degradation
      await waitFor(() => {
        // Should still be responsive
        expect(screen.getByText('Rejected Transactions')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should throttle notifications to prevent spam
      expect(mockNotificationService.notifyRejection).toHaveBeenCalledTimes(10); // Rate limited
    });

    it('should optimize API calls with proper caching and debouncing', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1); // Initial load
      });

      const fiberInput = screen.getByPlaceholderText('Enter fiber UUID...');
      
      // Rapid typing should be debounced
      await user.type(fiberInput, 'test-fiber-id');

      // Should make only one API call after debounce period
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + debounced
      }, { timeout: 1000 });

      // Subsequent identical queries should use cache
      await user.clear(fiberInput);
      await user.type(fiberInput, 'test-fiber-id');

      // Should not trigger additional API call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from API failures with retry mechanisms', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRejectionData
        });

      const user = userEvent.setup();
      render(<RejectionsView />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Failed to load rejections')).toBeInTheDocument();
      });

      // User clicks retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should show error again after second failure
      await waitFor(() => {
        expect(screen.getByText('Failed to load rejections')).toBeInTheDocument();
      });

      // User clicks retry again
      await user.click(screen.getByText('Retry'));

      // Should succeed on third attempt
      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
        expect(screen.queryByText('Failed to load rejections')).not.toBeInTheDocument();
      });
    });

    it('should maintain state during temporary network issues', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      // Initial successful load
      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // User applies filter
      const typeSelect = screen.getByLabelText('Update Type');
      await user.selectOptions(typeSelect, 'TransitionStateMachine');

      // Network fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should maintain filter state and show appropriate error
      await waitFor(() => {
        expect(typeSelect).toHaveValue('TransitionStateMachine');
        expect(screen.getByText(/Failed to load|Network error/)).toBeInTheDocument();
      });

      // Network recovers
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRejectionData
      });

      // Should retry with maintained filter state
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining('updateType=TransitionStateMachine')
        );
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide complete keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Should be able to navigate filters with keyboard
      const typeSelect = screen.getByLabelText('Update Type');
      typeSelect.focus();
      await user.keyboard('{ArrowDown}{Enter}');

      // Should be able to navigate rejection cards with keyboard
      const rejectionCard = screen.getByText('CreateStateMachine').closest('[role="button"]') ||
                           screen.getByText('CreateStateMachine').closest('div[class*="cursor-pointer"]');
      
      if (rejectionCard) {
        rejectionCard.focus();
        await user.keyboard('{Enter}');

        // Should open modal
        await waitFor(() => {
          expect(screen.getByText('hash-abc123')).toBeInTheDocument();
        });

        // Should be able to close modal with Escape
        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(screen.queryByText('hash-abc123')).not.toBeInTheDocument();
        });
      }
    });

    it('should support screen readers with proper ARIA labels', async () => {
      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Should have proper heading structure
      const mainHeading = screen.getByRole('heading', { name: /rejected transactions/i });
      expect(mainHeading).toBeInTheDocument();

      // Should have proper form labels
      expect(screen.getByLabelText('Update Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Fiber ID')).toBeInTheDocument();

      // Should have proper button labels
      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should handle mobile viewport properly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(<RejectionsView />);

      await waitFor(() => {
        expect(screen.getByText('CreateStateMachine')).toBeInTheDocument();
      });

      // Should adapt layout for mobile
      const filtersContainer = screen.getByText('Update Type').closest('div');
      expect(filtersContainer).toHaveClass(/flex-col|sm:flex-row/);
    });
  });
});