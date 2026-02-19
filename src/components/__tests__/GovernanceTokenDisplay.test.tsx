/**
 * GovernanceTokenDisplay Component Tests
 * 
 * TDD tests for governance token visualization and tracking.
 * Tests define expected behavior for token metrics, distribution, and voting power display.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceTokenDisplay } from '../governance/GovernanceTokenDisplay';

// Mock dependencies
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Chart.js for token distribution visualization
vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    data: {
      datasets: [],
      labels: []
    }
  }))
}));

const mockTokenData = {
  totalSupply: 37500000000, // 37.5B DAG
  circulatingSupply: 32500000000, // 32.5B DAG
  stakedAmount: 18750000000, // 18.75B DAG staked for governance
  lockedAmount: 5000000000, // 5B DAG locked (vesting, etc.)
  stakingParticipation: 57.7, // % of circulating supply staked
  votingPowerDistribution: [
    {
      tier: 'Whales (>50M)',
      holders: 127,
      totalTokens: 8750000000,
      percentage: 46.7,
      votingPower: 46.7
    },
    {
      tier: 'Large Holders (10M-50M)',
      holders: 543,
      totalTokens: 5250000000,
      percentage: 28.0,
      votingPower: 28.0
    },
    {
      tier: 'Medium Holders (1M-10M)',
      holders: 2847,
      totalTokens: 3750000000,
      percentage: 20.0,
      votingPower: 20.0
    },
    {
      tier: 'Small Holders (<1M)',
      holders: 15893,
      totalTokens: 1000000000,
      percentage: 5.3,
      votingPower: 5.3
    }
  ],
  delegationMetrics: {
    totalDelegated: 8500000000, // 8.5B DAG delegated
    activeDelegators: 12457,
    activeDelegates: 892,
    delegationRate: 45.3, // % of staked tokens delegated
    topDelegates: [
      {
        address: 'DAGdelegate1',
        delegatedPower: 750000000,
        delegators: 1247,
        votingParticipation: 94.2
      },
      {
        address: 'DAGdelegate2', 
        delegatedPower: 620000000,
        delegators: 896,
        votingParticipation: 87.5
      },
      {
        address: 'DAGdelegate3',
        delegatedPower: 485000000,
        delegators: 723,
        votingParticipation: 91.8
      }
    ]
  },
  historicalData: {
    stakingTrend: [
      { date: '2026-01-01', stakedAmount: 16250000000, participation: 50.0 },
      { date: '2026-01-15', stakedAmount: 17500000000, participation: 53.8 },
      { date: '2026-02-01', stakedAmount: 18125000000, participation: 55.7 },
      { date: '2026-02-15', stakedAmount: 18750000000, participation: 57.7 }
    ],
    votingParticipation: [
      { proposal: 'prop-120', participation: 62.3, outcome: 'passed' },
      { proposal: 'prop-121', participation: 58.7, outcome: 'failed' },
      { proposal: 'prop-122', participation: 71.2, outcome: 'passed' },
      { proposal: 'prop-123', participation: 67.8, outcome: 'active' }
    ]
  },
  userTokenData: {
    account: 'DAGuser456',
    balance: 5000000, // 5M DAG
    stakedAmount: 3500000, // 3.5M DAG staked
    delegatedAmount: 1500000, // 1.5M DAG delegated out
    receivedDelegations: 2750000, // 2.75M DAG delegated to user
    votingPower: 4750000, // 3.5M - 1.5M + 2.75M
    stakingRewards: {
      totalEarned: 125000,
      monthlyRate: 0.42, // 0.42% monthly
      projectedAnnual: 147000
    }
  }
};

describe('GovernanceTokenDisplay', () => {
  const mockOnStakeChange = vi.fn();
  const mockOnDelegationChange = vi.fn();

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

  describe('Token Supply and Distribution Overview', () => {
    it('should display comprehensive token supply metrics', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show total and circulating supply
      expect(screen.getByText('Total Supply')).toBeInTheDocument();
      expect(screen.getByText('37,500,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Circulating Supply')).toBeInTheDocument();
      expect(screen.getByText('32,500,000,000 DAG')).toBeInTheDocument();

      // Should show staking metrics
      expect(screen.getByText('Staked for Governance')).toBeInTheDocument();
      expect(screen.getByText('18,750,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('57.7% participation')).toBeInTheDocument();

      // Should show locked tokens
      expect(screen.getByText('Locked Tokens')).toBeInTheDocument();
      expect(screen.getByText('5,000,000,000 DAG')).toBeInTheDocument();
    });

    it('should display token distribution across holder tiers', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show distribution tiers
      expect(screen.getByText('Whales (>50M)')).toBeInTheDocument();
      expect(screen.getByText('127 holders')).toBeInTheDocument();
      expect(screen.getByText('46.7% voting power')).toBeInTheDocument();

      expect(screen.getByText('Large Holders (10M-50M)')).toBeInTheDocument();
      expect(screen.getByText('543 holders')).toBeInTheDocument();
      expect(screen.getByText('28.0% voting power')).toBeInTheDocument();

      expect(screen.getByText('Medium Holders (1M-10M)')).toBeInTheDocument();
      expect(screen.getByText('2,847 holders')).toBeInTheDocument();
      expect(screen.getByText('20.0% voting power')).toBeInTheDocument();

      expect(screen.getByText('Small Holders (<1M)')).toBeInTheDocument();
      expect(screen.getByText('15,893 holders')).toBeInTheDocument();
      expect(screen.getByText('5.3% voting power')).toBeInTheDocument();
    });

    it('should visualize distribution with charts and progress bars', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should have distribution chart
      const distributionChart = screen.getByRole('img', { name: /token distribution/i });
      expect(distributionChart).toBeInTheDocument();

      // Should have progress bars for each tier
      const whalesBar = screen.getByRole('progressbar', { name: /whales voting power/i });
      expect(whalesBar).toHaveAttribute('aria-valuenow', '46.7');

      const largeHoldersBar = screen.getByRole('progressbar', { name: /large holders voting power/i });
      expect(largeHoldersBar).toHaveAttribute('aria-valuenow', '28.0');
    });

    it('should calculate and display decentralization metrics', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show decentralization analysis
      expect(screen.getByText('Decentralization Index')).toBeInTheDocument();
      
      // Should calculate Gini coefficient or similar metric
      const giniCoefficient = screen.getByText(/Gini: 0\.\d{2}/);
      expect(giniCoefficient).toBeInTheDocument();

      // Should show concentration warnings if applicable
      expect(screen.getByText(/Top 10% of holders control 74.7% of voting power/)).toBeInTheDocument();
    });
  });

  describe('User Token Information', () => {
    it('should display user token holdings and voting power', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show user's token summary
      expect(screen.getByText('Your Token Holdings')).toBeInTheDocument();
      expect(screen.getByText('Total Balance: 5,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Staked: 3,500,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Voting Power: 4,750,000 DAG')).toBeInTheDocument();

      // Should show delegation breakdown
      expect(screen.getByText('Delegated Out: 1,500,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Delegated to You: 2,750,000 DAG')).toBeInTheDocument();
    });

    it('should display staking rewards information', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show staking rewards
      expect(screen.getByText('Staking Rewards')).toBeInTheDocument();
      expect(screen.getByText('Total Earned: 125,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Monthly Rate: 0.42%')).toBeInTheDocument();
      expect(screen.getByText('Projected Annual: 147,000 DAG')).toBeInTheDocument();
    });

    it('should provide staking management interface', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should have staking controls
      expect(screen.getByText('Manage Staking')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount to Stake (DAG)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Stake Tokens' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Unstake Tokens' })).toBeInTheDocument();
    });

    it('should validate staking amounts', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      const stakeInput = screen.getByLabelText('Amount to Stake (DAG)');
      await user.type(stakeInput, '2000000'); // More than unstaked balance (1.5M)

      const stakeButton = screen.getByRole('button', { name: 'Stake Tokens' });
      await user.click(stakeButton);

      expect(screen.getByText('Insufficient unstaked balance')).toBeInTheDocument();
    });

    it('should show user voting power ranking', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show user's position in voting power distribution
      expect(screen.getByText('Your Voting Power Rank')).toBeInTheDocument();
      expect(screen.getByText(/You rank in the top/)).toBeInTheDocument();
      expect(screen.getByText(/Medium Holders tier/)).toBeInTheDocument();
    });
  });

  describe('Delegation Metrics and Analytics', () => {
    it('should display delegation overview statistics', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show delegation metrics
      expect(screen.getByText('Delegation Overview')).toBeInTheDocument();
      expect(screen.getByText('Total Delegated: 8,500,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Delegation Rate: 45.3%')).toBeInTheDocument();
      expect(screen.getByText('Active Delegators: 12,457')).toBeInTheDocument();
      expect(screen.getByText('Active Delegates: 892')).toBeInTheDocument();
    });

    it('should display top delegates with performance metrics', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show top delegates
      expect(screen.getByText('Top Delegates')).toBeInTheDocument();
      
      // Should show delegate details
      expect(screen.getByText('DAGdelegate1')).toBeInTheDocument();
      expect(screen.getByText('750,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('1,247 delegators')).toBeInTheDocument();
      expect(screen.getByText('94.2% participation')).toBeInTheDocument();

      expect(screen.getByText('DAGdelegate2')).toBeInTheDocument();
      expect(screen.getByText('620,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('87.5% participation')).toBeInTheDocument();
    });

    it('should provide delegation concentration analysis', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should analyze delegation concentration
      expect(screen.getByText('Delegation Concentration')).toBeInTheDocument();
      expect(screen.getByText(/Top 10 delegates control/)).toBeInTheDocument();
      expect(screen.getByText(/Average delegation size:/)).toBeInTheDocument();
    });

    it('should show delegation trends and participation rates', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show delegation trends
      expect(screen.getByText('Delegation Trends')).toBeInTheDocument();
      
      // Should have trend visualization
      const delegationChart = screen.getByRole('img', { name: /delegation trends/i });
      expect(delegationChart).toBeInTheDocument();
    });
  });

  describe('Historical Data and Trends', () => {
    it('should display staking participation trends over time', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show staking trend chart
      expect(screen.getByText('Staking Participation Trend')).toBeInTheDocument();
      
      const stakingChart = screen.getByRole('img', { name: /staking trend/i });
      expect(stakingChart).toBeInTheDocument();

      // Should show trend direction
      expect(screen.getByText(/Staking participation increasing/)).toBeInTheDocument();
      expect(screen.getByText(/+7.7% since January/)).toBeInTheDocument();
    });

    it('should display voting participation by proposal', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show voting participation history
      expect(screen.getByText('Voting Participation History')).toBeInTheDocument();
      
      // Should show individual proposal participation
      expect(screen.getByText('prop-120: 62.3% participation')).toBeInTheDocument();
      expect(screen.getByText('prop-121: 58.7% participation')).toBeInTheDocument();
      expect(screen.getByText('prop-122: 71.2% participation')).toBeInTheDocument();

      // Should show outcomes
      expect(screen.getByText('Passed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should calculate average participation rates and trends', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show average participation metrics
      expect(screen.getByText('Average Participation: 65.0%')).toBeInTheDocument();
      expect(screen.getByText(/Participation trending upward/)).toBeInTheDocument();
    });

    it('should correlate participation with proposal outcomes', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show correlation analysis
      expect(screen.getByText('Participation-Outcome Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Higher participation correlates with passed proposals/)).toBeInTheDocument();
      expect(screen.getByText(/Minimum 60% participation for proposal validity/)).toBeInTheDocument();
    });
  });

  describe('Token Utility and Economics', () => {
    it('should explain governance token utility', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show utility explanation
      expect(screen.getByText('Token Utility')).toBeInTheDocument();
      expect(screen.getByText(/Voting Rights/)).toBeInTheDocument();
      expect(screen.getByText(/Staking Rewards/)).toBeInTheDocument();
      expect(screen.getByText(/Proposal Creation/)).toBeInTheDocument();
      expect(screen.getByText(/Treasury Access/)).toBeInTheDocument();
    });

    it('should display tokenomics information', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show tokenomics details
      expect(screen.getByText('Tokenomics')).toBeInTheDocument();
      expect(screen.getByText(/Fixed supply: No inflation/)).toBeInTheDocument();
      expect(screen.getByText(/Staking rewards from transaction fees/)).toBeInTheDocument();
      expect(screen.getByText(/Token burning mechanism/)).toBeInTheDocument();
    });

    it('should show minimum thresholds for governance participation', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should show participation thresholds
      expect(screen.getByText('Governance Thresholds')).toBeInTheDocument();
      expect(screen.getByText(/Minimum to vote: 1,000 DAG staked/)).toBeInTheDocument();
      expect(screen.getByText(/Minimum to create proposal: 100,000 DAG/)).toBeInTheDocument();
      expect(screen.getByText(/Minimum to become delegate: 1,000,000 DAG/)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates and Interactions', () => {
    it('should update token metrics in real-time', async () => {
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
      
      const mockWebSocket = vi.fn().mockImplementation(() => mockWsInstance);
      vi.stubGlobal('WebSocket', mockWebSocket);

      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Initial staked amount
      expect(screen.getByText('18,750,000,000 DAG')).toBeInTheDocument();

      // Simulate staking update
      const stakingUpdate = {
        type: 'STAKING_UPDATE',
        stakedAmount: 18850000000,
        participation: 58.0
      };

      wsOnMessage?.(new MessageEvent('message', { 
        data: JSON.stringify(stakingUpdate) 
      }));

      // Should update staked amount
      await waitFor(() => {
        expect(screen.getByText('18,850,000,000 DAG')).toBeInTheDocument();
        expect(screen.getByText('58.0% participation')).toBeInTheDocument();
      });
    });

    it('should handle staking transactions', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      const stakeInput = screen.getByLabelText('Amount to Stake (DAG)');
      await user.type(stakeInput, '1000000');

      const stakeButton = screen.getByRole('button', { name: 'Stake Tokens' });
      await user.click(stakeButton);

      // Should show confirmation modal
      expect(screen.getByText('Confirm Staking')).toBeInTheDocument();
      expect(screen.getByText('Stake 1,000,000 DAG for governance voting')).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm stake/i });
      await user.click(confirmButton);

      // Should submit staking transaction
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/stake'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('1000000')
          })
        );
      });

      expect(mockOnStakeChange).toHaveBeenCalledWith({
        type: 'stake',
        amount: 1000000
      });
    });

    it('should handle unstaking with cooldown period', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      const unstakeInput = screen.getByLabelText('Amount to Unstake (DAG)');
      await user.type(unstakeInput, '500000');

      const unstakeButton = screen.getByRole('button', { name: 'Unstake Tokens' });
      await user.click(unstakeButton);

      // Should show cooldown warning
      expect(screen.getByText('Unstaking Cooldown')).toBeInTheDocument();
      expect(screen.getByText(/7-day cooldown period/)).toBeInTheDocument();
      expect(screen.getByText(/Tokens unavailable for voting during cooldown/)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm unstake/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/unstake'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('500000')
          })
        );
      });
    });
  });

  describe('Accessibility and Responsive Design', () => {
    it('should provide comprehensive keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should support tabbing through interactive elements
      await user.tab();
      expect(screen.getByLabelText('Amount to Stake (DAG)')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Stake Tokens' })).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Amount to Unstake (DAG)')).toHaveFocus();
    });

    it('should have proper ARIA labels and descriptions', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should have proper headings
      expect(screen.getByRole('heading', { name: /token supply/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /your token holdings/i })).toBeInTheDocument();

      // Should have proper progress bar labels
      const stakingParticipation = screen.getByRole('progressbar', { name: /staking participation/i });
      expect(stakingParticipation).toHaveAttribute('aria-valuenow', '57.7');
      expect(stakingParticipation).toHaveAttribute('aria-valuetext', '57.7% staking participation');
    });

    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should stack elements vertically on mobile
      const container = screen.getByText('Total Supply').closest('div');
      expect(container).toHaveClass(/flex-col|mobile|responsive/);
    });

    it('should display large numbers with proper formatting and units', async () => {
      render(
        <GovernanceTokenDisplay
          tokenData={mockTokenData}
          onStakeChange={mockOnStakeChange}
          onDelegationChange={mockOnDelegationChange}
        />
      );

      // Should format large numbers properly
      expect(screen.getByText('37,500,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('32,500,000,000 DAG')).toBeInTheDocument();
      
      // Should use abbreviated formats where appropriate
      expect(screen.getByText('37.5B DAG')).toBeInTheDocument();
      expect(screen.getByText('18.75B DAG')).toBeInTheDocument();
    });
  });
});