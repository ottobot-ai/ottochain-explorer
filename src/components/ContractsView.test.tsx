import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client/core';
import { ContractsView } from './ContractsView';

// ─── GraphQL query shapes (must match ContractsView.tsx exactly) ────────────

const CONTRACTS_LIST_QUERY = gql`
  query ContractsList($limit: Int, $state: ContractState) {
    contracts(limit: $limit, state: $state) {
      id
      contractId
      proposer {
        address
        displayName
      }
      counterparty {
        address
        displayName
      }
      state
      proposedAt
      acceptedAt
      completedAt
    }
  }
`;

const CONTRACT_DETAILS_QUERY = gql`
  query ContractDetails($contractId: String!) {
    contract(contractId: $contractId) {
      id
      contractId
      proposer {
        address
        displayName
        reputation
      }
      counterparty {
        address
        displayName
        reputation
      }
      state
      terms
      proposedAt
      acceptedAt
      completedAt
      rejectedAt
      attestations {
        id
        type
        issuer {
          address
          displayName
        }
        delta
        reason
        createdAt
      }
      dispute {
        id
        status
        initiator {
          address
          displayName
        }
        reason
        resolution
        createdAt
        resolvedAt
      }
    }
  }
`;

// ─── Mock Data ───────────────────────────────────────────────────────────────

const makeContract = (overrides: Partial<{
  contractId: string;
  state: string;
  proposerName: string;
  counterpartyName: string;
}> = {}) => ({
  id: overrides.contractId ?? 'contract-001',
  contractId: overrides.contractId ?? 'contract-001',
  proposer: {
    address: 'DAGproposer1234',
    displayName: overrides.proposerName ?? 'AliceAgent',
  },
  counterparty: {
    address: 'DAGcounterparty5678',
    displayName: overrides.counterpartyName ?? 'BobAgent',
  },
  state: overrides.state ?? 'ACTIVE',
  proposedAt: '2026-02-01T10:00:00Z',
  acceptedAt: '2026-02-01T11:00:00Z',
  completedAt: null,
});

const mockContracts = [
  makeContract({ contractId: 'contract-001', state: 'ACTIVE', proposerName: 'AliceAgent' }),
  makeContract({ contractId: 'contract-002', state: 'PROPOSED', proposerName: 'CarolAgent' }),
  makeContract({ contractId: 'contract-003', state: 'COMPLETED', proposerName: 'DaveAgent' }),
];

const mockContractDetail = {
  id: 'contract-001',
  contractId: 'contract-001',
  proposer: { address: 'DAGproposer1234', displayName: 'AliceAgent', reputation: 92 },
  counterparty: { address: 'DAGcounterparty5678', displayName: 'BobAgent', reputation: 78 },
  state: 'ACTIVE',
  terms: { duration: '30d', payment: 500, description: 'Data analysis service' },
  proposedAt: '2026-02-01T10:00:00Z',
  acceptedAt: '2026-02-01T11:00:00Z',
  completedAt: null,
  rejectedAt: null,
  attestations: [],
  dispute: null,
};

const mockContractWithAttestation = {
  ...mockContractDetail,
  contractId: 'contract-att-001',
  id: 'contract-att-001',
  attestations: [
    {
      id: 'att-1',
      type: 'COMPLETION',
      issuer: { address: 'DAGissuer999', displayName: 'Auditor' },
      delta: 10,
      reason: 'Delivered on time',
      createdAt: '2026-02-10T09:00:00Z',
    },
    {
      id: 'att-2',
      type: 'VOUCH',
      issuer: null,
      delta: 5,
      reason: null,
      createdAt: '2026-02-11T09:00:00Z',
    },
  ],
};

const mockContractWithDispute = {
  ...mockContractDetail,
  contractId: 'contract-disp-001',
  id: 'contract-disp-001',
  state: 'DISPUTED',
  dispute: {
    id: 'disp-1',
    status: 'OPEN',
    initiator: { address: 'DAGproposer1234', displayName: 'AliceAgent' },
    reason: 'Service not delivered as agreed',
    resolution: null,
    createdAt: '2026-02-05T14:00:00Z',
    resolvedAt: null,
  },
};

const mockContractWithResolution = {
  ...mockContractDetail,
  contractId: 'contract-res-001',
  id: 'contract-res-001',
  state: 'DISPUTED',
  dispute: {
    id: 'disp-2',
    status: 'RESOLVED',
    initiator: { address: 'DAGproposer1234', displayName: 'AliceAgent' },
    reason: 'Partial delivery',
    resolution: 'Partial refund issued',
    createdAt: '2026-02-05T14:00:00Z',
    resolvedAt: '2026-02-08T16:00:00Z',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Default list mock: no state filter */
const listMock = (contracts = mockContracts, state: null | string = null) => ({
  request: {
    query: CONTRACTS_LIST_QUERY,
    variables: { limit: 50, state },
  },
  result: { data: { contracts } },
});

const detailMock = (contract = mockContractDetail) => ({
  request: {
    query: CONTRACT_DETAILS_QUERY,
    variables: { contractId: contract.contractId },
  },
  result: { data: { contract } },
});

function renderContracts(
  mocks: object[],
  props: { onAgentClick?: (addr: string) => void } = {}
) {
  const onAgentClick = props.onAgentClick ?? vi.fn();
  return {
    ...render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <ContractsView onAgentClick={onAgentClick} />
      </MockedProvider>
    ),
    onAgentClick,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ContractsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Render & Loading ──────────────────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = renderContracts([listMock()]);
    expect(container).toBeInTheDocument();
  });

  it('shows skeleton loading state initially', () => {
    const { container } = renderContracts([listMock()]);
    // Pulse skeleton divs appear while loading
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders the Contracts heading', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByText(/Contracts/)).toBeInTheDocument();
    });
  });

  // ── Contract List ─────────────────────────────────────────────────────────

  it('displays agent names from the contract list', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByText('AliceAgent')).toBeInTheDocument();
    });
  });

  it('shows all three mock contracts', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByText('AliceAgent')).toBeInTheDocument();
      expect(screen.getByText('CarolAgent')).toBeInTheDocument();
      expect(screen.getByText('DaveAgent')).toBeInTheDocument();
    });
  });

  it('shows empty state message when no contracts returned', async () => {
    renderContracts([listMock([])]);
    await waitFor(() => {
      expect(screen.getByText(/No contracts found/i)).toBeInTheDocument();
    });
  });

  // ── State Filter ──────────────────────────────────────────────────────────

  it('renders all state filter buttons', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /PROPOSED/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ACTIVE/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /COMPLETED/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /REJECTED/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /DISPUTED/i })).toBeInTheDocument();
    });
  });

  it('filters to PROPOSED state on button click', async () => {
    const proposedListMock = listMock(
      [makeContract({ contractId: 'contract-002', state: 'PROPOSED', proposerName: 'CarolAgent' })],
      'PROPOSED'
    );
    const user = userEvent.setup();
    renderContracts([listMock(), proposedListMock]);

    // Find the exact filter pill button (text is exactly "PROPOSED", not a badge inside a row)
    await waitFor(() => {
      const filterBtn = screen.getAllByRole('button').find(
        (b) => b.textContent?.trim() === 'PROPOSED' && b.className.includes('rounded-full')
      );
      expect(filterBtn).toBeDefined();
    });
    const filterBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.trim() === 'PROPOSED' && b.className.includes('rounded-full')
    )!;
    await user.click(filterBtn);

    await waitFor(() => {
      expect(screen.queryByText('AliceAgent')).not.toBeInTheDocument();
      expect(screen.getByText('CarolAgent')).toBeInTheDocument();
    });
  });

  it('resets filter to All state on All button click', async () => {
    const proposedListMock = listMock(
      [makeContract({ contractId: 'contract-002', state: 'PROPOSED', proposerName: 'CarolAgent' })],
      'PROPOSED'
    );
    const user = userEvent.setup();
    renderContracts([listMock(), proposedListMock, listMock()]);

    await waitFor(() => {
      const filterBtn = screen.getAllByRole('button').find(
        (b) => b.textContent?.trim() === 'PROPOSED' && b.className.includes('rounded-full')
      );
      expect(filterBtn).toBeDefined();
    });
    const filterBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.trim() === 'PROPOSED' && b.className.includes('rounded-full')
    )!;
    await user.click(filterBtn);

    await waitFor(() => screen.getByRole('button', { name: /All/i }));
    await user.click(screen.getByRole('button', { name: /All/i }));

    await waitFor(() => {
      expect(screen.getByText('AliceAgent')).toBeInTheDocument();
    });
  });

  // ── Export Buttons ────────────────────────────────────────────────────────

  it('renders CSV export button', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument();
    });
  });

  it('renders JSON export button', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /JSON/i })).toBeInTheDocument();
    });
  });

  // ── Empty Detail Panel ────────────────────────────────────────────────────

  it('shows placeholder when no contract is selected', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      expect(screen.getByText(/Select a contract to view details/i)).toBeInTheDocument();
    });
  });

  // ── Contract Detail ───────────────────────────────────────────────────────

  it('shows detail panel after selecting a contract', async () => {
    const user = userEvent.setup();
    renderContracts([listMock(), detailMock()]);

    await waitFor(() => screen.getByText('AliceAgent'));
    // Click the contract-001 list item (AliceAgent row)
    const listItems = screen.getAllByText('AliceAgent');
    await user.click(listItems[0].closest('button')!);

    await waitFor(() => {
      // Detail shows reputation
      expect(screen.getByText(/92/)).toBeInTheDocument();
    });
  });

  it('shows PROPOSER label in detail view', async () => {
    const user = userEvent.setup();
    renderContracts([listMock(), detailMock()]);

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('PROPOSER')).toBeInTheDocument();
      expect(screen.getByText('COUNTERPARTY')).toBeInTheDocument();
    });
  });

  it('renders terms in the detail view', async () => {
    const user = userEvent.setup();
    renderContracts([listMock(), detailMock()]);

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/Terms/i)).toBeInTheDocument();
    });
  });

  it('shows the proposed date in the timeline', async () => {
    const user = userEvent.setup();
    renderContracts([listMock(), detailMock()]);

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => {
      // "Proposed:" label in timeline (exact text)
      expect(screen.getByText('Proposed:')).toBeInTheDocument();
    });
  });

  it('shows the accepted date when contract is accepted', async () => {
    const user = userEvent.setup();
    renderContracts([listMock(), detailMock()]);

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
    });
  });

  it('shows contract-not-found message when detail returns null', async () => {
    const nullDetailMock = {
      request: {
        query: CONTRACT_DETAILS_QUERY,
        variables: { contractId: 'contract-001' },
      },
      result: { data: { contract: null } },
    };
    const user = userEvent.setup();
    renderContracts([listMock(), nullDetailMock]);

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/Contract not found/i)).toBeInTheDocument();
    });
  });

  // ── onAgentClick Callback ─────────────────────────────────────────────────

  it('calls onAgentClick with proposer address on proposer click', async () => {
    const onAgentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[listMock(), detailMock()]} addTypename={false}>
        <ContractsView onAgentClick={onAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => screen.getByText('PROPOSER'));
    // Click proposer card in detail
    await user.click(screen.getByText('PROPOSER').closest('div')!.parentElement!);

    expect(onAgentClick).toHaveBeenCalledWith('DAGproposer1234');
  });

  it('calls onAgentClick with counterparty address on counterparty click', async () => {
    const onAgentClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[listMock(), detailMock()]} addTypename={false}>
        <ContractsView onAgentClick={onAgentClick} />
      </MockedProvider>
    );

    await waitFor(() => screen.getByText('AliceAgent'));
    await user.click(screen.getAllByText('AliceAgent')[0].closest('button')!);

    await waitFor(() => screen.getByText('COUNTERPARTY'));
    await user.click(screen.getByText('COUNTERPARTY').closest('div')!.parentElement!);

    expect(onAgentClick).toHaveBeenCalledWith('DAGcounterparty5678');
  });

  // ── Attestations ──────────────────────────────────────────────────────────

  /**
   * Click the first (and only) contract row in the list.
   * We identify it by the row-button class pattern since CopyAddress truncates IDs.
   */
  async function clickFirstListRow(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      const rowBtn = screen.getAllByRole('button').find(
        (b) => b.className.includes('w-full') && b.className.includes('text-left') && b.className.includes('p-3')
      );
      expect(rowBtn).toBeDefined();
    });
    const rowBtn = screen.getAllByRole('button').find(
      (b) => b.className.includes('w-full') && b.className.includes('text-left') && b.className.includes('p-3')
    )!;
    await user.click(rowBtn);
  }

  it('renders attestation section when attestations exist', async () => {
    const attListMock = listMock([
      makeContract({ contractId: 'contract-att-001', state: 'COMPLETED' }),
    ]);
    const attDetailMock = detailMock(mockContractWithAttestation);
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[attListMock, attDetailMock]} addTypename={false}>
        <ContractsView onAgentClick={vi.fn()} />
      </MockedProvider>
    );

    await clickFirstListRow(user);

    await waitFor(() => {
      expect(screen.getByText(/Attestations/i)).toBeInTheDocument();
    });
  });

  it('shows COMPLETION attestation type badge', async () => {
    const attListMock = listMock([
      makeContract({ contractId: 'contract-att-001', state: 'COMPLETED' }),
    ]);
    const attDetailMock = detailMock(mockContractWithAttestation);
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[attListMock, attDetailMock]} addTypename={false}>
        <ContractsView onAgentClick={vi.fn()} />
      </MockedProvider>
    );

    await clickFirstListRow(user);

    await waitFor(() => {
      expect(screen.getByText('COMPLETION')).toBeInTheDocument();
    });
  });

  it('shows attestation rep delta', async () => {
    const attListMock = listMock([
      makeContract({ contractId: 'contract-att-001', state: 'COMPLETED' }),
    ]);
    const attDetailMock = detailMock(mockContractWithAttestation);
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[attListMock, attDetailMock]} addTypename={false}>
        <ContractsView onAgentClick={vi.fn()} />
      </MockedProvider>
    );

    await clickFirstListRow(user);

    await waitFor(() => {
      expect(screen.getByText('+10 rep')).toBeInTheDocument();
    });
  });

  // ── Dispute Section ───────────────────────────────────────────────────────

  it('renders dispute section for DISPUTED contracts', async () => {
    const dispListMock = listMock([
      makeContract({ contractId: 'contract-disp-001', state: 'DISPUTED' }),
    ]);
    const dispDetailMock = detailMock(mockContractWithDispute);
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[dispListMock, dispDetailMock]} addTypename={false}>
        <ContractsView onAgentClick={vi.fn()} />
      </MockedProvider>
    );

    await clickFirstListRow(user);

    await waitFor(() => {
      // "⚠️ Dispute" heading in detail panel
      expect(screen.getByText('⚠️ Dispute')).toBeInTheDocument();
    });
  });

  it('shows dispute reason text', async () => {
    const dispListMock = listMock([
      makeContract({ contractId: 'contract-disp-001', state: 'DISPUTED' }),
    ]);
    const dispDetailMock = detailMock(mockContractWithDispute);
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[dispListMock, dispDetailMock]} addTypename={false}>
        <ContractsView onAgentClick={vi.fn()} />
      </MockedProvider>
    );

    await clickFirstListRow(user);

    await waitFor(() => {
      expect(screen.getByText(/Service not delivered as agreed/i)).toBeInTheDocument();
    });
  });

  it('shows dispute resolution when resolved', async () => {
    const resListMock = listMock([
      makeContract({ contractId: 'contract-res-001', state: 'DISPUTED' }),
    ]);
    const resDetailMock = detailMock(mockContractWithResolution);
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[resListMock, resDetailMock]} addTypename={false}>
        <ContractsView onAgentClick={vi.fn()} />
      </MockedProvider>
    );

    await clickFirstListRow(user);

    await waitFor(() => {
      expect(screen.getByText(/Partial refund issued/i)).toBeInTheDocument();
    });
  });

  // ── State Icons & Colors ──────────────────────────────────────────────────

  it('shows ACTIVE state badge in contract list', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      const activeBadges = screen.getAllByText(/ACTIVE/i);
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows COMPLETED state badge in contract list', async () => {
    renderContracts([listMock()]);
    await waitFor(() => {
      const completedBadges = screen.getAllByText(/COMPLETED/i);
      // COMPLETED appears as filter button + badge in list
      expect(completedBadges.length).toBeGreaterThanOrEqual(1);
    });
  });
});
