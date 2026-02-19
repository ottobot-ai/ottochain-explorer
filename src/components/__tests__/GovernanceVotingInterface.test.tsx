/**
 * GovernanceVotingInterface Component Tests
 * 
 * TDD tests for DAO governance voting functionality.
 * Tests define expected behavior for proposal voting and results display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceVotingInterface } from '../governance/GovernanceVotingInterface';

// Mock dependencies
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket for real-time updates
const mockWebSocket = vi.fn();
vi.stubGlobal('WebSocket', mockWebSocket);

const mockProposal = {
  id: 'prop-123',
  title: 'Increase Treasury Allocation',
  description: 'This proposal seeks to increase treasury allocation for development.',
  type: 'Treasury Allocation',
  creator: 'DAGcreator123',
  createdAt: '2026-02-18T10:00:00Z',
  votingEnds: '2026-02-25T10:00:00Z',
  quorumThreshold: 25,
  status: 'active',
  votes: {
    yes: 1250000,
    no: 450000,
    abstain: 100000
  },
  totalEligibleVotes: 5000000,
  userVote: null,
  parameters: {
    recipientAddress: 'DAGrec123',
    amount: 100000,
    purpose: 'Development funding'
  }
};

describe('GovernanceVotingInterface', () => {
  const mockUserAccount = 'DAGuser456';
  const mockOnVoteSubmitted = vi.fn();

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

  describe('Proposal Display', () => {
    it('should render proposal details correctly', async () => {
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should display proposal header
      expect(screen.getByText('Increase Treasury Allocation')).toBeInTheDocument();
      expect(screen.getByText('Treasury Allocation')).toBeInTheDocument();
      expect(screen.getByText('Created by DAGcreator123')).toBeInTheDocument();

      // Should display proposal description
      expect(screen.getByText('This proposal seeks to increase treasury allocation for development.')).toBeInTheDocument();

      // Should display voting deadline
      expect(screen.getByText(/Voting ends:/)).toBeInTheDocument();
      expect(screen.getByText(/February 25, 2026/)).toBeInTheDocument();

      // Should display quorum threshold
      expect(screen.getByText('Quorum: 25%')).toBeInTheDocument();
    });

    it('should display treasury allocation specific details', async () => {
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should show treasury-specific information
      expect(screen.getByText('Recipient: DAGrec123')).toBeInTheDocument();
      expect(screen.getByText('Amount: 100,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Purpose: Development funding')).toBeInTheDocument();
    });

    it('should show different proposal types with appropriate details', async () => {
      const parameterProposal = {
        ...mockProposal,
        type: 'Parameter Change',
        parameters: {
          parameterName: 'block_time',
          currentValue: '10s',
          proposedValue: '8s',
          justification: 'Improve transaction throughput'
        }
      };

      render(
        <GovernanceVotingInterface
          proposal={parameterProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      expect(screen.getByText('Parameter Change')).toBeInTheDocument();
      expect(screen.getByText('Parameter: block_time')).toBeInTheDocument();
      expect(screen.getByText('Current: 10s → Proposed: 8s')).toBeInTheDocument();
      expect(screen.getByText('Improve transaction throughput')).toBeInTheDocument();
    });
  });

  describe('Vote Counting and Progress', () => {
    it('should display current vote counts and percentages', async () => {
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should show vote counts
      expect(screen.getByText('1,250,000')).toBeInTheDocument(); // Yes votes
      expect(screen.getByText('450,000')).toBeInTheDocument();   // No votes
      expect(screen.getByText('100,000')).toBeInTheDocument();   // Abstain votes

      // Should show vote percentages
      expect(screen.getByText('69.4%')).toBeInTheDocument(); // Yes percentage
      expect(screen.getByText('25.0%')).toBeInTheDocument(); // No percentage
      expect(screen.getByText('5.6%')).toBeInTheDocument();  // Abstain percentage
    });

    it('should show quorum progress indicator', async () => {
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Total votes cast: 1,800,000 out of 5,000,000 eligible = 36%
      const progressBar = screen.getByRole('progressbar', { name: /quorum progress/i });
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '36');

      expect(screen.getByText('36% of eligible voters have participated')).toBeInTheDocument();
      expect(screen.getByText('Quorum met!')).toBeInTheDocument(); // Since 36% > 25%
    });

    it('should indicate when quorum is not met', async () => {
      const lowVoteProposal = {
        ...mockProposal,
        votes: {
          yes: 500000,
          no: 200000,
          abstain: 50000
        }
      };

      render(
        <GovernanceVotingInterface
          proposal={lowVoteProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Total votes: 750,000 out of 5,000,000 = 15%
      expect(screen.getByText('15% of eligible voters have participated')).toBeInTheDocument();
      expect(screen.getByText('Quorum not met (need 25%)')).toBeInTheDocument();
    });

    it('should show visual vote distribution with progress bars', async () => {
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should have progress bars for each vote type
      const yesBar = screen.getByRole('progressbar', { name: /yes votes/i });
      const noBar = screen.getByRole('progressbar', { name: /no votes/i });
      const abstainBar = screen.getByRole('progressbar', { name: /abstain votes/i });

      expect(yesBar).toHaveAttribute('aria-valuenow', '69.4');
      expect(noBar).toHaveAttribute('aria-valuenow', '25.0');
      expect(abstainBar).toHaveAttribute('aria-valuenow', '5.6');
    });
  });

  describe('Voting Actions', () => {
    it('should allow user to vote yes', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const yesButton = screen.getByRole('button', { name: /vote yes/i });
      expect(yesButton).toBeInTheDocument();
      expect(yesButton).not.toBeDisabled();

      await user.click(yesButton);

      // Should show confirmation modal
      expect(screen.getByText('Confirm Your Vote')).toBeInTheDocument();
      expect(screen.getByText('You are voting YES on this proposal')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm vote/i });
      await user.click(confirmButton);

      // Should submit vote
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/vote'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"vote":"yes"')
          })
        );
      });

      expect(mockOnVoteSubmitted).toHaveBeenCalledWith({
        proposalId: 'prop-123',
        vote: 'yes'
      });
    });

    it('should allow user to vote no', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const noButton = screen.getByRole('button', { name: /vote no/i });
      await user.click(noButton);

      expect(screen.getByText('You are voting NO on this proposal')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm vote/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/vote'),
          expect.objectContaining({
            body: expect.stringContaining('"vote":"no"')
          })
        );
      });
    });

    it('should allow user to abstain', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const abstainButton = screen.getByRole('button', { name: /abstain/i });
      await user.click(abstainButton);

      expect(screen.getByText('You are choosing to ABSTAIN from this proposal')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm vote/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/vote'),
          expect.objectContaining({
            body: expect.stringContaining('"vote":"abstain"')
          })
        );
      });
    });

    it('should require user to provide reason for no vote', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const noButton = screen.getByRole('button', { name: /vote no/i });
      await user.click(noButton);

      // Should show reason input for no votes
      expect(screen.getByLabelText('Reason for voting no (optional)')).toBeInTheDocument();

      const reasonInput = screen.getByLabelText('Reason for voting no (optional)');
      await user.type(reasonInput, 'I disagree with the proposed amount');

      const confirmButton = screen.getByRole('button', { name: /confirm vote/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/vote'),
          expect.objectContaining({
            body: expect.stringContaining('I disagree with the proposed amount')
          })
        );
      });
    });
  });

  describe('User Vote Status', () => {
    it('should show when user has already voted', async () => {
      const votedProposal = {
        ...mockProposal,
        userVote: { vote: 'yes', timestamp: '2026-02-19T10:00:00Z', reason: null }
      };

      render(
        <GovernanceVotingInterface
          proposal={votedProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should show user's vote status
      expect(screen.getByText('Your Vote: YES')).toBeInTheDocument();
      expect(screen.getByText('Voted on February 19, 2026')).toBeInTheDocument();

      // Should disable voting buttons
      expect(screen.getByRole('button', { name: /vote yes/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /vote no/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /abstain/i })).toBeDisabled();

      // Should show change vote option
      expect(screen.getByRole('button', { name: /change vote/i })).toBeInTheDocument();
    });

    it('should allow user to change their vote', async () => {
      const votedProposal = {
        ...mockProposal,
        userVote: { vote: 'yes', timestamp: '2026-02-19T10:00:00Z', reason: null }
      };

      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={votedProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const changeVoteButton = screen.getByRole('button', { name: /change vote/i });
      await user.click(changeVoteButton);

      // Should enable voting buttons again
      expect(screen.getByRole('button', { name: /vote yes/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /vote no/i })).not.toBeDisabled();

      // Should show warning about changing vote
      expect(screen.getByText('Changing your vote will replace your previous vote')).toBeInTheDocument();
    });

    it('should display user vote reason if provided', async () => {
      const votedProposal = {
        ...mockProposal,
        userVote: { 
          vote: 'no', 
          timestamp: '2026-02-19T10:00:00Z', 
          reason: 'Amount is too high for current treasury status' 
        }
      };

      render(
        <GovernanceVotingInterface
          proposal={votedProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      expect(screen.getByText('Your Vote: NO')).toBeInTheDocument();
      expect(screen.getByText('Amount is too high for current treasury status')).toBeInTheDocument();
    });
  });

  describe('Proposal Status and Lifecycle', () => {
    it('should show voting closed status for expired proposals', async () => {
      const expiredProposal = {
        ...mockProposal,
        status: 'closed',
        votingEnds: '2026-02-17T10:00:00Z', // Past date
        result: 'passed'
      };

      render(
        <GovernanceVotingInterface
          proposal={expiredProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      expect(screen.getByText('Voting Closed')).toBeInTheDocument();
      expect(screen.getByText('Result: PASSED')).toBeInTheDocument();

      // Should disable all voting buttons
      expect(screen.getByRole('button', { name: /vote yes/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /vote no/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /abstain/i })).toBeDisabled();
    });

    it('should show countdown timer for active proposals', async () => {
      // Mock current time to be before voting ends
      vi.setSystemTime(new Date('2026-02-20T10:00:00Z'));

      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should show countdown
      expect(screen.getByText(/5 days remaining/)).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should handle failed proposals correctly', async () => {
      const failedProposal = {
        ...mockProposal,
        status: 'failed',
        result: 'failed',
        votes: {
          yes: 300000,
          no: 800000,
          abstain: 50000
        }
      };

      render(
        <GovernanceVotingInterface
          proposal={failedProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      expect(screen.getByText('Result: FAILED')).toBeInTheDocument();
      expect(screen.getByText('Majority voted against the proposal')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should receive and display real-time vote updates', async () => {
      let wsOnMessage: ((event: MessageEvent) => void) | undefined;
      
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

      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Initial vote count
      expect(screen.getByText('1,250,000')).toBeInTheDocument();

      // Simulate receiving vote update
      const voteUpdate = {
        type: 'VOTE_UPDATE',
        proposalId: 'prop-123',
        votes: {
          yes: 1350000,
          no: 450000,
          abstain: 100000
        }
      };

      wsOnMessage?.(new MessageEvent('message', { 
        data: JSON.stringify(voteUpdate) 
      }));

      // Should update vote count
      await waitFor(() => {
        expect(screen.getByText('1,350,000')).toBeInTheDocument();
      });
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

      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should still function with periodic polling fallback
      expect(screen.getByText('Increase Treasury Allocation')).toBeInTheDocument();

      // Should show offline indicator
      const connectionStatus = screen.queryByText(/offline|disconnected/i);
      if (connectionStatus) {
        expect(connectionStatus).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle vote submission failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const yesButton = screen.getByRole('button', { name: /vote yes/i });
      await user.click(yesButton);

      const confirmButton = screen.getByRole('button', { name: /confirm vote/i });
      await user.click(confirmButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to submit vote. Please try again.')).toBeInTheDocument();
      });

      expect(mockOnVoteSubmitted).not.toHaveBeenCalled();
    });

    it('should show loading state during vote submission', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 1000))
      );

      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      const yesButton = screen.getByRole('button', { name: /vote yes/i });
      await user.click(yesButton);

      const confirmButton = screen.getByRole('button', { name: /confirm vote/i });
      await user.click(confirmButton);

      // Should show loading state
      expect(screen.getByText('Submitting vote...')).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', async () => {
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should have proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Increase Treasury Allocation');

      // Voting buttons should have proper labels
      const yesButton = screen.getByRole('button', { name: /vote yes/i });
      const noButton = screen.getByRole('button', { name: /vote no/i });
      const abstainButton = screen.getByRole('button', { name: /abstain/i });

      expect(yesButton).toHaveAttribute('aria-describedby', expect.any(String));
      expect(noButton).toHaveAttribute('aria-describedby', expect.any(String));
      expect(abstainButton).toHaveAttribute('aria-describedby', expect.any(String));
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceVotingInterface
          proposal={mockProposal}
          userAccount={mockUserAccount}
          onVoteSubmitted={mockOnVoteSubmitted}
        />
      );

      // Should be able to tab to voting buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /vote yes/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /vote no/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /abstain/i })).toHaveFocus();

      // Should be able to vote with Enter key
      await user.keyboard('{Enter}');
      expect(screen.getByText('Confirm Your Vote')).toBeInTheDocument();
    });
  });
});