import { useState, useRef, useEffect } from 'react';
import { GlobalSearch } from './GlobalSearch';

interface NavProps {
  view: 'dashboard' | 'fibers' | 'identity' | 'contracts';
  setView: (view: 'dashboard' | 'fibers' | 'identity' | 'contracts') => void;
  onAgentSelect?: (address: string) => void;
  onFiberSelect?: (fiberId: string) => void;
}

type Network = 'mainnet' | 'testnet' | 'devnet';

const networks: { id: Network; label: string; color: string }[] = [
  { id: 'mainnet', label: 'Mainnet', color: 'green' },
  { id: 'testnet', label: 'Testnet', color: 'yellow' },
  { id: 'devnet', label: 'Devnet', color: 'blue' },
];

export function Nav({ view, setView, onAgentSelect, onFiberSelect }: NavProps) {
  const [network, setNetwork] = useState<Network>('devnet');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const networkRef = useRef<HTMLDivElement>(null);

  // Click outside handler for network menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (networkRef.current && !networkRef.current.contains(e.target as Node)) {
        setShowNetworkMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAgentSelect = (address: string) => {
    setView('identity');
    onAgentSelect?.(address);
  };

  const handleFiberSelect = (fiberId: string) => {
    setView('fibers');
    onFiberSelect?.(fiberId);
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
        
        {/* Global Search (searches fibers, agents, transitions) */}
        <GlobalSearch
          onAgentSelect={handleAgentSelect}
          onFiberSelect={handleFiberSelect}
          className="flex-1 max-w-xl"
        />
        
        {/* Mobile hamburger */}
        <button 
          className="lg:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
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

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-14 bg-[var(--bg)] z-40 p-6">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setView('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`text-sm font-medium transition-colors ${
                  view === 'dashboard' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => {
                  setView('fibers');
                  setMobileMenuOpen(false);
                }}
                className={`text-sm font-medium transition-colors ${
                  view === 'fibers' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                🧬 Fibers
              </button>
              <button
                onClick={() => {
                  setView('identity');
                  setMobileMenuOpen(false);
                }}
                className={`text-sm font-medium transition-colors ${
                  view === 'identity' ? 'text-white' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                🆔 Identity
              </button>
              <button
                onClick={() => {
                  setView('contracts');
                  setMobileMenuOpen(false);
                }}
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
              <div ref={networkRef} className="relative mt-4">
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
        )}
      </div>
    </nav>
  );
}
