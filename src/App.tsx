import { useState, useEffect, useCallback } from 'react';
import { useData } from './lib/DataProvider';
import { Nav } from './components/Nav';
import { StatsCards } from './components/StatsCards';
import { TransactionsTable } from './components/TransactionsTable';
import { LiveActivity } from './components/LiveActivity';
import { TopAgents } from './components/TopAgents';
import { AgentModal } from './components/AgentModal';
import { AttestationModal } from './components/AttestationModal';
import { ContractsView } from './components/ContractsView';
import { FibersView } from './components/FibersView';
import { IdentityView } from './components/IdentityView';
import { StatusBar } from './components/StatusBar';
import { InteractionGraph } from './components/InteractionGraph';
// Simplified attestation data for modal display
interface AttestationModalData {
  id: string;
  type: string;
  delta: number;
  reason: string | null;
  createdAt: string;
  txHash: string;
  agent: { address: string; displayName: string | null };
  issuer?: { address: string; displayName: string | null } | null;
}

// Parse URL hash for deep linking
function parseHash(): { view: string; agent?: string; fiber?: string } {
  const hash = window.location.hash.slice(1); // Remove #
  if (!hash) return { view: 'dashboard' };
  
  const parts = hash.split('/');
  if (parts[0] === 'agent' && parts[1]) {
    return { view: 'dashboard', agent: parts[1] };
  }
  if (parts[0] === 'fiber' && parts[1]) {
    return { view: 'fibers', fiber: parts[1] };
  }
  if (['dashboard', 'fibers', 'identity', 'contracts'].includes(parts[0])) {
    return { view: parts[0] };
  }
  return { view: 'dashboard' };
}

function App() {
  const [view, setView] = useState<'dashboard' | 'fibers' | 'identity' | 'contracts'>('dashboard');
  const [modalAgent, setModalAgent] = useState<string | null>(null);
  const [modalAttestation, setModalAttestation] = useState<AttestationModalData | null>(null);
  const [selectedFiber, setSelectedFiber] = useState<string | null>(null);
  
  // Use shared data from background polling
  const { data, isLoading, refresh, autoUpdate, setAutoUpdate } = useData();
  const currentStats = data.stats;

  // Update URL hash when view/modal changes
  const updateHash = (newHash: string) => {
    window.history.pushState(null, '', `#${newHash}`);
  };

  // Declare handlers BEFORE useEffects that reference them
  // Wrapped in useCallback to prevent unnecessary re-renders
  const handleViewChange = useCallback((newView: typeof view) => {
    setView(newView);
    setSelectedFiber(null);
    updateHash(newView);
  }, []);

  const handleAgentClick = useCallback((address: string) => {
    setModalAgent(address);
    updateHash(`agent/${address}`);
  }, []);

  const handleAgentClose = useCallback(() => {
    setModalAgent(null);
    updateHash(view);
  }, [view]);

  const handleAttestationClick = (attestation: AttestationModalData) => {
    setModalAttestation(attestation);
  };

  const handleFiberSelect = (fiberId: string) => {
    setSelectedFiber(fiberId);
    setView('fibers');
    updateHash(`fiber/${fiberId}`);
  };

  // Handle URL hash changes for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHash();
      if (parsed.agent) {
        setModalAgent(parsed.agent);
      }
      if (parsed.fiber) {
        setSelectedFiber(parsed.fiber);
        setView('fibers');
      }
      if (parsed.view && !parsed.agent && !parsed.fiber) {
        setView(parsed.view as typeof view);
      }
    };
    
    // Initial parse
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Escape closes modals
      if (e.key === 'Escape') {
        if (modalAttestation) {
          setModalAttestation(null);
        } else if (modalAgent) {
          handleAgentClose();
        }
        return;
      }
      
      // Ctrl/Cmd + K opens search (handled by GlobalSearch)
      // Number keys for navigation (when no modals open)
      if (!modalAgent && !modalAttestation) {
        switch (e.key) {
          case '1':
            handleViewChange('dashboard');
            break;
          case '2':
            handleViewChange('fibers');
            break;
          case '3':
            handleViewChange('identity');
            break;
          case '4':
            handleViewChange('contracts');
            break;
          case 'r':
            if (!e.metaKey && !e.ctrlKey) {
              refresh();
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAgent, modalAttestation, refresh, handleAgentClose, handleViewChange]);

  return (
    <div className="min-h-screen pb-12">
      <Nav view={view} setView={handleViewChange} onAgentSelect={handleAgentClick} onFiberSelect={handleFiberSelect} />
      
      <main className="container mx-auto px-6 pt-24 pb-16">
        {/* Live indicator with controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className={`live-dot ${!autoUpdate ? 'opacity-30' : ''}`}></div>
            <span className="text-sm text-[var(--green)] font-medium">
              {autoUpdate ? 'Live' : 'Paused'} — Snapshot #{currentStats?.lastSnapshotOrdinal ?? '...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-[var(--bg-elevated)] hover:bg-[var(--accent)] rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? '↻' : '⟳'} Refresh
            </button>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => setAutoUpdate(e.target.checked)}
                className="rounded"
              />
              Auto-update
            </label>
          </div>
        </div>

        {view === 'dashboard' && (
          <>
            {/* Enhanced Stats Cards */}
            <StatsCards stats={currentStats ?? undefined} loading={isLoading && !currentStats} />
            
            {/* Main content: Transactions + Sidebars */}
            <div className="flex gap-6 mt-6">
              {/* Transactions Table (main area) */}
              <TransactionsTable 
                contracts={data.contracts} 
                activity={data.activity}
                onAgentClick={handleAgentClick} 
              />
              
              {/* Right sidebar */}
              <div className="flex flex-col gap-6 w-80 flex-shrink-0">
                <LiveActivity 
                  activity={data.activity} 
                  onAgentClick={handleAgentClick}
                  onAttestationClick={handleAttestationClick}
                  onFiberClick={handleFiberSelect}
                />
                <TopAgents agents={data.leaderboard} onAgentClick={handleAgentClick} />
              </div>
            </div>
            
            {/* Interaction Graph */}
            <div className="mt-6">
              <InteractionGraph onAgentClick={handleAgentClick} width={1100} height={500} />
            </div>
          </>
        )}
        
        {view === 'fibers' && (
          <FibersView initialFiberId={selectedFiber} />
        )}
        
        {view === 'identity' && (
          <IdentityView />
        )}
        
        {view === 'contracts' && (
          <ContractsView onAgentClick={handleAgentClick} />
        )}
      </main>

      {/* Status Bar */}
      <StatusBar snapshotOrdinal={currentStats?.lastSnapshotOrdinal || null} />

      {/* Agent Modal */}
      {modalAgent && (
        <AgentModal 
          address={modalAgent} 
          onClose={handleAgentClose}
          onFiberClick={(fiberId) => {
            handleAgentClose();
            handleFiberSelect(fiberId);
          }}
        />
      )}

      {/* Attestation Modal */}
      {modalAttestation && (
        <AttestationModal
          attestation={modalAttestation}
          onClose={() => setModalAttestation(null)}
          onAgentClick={handleAgentClick}
        />
      )}
    </div>
  );
}

export default App;
