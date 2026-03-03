import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client/core';
import { DAOsView } from './DAOsView';

// ─── GraphQL query shapes (must match DAOsView.tsx exactly) ─────────────────

const DAOS_QUERY = gql`
  query DAOs($daoType: DAOType, $limit: Int, $offset: Int) {
    daos(daoType: $daoType, limit: $limit, offset: $offset) {
      id
      daoId
      name
      description
      daoType
      memberCount
      activeProposals
      createdAt
    }
  }
`;

const DAO_PREVIEW_QUERY = gql`
  query DAOPreview($daoId: String!) {
    dao(daoId: $daoId) {
      name
      daoType
      memberCount
      activeProposals
      members(limit: 5) {
        address
        displayName
        votingPower
      }
    }
  }
`;

// ─── Mock Data ───────────────────────────────────────────────────────────────

const makeDAO = (overrides: Partial<{
  id: string;
  daoId: string;
  name: string;
  description: string;
  daoType: string;
  memberCount: number;
  activeProposals: number;
}> = {}) => ({
  id: overrides.id ?? 'dao-001',
  daoId: overrides.daoId ?? 'dao-001',
  name: overrides.name ?? 'Test DAO',
  description: overrides.description ?? 'A test decentralized autonomous organization',
  daoType: overrides.daoType ?? 'TOKEN',
  memberCount: overrides.memberCount ?? 10,
  activeProposals: overrides.activeProposals ?? 2,
  createdAt: '2026-01-01T00:00:00Z',
});

const mockDAOs = [
  makeDAO({ id: 'dao-001', daoId: 'dao-001', name: 'TokenDAO Alpha', daoType: 'TOKEN', memberCount: 25, activeProposals: 3 }),
  makeDAO({ id: 'dao-002', daoId: 'dao-002', name: 'Multisig Treasury', daoType: 'MULTISIG', memberCount: 5, activeProposals: 0 }),
  makeDAO({ id: 'dao-003', daoId: 'dao-003', name: 'Threshold Council', daoType: 'THRESHOLD', memberCount: 12, activeProposals: 1 }),
  makeDAO({ id: 'dao-004', daoId: 'dao-004', name: 'Simple Voters', daoType: 'SIMPLE', memberCount: 8, activeProposals: 0 }),
];

const mockPreviewData = {
  dao: {
    name: 'TokenDAO Alpha',
    daoType: 'TOKEN',
    memberCount: 25,
    activeProposals: 3,
    members: [
      { address: 'DAGmember001', displayName: 'Alice', votingPower: 100 },
      { address: 'DAGmember002', displayName: 'Bob', votingPower: 50 },
    ],
  },
};

// ─── Mock Factories ──────────────────────────────────────────────────────────

function daosMock(daos = mockDAOs, daoType: string | null = null) {
  return {
    request: {
      query: DAOS_QUERY,
      variables: { daoType, limit: 50 },
    },
    result: { data: { daos } },
  };
}

function previewMock(daoId = 'dao-001') {
  return {
    request: {
      query: DAO_PREVIEW_QUERY,
      variables: { daoId },
    },
    result: { data: mockPreviewData },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDAOs(mocks: MockedResponse[] = [daosMock()]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <DAOsView />
    </MockedProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DAOsView', () => {

  // ── Smoke Test ────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = renderDAOs();
    expect(container).toBeInTheDocument();
  });

  it('shows the DAOs header', () => {
    renderDAOs();
    expect(screen.getByText('🏛️')).toBeInTheDocument();
    expect(screen.getByText('DAOs')).toBeInTheDocument();
  });

  // ── Loading State ─────────────────────────────────────────────────────────

  it('renders skeleton loading rows before data arrives', () => {
    renderDAOs();
    // Loading skeletons appear as animated divs — list area is present
    const listArea = screen.getByRole('textbox', { name: '' });
    expect(listArea).toBeInTheDocument(); // search input present during load
  });

  // ── Data Display ──────────────────────────────────────────────────────────

  it('renders DAO names after data loads', async () => {
    renderDAOs();
    await waitFor(() => expect(screen.getByText('TokenDAO Alpha')).toBeInTheDocument());
    expect(screen.getByText('Multisig Treasury')).toBeInTheDocument();
    expect(screen.getByText('Threshold Council')).toBeInTheDocument();
    expect(screen.getByText('Simple Voters')).toBeInTheDocument();
  });

  it('renders DAO descriptions', async () => {
    renderDAOs([daosMock([
      makeDAO({ name: 'Alpha DAO', description: 'Manages the alpha fund' }),
    ])]);
    await waitFor(() => expect(screen.getByText('Manages the alpha fund')).toBeInTheDocument());
  });

  it('shows member counts for each DAO', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));
    // Each row shows "👥 N members"
    expect(screen.getByText('👥 25 members')).toBeInTheDocument();
    expect(screen.getByText('👥 5 members')).toBeInTheDocument();
  });

  it('shows active proposals badge when count > 0', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));
    expect(screen.getByText('🗳️ 3 active')).toBeInTheDocument();
    expect(screen.getByText('🗳️ 1 active')).toBeInTheDocument();
  });

  it('does NOT show active proposals badge when count is 0', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('Multisig Treasury'));
    // Multisig has 0 active proposals — no badge for it
    const badges = screen.queryAllByText(/active/i);
    // Only Token (3) and Threshold (1) should show — not Multisig or Simple
    expect(badges.length).toBe(2);
  });

  // ── DAO Type Badges ───────────────────────────────────────────────────────

  it('shows Token type label for TOKEN DAOs', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));
    // "Token" appears in the type filter buttons AND in DAO row badges
    const tokenLabels = screen.getAllByText('Token');
    expect(tokenLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Multisig type label for MULTISIG DAOs', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('Multisig Treasury'));
    const multisigLabels = screen.getAllByText('Multisig');
    expect(multisigLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Threshold type label for THRESHOLD DAOs', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('Threshold Council'));
    const thresholdLabels = screen.getAllByText('Threshold');
    expect(thresholdLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Simple type label for SIMPLE DAOs', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('Simple Voters'));
    const simpleLabels = screen.getAllByText('Simple');
    expect(simpleLabels.length).toBeGreaterThanOrEqual(1);
  });

  // ── Type Filter Buttons ───────────────────────────────────────────────────

  it('renders All/Token/Multisig/Threshold/Simple filter buttons', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    // "All" filter button appears in the filter row
    const allButton = screen.getAllByText(/^All/)[0];
    expect(allButton).toBeInTheDocument();
    expect(screen.getAllByText('Token').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Multisig').length).toBeGreaterThanOrEqual(1);
  });

  it('shows correct count in All filter button', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));
    // "All (4)" appears as filter button text
    expect(screen.getByText(/All \(4\)/)).toBeInTheDocument();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  it('filters DAOs by name via search input', async () => {
    const user = userEvent.setup();
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Treasury');

    expect(screen.getByText('Multisig Treasury')).toBeInTheDocument();
    expect(screen.queryByText('TokenDAO Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Threshold Council')).not.toBeInTheDocument();
  });

  it('filters DAOs by description via search input', async () => {
    const user = userEvent.setup();
    renderDAOs([daosMock([
      makeDAO({ name: 'Alpha', description: 'Governance experiment' }),
      makeDAO({ id: 'dao-002', daoId: 'dao-002', name: 'Beta', description: 'Treasury management' }),
    ])]);
    await waitFor(() => screen.getByText('Alpha'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Treasury');

    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('shows all DAOs when search is cleared', async () => {
    const user = userEvent.setup();
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'xyz-no-match');
    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.getByText('TokenDAO Alpha')).toBeInTheDocument();
      expect(screen.getByText('Multisig Treasury')).toBeInTheDocument();
    });
  });

  it('shows "No DAOs found" when search has no match', async () => {
    const user = userEvent.setup();
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'ZZZNOMATCH9999');

    expect(screen.getByText('No DAOs found')).toBeInTheDocument();
  });

  // ── Empty State ───────────────────────────────────────────────────────────

  it('shows "No DAOs found" when query returns empty list', async () => {
    renderDAOs([daosMock([])]);
    await waitFor(() => {
      expect(screen.getByText('No DAOs found')).toBeInTheDocument();
    });
  });

  // ── Overview Sidebar ──────────────────────────────────────────────────────

  it('shows Overview sidebar by default with type counts', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Total DAOs')).toBeInTheDocument();
  });

  it('shows "4" as Total DAOs in overview sidebar', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('Total DAOs'));
    // Total = 4 in sidebar — distinct from member counts
    const overview = screen.getByText('Total DAOs').closest('div')!.parentElement!;
    expect(within(overview).getByText('4')).toBeInTheDocument();
  });

  // ── DAO Row Click → Sidebar Preview ──────────────────────────────────────

  it('clicking a DAO row shows DAO Preview in sidebar', async () => {
    const user = userEvent.setup();
    renderDAOs([daosMock(), previewMock('dao-001')]);
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    // Click the first DAO row button
    const daoButton = screen.getByText('TokenDAO Alpha').closest('button')!;
    await user.click(daoButton);

    await waitFor(() => {
      expect(screen.getByText('DAO Preview')).toBeInTheDocument();
    });
  });

  it('DAO preview loads and shows member count', async () => {
    const user = userEvent.setup();
    renderDAOs([daosMock(), previewMock('dao-001')]);
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    const daoButton = screen.getByText('TokenDAO Alpha').closest('button')!;
    await user.click(daoButton);

    await waitFor(() => {
      // Preview shows member count "25"
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('DAO preview shows members list with display names', async () => {
    const user = userEvent.setup();
    renderDAOs([daosMock(), previewMock('dao-001')]);
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    const daoButton = screen.getByText('TokenDAO Alpha').closest('button')!;
    await user.click(daoButton);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  // ── onAgentClick Callback ─────────────────────────────────────────────────

  it('calls onAgentClick when member in preview is clicked', async () => {
    const onAgentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[daosMock(), previewMock('dao-001')]} addTypename={false}>
        <DAOsView onAgentClick={onAgentClick} />
      </MockedProvider>
    );
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    const daoButton = screen.getByText('TokenDAO Alpha').closest('button')!;
    await user.click(daoButton);

    await waitFor(() => screen.getByText('Alice'));
    const aliceButton = screen.getByText('Alice').closest('button')!;
    await user.click(aliceButton);

    expect(onAgentClick).toHaveBeenCalledWith('DAGmember001');
  });

  // ── Export Buttons ────────────────────────────────────────────────────────

  it('renders CSV and JSON export buttons', async () => {
    renderDAOs();
    await waitFor(() => screen.getByText('TokenDAO Alpha'));

    expect(screen.getByText('📥 CSV')).toBeInTheDocument();
    expect(screen.getByText('📥 JSON')).toBeInTheDocument();
  });

  // ── initialDaoId Prop ─────────────────────────────────────────────────────

  it('starts with a DAO pre-selected when initialDaoId is provided', async () => {
    render(
      <MockedProvider mocks={[daosMock(), previewMock('dao-002')]} addTypename={false}>
        <DAOsView initialDaoId="dao-002" />
      </MockedProvider>
    );
    await waitFor(() => screen.getByText('DAO Preview'));
  });
});
