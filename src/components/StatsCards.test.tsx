import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { STATS_TRENDS } from '../lib/queries';
import { StatsCards } from './StatsCards';
import { mockNetworkStats, mockStatsTrends } from '../test/mocks';

const statsTrendsMock = {
  request: { query: STATS_TRENDS },
  result: { data: mockStatsTrends },
};

describe('StatsCards', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={undefined} loading={true} />
      </MockedProvider>
    );
    expect(container).toBeInTheDocument();
  });

  it('shows total fibers from stats', async () => {
    render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={mockNetworkStats} loading={false} />
      </MockedProvider>
    );

    // mockNetworkStats.totalFibers = 1250
    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });

  it('shows total agents from stats', async () => {
    render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={mockNetworkStats} loading={false} />
      </MockedProvider>
    );

    // mockNetworkStats.totalAgents = 150
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('shows TOTAL FIBERS label', () => {
    render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={mockNetworkStats} loading={false} />
      </MockedProvider>
    );

    expect(screen.getByText('TOTAL FIBERS')).toBeInTheDocument();
  });

  it('shows AGENTS label', () => {
    render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={mockNetworkStats} loading={false} />
      </MockedProvider>
    );

    expect(screen.getByText('AGENTS')).toBeInTheDocument();
  });

  it('renders without stats (loading state)', () => {
    render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={undefined} loading={true} />
      </MockedProvider>
    );

    // Labels should still be present even in loading state
    expect(screen.getByText('TOTAL FIBERS')).toBeInTheDocument();
  });

  it('shows sparklines for trend visualization', () => {
    const { container } = render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={mockNetworkStats} loading={false} />
      </MockedProvider>
    );

    // StatsCards uses Sparkline components which render SVGs
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders delta info after trends load', async () => {
    render(
      <MockedProvider mocks={[statsTrendsMock]} addTypename={false}>
        <StatsCards stats={mockNetworkStats} loading={false} />
      </MockedProvider>
    );

    // mockStatsTrends.statsTrends.oneHour.fibersDelta = 12
    await waitFor(() => {
      expect(screen.getByText(/\+12 \(1h\)/)).toBeInTheDocument();
    });
  });
});
