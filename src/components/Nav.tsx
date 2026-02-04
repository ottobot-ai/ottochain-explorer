import { useState, useRef, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { SEARCH_AGENTS, type Agent } from '../lib/queries';

interface NavProps {
  view: 'dashboard' | 'fibers' | 'identity' | 'contracts';
  setView: (view: 'dashboard' | 'fibers' | 'identity' | 'contracts') => void;
  onAgentSelect?: (address: string) => void;
}

type Network = 'mainnet' | 'testnet' | 'devnet';

const networks: { id: Network; label: string; color: string }[] = [
  { id: 'mainnet', label: 'Mainnet', color: 'green' },
  { id: 'testnet', label: 'Testnet', color: 'yellow' },
  { id: 'devnet', label: 'Devnet', color: 'blue' },
];

export function Nav({ view, setView, onAgentSelect }: NavProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [network, setNetwork] = useState<Network>('devnet');
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);

  const [searchAgents, { data: searchData, loading: searchLoading }] = useLazyQuery<{ searchAgents: Agent[] }>(SEARCH_AGENTS);

  // Debounced search
  useEffect(() => {
    if (search.length >= 2) {
      const timer = setTimeout(() => {
        searchAgents({ variables: { query: search } });
        setShowResults(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowResults(false);
    }
  }, [search, searchAgents]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (networkRef.current && !networkRef.current.contains(e.target as Node)) {
        setShowNetworkMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (address: string) => {
    setSearch('');
    setShowResults(false);
    setView('identity');
    onAgentSelect?.(address);
  };

  const currentNetwork = networks.find(n => n.id === network)!;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-3 bg-[rgba(10,10,15,0.9)] backdrop-blur-xl border-b border-[var(--border)]">
      <div className="container mx-auto px-6 flex justify-between items-center gap-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 text-white font-bold text-xl flex-shrink-0">
          <span className="text-2xl">🦦</span>
          <span>OttoChain</span>
        </a>
        
        {/* Search Bar */}
        <div ref={searchRef} className="flex-1 max-w-xl relative">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.length >= 2 && setShowResults(true)}
              placeholder="Search agents by name or address..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {searchLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">
                ...
              </span>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-50">
              {searchData?.searchAgents?.length ? (
                <ul>
                  {searchData.searchAgents.slice(0, 5).map((agent: Agent) => (
                    <li key={agent.address}>
                      <button
                        onClick={() => handleSelect(agent.address)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-card)] transition-colors text-left"
                      >
                        <div>
                          <span className="text-white font-medium">
                            {agent.displayName || agent.address.slice(0, 12) + '...'}
                          </span>
                          <span className="text-[var(--text-muted)] text-xs ml-2">
                            {agent.address.slice(0, 8)}...{agent.address.slice(-6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            agent.state === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                            agent.state === 'PROBATION' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {agent.state}
                          </span>
                          <span className="text-[var(--accent)] font-medium">
                            {agent.reputation}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-[var(--text-muted)] text-sm text-center">
                  {search.length >= 2 ? 'No agents found' : 'Type to search...'}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Nav Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setView('dashboard')}
            className={`text-sm font-medium transition-colors ${
              view === 'dashboard' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setView('fibers')}
            className={`text-sm font-medium transition-colors ${
              view === 'fibers' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            🧬 Fibers
          </button>
          <button
            onClick={() => setView('identity')}
            className={`text-sm font-medium transition-colors ${
              view === 'identity' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            🆔 Identity
          </button>
          <button
            onClick={() => setView('contracts')}
            className={`text-sm font-medium transition-colors ${
              view === 'contracts' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
            }`}
          >
            📝 Contracts
          </button>
          <a href="https://github.com/scasplte2/ottochain" target="_blank" rel="noopener" className="text-sm text-[var(--text-muted)] hover:text-white transition-colors">
            Docs
          </a>
          
          {/* Network Selector */}
          <div ref={networkRef} className="relative">
            <button
              onClick={() => setShowNetworkMenu(!showNetworkMenu)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${
                currentNetwork.color === 'green' 
                  ? 'bg-green-500/20 border-green-500/30 hover:bg-green-500/30' 
                  : currentNetwork.color === 'yellow'
                  ? 'bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30'
                  : 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                currentNetwork.color === 'green' ? 'bg-green-500' :
                currentNetwork.color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              <span className={`text-xs font-medium ${
                currentNetwork.color === 'green' ? 'text-green-400' :
                currentNetwork.color === 'yellow' ? 'text-yellow-400' : 'text-blue-400'
              }`}>
                {currentNetwork.label}
              </span>
              <span className="text-[var(--text-muted)] text-xs">▼</span>
            </button>
            
            {/* Network Dropdown */}
            {showNetworkMenu && (
              <div className="absolute top-full right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]">
                {networks.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => {
                      setNetwork(net.id);
                      setShowNetworkMenu(false);
                    }}
                    className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-[var(--bg-card)] transition-colors text-left ${
                      network === net.id ? 'bg-[var(--bg-card)]' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      net.color === 'green' ? 'bg-green-500' :
                      net.color === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm text-white">{net.label}</span>
                    {network === net.id && (
                      <span className="ml-auto text-[var(--accent)]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
