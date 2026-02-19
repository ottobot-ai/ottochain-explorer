/**
 * GovernanceProposalForm Component Tests
 * 
 * TDD tests for DAO governance proposal creation functionality.
 * Tests define expected behavior for proposal creation forms.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceProposalForm } from '../governance/GovernanceProposalForm';

// Mock dependencies
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment
vi.stubGlobal('import.meta', {
  env: {
    VITE_BRIDGE_URL: 'http://localhost:3030'
  }
});

describe('GovernanceProposalForm', () => {
  const mockOnProposalCreated = vi.fn();
  const mockUserAccount = 'DAG123user456';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, proposalId: 'prop-123' })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Form Rendering and Basic Interaction', () => {
    it('should render all required form fields', async () => {
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Should render form title
      expect(screen.getByText('Create Governance Proposal')).toBeInTheDocument();

      // Should render required input fields
      expect(screen.getByLabelText('Proposal Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Proposal Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Voting Duration (days)')).toBeInTheDocument();
      expect(screen.getByLabelText('Quorum Threshold (%)')).toBeInTheDocument();

      // Should render action buttons
      expect(screen.getByRole('button', { name: 'Create Proposal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should show proposal type options', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const proposalTypeSelect = screen.getByLabelText('Proposal Type');
      await user.click(proposalTypeSelect);

      // Should show different proposal types
      expect(screen.getByRole('option', { name: 'Parameter Change' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Treasury Allocation' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Protocol Upgrade' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'General Vote' })).toBeInTheDocument();
    });

    it('should display form validation requirements', async () => {
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Should show validation hints
      expect(screen.getByText(/minimum 10 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/minimum 100 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/between 1 and 30 days/i)).toBeInTheDocument();
      expect(screen.getByText(/between 1% and 100%/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields before submission', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      // Should show validation errors
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Proposal type must be selected')).toBeInTheDocument();
    });

    it('should validate minimum character counts', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const titleInput = screen.getByLabelText('Proposal Title');
      const descriptionInput = screen.getByLabelText('Description');

      // Enter text that's too short
      await user.type(titleInput, 'Short');
      await user.type(descriptionInput, 'Too short description');

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Title must be at least 10 characters')).toBeInTheDocument();
      expect(screen.getByText('Description must be at least 100 characters')).toBeInTheDocument();
    });

    it('should validate voting duration range', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const durationInput = screen.getByLabelText('Voting Duration (days)');
      
      // Test invalid ranges
      await user.clear(durationInput);
      await user.type(durationInput, '0');
      
      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Duration must be between 1 and 30 days')).toBeInTheDocument();

      await user.clear(durationInput);
      await user.type(durationInput, '31');
      await user.click(submitButton);

      expect(screen.getByText('Duration must be between 1 and 30 days')).toBeInTheDocument();
    });

    it('should validate quorum threshold range', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const quorumInput = screen.getByLabelText('Quorum Threshold (%)');
      
      await user.clear(quorumInput);
      await user.type(quorumInput, '0');

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Quorum must be between 1% and 100%')).toBeInTheDocument();
    });
  });

  describe('Proposal Submission', () => {
    it('should submit valid proposal successfully', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Fill in valid form data
      const titleInput = screen.getByLabelText('Proposal Title');
      const descriptionInput = screen.getByLabelText('Description');
      const typeSelect = screen.getByLabelText('Proposal Type');
      const durationInput = screen.getByLabelText('Voting Duration (days)');
      const quorumInput = screen.getByLabelText('Quorum Threshold (%)');

      await user.type(titleInput, 'Increase Treasury Allocation');
      await user.type(descriptionInput, 'This proposal seeks to increase the treasury allocation for community development projects by 10% to fund additional initiatives that will benefit the entire ecosystem.');
      await user.selectOptions(typeSelect, 'Treasury Allocation');
      await user.clear(durationInput);
      await user.type(durationInput, '7');
      await user.clear(quorumInput);
      await user.type(quorumInput, '25');

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      // Should submit to API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/proposals'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('Increase Treasury Allocation')
          })
        );
      });

      // Should call success callback
      expect(mockOnProposalCreated).toHaveBeenCalledWith({
        proposalId: 'prop-123',
        title: 'Increase Treasury Allocation',
        type: 'Treasury Allocation'
      });
    });

    it('should handle API submission errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Fill valid form and submit
      await user.type(screen.getByLabelText('Proposal Title'), 'Test Proposal Title');
      await user.type(screen.getByLabelText('Description'), 'This is a test proposal description that meets the minimum character requirement for testing purposes.');
      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'General Vote');

      await user.click(screen.getByRole('button', { name: 'Create Proposal' }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create proposal. Please try again.')).toBeInTheDocument();
      });

      // Should not call success callback
      expect(mockOnProposalCreated).not.toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      // Mock delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, proposalId: 'prop-123' })
        }), 1000))
      );

      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Fill and submit form
      await user.type(screen.getByLabelText('Proposal Title'), 'Loading Test Proposal');
      await user.type(screen.getByLabelText('Description'), 'This is a test proposal to verify loading states work correctly during the submission process.');
      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'General Vote');

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Creating Proposal...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Parameter Change Proposals', () => {
    it('should show additional fields for parameter change proposals', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const typeSelect = screen.getByLabelText('Proposal Type');
      await user.selectOptions(typeSelect, 'Parameter Change');

      // Should show parameter-specific fields
      await waitFor(() => {
        expect(screen.getByLabelText('Parameter Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Current Value')).toBeInTheDocument();
        expect(screen.getByLabelText('Proposed Value')).toBeInTheDocument();
        expect(screen.getByLabelText('Justification')).toBeInTheDocument();
      });
    });

    it('should validate parameter change specific fields', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'Parameter Change');
      
      await waitFor(() => {
        expect(screen.getByLabelText('Parameter Name')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Parameter name is required')).toBeInTheDocument();
      expect(screen.getByText('Current value is required')).toBeInTheDocument();
      expect(screen.getByText('Proposed value is required')).toBeInTheDocument();
    });
  });

  describe('Treasury Allocation Proposals', () => {
    it('should show treasury-specific fields for treasury proposals', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'Treasury Allocation');

      await waitFor(() => {
        expect(screen.getByLabelText('Recipient Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Amount (DAG)')).toBeInTheDocument();
        expect(screen.getByLabelText('Funding Purpose')).toBeInTheDocument();
        expect(screen.getByLabelText('Milestone Schedule')).toBeInTheDocument();
      });
    });

    it('should validate DAG address format for treasury proposals', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'Treasury Allocation');
      
      await waitFor(() => {
        expect(screen.getByLabelText('Recipient Address')).toBeInTheDocument();
      });

      const addressInput = screen.getByLabelText('Recipient Address');
      await user.type(addressInput, 'invalid-address');

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Invalid DAG address format')).toBeInTheDocument();
    });

    it('should validate amount is positive for treasury proposals', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'Treasury Allocation');
      
      await waitFor(() => {
        expect(screen.getByLabelText('Amount (DAG)')).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText('Amount (DAG)');
      await user.type(amountInput, '-100');

      const submitButton = screen.getByRole('button', { name: 'Create Proposal' });
      await user.click(submitButton);

      expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
    });
  });

  describe('User Experience Features', () => {
    it('should save draft proposal to localStorage', async () => {
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn()
      };
      vi.stubGlobal('localStorage', mockLocalStorage);

      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      const titleInput = screen.getByLabelText('Proposal Title');
      await user.type(titleInput, 'Draft Proposal');

      // Should save draft after delay
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'governance-proposal-draft',
          expect.stringContaining('Draft Proposal')
        );
      }, { timeout: 3000 });
    });

    it('should restore draft from localStorage on mount', async () => {
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn().mockReturnValue(JSON.stringify({
          title: 'Restored Draft',
          description: 'This is a restored draft proposal',
          type: 'General Vote'
        })),
        removeItem: vi.fn()
      };
      vi.stubGlobal('localStorage', mockLocalStorage);

      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Should restore draft values
      expect(screen.getByDisplayValue('Restored Draft')).toBeInTheDocument();
      expect(screen.getByDisplayValue('This is a restored draft proposal')).toBeInTheDocument();
    });

    it('should clear draft after successful submission', async () => {
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn()
      };
      vi.stubGlobal('localStorage', mockLocalStorage);

      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Submit valid proposal
      await user.type(screen.getByLabelText('Proposal Title'), 'Final Proposal');
      await user.type(screen.getByLabelText('Description'), 'This is the final version of the proposal that should clear the draft after successful submission.');
      await user.selectOptions(screen.getByLabelText('Proposal Type'), 'General Vote');

      await user.click(screen.getByRole('button', { name: 'Create Proposal' }));

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('governance-proposal-draft');
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Should be able to tab through all form fields
      await user.tab();
      expect(screen.getByLabelText('Proposal Title')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Description')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Proposal Type')).toHaveFocus();

      // Should be able to submit with Enter key
      const titleInput = screen.getByLabelText('Proposal Title');
      titleInput.focus();
      await user.keyboard('{Enter}');
      
      // Should trigger validation since form is incomplete
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });

    it('should have proper ARIA labels and descriptions', async () => {
      render(
        <GovernanceProposalForm 
          userAccount={mockUserAccount}
          onProposalCreated={mockOnProposalCreated}
        />
      );

      // Should have form role
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Should have proper labels
      expect(screen.getByLabelText('Proposal Title')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Description')).toHaveAttribute('aria-required', 'true');

      // Should have helper text associated
      const titleInput = screen.getByLabelText('Proposal Title');
      expect(titleInput).toHaveAttribute('aria-describedby', expect.stringMatching(/title-help/));
    });
  });
});