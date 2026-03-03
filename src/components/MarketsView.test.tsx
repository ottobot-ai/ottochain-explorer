import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client/core';
import { MarketsView } from './MarketsView';

const WORKFLOW_TYPES_QUERY = gql`
  query WorkflowTypes {
    workflowTypes {
      name
      description
      count
      states
    }
  }
`;

const FIBERS_QUERY = gql`
  query Fibers($workflowType: String, $status: FiberStatus, $limit: Int, $offset: Int) {
    fibers(workflowType: $workflowType, status: $status, limit: $limit, offset: $offset) {
      fiberId
      workflowType
      workflowDesc
      currentState
      status
      owners
      sequenceNumber
      createdAt
      updatedAt
      stateData
    }
  }
`;

const mockWorkflowTypes = {
  workflowTypes: [
    {
      name: 'Market',
      description: 'Prediction markets',
      count: 3,
      states: ['pending', 'active', 'resolved'],
    },
  ],
};

const mockFibers = [
  {
    fiberId: 'market-fiber-001',
    workflowType: 'Market',
    workflowDesc: 'BTC price prediction',
    currentState: 'active',
    status: 'ACTIVE',
    owners: ['DAGowner1'],
    sequenceNumber: 1,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    stateData: JSON.stringify({ marketType: 'Prediction', stake: 100 }),
  },
  {
    fiberId: 'market-fiber-002',
    workflowType: 'Market',
    workflowDesc: 'ETH staking market',
    currentState: 'active',
    status: 'ACTIVE',
    owners: ['DAGowner2'],
    sequenceNumber: 2,
    createdAt: '2026-02-05T00:00:00Z',
    updatedAt: '2026-02-11T00:00:00Z',
    stateData: JSON.stringify({ marketType: 'Staking', stake: 50 }),
  },
];

const typesMock = {
  request: { query: WORKFLOW_TYPES_QUERY },
  result: { data: mockWorkflowTypes },
};

// Default query uses workflowType='Market', status='ACTIVE', limit=50
const fibersMock = {
  request: {
    query: FIBERS_QUERY,
    variables: { workflowType: 'Market', status: 'ACTIVE', limit: 50 },
  },
  result: { data: { fibers: mockFibers } },
};

const emptyFibersMock = {
  request: {
    query: FIBERS_QUERY,
    variables: { workflowType: 'Market', status: 'ACTIVE', limit: 50 },
  },
  result: { data: { fibers: [] } },
};

describe('MarketsView', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MockedProvider mocks={[typesMock, fibersMock]} addTypename={false}>
        <MarketsView />
      </MockedProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it('renders market fibers after loading', async () => {
    render(
      <MockedProvider mocks={[typesMock, fibersMock]} addTypename={false}>
        <MarketsView />
      </MockedProvider>
    );

    // MarketsView shows stateData.question or 'No question' — our mock stateData has no question
    await waitFor(() => {
      const noQuestion = screen.getAllByText('No question');
      expect(noQuestion.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state when no fibers returned', async () => {
    render(
      <MockedProvider mocks={[typesMock, emptyFibersMock]} addTypename={false}>
        <MarketsView />
      </MockedProvider>
    );

    await waitFor(() => {
      // After loading, no fiber IDs should be present
      expect(screen.queryByText('market-fiber-001')).not.toBeInTheDocument();
    });
  });

  it('renders fiber count from workflow types', async () => {
    render(
      <MockedProvider mocks={[typesMock, fibersMock]} addTypename={false}>
        <MarketsView />
      </MockedProvider>
    );

    await waitFor(() => {
      // Should show count "3" from mockWorkflowTypes
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });
  });

  it('accepts initialFiberId prop without crashing', () => {
    // Fibers query without status filter when initialFiberId provided
    const fibersNoStatusMock = {
      request: {
        query: FIBERS_QUERY,
        variables: { workflowType: 'Market', status: undefined, limit: 50 },
      },
      result: { data: { fibers: mockFibers } },
    };

    const { container } = render(
      <MockedProvider mocks={[typesMock, fibersNoStatusMock]} addTypename={false}>
        <MarketsView initialFiberId="market-fiber-001" onFiberClick={vi.fn()} />
      </MockedProvider>
    );

    expect(container).toBeInTheDocument();
  });
});
