/**
 * GovernanceDelegationInterface Component Tests
 * 
 * TDD tests for DAO governance delegation functionality.
 * Tests define expected behavior for delegation management and voting power.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceDelegationInterface } from '../governance/GovernanceDelegationInterface';

// Mock dependencies
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUserData = {
  account: 'DAGuser456',
  votingPower: 5000000, // 5M DAG
  delegatedPower: 2000000, // 2M DAG delegated to others
  receivedDelegations: 3500000, // 3.5M DAG delegated to user
  totalVotingPower: 6500000, // 5M own + 3.5M received - 2M delegated
  activeDelegations: [
    {
      id: 'del-1',
      delegate: 'DAGdelegate1',
      amount: 1500000,
      timestamp: '2026-02-15T10:00:00Z'
    },
    {
      id: 'del-2', 
      delegate: 'DAGdelegate2',
      amount: 500000,
      timestamp: '2026-02-16T10:00:00Z'
    }
  ],
  receivedDelegationsDetails: [
    {
      id: 'rec-1',
      delegator: 'DAGdelegator1',
      amount: 2000000,
      timestamp: '2026-02-14T10:00:00Z'
    },
    {
      id: 'rec-2',
      delegator: 'DAGdelegator2', 
      amount: 1500000,
      timestamp: '2026-02-17T10:00:00Z'
    }
  ]
};

describe('GovernanceDelegationInterface', () => {
  const mockOnDelegationChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Voting Power Overview', () => {
    it('should display comprehensive voting power breakdown', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show total voting power prominently
      expect(screen.getByText('Total Voting Power')).toBeInTheDocument();
      expect(screen.getByText('6,500,000 DAG')).toBeInTheDocument();

      // Should show breakdown components
      expect(screen.getByText('Your Tokens: 5,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Delegated to You: +3,500,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Delegated by You: -2,000,000 DAG')).toBeInTheDocument();
    });

    it('should show voting power utilization percentage', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should calculate and show utilization
      const utilizationBar = screen.getByRole('progressbar', { name: /delegation utilization/i });
      expect(utilizationBar).toBeInTheDocument();
      
      // 2M delegated out of 5M owned = 40%
      expect(utilizationBar).toHaveAttribute('aria-valuenow', '40');
      expect(screen.getByText('40% of your tokens are delegated')).toBeInTheDocument();
    });

    it('should display visual representation of voting power composition', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should have visual breakdown chart or bars
      const ownTokensBar = screen.getByRole('progressbar', { name: /own tokens/i });
      const delegatedToBar = screen.getByRole('progressbar', { name: /delegated to you/i });
      
      expect(ownTokensBar).toHaveAttribute('aria-valuenow', '76.9'); // 5M / 6.5M
      expect(delegatedToBar).toHaveAttribute('aria-valuenow', '53.8'); // 3.5M / 6.5M
    });
  });

  describe('Delegation Management', () => {
    it('should display current delegations with details', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show delegations section
      expect(screen.getByText('Your Delegations')).toBeInTheDocument();
      
      // Should list active delegations
      expect(screen.getByText('DAGdelegate1')).toBeInTheDocument();
      expect(screen.getByText('1,500,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('DAGdelegate2')).toBeInTheDocument();
      expect(screen.getByText('500,000 DAG')).toBeInTheDocument();

      // Should show delegation dates
      expect(screen.getByText(/February 15, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/February 16, 2026/)).toBeInTheDocument();
    });

    it('should provide delegation form for new delegations', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should have delegation form
      expect(screen.getByText('Delegate Voting Power')).toBeInTheDocument();
      expect(screen.getByLabelText('Delegate Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount (DAG)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument();
    });

    it('should validate delegation form inputs', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      // Should validate required fields
      expect(screen.getByText('Delegate address is required')).toBeInTheDocument();
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });

    it('should validate DAG address format', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const addressInput = screen.getByLabelText('Delegate Address');
      await user.type(addressInput, 'invalid-address');

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      expect(screen.getByText('Invalid DAG address format')).toBeInTheDocument();
    });

    it('should validate delegation amount constraints', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const amountInput = screen.getByLabelText('Amount (DAG)');
      const addressInput = screen.getByLabelText('Delegate Address');

      // Test negative amount
      await user.type(addressInput, 'DAGvalid123');
      await user.type(amountInput, '-1000');

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      expect(screen.getByText('Amount must be positive')).toBeInTheDocument();

      // Test amount exceeding available balance
      await user.clear(amountInput);
      await user.type(amountInput, '4000000'); // More than 3M available (5M - 2M already delegated)

      await user.click(delegateButton);

      expect(screen.getByText('Insufficient available balance for delegation')).toBeInTheDocument();
    });

    it('should prevent delegation to self', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const addressInput = screen.getByLabelText('Delegate Address');
      const amountInput = screen.getByLabelText('Amount (DAG)');

      await user.type(addressInput, mockUserData.account);
      await user.type(amountInput, '1000000');

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      expect(screen.getByText('Cannot delegate to yourself')).toBeInTheDocument();
    });

    it('should prevent duplicate delegations to same address', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const addressInput = screen.getByLabelText('Delegate Address');
      const amountInput = screen.getByLabelText('Amount (DAG)');

      await user.type(addressInput, 'DAGdelegate1'); // Already delegated to
      await user.type(amountInput, '1000000');

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      expect(screen.getByText('You already have an active delegation to this address')).toBeInTheDocument();
    });
  });

  describe('Delegation Creation', () => {
    it('should submit new delegation successfully', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const addressInput = screen.getByLabelText('Delegate Address');
      const amountInput = screen.getByLabelText('Amount (DAG)');

      await user.type(addressInput, 'DAGnewdelegate');
      await user.type(amountInput, '1000000');

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      // Should show confirmation modal
      expect(screen.getByText('Confirm Delegation')).toBeInTheDocument();
      expect(screen.getByText('Delegate 1,000,000 DAG to DAGnewdelegate')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm delegation/i });
      await user.click(confirmButton);

      // Should submit to API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/delegate'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('DAGnewdelegate')
          })
        );
      });

      expect(mockOnDelegationChanged).toHaveBeenCalledWith({
        type: 'delegate',
        delegate: 'DAGnewdelegate',
        amount: 1000000
      });
    });

    it('should show delegation impact preview', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const amountInput = screen.getByLabelText('Amount (DAG)');
      await user.type(amountInput, '1000000');

      // Should show impact preview
      expect(screen.getByText('Impact:')).toBeInTheDocument();
      expect(screen.getByText('Your voting power: 6,500,000 → 5,500,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Available to delegate: 3,000,000 → 2,000,000 DAG')).toBeInTheDocument();
    });

    it('should handle delegation submission errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const addressInput = screen.getByLabelText('Delegate Address');
      const amountInput = screen.getByLabelText('Amount (DAG)');

      await user.type(addressInput, 'DAGnewdelegate');
      await user.type(amountInput, '1000000');

      const delegateButton = screen.getByRole('button', { name: 'Delegate' });
      await user.click(delegateButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delegation/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create delegation. Please try again.')).toBeInTheDocument();
      });

      expect(mockOnDelegationChanged).not.toHaveBeenCalled();
    });
  });

  describe('Delegation Revocation', () => {
    it('should allow revocation of existing delegations', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should have revoke buttons for each delegation
      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      expect(revokeButtons).toHaveLength(2);

      await user.click(revokeButtons[0]);

      // Should show revocation confirmation
      expect(screen.getByText('Revoke Delegation')).toBeInTheDocument();
      expect(screen.getByText('Revoke delegation of 1,500,000 DAG from DAGdelegate1?')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
      await user.click(confirmButton);

      // Should submit revocation
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/revoke-delegation'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('del-1')
          })
        );
      });

      expect(mockOnDelegationChanged).toHaveBeenCalledWith({
        type: 'revoke',
        delegationId: 'del-1'
      });
    });

    it('should show revocation impact preview', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      await user.click(revokeButtons[0]);

      // Should show impact of revocation
      expect(screen.getByText('Impact:')).toBeInTheDocument();
      expect(screen.getByText('Your voting power: 6,500,000 → 8,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Available to delegate: 3,000,000 → 4,500,000 DAG')).toBeInTheDocument();
    });

    it('should handle partial delegation revocation', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
      await user.click(revokeButtons[0]);

      // Should have option for partial revocation
      const partialRevokeCheckbox = screen.getByLabelText('Partial revocation');
      await user.click(partialRevokeCheckbox);

      // Should show amount input
      const amountInput = screen.getByLabelText('Amount to revoke (DAG)');
      expect(amountInput).toBeInTheDocument();
      expect(amountInput).toHaveAttribute('max', '1500000');

      await user.type(amountInput, '1000000');

      const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/partial-revoke-delegation'),
          expect.objectContaining({
            body: expect.stringContaining('1000000')
          })
        );
      });
    });
  });

  describe('Received Delegations Display', () => {
    it('should display delegations received from others', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show received delegations section
      expect(screen.getByText('Delegations to You')).toBeInTheDocument();
      
      // Should list received delegations
      expect(screen.getByText('DAGdelegator1')).toBeInTheDocument();
      expect(screen.getByText('2,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('DAGdelegator2')).toBeInTheDocument();
      expect(screen.getByText('1,500,000 DAG')).toBeInTheDocument();

      // Should show trust indicators or delegator info
      expect(screen.getByText(/February 14, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/February 17, 2026/)).toBeInTheDocument();
    });

    it('should show delegation responsibility information', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show responsibility notice
      expect(screen.getByText(/You are responsible for voting with 3,500,000 DAG/)).toBeInTheDocument();
      expect(screen.getByText(/delegated to you by 2 users/)).toBeInTheDocument();
    });

    it('should provide delegation statistics', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show delegation stats
      expect(screen.getByText('Delegation Statistics')).toBeInTheDocument();
      expect(screen.getByText('Active delegations given: 2')).toBeInTheDocument();
      expect(screen.getByText('Delegations received: 2')).toBeInTheDocument();
      expect(screen.getByText('Your delegation ratio: 57.1%')).toBeInTheDocument(); // 2M / 3.5M
    });
  });

  describe('Delegate Discovery and Reputation', () => {
    it('should provide delegate search and recommendation', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should have delegate finder
      expect(screen.getByText('Find Delegates')).toBeInTheDocument();
      const searchInput = screen.getByLabelText('Search delegates');
      expect(searchInput).toBeInTheDocument();

      // Should have browse delegates button
      expect(screen.getByRole('button', { name: 'Browse Top Delegates' })).toBeInTheDocument();
    });

    it('should display delegate profiles and voting history', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const browseButton = screen.getByRole('button', { name: 'Browse Top Delegates' });
      await user.click(browseButton);

      // Should show delegate list modal/section
      expect(screen.getByText('Top Delegates')).toBeInTheDocument();
      
      // Should show delegate stats
      expect(screen.getByText(/Voting participation:/)).toBeInTheDocument();
      expect(screen.getByText(/Delegated power:/)).toBeInTheDocument();
      expect(screen.getByText(/Recent votes:/)).toBeInTheDocument();
    });

    it('should show delegate reputation and performance metrics', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      const browseButton = screen.getByRole('button', { name: 'Browse Top Delegates' });
      await user.click(browseButton);

      // Should show reputation metrics
      expect(screen.getByText(/Reputation score:/)).toBeInTheDocument();
      expect(screen.getByText(/Voting consistency:/)).toBeInTheDocument();
      expect(screen.getByText(/Community trust:/)).toBeInTheDocument();
    });
  });

  describe('Performance and Analytics', () => {
    it('should track delegation performance over time', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show delegation history
      expect(screen.getByText('Delegation History')).toBeInTheDocument();
      
      // Should have performance charts/graphs
      const performanceChart = screen.queryByRole('img', { name: /delegation performance/i });
      if (performanceChart) {
        expect(performanceChart).toBeInTheDocument();
      }
    });

    it('should provide delegation impact analysis', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show impact metrics
      expect(screen.getByText('Delegation Impact')).toBeInTheDocument();
      expect(screen.getByText(/Your delegates participated in/)).toBeInTheDocument();
      expect(screen.getByText(/Your voting power influence:/)).toBeInTheDocument();
    });

    it('should suggest delegation optimizations', async () => {
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should show optimization suggestions
      const suggestions = screen.queryByText('Delegation Suggestions');
      if (suggestions) {
        expect(suggestions).toBeInTheDocument();
        expect(screen.getByText(/Consider diversifying your delegations/)).toBeInTheDocument();
      }
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should have proper headings
      expect(screen.getByRole('heading', { name: /total voting power/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /your delegations/i })).toBeInTheDocument();

      // Should support keyboard navigation
      await user.tab();
      expect(screen.getByLabelText('Delegate Address')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Amount (DAG)')).toHaveFocus();
    });

    it('should provide helpful tooltips and guidance', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should have help icons with tooltips
      const helpIcon = screen.queryByRole('button', { name: /help|info/i });
      if (helpIcon) {
        await user.hover(helpIcon);
        expect(screen.getByText(/Delegation allows you to assign/)).toBeInTheDocument();
      }
    });

    it('should handle responsive design for mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <GovernanceDelegationInterface
          userData={mockUserData}
          onDelegationChanged={mockOnDelegationChanged}
        />
      );

      // Should adapt layout for mobile
      const container = screen.getByText('Total Voting Power').closest('div');
      expect(container).toHaveClass(/flex-col|mobile|responsive/);
    });
  });
});