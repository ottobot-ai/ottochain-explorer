/**
 * DomainRouter Component Tests
 * 
 * TDD tests for domain-specific routing and navigation system.
 * Tests define expected behavior for multi-domain OttoChain explorer navigation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DomainRouter } from '../shared/DomainRouter';

// Mock the domain components since they don't exist yet
vi.mock('../domains/ContractsView', () => ({
  ContractsView: () => <div data-testid="contracts-domain">Contracts Domain</div>
}));

vi.mock('../domains/MarketsView', () => ({
  MarketsView: () => <div data-testid="markets-domain">Markets Domain</div>
}));

vi.mock('../domains/GovernanceView', () => ({
  GovernanceView: () => <div data-testid="governance-domain">Governance Domain</div>
}));

vi.mock('../domains/IdentityView', () => ({
  IdentityView: () => <div data-testid="identity-domain">Identity Domain</div>
}));

const mockBridgeUrl = 'http://localhost:3030';
vi.stubGlobal('import.meta', {
  env: {
    VITE_BRIDGE_URL: mockBridgeUrl
  }
});

describe('DomainRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Domain Route Registration', () => {
    it('should register all OttoChain domain routes correctly', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should have routes for all domains
      const router = document.querySelector('[data-testid="domain-router"]');
      expect(router).toBeInTheDocument();

      // Should register core domain routes
      expect(screen.getByTestId('domain-router')).toHaveAttribute(
        'data-domains',
        expect.stringContaining('contracts,markets,governance,identity')
      );
    });

    it('should handle domain-specific route patterns', async () => {
      const testRoutes = [
        { path: '/contracts', domain: 'contracts', component: 'ContractsView' },
        { path: '/contracts/:contractId', domain: 'contracts', component: 'ContractDetail' },
        { path: '/markets', domain: 'markets', component: 'MarketsView' },
        { path: '/markets/:marketId', domain: 'markets', component: 'MarketDetail' },
        { path: '/governance', domain: 'governance', component: 'GovernanceView' },
        { path: '/governance/proposals/:proposalId', domain: 'governance', component: 'ProposalDetail' },
        { path: '/identity', domain: 'identity', component: 'IdentityView' },
        { path: '/identity/:address', domain: 'identity', component: 'AddressDetail' }
      ];

      for (const route of testRoutes) {
        render(
          <MemoryRouter initialEntries={[route.path]}>
            <DomainRouter />
          </MemoryRouter>
        );

        // Should render appropriate domain component
        const domainElement = screen.queryByTestId(`${route.domain}-domain`);
        expect(domainElement).toBeInTheDocument();
      }
    });

    it('should support nested routing within domains', async () => {
      render(
        <MemoryRouter initialEntries={['/governance/proposals/prop-123/vote']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should handle nested routes
      const governanceDomain = screen.getByTestId('governance-domain');
      expect(governanceDomain).toHaveAttribute(
        'data-route',
        expect.stringContaining('proposals/prop-123/vote')
      );
    });

    it('should handle wildcard routes for dynamic content', async () => {
      render(
        <MemoryRouter initialEntries={['/contracts/0x123/transactions']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should pass route parameters to domain components
      const contractsDomain = screen.getByTestId('contracts-domain');
      expect(contractsDomain).toHaveAttribute(
        'data-contract-id',
        '0x123'
      );
      expect(contractsDomain).toHaveAttribute(
        'data-sub-route',
        'transactions'
      );
    });
  });

  describe('Domain Navigation', () => {
    it('should provide navigation between domains', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should have domain navigation
      const domainNav = screen.getByTestId('domain-navigation');
      expect(domainNav).toBeInTheDocument();

      // Should have navigation links for each domain
      expect(screen.getByRole('link', { name: /contracts/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /markets/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /governance/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /identity/i })).toBeInTheDocument();

      // Should navigate to domain when clicked
      const marketsLink = screen.getByRole('link', { name: /markets/i });
      await user.click(marketsLink);

      expect(screen.getByTestId('markets-domain')).toBeInTheDocument();
    });

    it('should maintain active navigation state', async () => {
      render(
        <MemoryRouter initialEntries={['/governance']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should show active state for current domain
      const governanceLink = screen.getByRole('link', { name: /governance/i });
      expect(governanceLink).toHaveClass('active');
      expect(governanceLink).toHaveAttribute('aria-current', 'page');

      // Other links should not be active
      const contractsLink = screen.getByRole('link', { name: /contracts/i });
      expect(contractsLink).not.toHaveClass('active');
    });

    it('should support breadcrumb navigation for nested routes', async () => {
      render(
        <MemoryRouter initialEntries={['/contracts/0x123/transactions']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should show breadcrumb navigation
      const breadcrumbs = screen.getByTestId('domain-breadcrumbs');
      expect(breadcrumbs).toBeInTheDocument();

      // Should show full path
      expect(screen.getByText('Contracts')).toBeInTheDocument();
      expect(screen.getByText('0x123')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();

      // Breadcrumb links should be functional
      const contractsLink = screen.getByRole('link', { name: 'Contracts' });
      expect(contractsLink).toHaveAttribute('href', '/contracts');
    });

    it('should handle programmatic navigation between domains', async () => {
      const NavigationTester = () => {
        const navigate = useDomainNavigation();
        
        return (
          <div>
            <button onClick={() => navigate('markets', { marketId: '123' })}>
              Go to Market 123
            </button>
            <button onClick={() => navigate('governance/proposals/new')}>
              Create Proposal
            </button>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/']}>
          <DomainRouter>
            <NavigationTester />
          </DomainRouter>
        </MemoryRouter>
      );

      const user = userEvent.setup();
      
      // Should navigate programmatically
      await user.click(screen.getByText('Go to Market 123'));
      expect(screen.getByTestId('markets-domain')).toBeInTheDocument();

      await user.click(screen.getByText('Create Proposal'));
      expect(screen.getByTestId('governance-domain')).toBeInTheDocument();
    });
  });

  describe('Domain Context and State Management', () => {
    it('should provide domain context to child components', async () => {
      render(
        <MemoryRouter initialEntries={['/contracts']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should provide domain context
      const contractsDomain = screen.getByTestId('contracts-domain');
      expect(contractsDomain).toHaveAttribute('data-domain', 'contracts');
      expect(contractsDomain).toHaveAttribute('data-bridge-url', mockBridgeUrl);
    });

    it('should manage domain-specific state isolation', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Navigate to contracts and set some state
      await user.click(screen.getByRole('link', { name: /contracts/i }));
      const contractsDomain = screen.getByTestId('contracts-domain');
      
      // Simulate state change in contracts domain
      fireEvent(contractsDomain, new CustomEvent('stateChange', { 
        detail: { selectedContract: '0x123' } 
      }));

      // Navigate to markets
      await user.click(screen.getByRole('link', { name: /markets/i }));
      const marketsDomain = screen.getByTestId('markets-domain');

      // Markets domain should have clean state
      expect(marketsDomain).not.toHaveAttribute('data-selected-contract');

      // Navigate back to contracts
      await user.click(screen.getByRole('link', { name: /contracts/i }));
      const contractsDomainRevisited = screen.getByTestId('contracts-domain');

      // Contracts state should be preserved
      expect(contractsDomainRevisited).toHaveAttribute(
        'data-selected-contract',
        '0x123'
      );
    });

    it('should handle domain-specific data loading', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ contracts: [{ id: '1', name: 'Test Contract' }] })
      });
      vi.stubGlobal('fetch', mockFetch);

      render(
        <MemoryRouter initialEntries={['/contracts']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should trigger domain-specific data loading
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/bridge/contracts')
        );
      });

      // Should provide data to domain component
      const contractsDomain = screen.getByTestId('contracts-domain');
      expect(contractsDomain).toHaveAttribute(
        'data-loading',
        'false'
      );
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle unknown domain routes', async () => {
      render(
        <MemoryRouter initialEntries={['/unknown-domain']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should show 404 or redirect to default
      expect(screen.getByText(/page not found|404/i)).toBeInTheDocument();
    });

    it('should handle domain loading failures gracefully', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', mockFetch);

      render(
        <MemoryRouter initialEntries={['/markets']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load|error/i)).toBeInTheDocument();
      });

      // Should provide retry option
      expect(screen.getByRole('button', { name: /retry|reload/i })).toBeInTheDocument();
    });

    it('should fall back to cached data when bridge is unavailable', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ cached: true }) })
        .mockRejectedValueOnce(new Error('Bridge unavailable'));

      vi.stubGlobal('fetch', mockFetch);

      render(
        <MemoryRouter initialEntries={['/governance']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should load cached data
      await waitFor(() => {
        const governanceDomain = screen.getByTestId('governance-domain');
        expect(governanceDomain).toHaveAttribute('data-cached', 'true');
      });
    });

    it('should handle route parameter validation', async () => {
      render(
        <MemoryRouter initialEntries={['/contracts/invalid-contract-id']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should validate route parameters
      expect(screen.getByText(/invalid contract id/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should lazy load domain components', async () => {
      const LazyContractsView = vi.fn(() => <div data-testid="contracts-domain">Lazy Contracts</div>);
      
      vi.doMock('../domains/ContractsView', () => ({
        ContractsView: LazyContractsView
      }));

      render(
        <MemoryRouter initialEntries={['/']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Should not load contracts component initially
      expect(LazyContractsView).not.toHaveBeenCalled();

      // Navigate to contracts
      const user = userEvent.setup();
      await user.click(screen.getByRole('link', { name: /contracts/i }));

      // Should now load contracts component
      await waitFor(() => {
        expect(LazyContractsView).toHaveBeenCalled();
      });
    });

    it('should preload adjacent domain data on hover', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ preloaded: true })
      });
      vi.stubGlobal('fetch', mockFetch);

      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/contracts']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Hover over markets link
      const marketsLink = screen.getByRole('link', { name: /markets/i });
      await user.hover(marketsLink);

      // Should preload markets data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/bridge/markets')
        );
      });
    });

    it('should cache domain data across navigation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ cached: false })
      });
      vi.stubGlobal('fetch', mockFetch);

      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/contracts']}>
          <DomainRouter />
        </MemoryRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Navigate away and back
      await user.click(screen.getByRole('link', { name: /markets/i }));
      await user.click(screen.getByRole('link', { name: /contracts/i }));

      // Should use cached data, not make additional request
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + markets, but not contracts again
    });
  });
});