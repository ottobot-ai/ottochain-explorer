import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { CLUSTER_STATS } from '../lib/queries';
import { StatusBar } from './StatusBar';

const mockClusterStats = {
  clusterStats: {
    gl0Nodes: 3,
    ml0Nodes: 2,
    dl1Nodes: 5,
    tps: 12.5,
    epoch: 42,
  },
};

const clusterStatsMock = {
  request: { query: CLUSTER_STATS },
  result: { data: mockClusterStats },
};

describe('StatusBar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={12345} />
      </MockedProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it('displays snapshot ordinal', () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={99999} />
      </MockedProvider>
    );

    expect(screen.getByText(/#99,999/)).toBeInTheDocument();
  });

  it('shows GL0 node count after data loads', async () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={1000} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/3 nodes/)).toBeInTheDocument();
    });
  });

  it('shows ML0 node count after data loads', async () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={1000} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/2 nodes/)).toBeInTheDocument();
    });
  });

  it('shows DL1 node count after data loads', async () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={1000} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/5 nodes/)).toBeInTheDocument();
    });
  });

  it('shows TPS after data loads', async () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={1000} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('12.5')).toBeInTheDocument();
    });
  });

  it('shows default values before data loads', () => {
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <StatusBar snapshotOrdinal={500} />
      </MockedProvider>
    );

    // Default 0 nodes shown before data
    const zeroNodes = screen.getAllByText('0 nodes');
    expect(zeroNodes.length).toBeGreaterThan(0);
  });

  it('shows "..." when snapshot ordinal is null', () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={null} />
      </MockedProvider>
    );

    expect(screen.getByText('#...')).toBeInTheDocument();
  });

  it('shows node labels GL0, ML0, DL1', () => {
    render(
      <MockedProvider mocks={[clusterStatsMock]} addTypename={false}>
        <StatusBar snapshotOrdinal={1000} />
      </MockedProvider>
    );

    expect(screen.getByText(/GL0:/)).toBeInTheDocument();
    expect(screen.getByText(/ML0:/)).toBeInTheDocument();
    expect(screen.getByText(/DL1:/)).toBeInTheDocument();
  });
});
