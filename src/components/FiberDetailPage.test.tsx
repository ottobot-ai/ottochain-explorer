import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client/core';
import { FiberDetailPage } from './FiberDetailPage';

const GET_FIBER = gql`
  query GetFiber($fiberId: String!) {
    fiber(fiberId: $fiberId) {
      fiberId
      workflowType
      currentState
      stateData
      definition
      owners
      sequenceNumber
      createdOrdinal
      updatedOrdinal
      createdGl0Ordinal
      updatedGl0Ordinal
      createdAt
      updatedAt
      transitions(limit: 50) {
        id
        eventName
        fromState
        toState
        success
        gasUsed
        payload
        snapshotOrdinal
        gl0Ordinal
        createdAt
      }
    }
  }
`;

const mockFiberId = 'fiber-abc-123';

const mockFiberData = {
  fiber: {
    fiberId: mockFiberId,
    workflowType: 'Market',
    currentState: 'active',
    stateData: JSON.stringify({ marketType: 'Prediction', stake: 100 }),
    definition: JSON.stringify({
      states: ['pending', 'active', 'resolved'],
      initial: 'pending',
      final: ['resolved'],
    }),
    owners: ['DAGowner1234567890'],
    sequenceNumber: 5,
    createdOrdinal: 1000,
    updatedOrdinal: 1050,
    createdGl0Ordinal: 1001,
    updatedGl0Ordinal: null,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
    transitions: [
      {
        id: 1,
        eventName: 'activate',
        fromState: 'pending',
        toState: 'active',
        success: true,
        gasUsed: 10,
        payload: null,
        snapshotOrdinal: 1010,
        gl0Ordinal: 1011,
        createdAt: '2026-02-02T00:00:00Z',
      },
    ],
  },
};

const successMock = {
  request: {
    query: GET_FIBER,
    variables: { fiberId: mockFiberId },
  },
  result: { data: mockFiberData },
};

const errorMock = {
  request: {
    query: GET_FIBER,
    variables: { fiberId: 'bad-id' },
  },
  error: new Error('Fiber not found'),
};

const notFoundMock = {
  request: {
    query: GET_FIBER,
    variables: { fiberId: 'missing-id' },
  },
  result: { data: { fiber: null } },
};

describe('FiberDetailPage', () => {
  it('shows loading state initially', () => {
    render(
      <MockedProvider mocks={[successMock]} addTypename={false}>
        <FiberDetailPage fiberId={mockFiberId} onClose={vi.fn()} />
      </MockedProvider>
    );

    expect(screen.getByText(/loading fiber/i)).toBeInTheDocument();
  });

  it('renders fiber details after loading', async () => {
    render(
      <MockedProvider mocks={[successMock]} addTypename={false}>
        <FiberDetailPage fiberId={mockFiberId} onClose={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(mockFiberId)).toBeInTheDocument();
    });

    expect(screen.getByText('Market')).toBeInTheDocument();
  });

  it('shows error state when fiber not found (null)', async () => {
    render(
      <MockedProvider mocks={[notFoundMock]} addTypename={false}>
        <FiberDetailPage fiberId="missing-id" onClose={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/fiber not found/i)).toBeInTheDocument();
    });
  });

  it('shows error state on query error', async () => {
    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <FiberDetailPage fiberId="bad-id" onClose={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/fiber not found/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when close button clicked after loading', async () => {
    const onClose = vi.fn();
    render(
      <MockedProvider mocks={[notFoundMock]} addTypename={false}>
        <FiberDetailPage fiberId="missing-id" onClose={onClose} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/fiber not found/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders tabs after loading', async () => {
    render(
      <MockedProvider mocks={[successMock]} addTypename={false}>
        <FiberDetailPage fiberId={mockFiberId} onClose={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(mockFiberId)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transitions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /definition/i })).toBeInTheDocument();
  });

  it('shows ordinal information after loading', async () => {
    render(
      <MockedProvider mocks={[successMock]} addTypename={false}>
        <FiberDetailPage fiberId={mockFiberId} onClose={vi.fn()} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(mockFiberId)).toBeInTheDocument();
    });

    // Should show ML0 ordinal
    expect(screen.getByText(/ML0 #1000/)).toBeInTheDocument();
  });
});
