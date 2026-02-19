/**
 * Live Data Integration Tests
 * 
 * TDD tests for real-time data integration with OttoChain bridge.
 * Tests define expected behavior for live updates across all domains.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import data integration components (to be implemented)
import { LiveDataProvider } from '../shared/LiveDataProvider';
import { useLiveData } from '../shared/hooks/useLiveData';
import { BridgeConnection } from '../shared/BridgeConnection';
import { DataSubscriptionManager } from '../shared/DataSubscriptionManager';

// Mock WebSocket
const mockWebSocket = vi.fn();
const mockWsInstance = {
  readyState: WebSocket.OPEN,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};
vi.stubGlobal('WebSocket', mockWebSocket.mockImplementation(() => mockWsInstance));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockBridgeUrl = 'http://localhost:3030';
vi.stubGlobal('import.meta', {
  env: {
    VITE_BRIDGE_URL: mockBridgeUrl
  }
});

describe('Live Data Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LiveDataProvider', () => {
    it('should establish bridge connection on mount', async () => {
      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <div data-testid="child-component">Test Child</div>
        </LiveDataProvider>
      );

      // Should establish WebSocket connection
      expect(mockWebSocket).toHaveBeenCalledWith(
        expect.stringContaining('ws://localhost:3030')
      );

      // Should render children
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });

    it('should provide connection status to consumers', async () => {
      const ConnectionStatusDisplay = () => {
        const { connectionStatus, isConnected } = useBridgeConnection();
        return (
          <div>
            <span data-testid="connection-status">{connectionStatus}</span>
            <span data-testid="is-connected">{isConnected.toString()}</span>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <ConnectionStatusDisplay />
        </LiveDataProvider>
      );

      // Should show connected status
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
    });

    it('should handle connection failures and retry automatically', async () => {
      // Mock connection failure
      mockWsInstance.readyState = WebSocket.CLOSED;
      
      const ConnectionTester = () => {
        const { connectionStatus, reconnect } = useBridgeConnection();
        return (
          <div>
            <span data-testid="status">{connectionStatus}</span>
            <button onClick={reconnect}>Reconnect</button>
          </div>
        );
      };

      render(
        <LiveDataProvider 
          bridgeUrl={mockBridgeUrl}
          autoReconnect={true}
          reconnectInterval={1000}
        >
          <ConnectionTester />
        </LiveDataProvider>
      );

      // Should show disconnected status
      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');

      // Should retry connection automatically
      await waitFor(() => {
        expect(mockWebSocket).toHaveBeenCalledTimes(2); // Initial + retry
      }, { timeout: 1500 });
    });

    it('should provide data subscription management', async () => {
      const SubscriptionTester = () => {
        const { subscribe, unsubscribe } = useDataSubscriptions();
        
        return (
          <div>
            <button onClick={() => subscribe('contracts', { limit: 10 })}>
              Subscribe to Contracts
            </button>
            <button onClick={() => unsubscribe('contracts')}>
              Unsubscribe
            </button>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <SubscriptionTester />
        </LiveDataProvider>
      );

      const user = userEvent.setup();
      
      // Subscribe to data
      await user.click(screen.getByText('Subscribe to Contracts'));
      
      // Should send subscription message
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SUBSCRIBE',
          channel: 'contracts',
          params: { limit: 10 }
        })
      );

      // Unsubscribe
      await user.click(screen.getByText('Unsubscribe'));
      
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'UNSUBSCRIBE',
          channel: 'contracts'
        })
      );
    });
  });

  describe('useLiveData Hook', () => {
    it('should fetch initial data and subscribe to updates', async () => {
      const mockInitialData = [
        { id: '1', name: 'Contract 1', status: 'active' },
        { id: '2', name: 'Contract 2', status: 'inactive' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockInitialData })
      });

      const LiveDataConsumer = () => {
        const { data, loading, error } = useLiveData('contracts', {
          initialFetch: true,
          subscribeToUpdates: true
        });

        return (
          <div>
            <div data-testid="loading">{loading.toString()}</div>
            <div data-testid="error">{error?.message || 'none'}</div>
            <div data-testid="data-count">{data?.length || 0}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <LiveDataConsumer />
        </LiveDataProvider>
      );

      // Should start in loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Should fetch initial data
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/bridge/contracts')
      );

      // Should show data once loaded
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('data-count')).toHaveTextContent('2');
      });

      // Should subscribe to updates
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SUBSCRIBE',
          channel: 'contracts'
        })
      );
    });

    it('should handle real-time data updates via WebSocket', async () => {
      const initialData = [
        { id: '1', name: 'Contract 1', balance: 1000 }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: initialData })
      });

      let wsMessageHandler: ((event: MessageEvent) => void) | undefined;
      mockWsInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          wsMessageHandler = handler as (event: MessageEvent) => void;
        }
      });

      const LiveDataConsumer = () => {
        const { data } = useLiveData('contracts');

        return (
          <div>
            {data?.map(item => (
              <div key={item.id} data-testid={`contract-${item.id}`}>
                {item.name}: {item.balance}
              </div>
            ))}
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <LiveDataConsumer />
        </LiveDataProvider>
      );

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByTestId('contract-1')).toHaveTextContent('Contract 1: 1000');
      });

      // Simulate WebSocket update
      const updateMessage = {
        type: 'DATA_UPDATE',
        channel: 'contracts',
        data: [
          { id: '1', name: 'Contract 1', balance: 2500 }, // Updated balance
          { id: '2', name: 'Contract 2', balance: 500 }   // New contract
        ]
      };

      wsMessageHandler?.(new MessageEvent('message', {
        data: JSON.stringify(updateMessage)
      }));

      // Should update existing data
      expect(screen.getByTestId('contract-1')).toHaveTextContent('Contract 1: 2500');
      expect(screen.getByTestId('contract-2')).toHaveTextContent('Contract 2: 500');
    });

    it('should support different update strategies (merge, replace, append)', async () => {
      const MergeTestConsumer = () => {
        const { data, updateStrategy } = useLiveData('transactions', {
          updateStrategy: 'merge',
          mergeKey: 'id'
        });

        return (
          <div>
            <div data-testid="strategy">{updateStrategy}</div>
            <div data-testid="count">{data?.length || 0}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <MergeTestConsumer />
        </LiveDataProvider>
      );

      expect(screen.getByTestId('strategy')).toHaveTextContent('merge');
    });

    it('should handle partial data updates efficiently', async () => {
      let wsMessageHandler: ((event: MessageEvent) => void) | undefined;
      mockWsInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          wsMessageHandler = handler as (event: MessageEvent) => void;
        }
      });

      const PartialUpdateConsumer = () => {
        const { data, lastUpdate } = useLiveData('markets', {
          supportPartialUpdates: true
        });

        return (
          <div>
            <div data-testid="last-update">{lastUpdate?.timestamp}</div>
            <div data-testid="update-type">{lastUpdate?.type}</div>
            {data?.map(item => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {item.price}
              </div>
            ))}
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <PartialUpdateConsumer />
        </LiveDataProvider>
      );

      // Send partial update
      const partialUpdate = {
        type: 'PARTIAL_UPDATE',
        channel: 'markets',
        updates: [
          { op: 'update', id: '1', field: 'price', value: 150 },
          { op: 'insert', data: { id: '3', price: 200 } }
        ]
      };

      wsMessageHandler?.(new MessageEvent('message', {
        data: JSON.stringify(partialUpdate)
      }));

      expect(screen.getByTestId('update-type')).toHaveTextContent('PARTIAL_UPDATE');
    });
  });

  describe('Data Subscription Management', () => {
    it('should manage subscription lifecycle efficiently', async () => {
      const SubscriptionLifecycleTester = () => {
        const [subscribed, setSubscribed] = React.useState(false);
        const { data, isSubscribed } = useLiveData('governance', {
          subscribeToUpdates: subscribed
        });

        return (
          <div>
            <button onClick={() => setSubscribed(!subscribed)}>
              Toggle Subscription
            </button>
            <div data-testid="is-subscribed">{isSubscribed.toString()}</div>
            <div data-testid="data-available">{!!data}</div>
          </div>
        );
      };

      const user = userEvent.setup();
      
      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <SubscriptionLifecycleTester />
        </LiveDataProvider>
      );

      // Should not be subscribed initially
      expect(screen.getByTestId('is-subscribed')).toHaveTextContent('false');

      // Subscribe
      await user.click(screen.getByText('Toggle Subscription'));
      
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SUBSCRIBE',
          channel: 'governance'
        })
      );
      expect(screen.getByTestId('is-subscribed')).toHaveTextContent('true');

      // Unsubscribe
      await user.click(screen.getByText('Toggle Subscription'));
      
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'UNSUBSCRIBE',
          channel: 'governance'
        })
      );
      expect(screen.getByTestId('is-subscribed')).toHaveTextContent('false');
    });

    it('should handle subscription conflicts and priorities', async () => {
      const ConflictTester = () => {
        const subscription1 = useLiveData('contracts', { 
          priority: 'high',
          filters: { status: 'active' }
        });
        const subscription2 = useLiveData('contracts', { 
          priority: 'low',
          filters: { status: 'inactive' }
        });

        return (
          <div>
            <div data-testid="sub1-active">{subscription1.isSubscribed.toString()}</div>
            <div data-testid="sub2-active">{subscription2.isSubscribed.toString()}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <ConflictTester />
        </LiveDataProvider>
      );

      // Higher priority subscription should be active
      expect(screen.getByTestId('sub1-active')).toHaveTextContent('true');
      // Lower priority should be queued/merged
      expect(screen.getByTestId('sub2-active')).toHaveTextContent('false');
    });

    it('should optimize subscriptions by merging compatible requests', async () => {
      const OptimizationTester = () => {
        const sub1 = useLiveData('markets', { filters: { type: 'spot' } });
        const sub2 = useLiveData('markets', { filters: { type: 'futures' } });
        const sub3 = useLiveData('markets'); // No filters - should merge all

        return (
          <div>
            <div data-testid="active-subscriptions">{sub1.activeSubscriptions}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <OptimizationTester />
        </LiveDataProvider>
      );

      // Should merge compatible subscriptions
      expect(mockWsInstance.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'SUBSCRIBE',
          channel: 'markets',
          filters: {} // Merged to no filters to cover all cases
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle WebSocket connection errors gracefully', async () => {
      mockWsInstance.readyState = WebSocket.CLOSED;
      
      const ErrorTester = () => {
        const { data, error, connectionStatus } = useLiveData('contracts');
        
        return (
          <div>
            <div data-testid="connection-status">{connectionStatus}</div>
            <div data-testid="error-message">{error?.message || 'none'}</div>
            <div data-testid="has-data">{!!data}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <ErrorTester />
        </LiveDataProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
    });

    it('should fall back to polling when WebSocket is unavailable', async () => {
      mockWebSocket.mockImplementation(() => {
        throw new Error('WebSocket not supported');
      });

      const FallbackTester = () => {
        const { data, connectionMode } = useLiveData('governance', {
          fallbackToPolling: true,
          pollingInterval: 5000
        });

        return (
          <div>
            <div data-testid="connection-mode">{connectionMode}</div>
            <div data-testid="data-count">{data?.length || 0}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <FallbackTester />
        </LiveDataProvider>
      );

      expect(screen.getByTestId('connection-mode')).toHaveTextContent('polling');
      
      // Should use fetch for polling
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/bridge/governance')
      );
    });

    it('should cache data during connection outages', async () => {
      const mockInitialData = [{ id: '1', name: 'Test' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockInitialData })
      });

      const CacheTester = () => {
        const { data, isCached, connectionStatus } = useLiveData('identity', {
          cacheData: true,
          cacheTimeout: 300000 // 5 minutes
        });

        return (
          <div>
            <div data-testid="is-cached">{isCached.toString()}</div>
            <div data-testid="connection-status">{connectionStatus}</div>
            <div data-testid="data-count">{data?.length || 0}</div>
          </div>
        );
      };

      const { rerender } = render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <CacheTester />
        </LiveDataProvider>
      );

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByTestId('data-count')).toHaveTextContent('1');
        expect(screen.getByTestId('is-cached')).toHaveTextContent('false');
      });

      // Simulate connection failure
      mockWsInstance.readyState = WebSocket.CLOSED;
      
      rerender(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <CacheTester />
        </LiveDataProvider>
      );

      // Should show cached data
      expect(screen.getByTestId('data-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-cached')).toHaveTextContent('true');
    });

    it('should implement exponential backoff for failed reconnections', async () => {
      const reconnectDelays: number[] = [];
      
      const BackoffTester = () => {
        const { reconnect } = useBridgeConnection();
        
        React.useEffect(() => {
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = ((callback: Function, delay: number) => {
            if (delay > 0) {
              reconnectDelays.push(delay);
            }
            return originalSetTimeout(callback, 0);
          }) as any;
          
          return () => {
            global.setTimeout = originalSetTimeout;
          };
        }, []);

        return (
          <div>
            <button onClick={reconnect}>Force Reconnect</button>
          </div>
        );
      };

      mockWsInstance.readyState = WebSocket.CLOSED;
      mockWebSocket.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const user = userEvent.setup();
      
      render(
        <LiveDataProvider 
          bridgeUrl={mockBridgeUrl}
          maxReconnectAttempts={3}
        >
          <BackoffTester />
        </LiveDataProvider>
      );

      // Trigger multiple reconnection attempts
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByText('Force Reconnect'));
      }

      // Should use exponential backoff: 1s, 2s, 4s
      expect(reconnectDelays).toEqual([1000, 2000, 4000]);
    });
  });

  describe('Performance Optimization', () => {
    it('should batch multiple data subscriptions', async () => {
      const BatchTester = () => {
        const contracts = useLiveData('contracts');
        const markets = useLiveData('markets');
        const governance = useLiveData('governance');

        return (
          <div>
            <div data-testid="contracts-subscribed">{contracts.isSubscribed.toString()}</div>
            <div data-testid="markets-subscribed">{markets.isSubscribed.toString()}</div>
            <div data-testid="governance-subscribed">{governance.isSubscribed.toString()}</div>
          </div>
        );
      };

      render(
        <LiveDataProvider 
          bridgeUrl={mockBridgeUrl}
          batchSubscriptions={true}
          batchDelay={100}
        >
          <BatchTester />
        </LiveDataProvider>
      );

      // Should batch subscription requests
      await waitFor(() => {
        expect(mockWsInstance.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'BATCH_SUBSCRIBE',
            channels: ['contracts', 'markets', 'governance']
          })
        );
      }, { timeout: 200 });
    });

    it('should implement efficient data diffing to minimize re-renders', async () => {
      const renderCount = { current: 0 };
      
      const DiffTester = () => {
        renderCount.current++;
        const { data } = useLiveData('contracts');
        
        return (
          <div data-testid="render-count">{renderCount.current}</div>
        );
      };

      let wsMessageHandler: ((event: MessageEvent) => void) | undefined;
      mockWsInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
        if (event === 'message') {
          wsMessageHandler = handler as (event: MessageEvent) => void;
        }
      });

      render(
        <LiveDataProvider bridgeUrl={mockBridgeUrl}>
          <DiffTester />
        </LiveDataProvider>
      );

      const initialRenderCount = renderCount.current;

      // Send identical data update
      wsMessageHandler?.(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'DATA_UPDATE',
          channel: 'contracts',
          data: [] // Same as initial empty data
        })
      }));

      // Should not trigger re-render for identical data
      expect(renderCount.current).toBe(initialRenderCount);

      // Send actual data change
      wsMessageHandler?.(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'DATA_UPDATE',
          channel: 'contracts',
          data: [{ id: '1', name: 'New Contract' }]
        })
      }));

      // Should trigger re-render for changed data
      expect(renderCount.current).toBe(initialRenderCount + 1);
    });
  });
});