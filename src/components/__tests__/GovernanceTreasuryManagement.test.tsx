/**
 * GovernanceTreasuryManagement Component Tests
 * 
 * TDD tests for DAO treasury management and visualization.
 * Tests define expected behavior for treasury oversight and financial operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceTreasuryManagement } from '../governance/GovernanceTreasuryManagement';

// Mock dependencies
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Chart.js for visualization
vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn()
  }))
}));

const mockTreasuryData = {
  totalBalance: 15750000, // 15.75M DAG
  allocations: [
    {
      id: 'dev-fund',
      name: 'Development Fund',
      balance: 8500000,
      allocated: 10000000,
      percentage: 63.5,
      description: 'Funding for core development and infrastructure',
      proposals: ['prop-123', 'prop-124'],
      lastActivity: '2026-02-17T10:00:00Z'
    },
    {
      id: 'community-fund',
      name: 'Community Initiatives',
      balance: 3250000,
      allocated: 4000000,
      percentage: 20.6,
      description: 'Community events, marketing, and outreach',
      proposals: ['prop-125'],
      lastActivity: '2026-02-16T14:00:00Z'
    },
    {
      id: 'security-fund',
      name: 'Security Audits',
      balance: 2000000,
      allocated: 2000000,
      percentage: 12.7,
      description: 'Security audits and bug bounty programs',
      proposals: [],
      lastActivity: '2026-02-15T08:00:00Z'
    },
    {
      id: 'reserve-fund',
      name: 'Emergency Reserve',
      balance: 2000000,
      allocated: 2000000,
      percentage: 12.7,
      description: 'Emergency fund for critical situations',
      proposals: [],
      lastActivity: null
    }
  ],
  recentTransactions: [
    {
      id: 'tx-1',
      type: 'allocation',
      amount: 500000,
      from: 'treasury',
      to: 'dev-fund',
      proposalId: 'prop-123',
      timestamp: '2026-02-17T10:00:00Z',
      description: 'Development milestone payment'
    },
    {
      id: 'tx-2',
      type: 'expenditure',
      amount: -250000,
      from: 'community-fund',
      to: 'DAGmarketing123',
      proposalId: 'prop-125',
      timestamp: '2026-02-16T14:00:00Z',
      description: 'Marketing campaign funding'
    },
    {
      id: 'tx-3',
      type: 'deposit',
      amount: 1000000,
      from: 'DAGdonor456',
      to: 'treasury',
      proposalId: null,
      timestamp: '2026-02-15T12:00:00Z',
      description: 'Community donation'
    }
  ],
  analytics: {
    monthlyBurn: 1250000,
    runwayMonths: 12.6,
    allocationEfficiency: 87.3,
    diversificationScore: 0.72
  }
};

describe('GovernanceTreasuryManagement', () => {
  const mockUserAccount = 'DAGuser456';
  const mockOnProposalCreate = vi.fn();

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

  describe('Treasury Overview Display', () => {
    it('should display total treasury balance prominently', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show total balance
      expect(screen.getByText('Total Treasury Balance')).toBeInTheDocument();
      expect(screen.getByText('15,750,000 DAG')).toBeInTheDocument();

      // Should show key metrics
      expect(screen.getByText('Monthly Burn Rate')).toBeInTheDocument();
      expect(screen.getByText('1,250,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('Runway: 12.6 months')).toBeInTheDocument();
    });

    it('should display allocation breakdown with visual representation', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show all allocation categories
      expect(screen.getByText('Development Fund')).toBeInTheDocument();
      expect(screen.getByText('Community Initiatives')).toBeInTheDocument();
      expect(screen.getByText('Security Audits')).toBeInTheDocument();
      expect(screen.getByText('Emergency Reserve')).toBeInTheDocument();

      // Should show allocation percentages
      expect(screen.getByText('63.5%')).toBeInTheDocument();
      expect(screen.getByText('20.6%')).toBeInTheDocument();
      expect(screen.getByText('12.7%')).toBeInTheDocument();

      // Should show balance vs allocated amounts
      expect(screen.getByText('8,500,000 / 10,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('3,250,000 / 4,000,000 DAG')).toBeInTheDocument();
    });

    it('should show allocation utilization progress bars', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should have progress bars for utilization
      const devUtilizationBar = screen.getByRole('progressbar', { name: /development fund utilization/i });
      expect(devUtilizationBar).toHaveAttribute('aria-valuenow', '85'); // 8.5M / 10M

      const communityUtilizationBar = screen.getByRole('progressbar', { name: /community initiatives utilization/i });
      expect(communityUtilizationBar).toHaveAttribute('aria-valuenow', '81.25'); // 3.25M / 4M
    });

    it('should display treasury health indicators', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show health metrics
      expect(screen.getByText('Treasury Health')).toBeInTheDocument();
      expect(screen.getByText('Allocation Efficiency: 87.3%')).toBeInTheDocument();
      expect(screen.getByText('Diversification Score: 72/100')).toBeInTheDocument();

      // Should show health status indicators
      const healthIndicator = screen.getByText('Healthy');
      expect(healthIndicator).toBeInTheDocument();
      expect(healthIndicator).toHaveClass(/text-green|healthy/);
    });
  });

  describe('Transaction History', () => {
    it('should display recent treasury transactions', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show transaction history section
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();

      // Should display transaction details
      expect(screen.getByText('Development milestone payment')).toBeInTheDocument();
      expect(screen.getByText('Marketing campaign funding')).toBeInTheDocument();
      expect(screen.getByText('Community donation')).toBeInTheDocument();

      // Should show transaction amounts
      expect(screen.getByText('+500,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('-250,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('+1,000,000 DAG')).toBeInTheDocument();

      // Should show transaction dates
      expect(screen.getByText(/February 17, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/February 16, 2026/)).toBeInTheDocument();
      expect(screen.getByText(/February 15, 2026/)).toBeInTheDocument();
    });

    it('should categorize transactions by type with appropriate styling', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show transaction type badges
      const allocationBadge = screen.getByText('Allocation');
      const expenditureBadge = screen.getByText('Expenditure');
      const depositBadge = screen.getByText('Deposit');

      expect(allocationBadge).toHaveClass(/blue|allocation/);
      expect(expenditureBadge).toHaveClass(/red|expenditure/);
      expect(depositBadge).toHaveClass(/green|deposit/);
    });

    it('should link transactions to proposals when applicable', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show proposal links
      const proposalLink = screen.getByText('prop-123');
      expect(proposalLink).toHaveAttribute('href', expect.stringContaining('prop-123'));

      await user.click(proposalLink);
      
      // Should navigate to proposal (test that link is properly formatted)
      expect(proposalLink).toHaveAttribute('href', '/governance/proposals/prop-123');
    });

    it('should provide transaction filtering and search', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should have transaction filters
      const filterSelect = screen.getByLabelText('Filter transactions');
      expect(filterSelect).toBeInTheDocument();

      await user.selectOptions(filterSelect, 'expenditure');

      // Should filter to show only expenditures
      expect(screen.getByText('Marketing campaign funding')).toBeInTheDocument();
      expect(screen.queryByText('Development milestone payment')).not.toBeInTheDocument();
    });
  });

  describe('Treasury Proposal Creation', () => {
    it('should provide form for creating treasury allocation proposals', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should have proposal creation section
      expect(screen.getByText('Request Treasury Allocation')).toBeInTheDocument();
      
      // Should have form fields
      expect(screen.getByLabelText('Allocation Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Requested Amount (DAG)')).toBeInTheDocument();
      expect(screen.getByLabelText('Purpose')).toBeInTheDocument();
      expect(screen.getByLabelText('Justification')).toBeInTheDocument();
      expect(screen.getByLabelText('Milestone Timeline')).toBeInTheDocument();
    });

    it('should validate treasury proposal form', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit Treasury Proposal' });
      await user.click(submitButton);

      // Should show validation errors
      expect(screen.getByText('Allocation category is required')).toBeInTheDocument();
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
      expect(screen.getByText('Purpose is required')).toBeInTheDocument();
      expect(screen.getByText('Justification must be at least 100 characters')).toBeInTheDocument();
    });

    it('should validate amount against available treasury balance', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      const amountInput = screen.getByLabelText('Requested Amount (DAG)');
      await user.type(amountInput, '20000000'); // More than treasury balance

      const submitButton = screen.getByRole('button', { name: 'Submit Treasury Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Amount exceeds available treasury balance')).toBeInTheDocument();
    });

    it('should check allocation category limits', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      const categorySelect = screen.getByLabelText('Allocation Category');
      const amountInput = screen.getByLabelText('Requested Amount (DAG)');

      await user.selectOptions(categorySelect, 'dev-fund');
      await user.type(amountInput, '3000000'); // Would exceed remaining dev fund allocation

      const submitButton = screen.getByRole('button', { name: 'Submit Treasury Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Amount exceeds remaining allocation for Development Fund')).toBeInTheDocument();
    });

    it('should submit valid treasury proposals', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Fill in valid proposal
      await user.selectOptions(screen.getByLabelText('Allocation Category'), 'community-fund');
      await user.type(screen.getByLabelText('Requested Amount (DAG)'), '500000');
      await user.type(screen.getByLabelText('Purpose'), 'Developer conference sponsorship');
      await user.type(screen.getByLabelText('Justification'), 'This proposal requests funding for sponsoring a major blockchain developer conference that will increase visibility of our ecosystem and attract new developers. The conference has 5000+ attendees and offers significant marketing value.');
      await user.type(screen.getByLabelText('Milestone Timeline'), 'Event: March 15-17, 2026\nPayment: Upon confirmed sponsorship package\nReporting: Post-event metrics within 30 days');

      const submitButton = screen.getByRole('button', { name: 'Submit Treasury Proposal' });
      await user.click(submitButton);

      // Should submit to API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/treasury-proposals'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Developer conference sponsorship')
          })
        );
      });

      expect(mockOnProposalCreate).toHaveBeenCalledWith({
        type: 'treasury-allocation',
        category: 'community-fund',
        amount: 500000
      });
    });
  });

  describe('Treasury Analytics and Visualization', () => {
    it('should display spending trends over time', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show analytics section
      expect(screen.getByText('Treasury Analytics')).toBeInTheDocument();

      // Should display spending trends chart
      const spendingChart = screen.getByRole('img', { name: /spending trends/i });
      expect(spendingChart).toBeInTheDocument();
    });

    it('should show allocation efficiency metrics', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show efficiency metrics
      expect(screen.getByText('Allocation Efficiency')).toBeInTheDocument();
      expect(screen.getByText('87.3%')).toBeInTheDocument();

      // Should show efficiency breakdown
      expect(screen.getByText('Funds actively deployed: 85%')).toBeInTheDocument();
      expect(screen.getByText('Idle funds: 15%')).toBeInTheDocument();
    });

    it('should provide runway analysis and projections', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show runway information
      expect(screen.getByText('Treasury Runway')).toBeInTheDocument();
      expect(screen.getByText('12.6 months at current burn rate')).toBeInTheDocument();

      // Should show scenario analysis
      expect(screen.getByText('Scenario Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Conservative burn/)).toBeInTheDocument();
      expect(screen.getByText(/Aggressive growth/)).toBeInTheDocument();
    });

    it('should display allocation diversification metrics', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show diversification analysis
      expect(screen.getByText('Portfolio Diversification')).toBeInTheDocument();
      expect(screen.getByText('Score: 72/100')).toBeInTheDocument();

      // Should show recommendations
      expect(screen.getByText(/Consider reducing development fund concentration/)).toBeInTheDocument();
    });
  });

  describe('Budget Planning and Forecasting', () => {
    it('should provide budget planning tools', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should have budget planning section
      expect(screen.getByText('Budget Planning')).toBeInTheDocument();

      // Should show quarterly budget breakdown
      expect(screen.getByText('Q1 2026 Budget')).toBeInTheDocument();
      expect(screen.getByText('Q2 2026 Forecast')).toBeInTheDocument();
    });

    it('should allow budget scenario modeling', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should have scenario modeling controls
      const scenarioSelect = screen.getByLabelText('Scenario');
      expect(scenarioSelect).toBeInTheDocument();

      await user.selectOptions(scenarioSelect, 'bull-market');

      // Should update projections
      expect(screen.getByText(/Bull market scenario/)).toBeInTheDocument();
      expect(screen.getByText(/18+ months runway/)).toBeInTheDocument();
    });

    it('should show spending alerts and warnings', async () => {
      const highBurnData = {
        ...mockTreasuryData,
        analytics: {
          ...mockTreasuryData.analytics,
          monthlyBurn: 2500000, // High burn rate
          runwayMonths: 6.3
        }
      };

      render(
        <GovernanceTreasuryManagement
          treasuryData={highBurnData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show warnings
      expect(screen.getByText('⚠️ High burn rate detected')).toBeInTheDocument();
      expect(screen.getByText('Treasury runway below 12 months')).toBeInTheDocument();
    });
  });

  describe('Governance Integration', () => {
    it('should link to related governance proposals', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show related proposals
      expect(screen.getByText('Related Proposals')).toBeInTheDocument();
      
      // Should link to active treasury proposals
      const proposalLinks = screen.getAllByText(/prop-12/);
      expect(proposalLinks.length).toBeGreaterThan(0);
      
      proposalLinks.forEach(link => {
        expect(link).toHaveAttribute('href', expect.stringContaining('/governance/proposals/'));
      });
    });

    it('should show pending treasury proposals status', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show proposal status
      expect(screen.getByText('Pending Proposals')).toBeInTheDocument();
      expect(screen.getByText('2 proposals affecting Development Fund')).toBeInTheDocument();
      expect(screen.getByText('1 proposal affecting Community Initiatives')).toBeInTheDocument();
    });

    it('should integrate with delegation system for treasury oversight', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show delegation relevance
      expect(screen.getByText('Treasury Oversight')).toBeInTheDocument();
      expect(screen.getByText(/Your voting power can influence/)).toBeInTheDocument();
    });
  });

  describe('Security and Audit Features', () => {
    it('should display audit trail for treasury operations', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show audit section
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
      
      // Should show transaction verification
      expect(screen.getByText(/All transactions verified on-chain/)).toBeInTheDocument();
      expect(screen.getByText(/Last audit: /)).toBeInTheDocument();
    });

    it('should show multi-signature requirements for large transactions', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show security requirements
      expect(screen.getByText('Security Requirements')).toBeInTheDocument();
      expect(screen.getByText(/Transactions > 1M DAG require/)).toBeInTheDocument();
      expect(screen.getByText(/3 of 5 multisig approval/)).toBeInTheDocument();
    });

    it('should provide emergency fund access controls', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should show emergency controls
      const emergencySection = within(screen.getByText('Emergency Reserve').closest('div')!);
      expect(emergencySection.getByText(/Emergency access only/)).toBeInTheDocument();
      expect(emergencySection.getByText(/Special governance required/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should provide comprehensive keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should support tab navigation through form fields
      await user.tab();
      expect(screen.getByLabelText('Allocation Category')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Requested Amount (DAG)')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Purpose')).toHaveFocus();
    });

    it('should have proper ARIA labels and semantic structure', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should have proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1, name: /treasury management/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /treasury balance/i })).toBeInTheDocument();

      // Should have proper form labels
      expect(screen.getByLabelText('Allocation Category')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Requested Amount (DAG)')).toHaveAttribute('aria-describedby', expect.any(String));
    });

    it('should display numbers and currencies with proper formatting', async () => {
      render(
        <GovernanceTreasuryManagement
          treasuryData={mockTreasuryData}
          userAccount={mockUserAccount}
          onProposalCreate={mockOnProposalCreate}
        />
      );

      // Should format large numbers with commas
      expect(screen.getByText('15,750,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('8,500,000 / 10,000,000 DAG')).toBeInTheDocument();

      // Should show proper currency symbols and units
      expect(screen.getByText(/DAG/)).toBeInTheDocument();
      expect(screen.getByText(/\+500,000 DAG/)).toBeInTheDocument();
      expect(screen.getByText(/-250,000 DAG/)).toBeInTheDocument();
    });
  });
});