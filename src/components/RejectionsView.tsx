import { useState, useEffect, useCallback } from 'react';
import config from '../config';

// Types for rejection data
interface ValidationError {
  code: string;
  message: string;
}

interface RejectedTransaction {
  id: number;
  ordinal: number;
  timestamp: string;
  updateType: string;
  fiberId: string;
  updateHash: string;
  errors: ValidationError[];
  signers: string[];
  createdAt: string;
}

interface RejectionsResponse {
  rejections: RejectedTransaction[];
  total: number;
  hasMore: boolean;
}

// Get indexer URL from runtime config
const INDEXER_URL = config.INDEXER_URL;

// ──────────────────────────────────────────────────────────────────────────────
// URL state helpers
// ──────────────────────────────────────────────────────────────────────────────

function readUrlParams(): {
  type: string;
  fiberId: string;
  signer: string;
  from: string;
  to: string;
} {
  const p = new URLSearchParams(window.location.search);
  return {
    type:    p.get('type')    ?? '',
    fiberId: p.get('fiberId') ?? '',
    signer:  p.get('signer')  ?? '',
    from:    p.get('from')    ?? '',
    to:      p.get('to')      ?? '',
  };
}

function syncUrlParams(filters: {
  type: string;
  fiberId: string;
  signer: string;
  from: string;
  to: string;
}) {
  const p = new URLSearchParams();
  if (filters.type)    p.set('type',    filters.type);
  if (filters.fiberId) p.set('fiberId', filters.fiberId);
  if (filters.signer)  p.set('signer',  filters.signer);
  if (filters.from)    p.set('from',    filters.from);
  if (filters.to)      p.set('to',      filters.to);
  const qs = p.toString();
  // replaceState instead of pushState: filter changes shouldn't fill
  // the browser history with one entry per keystroke (AC13).
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

interface RejectionsViewProps {
  onFiberSelect?: (fiberId: string) => void;
}

export function RejectionsView({ onFiberSelect }: RejectionsViewProps) {
  // Initialise filter state from URL params (AC14 — pre-populate on reload)
  const initialParams = readUrlParams();

  const [rejections, setRejections] = useState<RejectedTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [filterType,     setFilterType]     = useState<string>(initialParams.type);
  const [filterFiberId,  setFilterFiberId]  = useState<string>(initialParams.fiberId);
  const [filterSigner,   setFilterSigner]   = useState<string>(initialParams.signer);
  const [filterDateFrom, setFilterDateFrom] = useState<string>(initialParams.from);
  const [filterDateTo,   setFilterDateTo]   = useState<string>(initialParams.to);

  // Selected rejection for detail view
  const [selectedRejection, setSelectedRejection] = useState<RejectedTransaction | null>(null);

  const limit = 20;

  // Sync URL whenever filters change (AC13)
  useEffect(() => {
    syncUrlParams({
      type:    filterType,
      fiberId: filterFiberId,
      signer:  filterSigner,
      from:    filterDateFrom,
      to:      filterDateTo,
    });
  }, [filterType, filterFiberId, filterSigner, filterDateFrom, filterDateTo]);

  const fetchRejections = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams();
      params.set('limit',  String(limit));
      params.set('offset', String(currentOffset));
      if (filterType)     params.set('updateType',     filterType);
      if (filterFiberId)  params.set('fiberId',         filterFiberId);
      if (filterSigner)   params.set('signer',          filterSigner);   // AC8
      if (filterDateFrom) params.set('timestamp_from',  new Date(filterDateFrom).toISOString()); // AC10
      if (filterDateTo)   params.set('timestamp_to',    new Date(filterDateTo).toISOString());   // AC11

      const response = await fetch(`${INDEXER_URL}/rejections?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data: RejectionsResponse = await response.json();

      if (reset) {
        setRejections(data.rejections);
        setOffset(0);
      } else {
        setRejections(data.rejections);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rejections');
    } finally {
      setLoading(false);
    }
  }, [offset, filterType, filterFiberId, filterSigner, filterDateFrom, filterDateTo]);

  // Refetch on filter change; resets offset to 0 (AC16).
  // fetchRejections(true) already passes currentOffset=0 internally,
  // so we don't call setOffset(0) here — that would trigger the
  // pagination useEffect and cause a double-fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchRejections(true);
  }, [filterType, filterFiberId, filterSigner, filterDateFrom, filterDateTo]);

  // Refetch on offset change (pagination)
  useEffect(() => {
    if (offset > 0) {
      fetchRejections(false);
    }
  }, [offset, fetchRejections]);

  const handleNextPage = () => {
    if (hasMore) setOffset(prev => prev + limit);
  };

  const handlePrevPage = () => {
    if (offset > 0) setOffset(prev => Math.max(0, prev - limit));
  };

  // Clear all filters and URL params (AC15)
  const handleClearFilters = () => {
    setFilterType('');
    setFilterFiberId('');
    setFilterSigner('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const shortenHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const getErrorBadgeColor = (code: string) => {
    if (code.includes('NotSigned') || code.includes('Owner')) return 'bg-red-500/20 text-red-400';
    if (code.includes('NotFound')  || code.includes('Nothing')) return 'bg-yellow-500/20 text-yellow-400';
    if (code.includes('Invalid'))  return 'bg-orange-500/20 text-orange-400';
    return 'bg-purple-500/20 text-purple-400';
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'CreateStateMachine':    return '🆕';
      case 'TransitionStateMachine': return '🔄';
      case 'ArchiveStateMachine':   return '📦';
      case 'CreateScript':          return '📜';
      case 'InvokeScript':          return '▶️';
      default:                      return '❓';
    }
  };

  const updateTypes = ['CreateStateMachine', 'TransitionStateMachine', 'ArchiveStateMachine', 'CreateScript', 'InvokeScript'];
  const hasActiveFilters = filterType || filterFiberId || filterSigner || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⛔</span> Rejected Transactions
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Transactions accepted by DL1 but rejected during ML0 validation
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)]">Total:</span>
          <span className="text-white font-medium">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Filters — two-row responsive grid */}
      <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] space-y-3">
        {/* Row 1: Update Type | Fiber ID | Signer Address */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Update Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              data-testid="filter-type"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">All Types</option>
              {updateTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Fiber ID</label>
            <input
              type="text"
              value={filterFiberId}
              onChange={(e) => setFilterFiberId(e.target.value)}
              placeholder="Enter fiber UUID..."
              data-testid="filter-fiber-id"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Signer Address</label>
            <input
              type="text"
              value={filterSigner}
              onChange={(e) => setFilterSigner(e.target.value)}
              placeholder="DAG address (exact match)..."
              data-testid="filter-signer"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        {/* Row 2: Date From | Date To | Clear */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[var(--text-muted)] mb-1">From</label>
            <input
              type="datetime-local"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              data-testid="filter-date-from"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs text-[var(--text-muted)] mb-1">To</label>
            <input
              type="datetime-local"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              data-testid="filter-date-to"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              data-testid="filter-clear"
              className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          <p className="font-medium">Failed to load rejections</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchRejections(true)}
            className="mt-2 px-3 py-1 bg-red-500/20 rounded text-sm hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && rejections.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin text-2xl">⏳</div>
        </div>
      )}

      {/* Empty state (AC17) */}
      {!loading && !error && rejections.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-[var(--text-muted)]">No rejected transactions found</p>
          {hasActiveFilters && (
            <p className="text-sm text-[var(--text-muted)] mt-2">Try adjusting your filters</p>
          )}
        </div>
      )}

      {/* Rejections list */}
      {rejections.length > 0 && (
        <div className="space-y-3">
          {rejections.map((rejection) => (
            <div
              key={rejection.id}
              onClick={() => setSelectedRejection(rejection)}
              className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-red-500/30 transition-colors cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Type & Fiber */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getUpdateTypeIcon(rejection.updateType)}</span>
                    <span className="font-medium text-white">{rejection.updateType}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFiberSelect?.(rejection.fiberId);
                    }}
                    className="text-sm text-[var(--accent)] hover:underline font-mono"
                  >
                    {shortenHash(rejection.fiberId)}
                  </button>
                </div>

                {/* Errors */}
                <div className="flex flex-wrap gap-1">
                  {rejection.errors.slice(0, 3).map((err, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getErrorBadgeColor(err.code)}`}
                    >
                      {err.code}
                    </span>
                  ))}
                  {rejection.errors.length > 3 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--bg)] text-[var(--text-muted)]">
                      +{rejection.errors.length - 3} more
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-right text-sm">
                  <div className="text-[var(--text-muted)]">
                    Ordinal {rejection.ordinal.toLocaleString()}
                  </div>
                  <div className="text-[var(--text-muted)] text-xs">
                    {formatDate(rejection.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <button
            onClick={handlePrevPage}
            disabled={offset === 0}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--accent)] transition-colors"
          >
            ← Previous
          </button>

          <span className="text-sm text-[var(--text-muted)]">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>

          <button
            onClick={handleNextPage}
            disabled={!hasMore}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--accent)] transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRejection && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedRejection(null)}
        >
          <div
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{getUpdateTypeIcon(selectedRejection.updateType)}</span>
                {selectedRejection.updateType}
              </h3>
              <button
                onClick={() => setSelectedRejection(null)}
                className="text-[var(--text-muted)] hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Fiber ID */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Fiber ID</label>
                <button
                  onClick={() => {
                    onFiberSelect?.(selectedRejection.fiberId);
                    setSelectedRejection(null);
                  }}
                  className="font-mono text-[var(--accent)] hover:underline"
                >
                  {selectedRejection.fiberId}
                </button>
              </div>

              {/* Update Hash */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Update Hash</label>
                <code className="font-mono text-sm text-white break-all">
                  {selectedRejection.updateHash}
                </code>
              </div>

              {/* Ordinal & Timestamp */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Ordinal</label>
                  <span className="text-white">{selectedRejection.ordinal.toLocaleString()}</span>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">Timestamp</label>
                  <span className="text-white">{formatDate(selectedRejection.timestamp)}</span>
                </div>
              </div>

              {/* Signers */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">
                  Signers ({selectedRejection.signers.length})
                </label>
                <div className="space-y-1">
                  {selectedRejection.signers.map((signer, i) => (
                    <code key={i} className="block font-mono text-xs text-white break-all bg-[var(--bg)] p-2 rounded">
                      {signer}
                    </code>
                  ))}
                </div>
              </div>

              {/* Errors */}
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-2">
                  Validation Errors ({selectedRejection.errors.length})
                </label>
                <div className="space-y-2">
                  {selectedRejection.errors.map((err, i) => (
                    <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${getErrorBadgeColor(err.code)}`}>
                        {err.code}
                      </div>
                      <p className="text-sm text-white">{err.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
