import { createContext, useContext, useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { NETWORK_STATS, AGENTS_LIST, CONTRACTS_LIST, RECENT_ACTIVITY, LEADERBOARD } from './queries';
import type { NetworkStats, Agent, Contract, ActivityEvent } from './queries';

// Re-export Contract type for other files that need it
export type { Contract };

interface DataState {
  stats: NetworkStats | null;
  agents: Agent[];
  contracts: Contract[];
  activity: ActivityEvent[];
  leaderboard: Agent[];
  lastUpdated: number;
  isStale: boolean;
}

interface DataContextValue {
  data: DataState;
  refresh: () => Promise<void>;
  isLoading: boolean;
  setAutoUpdate: (enabled: boolean) => void;
  autoUpdate: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

const POLL_INTERVAL = 5000; // 5 seconds background poll
const STALE_THRESHOLD = 3000; // Mark as stale after 3s for UI hints

export function DataProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const dataRef = useRef<DataState>({
    stats: null,
    agents: [],
    contracts: [],
    activity: [],
    leaderboard: [],
    lastUpdated: 0,
    isStale: false,
  });
  
  const [data, setData] = useState<DataState>(dataRef.current);
  const [isLoading, setIsLoading] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [statsRes, agentsRes, contractsRes, activityRes, leaderboardRes] = await Promise.all([
        client.query<{ networkStats: NetworkStats }>({ query: NETWORK_STATS, fetchPolicy: 'network-only' }),
        client.query<{ agents: Agent[] }>({ query: AGENTS_LIST, variables: { limit: 50 }, fetchPolicy: 'network-only' }),
        client.query<{ contracts: Contract[] }>({ query: CONTRACTS_LIST, variables: { limit: 30 }, fetchPolicy: 'network-only' }),
        client.query<{ recentActivity: ActivityEvent[] }>({ query: RECENT_ACTIVITY, variables: { limit: 20 }, fetchPolicy: 'network-only' }),
        client.query<{ leaderboard: Agent[] }>({ query: LEADERBOARD, variables: { limit: 10 }, fetchPolicy: 'network-only' }),
      ]);

      const newData: DataState = {
        stats: statsRes.data?.networkStats ?? null,
        agents: agentsRes.data?.agents ?? [],
        contracts: contractsRes.data?.contracts ?? [],
        activity: activityRes.data?.recentActivity ?? [],
        leaderboard: leaderboardRes.data?.leaderboard ?? [],
        lastUpdated: Date.now(),
        isStale: false,
      };

      // Update ref immediately (non-reactive)
      dataRef.current = newData;
      
      // Only trigger React state update (and re-renders) periodically
      setData(newData);
      
      return newData;
    } catch (err) {
      console.error('Failed to fetch data:', err);
      throw err;
    }
  }, [client]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchAllData();
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllData]);

  // Background polling loop
  useEffect(() => {
    // Initial fetch
    refresh();

    if (autoUpdate) {
      intervalRef.current = window.setInterval(() => {
        fetchAllData().catch(() => {
          // Mark as stale on error
          dataRef.current = { ...dataRef.current, isStale: true };
        });
      }, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoUpdate, fetchAllData, refresh]);

  // Mark data as stale periodically for UI hints
  useEffect(() => {
    const staleCheck = setInterval(() => {
      const timeSinceUpdate = Date.now() - dataRef.current.lastUpdated;
      if (timeSinceUpdate > STALE_THRESHOLD && !dataRef.current.isStale) {
        dataRef.current = { ...dataRef.current, isStale: true };
        // Don't trigger re-render for staleness alone
      }
    }, 1000);

    return () => clearInterval(staleCheck);
  }, []);

  return (
    <DataContext.Provider value={{ data, refresh, isLoading, autoUpdate, setAutoUpdate }}>
      {children}
    </DataContext.Provider>
  );
}

 
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

// Hook for components that want the latest ref value without triggering re-renders
 
export function useDataRef() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataRef must be used within DataProvider');
  
  const dataRef = useRef(ctx.data);
  
  // Update ref in effect to avoid render-phase mutation
  useEffect(() => {
    dataRef.current = ctx.data;
  }, [ctx.data]);
  
  return dataRef;
}
