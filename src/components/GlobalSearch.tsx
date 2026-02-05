import { useState, useEffect, useRef, useCallback } from 'react';
import { gql } from '@apollo/client/core';
import { useLazyQuery } from '@apollo/client/react';
import { CopyAddress } from './CopyAddress';

const SEARCH_QUERY = gql`
  query Search($query: String!, $limit: Int) {
    search(query: $query, limit: $limit) {
      fibers {
        fiberId
        workflowType
        currentState
        owners
      }
      agents {
        address
        displayName
        reputation
        platform
      }
      transitions {
        id
        fiberId
        eventName
        fromState
        toState
        createdAt
      }
    }
  }
`;

interface SearchResult {
  fibers: Array<{
    fiberId: string;
    workflowType: string;
    currentState: string;
    owners: string[];
  }>;
  agents: Array<{
    address: string;
    displayName: string | null;
    reputation: number;
    platform: string | null;
  }>;
  transitions: Array<{
    id: string;
    fiberId: string;
    eventName: string;
    fromState: string;
    toState: string;
    createdAt: string;
  }>;
}

interface GlobalSearchProps {
  onFiberSelect?: (fiberId: string) => void;
  onAgentSelect?: (address: string) => void;
  className?: string;
}

export function GlobalSearch({ onFiberSelect, onAgentSelect, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [search, { data, loading }] = useLazyQuery<{ search: SearchResult }>(SEARCH_QUERY);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) return;
    
    const timer = setTimeout(() => {
      search({ variables: { query, limit: 10 } });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFiberClick = useCallback((fiberId: string) => {
    onFiberSelect?.(fiberId);
    setIsOpen(false);
    setQuery('');
  }, [onFiberSelect]);

  const handleAgentClick = useCallback((address: string) => {
    onAgentSelect?.(address);
    setIsOpen(false);
    setQuery('');
  }, [onAgentSelect]);

  const results = data?.search;
  const hasResults = results && (
    results.fibers.length > 0 || 
    results.agents.length > 0 || 
    results.transitions.length > 0
  );

  const getWorkflowColor = (type: string) => {
    switch (type) {
      case 'AgentIdentity': return 'text-purple-400';
      case 'Contract': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search fibers, agents, addresses..."
          className="w-full px-4 py-2 pl-10 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs bg-[var(--bg)] border border-[var(--border)] rounded text-[var(--text-muted)]">
          ⌘K
        </kbd>
      </div>

      {/* Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-96 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-[var(--text-muted)]">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-[var(--text-muted)]">
              No results found
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {/* Fibers */}
              {results.fibers.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)]">
                    Fibers
                  </div>
                  {results.fibers.map((fiber) => (
                    <button
                      key={fiber.fiberId}
                      onClick={() => handleFiberClick(fiber.fiberId)}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${getWorkflowColor(fiber.workflowType)}`}>
                          {fiber.workflowType}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {fiber.currentState}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[var(--text-muted)] truncate">
                        {fiber.fiberId}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Agents */}
              {results.agents.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)]">
                    Agents
                  </div>
                  {results.agents.map((agent) => (
                    <button
                      key={agent.address}
                      onClick={() => handleAgentClick(agent.address)}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {agent.displayName || 'Unnamed Agent'}
                        </span>
                        <span className="text-xs text-[var(--accent)]">
                          ⭐ {agent.reputation}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        <CopyAddress address={agent.address} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Transitions */}
              {results.transitions.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)]">
                    Transitions
                  </div>
                  {results.transitions.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => handleFiberClick(tx.fiberId)}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{tx.eventName}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {tx.fromState} → {tx.toState}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[var(--text-muted)] truncate">
                        {tx.fiberId}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
