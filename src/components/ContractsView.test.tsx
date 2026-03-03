import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ContractsView } from './ContractsView';
import { CONTRACTS_LIST, CONTRACT_DETAILS } from '../lib/queries';

// Mock the export functions
vi.mock('../lib/export', () => ({
  exportToCSV: vi.fn(),
  exportToJSON: vi.fn(),
}));

describe('ContractsView', () => {
  const mockOnAgentClick = vi.fn();
  
  const mockContractsData = {
    contracts: [
      {
        contractId: 'contract-1',
        state: 'ACTIVE',
        proposer: {
          address: 'DAG123456',
          displayName: 'Alice',
          reputation: 85,
        },
        counterparty: {
          address: 'DAG789012',
          displayName: 'Bob',
          reputation: 92,
        },
      },
      {
        contractId: 'contract-2',
        state: 'COMPLETED',
        proposer: {
          address: 'DAG345678',
          displayName: 'Charlie',
          reputation: 78,
        },
        counterparty: {
          address: 'DAG901234',
          displayName: 'Diana',
          reputation: 88,
        },
      },
      {
        contractId: 'contract-3',
        state: 'PROPOSED',
        proposer: {
          address: 'DAG567890',
          displayName: null,
          reputation: 65,
        },
        counterparty: {
          address: 'DAG234567',
          displayName: 'Eve',
          reputation: 95,
        },
      },
    ],
  };

  const mockContractDetail = {
    contract: {
      contractId: 'contract-1',
      state: 'ACTIVE',
      proposer: {
        address: 'DAG123456',
        displayName: 'Alice',
        reputation: 85,
      },
      counterparty: {
        address: 'DAG789012',
        displayName: 'Bob',
        reputation: 92,
      },
      terms: {
        description: 'Test contract terms',
        payment: '1000 DAG',
        deadline: '2026-04-01',
      },
      proposedAt: '2026-03-01T10:00:00Z',
      acceptedAt: '2026-03-01T11:00:00Z',
      completedAt: null,
      rejectedAt: null,
      attestations: [],
      dispute: null,
    },
  };

  const mocks = [
    {
      request: {
        query: CONTRACTS_LIST,
        variables: { limit: 50, state: null },
      },
      result: {
        data: mockContractsData,
      },
    },
    {
      request: {
        query: CONTRACT_DETAILS,
        variables: { contractId: 'contract-1' },
      },
      result: {
        data: mockContractDetail,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render contracts page with status filtering', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    // Should show the contracts header
    expect(screen.getByText('📄')).toBeInTheDocument();
    expect(screen.getByText('Contracts')).toBeInTheDocument();

    // Should show status filter buttons
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PROPOSED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ACTIVE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'COMPLETED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REJECTED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DISPUTED' })).toBeInTheDocument();

    // Wait for contracts to load
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Should display contract cards with proper information
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should filter contracts by status', async () => {
    const filteredMocks = [
      ...mocks,
      {
        request: {
          query: CONTRACTS_LIST,
          variables: { limit: 50, state: 'ACTIVE' },
        },
        result: {
          data: {
            contracts: [mockContractsData.contracts[0]], // Only ACTIVE contract
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={filteredMocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click ACTIVE filter
    const activeButton = screen.getByRole('button', { name: 'ACTIVE' });
    fireEvent.click(activeButton);

    // Should apply active styling to filter button
    expect(activeButton).toHaveClass('bg-[var(--accent)]');

    // Should still show Alice (ACTIVE contract)
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should display contract state with correct icons and colors', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Should show correct state icons
    expect(screen.getByText('🔄 ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('✅ COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('📝 PROPOSED')).toBeInTheDocument();
  });

  it('should handle agent name fallbacks for anonymous agents', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Should show "Agent" for null displayName
    // (contract-3 has proposer with null displayName)
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('should show contract detail view when contract is selected', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Initially should show empty state
    expect(screen.getByText('Select a contract to view details')).toBeInTheDocument();

    // Click on first contract
    const contractButton = screen.getByText('Alice').closest('button');
    expect(contractButton).toBeInTheDocument();
    fireEvent.click(contractButton!);

    // Should load contract details
    await waitFor(() => {
      expect(screen.getByText('PROPOSER')).toBeInTheDocument();
    });

    expect(screen.getByText('COUNTERPARTY')).toBeInTheDocument();
    expect(screen.getByText('📋 Terms')).toBeInTheDocument();
    expect(screen.getByText('📅 Timeline')).toBeInTheDocument();
  });

  it('should handle contract detail click to open agent profiles', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Select contract
    const contractButton = screen.getByText('Alice').closest('button');
    fireEvent.click(contractButton!);

    // Wait for detail view
    await waitFor(() => {
      expect(screen.getByText('PROPOSER')).toBeInTheDocument();
    });

    // Click on proposer
    const proposerCard = screen.getByText('PROPOSER').closest('div');
    expect(proposerCard).toBeInTheDocument();
    fireEvent.click(proposerCard!);

    // Should call onAgentClick with proposer address
    expect(mockOnAgentClick).toHaveBeenCalledWith('DAG123456');
  });

  it('should display contract terms in JSON format', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Select contract
    const contractButton = screen.getByText('Alice').closest('button');
    fireEvent.click(contractButton!);

    // Wait for detail view
    await waitFor(() => {
      expect(screen.getByText('📋 Terms')).toBeInTheDocument();
    });

    // Should show formatted JSON terms
    expect(screen.getByText('"Test contract terms"')).toBeInTheDocument();
    expect(screen.getByText('"1000 DAG"')).toBeInTheDocument();
  });

  it('should display timeline with correct timestamps', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Select contract
    const contractButton = screen.getByText('Alice').closest('button');
    fireEvent.click(contractButton!);

    // Wait for detail view
    await waitFor(() => {
      expect(screen.getByText('📅 Timeline')).toBeInTheDocument();
    });

    // Should show timeline events
    expect(screen.getByText('Proposed:')).toBeInTheDocument();
    expect(screen.getByText('Accepted:')).toBeInTheDocument();
    
    // Should show formatted dates
    expect(screen.getByText('3/1/2026, 4:00:00 AM')).toBeInTheDocument();
    expect(screen.getByText('3/1/2026, 5:00:00 AM')).toBeInTheDocument();
  });

  it('should provide CSV and JSON export functionality', async () => {
    const { exportToCSV, exportToJSON } = await import('../lib/export');
    
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click CSV export
    const csvButton = screen.getByRole('button', { name: '📥 CSV' });
    fireEvent.click(csvButton);
    expect(exportToCSV).toHaveBeenCalledWith(mockContractsData.contracts, 'contracts.csv');

    // Click JSON export
    const jsonButton = screen.getByRole('button', { name: '📥 JSON' });
    fireEvent.click(jsonButton);
    expect(exportToJSON).toHaveBeenCalledWith(mockContractsData.contracts, 'contracts.json');
  });

  it('should show loading state while fetching contracts', () => {
    const loadingMocks = [
      {
        request: {
          query: CONTRACTS_LIST,
          variables: { limit: 50, state: null },
        },
        delay: 1000, // Simulate slow network
        result: {
          data: mockContractsData,
        },
      },
    ];

    render(
      <MockedProvider mocks={loadingMocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    // Should show loading skeleton
    expect(screen.getAllByText(/bg-\[var\(--bg-elevated\)\]/)).toBeDefined();
  });

  it('should handle empty contracts state', async () => {
    const emptyMocks = [
      {
        request: {
          query: CONTRACTS_LIST,
          variables: { limit: 50, state: null },
        },
        result: {
          data: { contracts: [] },
        },
      },
    ];

    render(
      <MockedProvider mocks={emptyMocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No contracts found')).toBeInTheDocument();
    });
  });

  it('should highlight selected contract in the list', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractsView onAgentClick={mockOnAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click on first contract
    const contractButton = screen.getByText('Alice').closest('button');
    fireEvent.click(contractButton!);

    // Should apply selected styling
    expect(contractButton).toHaveClass('bg-[var(--accent)]');
    expect(contractButton).toHaveClass('border-[var(--accent)]');
  });
});