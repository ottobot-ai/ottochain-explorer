import { useState } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * (pageSize ?? 0) + 1;
  const end = Math.min(page * (pageSize ?? 0), totalItems ?? 0);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
      <div className="text-xs text-[var(--text-muted)]">
        {totalItems && pageSize ? `${start}–${end} of ${totalItems}` : `Page ${page} of ${totalPages}`}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 text-xs rounded bg-[var(--bg-elevated)] hover:bg-[var(--accent)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Prev
        </button>
        {/* Show up to 5 page numbers */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-7 h-7 text-xs rounded transition-colors ${
                pageNum === page
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-elevated)] hover:bg-[var(--accent)]/20'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 py-1 text-xs rounded bg-[var(--bg-elevated)] hover:bg-[var(--accent)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  
  // Reset to page 1 if items change and current page is out of bounds
  const safePage = Math.min(page, totalPages);
  if (safePage !== page) setPage(safePage);

  const pagedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    setPage,
    totalPages,
    pagedItems,
    totalItems: items.length,
    pageSize,
  };
}
