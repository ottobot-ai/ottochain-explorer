import React from 'react';
import { MockedProvider } from '@apollo/client/testing';
import type { MockedResponse } from '@apollo/client/testing';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';

/**
 * Custom render function that wraps components with Apollo MockedProvider
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mocks?: MockedResponse[];
  addTypename?: boolean;
}

export function renderWithApollo(
  ui: React.ReactElement,
  { mocks = [], addTypename = false, ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={addTypename}>
        {children}
      </MockedProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Sample mock data for common types
 */
export const mockNetworkStats = {
  totalAgents: 150,
  activeAgents: 42,
  totalFibers: 1250,
  totalContracts: 89,
  completedContracts: 67,
  lastSnapshotOrdinal: 45678,
};

export const mockStatsTrends = {
  statsTrends: {
    oneHour: {
      agentsDelta: 3,
      fibersDelta: 12,
      contractsDelta: 2,
      avgSnapshotsPerHour: 120,
    },
    twentyFourHour: {
      agentsDelta: 15,
      fibersDelta: 45,
      contractsDelta: 8,
      successRatePct: 2.5,
    },
  },
};

export const mockAgent = {
  id: 'DAG1234567890abcdef',
  alias: 'TestAgent',
  reputation: 85,
  createdAt: '2026-02-01T00:00:00Z',
  lastActive: '2026-02-15T12:00:00Z',
  totalInteractions: 42,
};

export const mockFiber = {
  id: 'fiber-123',
  createdAt: '2026-02-01T00:00:00Z',
  currentState: 'active',
  definition: {
    states: ['pending', 'active', 'completed'],
    initial: 'pending',
    final: ['completed'],
  },
  ownerAddress: 'DAG1234567890abcdef',
};

export const mockContract = {
  id: 'contract-456',
  fiberId: 'fiber-123',
  status: 'completed',
  parties: ['DAG111', 'DAG222'],
  createdAt: '2026-02-01T00:00:00Z',
  completedAt: '2026-02-05T00:00:00Z',
};
