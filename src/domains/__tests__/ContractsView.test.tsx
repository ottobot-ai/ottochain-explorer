/**
 * ContractsView Component Tests (TDD - SHOULD FAIL)
 * 
 * Tests for contract visualization and interaction components.
 * These tests define the expected UI behavior before implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContractsView } from '../ContractsView';
import type { Contract, ContractState } from '@ottochain/sdk/apps/contracts';

// Mock the contract client
const mockContractClient = {
  getContract: vi.fn(),
  getContractsByAgent: vi.fn(),
  proposeContract: vi.fn(),
  acceptContract: vi.fn(),
  completeContract: vi.fn(),
  rejectContract: vi.fn(),
  disputeContract: vi.fn(),
  waitForContractState: vi.fn(),
};

// Mock the context provider
vi.mock('../../context/OttoChainContext', () => ({
  useOttoChain: () => ({
    contractClient: mockContractClient,
    currentAccount: '0x1234567890123456789012345678901234567890',
  }),
}));

describe('ContractsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract Display', () => {
    it('should render contract details when contractId is provided', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' },
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'ACTIVE' as ContractState,
        terms: {
          fields: {
            title: { stringValue: 'Development Contract' },
            payment: { numberValue: 1000 },
            deadline: { stringValue: '2026-03-01T00:00:00Z' }
          }
        },
        proposedAt: { seconds: BigInt(1640995200), nanos: 0 },
        acceptedAt: { seconds: BigInt(1641000600), nanos: 0 },
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" />);

      // Wait for contract data to load
      await waitFor(() => {
        expect(screen.getByText('Development Contract')).toBeInTheDocument();
      });

      // Check contract details are displayed
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
      expect(screen.getByText(/March 1, 2026/)).toBeInTheDocument();
      
      // Check addresses are displayed (truncated)
      expect(screen.getByText(/0x1234...7890/)).toBeInTheDocument(); // Proposer
      expect(screen.getByText(/0x0987...4321/)).toBeInTheDocument(); // Counterparty
    });

    it('should show loading state while fetching contract', () => {
      mockContractClient.getContract.mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      render(<ContractsView contractId="contract_123" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/Loading contract/i)).toBeInTheDocument();
    });

    it('should show error state when contract not found', async () => {
      mockContractClient.getContract.mockRejectedValue(
        new Error('Contract not found')
      );

      render(<ContractsView contractId="nonexistent" />);

      await waitFor(() => {
        expect(screen.getByText(/Contract not found/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Try checking the contract ID/i)).toBeInTheDocument();
    });

    it('should display different states with appropriate styling', async () => {
      const testStates = [
        { state: 'PROPOSED' as ContractState, expectedClass: 'status-proposed', expectedText: 'Proposed' },
        { state: 'ACTIVE' as ContractState, expectedClass: 'status-active', expectedText: 'Active' },
        { state: 'COMPLETED' as ContractState, expectedClass: 'status-completed', expectedText: 'Completed' },
        { state: 'REJECTED' as ContractState, expectedClass: 'status-rejected', expectedText: 'Rejected' },
        { state: 'DISPUTED' as ContractState, expectedClass: 'status-disputed', expectedText: 'Disputed' },
        { state: 'CANCELLED' as ContractState, expectedClass: 'status-cancelled', expectedText: 'Cancelled' },
      ];

      for (const { state, expectedClass, expectedText } of testStates) {
        const mockContract: Contract = {
          id: 'contract_123',
          contractId: 'contract_123',
          proposer: { value: '0x1234567890123456789012345678901234567890' },
          counterparty: { value: '0x0987654321098765432109876543210987654321' },
          state,
          terms: { fields: {} },
          proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
          acceptedAt: undefined,
          completedAt: undefined,
          completionProof: ''
        };

        mockContractClient.getContract.mockResolvedValue(mockContract);

        const { unmount } = render(<ContractsView contractId="contract_123" />);

        await waitFor(() => {
          const statusElement = screen.getByText(expectedText);
          expect(statusElement).toBeInTheDocument();
          expect(statusElement).toHaveClass(expectedClass);
        });

        unmount();
      }
    });
  });

  describe('Contract List View', () => {
    it('should render list of contracts when no contractId is provided', async () => {
      const mockContracts: Contract[] = [
        {
          id: 'contract_1',
          contractId: 'contract_1',
          proposer: { value: '0x1234567890123456789012345678901234567890' },
          counterparty: { value: '0x0987654321098765432109876543210987654321' },
          state: 'ACTIVE' as ContractState,
          terms: {
            fields: {
              title: { stringValue: 'App Development' }
            }
          },
          proposedAt: { seconds: BigInt(1640995200), nanos: 0 },
          acceptedAt: undefined,
          completedAt: undefined,
          completionProof: ''
        },
        {
          id: 'contract_2',
          contractId: 'contract_2',
          proposer: { value: '0x1234567890123456789012345678901234567890' },
          counterparty: { value: '0x1111111111111111111111111111111111111111' },
          state: 'COMPLETED' as ContractState,
          terms: {
            fields: {
              title: { stringValue: 'Website Design' }
            }
          },
          proposedAt: { seconds: BigInt(1640985200), nanos: 0 },
          acceptedAt: { seconds: BigInt(1640990600), nanos: 0 },
          completedAt: { seconds: BigInt(1641080400), nanos: 0 },
          completionProof: ''
        }
      ];

      mockContractClient.getContractsByAgent.mockResolvedValue(mockContracts);

      render(<ContractsView />);

      await waitFor(() => {
        expect(screen.getByText('App Development')).toBeInTheDocument();
        expect(screen.getByText('Website Design')).toBeInTheDocument();
      });

      // Check both contracts are displayed
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should show empty state when no contracts exist', async () => {
      mockContractClient.getContractsByAgent.mockResolvedValue([]);

      render(<ContractsView />);

      await waitFor(() => {
        expect(screen.getByText(/No contracts found/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Create your first contract/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New Contract/i })).toBeInTheDocument();
    });

    it('should filter contracts by state when filter is applied', async () => {
      const mockContracts: Contract[] = [
        {
          id: 'contract_1',
          contractId: 'contract_1',
          state: 'ACTIVE' as ContractState,
          terms: { fields: { title: { stringValue: 'Active Contract' } } },
        },
        {
          id: 'contract_2',
          contractId: 'contract_2',
          state: 'COMPLETED' as ContractState,
          terms: { fields: { title: { stringValue: 'Completed Contract' } } },
        },
      ] as Contract[];

      mockContractClient.getContractsByAgent.mockResolvedValue(mockContracts);

      render(<ContractsView />);

      await waitFor(() => {
        expect(screen.getByText('Active Contract')).toBeInTheDocument();
        expect(screen.getByText('Completed Contract')).toBeInTheDocument();
      });

      // Apply filter to show only active contracts
      fireEvent.click(screen.getByLabelText(/Filter by state/i));
      fireEvent.click(screen.getByText('Active Only'));

      await waitFor(() => {
        expect(screen.getByText('Active Contract')).toBeInTheDocument();
        expect(screen.queryByText('Completed Contract')).not.toBeInTheDocument();
      });
    });
  });

  describe('Contract Interactions', () => {
    it('should show accept button for counterparty on proposed contracts', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x0987654321098765432109876543210987654321' },
        counterparty: { value: '0x1234567890123456789012345678901234567890' }, // Current user
        state: 'PROPOSED' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        acceptedAt: undefined,
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" allowInteractions={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept Contract/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reject Contract/i })).toBeInTheDocument();
      });
    });

    it('should show completion button for contract parties on active contracts', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' }, // Current user
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'ACTIVE' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000 - 3600), nanos: 0 },
        acceptedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" allowInteractions={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit Completion/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Dispute Contract/i })).toBeInTheDocument();
      });
    });

    it('should handle contract acceptance', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x0987654321098765432109876543210987654321' },
        counterparty: { value: '0x1234567890123456789012345678901234567890' },
        state: 'PROPOSED' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        acceptedAt: undefined,
        completedAt: undefined,
        completionProof: ''
      };

      const acceptedContract = {
        ...mockContract,
        state: 'ACTIVE' as ContractState,
        acceptedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);
      mockContractClient.acceptContract.mockResolvedValue(acceptedContract);

      render(<ContractsView contractId="contract_123" allowInteractions={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Accept Contract/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Accept Contract/i }));

      await waitFor(() => {
        expect(mockContractClient.acceptContract).toHaveBeenCalledWith({
          contractId: 'contract_123',
          acceptor: { value: '0x1234567890123456789012345678901234567890' }
        });
      });

      // Should show success message
      expect(screen.getByText(/Contract accepted successfully/i)).toBeInTheDocument();
    });

    it('should handle contract rejection with reason', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x0987654321098765432109876543210987654321' },
        counterparty: { value: '0x1234567890123456789012345678901234567890' },
        state: 'PROPOSED' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        acceptedAt: undefined,
        completedAt: undefined,
        completionProof: ''
      };

      const rejectedContract = {
        ...mockContract,
        state: 'REJECTED' as ContractState,
        rejectedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);
      mockContractClient.rejectContract.mockResolvedValue(rejectedContract);

      render(<ContractsView contractId="contract_123" allowInteractions={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reject Contract/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Reject Contract/i }));

      // Should show rejection reason modal
      await waitFor(() => {
        expect(screen.getByText(/Reason for rejection/i)).toBeInTheDocument();
      });

      const reasonTextarea = screen.getByRole('textbox', { name: /rejection reason/i });
      fireEvent.change(reasonTextarea, {
        target: { value: 'Terms are not acceptable' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Confirm Rejection/i }));

      await waitFor(() => {
        expect(mockContractClient.rejectContract).toHaveBeenCalledWith({
          contractId: 'contract_123',
          rejector: { value: '0x1234567890123456789012345678901234567890' },
          reason: 'Terms are not acceptable'
        });
      });
    });

    it('should handle completion submission with proof', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' },
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'ACTIVE' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000 - 7200), nanos: 0 },
        acceptedAt: { seconds: BigInt(Date.now() / 1000 - 3600), nanos: 0 },
        completedAt: undefined,
        completionProof: ''
      };

      const updatedContract = {
        ...mockContract,
        completions: [{
          agent: '0x1234567890123456789012345678901234567890',
          proof: 'https://example.com/deliverable',
          submittedAt: new Date().toISOString()
        }]
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);
      mockContractClient.completeContract.mockResolvedValue(updatedContract);

      render(<ContractsView contractId="contract_123" allowInteractions={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Submit Completion/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit Completion/i }));

      // Should show completion submission modal
      await waitFor(() => {
        expect(screen.getByText(/Submit completion proof/i)).toBeInTheDocument();
      });

      const proofInput = screen.getByRole('textbox', { name: /proof url/i });
      fireEvent.change(proofInput, {
        target: { value: 'https://example.com/deliverable' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Submit Proof/i }));

      await waitFor(() => {
        expect(mockContractClient.completeContract).toHaveBeenCalledWith({
          contractId: 'contract_123',
          completer: { value: '0x1234567890123456789012345678901234567890' },
          proof: 'https://example.com/deliverable'
        });
      });
    });

    it('should not show interaction buttons when allowInteractions is false', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' },
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'PROPOSED' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        acceptedAt: undefined,
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" allowInteractions={false} />);

      await waitFor(() => {
        expect(screen.getByText('Proposed')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /Accept Contract/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reject Contract/i })).not.toBeInTheDocument();
    });
  });

  describe('Related Identities', () => {
    it('should show proposer and counterparty identity links when showRelatedIdentities is true', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' },
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'ACTIVE' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        acceptedAt: undefined,
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" showRelatedIdentities={true} />);

      await waitFor(() => {
        const proposerLink = screen.getByRole('link', { name: /View Proposer Profile/i });
        const counterpartyLink = screen.getByRole('link', { name: /View Counterparty Profile/i });
        
        expect(proposerLink).toBeInTheDocument();
        expect(counterpartyLink).toBeInTheDocument();
        
        expect(proposerLink).toHaveAttribute(
          'href',
          '/identity/0x1234567890123456789012345678901234567890'
        );
        expect(counterpartyLink).toHaveAttribute(
          'href',
          '/identity/0x0987654321098765432109876543210987654321'
        );
      });
    });

    it('should not show identity links when showRelatedIdentities is false', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' },
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'ACTIVE' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(Date.now() / 1000), nanos: 0 },
        acceptedAt: undefined,
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" showRelatedIdentities={false} />);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /View Proposer Profile/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /View Counterparty Profile/i })).not.toBeInTheDocument();
    });
  });

  describe('Deployment Information', () => {
    it('should show contract deployment details when showDeployments is true', async () => {
      const mockContract: Contract = {
        id: 'contract_123',
        contractId: 'contract_123',
        proposer: { value: '0x1234567890123456789012345678901234567890' },
        counterparty: { value: '0x0987654321098765432109876543210987654321' },
        state: 'ACTIVE' as ContractState,
        terms: { fields: {} },
        proposedAt: { seconds: BigInt(1640995200), nanos: 0 }, // January 1, 2022
        acceptedAt: { seconds: BigInt(1641000600), nanos: 0 },
        completedAt: undefined,
        completionProof: ''
      };

      mockContractClient.getContract.mockResolvedValue(mockContract);

      render(<ContractsView contractId="contract_123" showDeployments={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Contract ID:/i)).toBeInTheDocument();
        expect(screen.getByText('contract_123')).toBeInTheDocument();
        expect(screen.getByText(/Proposed:/i)).toBeInTheDocument();
        expect(screen.getByText(/January 1, 2022/i)).toBeInTheDocument();
      });
    });
  });
});