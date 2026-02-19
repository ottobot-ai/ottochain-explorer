/**
 * Shared UI Components Tests
 * 
 * TDD tests for reusable UI components that work across all OttoChain domains.
 * Tests define expected behavior for cross-domain component library.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import shared components (to be implemented)
import { StateVisualizationCard } from '../shared/StateVisualizationCard';
import { DataTable } from '../shared/DataTable';
import { FilterPanel } from '../shared/FilterPanel';
import { SearchBar } from '../shared/SearchBar';
import { LoadingStates } from '../shared/LoadingStates';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { MetricCard } from '../shared/MetricCard';
import { StatusIndicator } from '../shared/StatusIndicator';

// Mock WebSocket for live updates
const mockWebSocket = vi.fn();
vi.stubGlobal('WebSocket', mockWebSocket);

describe('Shared UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('StateVisualizationCard', () => {
    it('should render state data with appropriate visualization', async () => {
      const mockStateData = {
        title: 'Contract State',
        type: 'object',
        data: {
          balance: 1000000,
          owner: 'DAG123',
          lastUpdated: '2026-02-18T20:00:00Z'
        },
        schema: {
          balance: { type: 'number', format: 'DAG' },
          owner: { type: 'string', format: 'address' },
          lastUpdated: { type: 'string', format: 'datetime' }
        }
      };

      render(
        <StateVisualizationCard 
          stateData={mockStateData}
          domain="contracts"
        />
      );

      // Should render card title
      expect(screen.getByText('Contract State')).toBeInTheDocument();

      // Should format data according to schema
      expect(screen.getByText('1,000,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('DAG123')).toBeInTheDocument();
      expect(screen.getByText(/February 18, 2026/)).toBeInTheDocument();

      // Should show appropriate data type indicators
      expect(screen.getByTestId('balance-field')).toHaveAttribute('data-type', 'number');
      expect(screen.getByTestId('owner-field')).toHaveAttribute('data-type', 'address');
    });

    it('should handle different data types with appropriate visualizations', async () => {
      const complexStateData = {
        title: 'Market State',
        type: 'object',
        data: {
          prices: [100, 150, 120, 180, 200],
          status: 'active',
          participants: ['DAG1', 'DAG2', 'DAG3'],
          metadata: {
            created: '2026-02-01T00:00:00Z',
            volume: 50000
          }
        }
      };

      render(
        <StateVisualizationCard 
          stateData={complexStateData}
          domain="markets"
        />
      );

      // Should render array data
      expect(screen.getByText('prices (5 items)')).toBeInTheDocument();
      
      // Should render status with appropriate indicator
      const statusIndicator = screen.getByTestId('status-indicator');
      expect(statusIndicator).toHaveClass('status-active');
      
      // Should render nested objects
      expect(screen.getByText('metadata')).toBeInTheDocument();
      expect(screen.getByText('50,000')).toBeInTheDocument();
    });

    it('should support expandable/collapsible sections for complex data', async () => {
      const user = userEvent.setup();
      
      const nestedStateData = {
        title: 'Complex State',
        type: 'object',
        data: {
          simpleField: 'value',
          complexField: {
            nested: { deeply: { value: 'found' } },
            array: [1, 2, 3, 4, 5]
          }
        }
      };

      render(
        <StateVisualizationCard 
          stateData={nestedStateData}
          domain="governance"
        />
      );

      // Should show expandable sections for complex data
      const expandButton = screen.getByRole('button', { name: /expand|show details/i });
      expect(expandButton).toBeInTheDocument();

      // Should expand when clicked
      await user.click(expandButton);
      
      expect(screen.getByText('deeply')).toBeInTheDocument();
      expect(screen.getByText('found')).toBeInTheDocument();
    });

    it('should update in real-time when state data changes', async () => {
      let stateData = {
        title: 'Live State',
        type: 'object',
        data: { counter: 0 }
      };

      const { rerender } = render(
        <StateVisualizationCard 
          stateData={stateData}
          domain="contracts"
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();

      // Update state data
      stateData = {
        ...stateData,
        data: { counter: 42 }
      };

      rerender(
        <StateVisualizationCard 
          stateData={stateData}
          domain="contracts"
        />
      );

      // Should reflect updated value
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('DataTable', () => {
    const mockTableData = {
      columns: [
        { key: 'id', label: 'ID', type: 'string' },
        { key: 'amount', label: 'Amount', type: 'number', format: 'DAG' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'timestamp', label: 'Time', type: 'datetime' }
      ],
      rows: [
        { id: 'tx-1', amount: 1000, status: 'confirmed', timestamp: '2026-02-18T20:00:00Z' },
        { id: 'tx-2', amount: 2500, status: 'pending', timestamp: '2026-02-18T19:00:00Z' },
        { id: 'tx-3', amount: 750, status: 'failed', timestamp: '2026-02-18T18:00:00Z' }
      ]
    };

    it('should render table with proper column headers and data', async () => {
      render(
        <DataTable 
          data={mockTableData}
          domain="contracts"
        />
      );

      // Should render column headers
      expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument();

      // Should render data rows
      expect(screen.getByText('tx-1')).toBeInTheDocument();
      expect(screen.getByText('1,000 DAG')).toBeInTheDocument();
      expect(screen.getByText('confirmed')).toBeInTheDocument();
    });

    it('should support sorting by columns', async () => {
      const user = userEvent.setup();
      
      render(
        <DataTable 
          data={mockTableData}
          sortable={true}
          domain="markets"
        />
      );

      // Should have sortable column headers
      const amountHeader = screen.getByRole('columnheader', { name: 'Amount' });
      expect(amountHeader).toHaveAttribute('aria-sort', 'none');

      // Click to sort by amount
      await user.click(amountHeader);
      
      // Should sort in ascending order
      expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
      
      // Should reorder rows (750, 1000, 2500)
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('750 DAG')).toBeInTheDocument();
      expect(within(rows[2]).getByText('1,000 DAG')).toBeInTheDocument();
      expect(within(rows[3]).getByText('2,500 DAG')).toBeInTheDocument();

      // Click again to sort descending
      await user.click(amountHeader);
      expect(amountHeader).toHaveAttribute('aria-sort', 'descending');
    });

    it('should support row selection with callbacks', async () => {
      const mockOnRowSelect = vi.fn();
      const user = userEvent.setup();
      
      render(
        <DataTable 
          data={mockTableData}
          selectable={true}
          onRowSelect={mockOnRowSelect}
          domain="governance"
        />
      );

      // Should have checkboxes for row selection
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // 3 rows + header

      // Select a row
      await user.click(checkboxes[1]); // First data row
      
      expect(mockOnRowSelect).toHaveBeenCalledWith(['tx-1']);

      // Select multiple rows
      await user.click(checkboxes[2]); // Second data row
      
      expect(mockOnRowSelect).toHaveBeenCalledWith(['tx-1', 'tx-2']);
    });

    it('should handle large datasets with virtual scrolling', async () => {
      const largeDataset = {
        columns: mockTableData.columns,
        rows: Array.from({ length: 10000 }, (_, i) => ({
          id: `item-${i}`,
          amount: Math.floor(Math.random() * 10000),
          status: 'active',
          timestamp: '2026-02-18T20:00:00Z'
        }))
      };

      render(
        <DataTable 
          data={largeDataset}
          virtualized={true}
          domain="identity"
        />
      );

      // Should only render visible rows
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeLessThan(100); // Much less than 10000

      // Should show total count
      expect(screen.getByText(/10,000 items/)).toBeInTheDocument();
    });

    it('should support custom cell renderers', async () => {
      const customRenderers = {
        status: (value: string) => (
          <span className={`status-${value}`} data-testid={`status-${value}`}>
            {value.toUpperCase()}
          </span>
        ),
        amount: (value: number) => (
          <span className="amount-cell" data-value={value}>
            ${value.toLocaleString()}
          </span>
        )
      };

      render(
        <DataTable 
          data={mockTableData}
          cellRenderers={customRenderers}
          domain="contracts"
        />
      );

      // Should use custom renderers
      expect(screen.getByTestId('status-confirmed')).toBeInTheDocument();
      expect(screen.getByTestId('status-confirmed')).toHaveTextContent('CONFIRMED');
      
      const amountCell = screen.getByText('$1,000');
      expect(amountCell).toHaveClass('amount-cell');
      expect(amountCell).toHaveAttribute('data-value', '1000');
    });
  });

  describe('FilterPanel', () => {
    const mockFilterConfig = {
      filters: [
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]
        },
        {
          key: 'amount',
          label: 'Amount Range',
          type: 'range',
          min: 0,
          max: 10000,
          step: 100
        },
        {
          key: 'date',
          label: 'Date Range',
          type: 'daterange'
        },
        {
          key: 'search',
          label: 'Search',
          type: 'text',
          placeholder: 'Search transactions...'
        }
      ]
    };

    it('should render all filter types correctly', async () => {
      render(
        <FilterPanel 
          config={mockFilterConfig}
          onFiltersChange={vi.fn()}
          domain="markets"
        />
      );

      // Should render select filter
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();

      // Should render range filter
      expect(screen.getByLabelText('Amount Range')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();

      // Should render date range filter
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
      
      // Should render text filter
      expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
    });

    it('should handle filter value changes', async () => {
      const mockOnFiltersChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <FilterPanel 
          config={mockFilterConfig}
          onFiltersChange={mockOnFiltersChange}
          domain="governance"
        />
      );

      // Change select filter
      const statusSelect = screen.getByRole('combobox', { name: 'Status' });
      await user.selectOptions(statusSelect, 'active');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        status: 'active'
      });

      // Change text filter
      const searchInput = screen.getByPlaceholderText('Search transactions...');
      await user.type(searchInput, 'test query');

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        status: 'active',
        search: 'test query'
      });
    });

    it('should support filter presets and saved filters', async () => {
      const user = userEvent.setup();
      
      const configWithPresets = {
        ...mockFilterConfig,
        presets: [
          { name: 'Recent Active', filters: { status: 'active', date: 'last-7-days' } },
          { name: 'High Value', filters: { amount: { min: 5000, max: 10000 } } }
        ]
      };

      render(
        <FilterPanel 
          config={configWithPresets}
          onFiltersChange={vi.fn()}
          domain="identity"
        />
      );

      // Should show preset options
      expect(screen.getByText('Filter Presets')).toBeInTheDocument();
      
      const recentActivePreset = screen.getByRole('button', { name: 'Recent Active' });
      await user.click(recentActivePreset);

      // Should apply preset filters
      const statusSelect = screen.getByRole('combobox', { name: 'Status' });
      expect(statusSelect).toHaveValue('active');
    });

    it('should debounce filter changes to avoid excessive updates', async () => {
      const mockOnFiltersChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <FilterPanel 
          config={mockFilterConfig}
          onFiltersChange={mockOnFiltersChange}
          debounceMs={300}
          domain="contracts"
        />
      );

      const searchInput = screen.getByPlaceholderText('Search transactions...');
      
      // Type quickly
      await user.type(searchInput, 'test');

      // Should not call onChange for each keystroke
      expect(mockOnFiltersChange).not.toHaveBeenCalled();

      // Should call onChange after debounce delay
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          search: 'test'
        });
      }, { timeout: 500 });
    });

    it('should clear all filters when reset button is clicked', async () => {
      const mockOnFiltersChange = vi.fn();
      const user = userEvent.setup();
      
      render(
        <FilterPanel 
          config={mockFilterConfig}
          onFiltersChange={mockOnFiltersChange}
          initialFilters={{ status: 'active', search: 'test' }}
          domain="markets"
        />
      );

      // Should have reset button
      const resetButton = screen.getByRole('button', { name: /clear|reset/i });
      await user.click(resetButton);

      // Should clear all filters
      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });
  });

  describe('LoadingStates', () => {
    it('should display skeleton loading for different content types', async () => {
      render(
        <LoadingStates.Skeleton 
          type="table"
          rows={5}
          columns={4}
        />
      );

      // Should render table skeleton
      const skeleton = screen.getByTestId('loading-skeleton-table');
      expect(skeleton).toBeInTheDocument();
      
      // Should have correct number of skeleton rows
      expect(skeleton.querySelectorAll('[data-skeleton-row]')).toHaveLength(5);
    });

    it('should show loading spinner with customizable size and message', async () => {
      render(
        <LoadingStates.Spinner 
          size="large"
          message="Loading contract data..."
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading contract data...')).toBeInTheDocument();
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('size-large');
    });

    it('should provide progress bar for deterministic loading', async () => {
      render(
        <LoadingStates.ProgressBar 
          progress={65}
          message="Processing transactions..."
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      
      expect(screen.getByText('Processing transactions...')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });
  });

  describe('ErrorBoundary', () => {
    it('should catch and display component errors gracefully', async () => {
      const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Normal content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary domain="contracts">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should render normally
      expect(screen.getByText('Normal content')).toBeInTheDocument();

      // Trigger error
      rerender(
        <ErrorBoundary domain="contracts">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry|reload/i })).toBeInTheDocument();
    });

    it('should provide domain-specific error messages', async () => {
      const ThrowError = () => {
        throw new Error('Bridge connection failed');
      };

      render(
        <ErrorBoundary domain="governance" bridgeError={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should show domain-specific error message
      expect(screen.getByText(/governance data unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/bridge connection failed/i)).toBeInTheDocument();
    });

    it('should handle retry functionality', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;
      
      const MaybeThrow = () => {
        if (shouldThrow) {
          throw new Error('Retry test error');
        }
        return <div>Content loaded successfully</div>;
      };

      render(
        <ErrorBoundary 
          domain="markets"
          onRetry={() => { shouldThrow = false; }}
        >
          <MaybeThrow />
        </ErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should show success content after retry
      expect(screen.getByText('Content loaded successfully')).toBeInTheDocument();
    });
  });
});