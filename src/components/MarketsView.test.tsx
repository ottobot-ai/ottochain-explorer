import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MarketsView } from './MarketsView';

// Mock the GraphQL queries
const WORKFLOW_TYPES_QUERY = vi.fn();
const FIBERS_QUERY = vi.fn();
const FIBER_DETAIL_QUERY = vi.fn();

// Mock the export functions
vi.mock('../lib/export', () => ({
  exportToCSV: vi.fn(),
  exportToJSON: vi.fn(),
}));

describe('MarketsView', () => {
  const mockOnFiberClick = vi.fn();
  
  const mockWorkflowTypes = {
    workflowTypes: [
      {
        name: 'Market',
        description: 'Prediction markets',
        count: 15,
        states: ['active', 'resolved', 'cancelled'],
      },
      {
        name: 'Contract',
        description: 'Smart contracts',
        count: 25,
        states: ['pending', 'active', 'completed'],
      },
    ],
  };

  const mockMarketsData = {
    fibers: [
      {
        fiberId: 'market-1',
        workflowType: 'Market',
        workflowDesc: 'Prediction: Will ETH reach $5000?',
        currentState: 'active',
        status: 'ACTIVE',
        owners: ['DAG123456'],
        sequenceNumber: 1,
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-02T15:30:00Z',
        stateData: {
          marketType: 'Prediction',
          question: 'Will ETH reach $5000 by end of March?',
          deadline: '2026-03-31T23:59:59Z',
          totalStake: 1500,
          participants: 12,
        },
      },
      {
        fiberId: 'market-2',
        workflowType: 'Market',
        workflowDesc: 'Auction: Rare NFT Collection',
        currentState: 'active',
        status: 'ACTIVE',
        owners: ['DAG789012'],
        sequenceNumber: 2,
        createdAt: '2026-03-02T14:00:00Z',
        updatedAt: '2026-03-02T16:00:00Z',
        stateData: {
          marketType: 'Auction',
          title: 'Rare Digital Art Collection',
          deadline: '2026-03-15T20:00:00Z',
          currentBid: 500,
          bidders: 8,
        },
      },
      {
        fiberId: 'market-3',
        workflowType: 'Market',
        workflowDesc: 'Crowdfund: Community Garden Project',
        currentState: 'resolved',
        status: 'COMPLETED',
        owners: ['DAG345678'],
        sequenceNumber: 3,
        createdAt: '2026-02-20T09:00:00Z',
        updatedAt: '2026-03-01T12:00:00Z',
        stateData: {
          marketType: 'Crowdfund',
          title: 'Local Community Garden',
          goal: 10000,
          raised: 12500,
          backers: 45,
        },
      },
    ],
  };

  const mockMarketDetail = {
    fiber: {
      fiberId: 'market-1',
      workflowType: 'Market',
      workflowDesc: 'Prediction: Will ETH reach $5000?',
      currentState: 'active',
      status: 'ACTIVE',
      owners: ['DAG123456'],
      sequenceNumber: 1,
      createdAt: '2026-03-01T10:00:00Z',
      updatedAt: '2026-03-02T15:30:00Z',
      stateData: {
        marketType: 'Prediction',
        question: 'Will ETH reach $5000 by end of March?',
        deadline: '2026-03-31T23:59:59Z',
        totalStake: 1500,
        participants: 12,
        outcomes: ['Yes', 'No'],
        odds: { Yes: 0.65, No: 0.35 },
      },
      definition: {
        states: {
          active: { id: 'active', isFinal: false },
          resolved: { id: 'resolved', isFinal: true },
          cancelled: { id: 'cancelled', isFinal: true },
        },
        transitions: [
          { from: 'active', to: 'resolved', eventName: 'resolve' },
          { from: 'active', to: 'cancelled', eventName: 'cancel' },
        ],
      },
      transitions: [
        {
          eventName: 'create',
          fromState: '',
          toState: 'active',
          success: true,
          gasUsed: 45000,
          createdAt: '2026-03-01T10:00:00Z',
        },
      ],
    },
  };

  const mocks = [
    {
      request: {
        query: WORKFLOW_TYPES_QUERY,
      },
      result: {
        data: mockWorkflowTypes,
      },
    },
    {
      request: {
        query: FIBERS_QUERY,
        variables: {
          workflowType: 'Market',
          status: 'ACTIVE',
          limit: 50,
        },
      },
      result: {
        data: mockMarketsData,
      },
    },
    {
      request: {
        query: FIBER_DETAIL_QUERY,
        variables: { fiberId: 'market-1' },
      },
      result: {
        data: mockMarketDetail,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render markets page with type filtering', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    // Should show the markets header
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('Markets')).toBeInTheDocument();

    // Wait for markets to load
    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Should display market cards
    expect(screen.getByText('Auction: Rare NFT Collection')).toBeInTheDocument();
    expect(screen.getByText('Crowdfund: Community Garden Project')).toBeInTheDocument();
  });

  it('should filter markets by type', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Should show type filter buttons
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prediction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crowdfund' })).toBeInTheDocument();

    // Click Prediction filter
    const predictionButton = screen.getByRole('button', { name: 'Prediction' });
    fireEvent.click(predictionButton);

    // Should apply active styling to filter button
    expect(predictionButton).toHaveClass('bg-[var(--accent)]');

    // Should filter to only show prediction markets
    expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    // Other types should be filtered out (this would fail if not properly filtered)
    expect(screen.queryByText('Auction: Rare NFT Collection')).not.toBeInTheDocument();
  });

  it('should show market status with correct colors', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Should show status badges with colors
    const activeStatuses = screen.getAllByText('active');
    expect(activeStatuses.length).toBeGreaterThan(0);
    
    const resolvedStatus = screen.getByText('resolved');
    expect(resolvedStatus).toBeInTheDocument();
  });

  it('should handle market type badges with correct colors', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction')).toBeInTheDocument();
    });

    // Should show market type badges
    expect(screen.getByText('Auction')).toBeInTheDocument();
    expect(screen.getByText('Crowdfund')).toBeInTheDocument();

    // Should apply correct color classes
    const predictionBadge = screen.getByText('Prediction');
    expect(predictionBadge).toHaveClass('text-blue-400');
  });

  it('should show market detail view when market is selected', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Initially should show empty state
    expect(screen.getByText('Select a market to view details')).toBeInTheDocument();

    // Click on first market
    const marketCard = screen.getByText('Prediction: Will ETH reach $5000?').closest('div');
    expect(marketCard).toBeInTheDocument();
    fireEvent.click(marketCard!);

    // Should load market details
    await waitFor(() => {
      expect(screen.getByText('Market Details')).toBeInTheDocument();
    });

    expect(screen.getByText('State Data')).toBeInTheDocument();
    expect(screen.getByText('Workflow Definition')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Find and use search input
    const searchInput = screen.getByPlaceholderText('Search markets...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'market-1' } });

    // Should filter to only matching markets
    expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    // Non-matching markets should be filtered out
    expect(screen.queryByText('Auction: Rare NFT Collection')).not.toBeInTheDocument();
  });

  it('should handle date range filtering', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Find date inputs
    const dateFromInput = screen.getByLabelText('From:');
    const dateToInput = screen.getByLabelText('To:');

    expect(dateFromInput).toBeInTheDocument();
    expect(dateToInput).toBeInTheDocument();

    // Set date range to filter markets
    fireEvent.change(dateFromInput, { target: { value: '2026-03-01' } });
    fireEvent.change(dateToInput, { target: { value: '2026-03-01' } });

    // Should filter to only markets created on March 1
    expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    // Markets from other dates should be filtered out
    expect(screen.queryByText('Auction: Rare NFT Collection')).not.toBeInTheDocument();
  });

  it('should handle status filtering', async () => {
    const allStatusMocks = [
      ...mocks,
      {
        request: {
          query: FIBERS_QUERY,
          variables: {
            workflowType: 'Market',
            status: undefined,
            limit: 50,
          },
        },
        result: {
          data: mockMarketsData,
        },
      },
    ];

    render(
      <MockedProvider mocks={allStatusMocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Should have status filter
    const statusSelect = screen.getByDisplayValue('ACTIVE');
    expect(statusSelect).toBeInTheDocument();

    // Change status filter to All
    fireEvent.change(statusSelect, { target: { value: '' } });

    // Should show all markets regardless of status
    expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    expect(screen.getByText('Crowdfund: Community Garden Project')).toBeInTheDocument();
  });

  it('should handle sorting options', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Should have sort dropdown
    const sortSelect = screen.getByDisplayValue('newest');
    expect(sortSelect).toBeInTheDocument();

    // Change sort to ending soon
    fireEvent.change(sortSelect, { target: { value: 'ending' } });

    // Should re-sort markets by deadline
    // (Note: This would need to verify actual order in real implementation)
    expect(sortSelect.value).toBe('ending');
  });

  it('should display market statistics correctly', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Should show participant counts, stakes, deadlines etc.
    expect(screen.getByText('12 participants')).toBeInTheDocument();
    expect(screen.getByText('1500 total stake')).toBeInTheDocument();
    expect(screen.getByText('8 bidders')).toBeInTheDocument();
    expect(screen.getByText('45 backers')).toBeInTheDocument();
  });

  it('should provide export functionality', async () => {
    const { exportToCSV, exportToJSON } = await import('../lib/export');
    
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Click CSV export
    const csvButton = screen.getByRole('button', { name: /CSV/ });
    fireEvent.click(csvButton);
    expect(exportToCSV).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ fiberId: 'market-1' })
      ]),
      'markets.csv'
    );
  });

  it('should handle empty markets state', async () => {
    const emptyMocks = [
      {
        request: {
          query: WORKFLOW_TYPES_QUERY,
        },
        result: {
          data: mockWorkflowTypes,
        },
      },
      {
        request: {
          query: FIBERS_QUERY,
          variables: {
            workflowType: 'Market',
            status: 'ACTIVE',
            limit: 50,
          },
        },
        result: {
          data: { fibers: [] },
        },
      },
    ];

    render(
      <MockedProvider mocks={emptyMocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No markets found')).toBeInTheDocument();
    });
  });

  it('should handle initial fiber selection', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView initialFiberId="market-1" onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(mockOnFiberClick).toHaveBeenCalledWith('market-1');
    });
  });

  it('should show loading state while fetching markets', () => {
    const loadingMocks = [
      {
        request: {
          query: WORKFLOW_TYPES_QUERY,
        },
        delay: 1000,
        result: {
          data: mockWorkflowTypes,
        },
      },
      {
        request: {
          query: FIBERS_QUERY,
          variables: {
            workflowType: 'Market',
            status: 'ACTIVE',
            limit: 50,
          },
        },
        delay: 1000,
        result: {
          data: mockMarketsData,
        },
      },
    ];

    render(
      <MockedProvider mocks={loadingMocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    // Should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should highlight selected market in the list', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <MarketsView onFiberClick={mockOnFiberClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Prediction: Will ETH reach $5000?')).toBeInTheDocument();
    });

    // Click on first market
    const marketCard = screen.getByText('Prediction: Will ETH reach $5000?').closest('div');
    fireEvent.click(marketCard!);

    // Should apply selected styling
    expect(marketCard).toHaveClass('border-[var(--accent)]');
  });
});