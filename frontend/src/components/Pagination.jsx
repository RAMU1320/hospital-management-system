import { useEffect, useMemo, useState } from "react";

/**
 * Client-side pagination hook.
 * - Resets to page 1 whenever any value in `resetKeys` changes.
 * - Default page size = 10.
 */
export function usePagination(items, { pageSize = 10, resetKeys = [] } = {}) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, resetKeys);

  const total = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);

  const paged = useMemo(
    () => (items || []).slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [items, clampedPage, pageSize],
  );

  return {
    page: clampedPage,
    setPage,
    totalPages,
    total,
    pageSize,
    pageItems: paged,
  };
}

/**
 * Pagination controls. Hidden entirely when total <= pageSize.
 */
export default function Pagination({ page, totalPages, total, setPage, testid = "pagination" }) {
  if (total <= 0 || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 mt-4" data-testid={testid}>
      <div className="text-xs text-slate-500 tabular-nums">
        Showing page <span className="font-medium text-slate-900" data-testid={`${testid}-current`}>{page}</span> of{" "}
        <span className="font-medium text-slate-900" data-testid={`${testid}-total`}>{totalPages}</span>
        <span className="ml-2 text-slate-400">· {total} record{total === 1 ? "" : "s"}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          data-testid={`${testid}-prev`}
          className="px-3 py-1.5 rounded-md border border-slate-200 text-sm hover:border-blue-500 disabled:opacity-50 disabled:hover:border-slate-200"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          data-testid={`${testid}-next`}
          className="px-3 py-1.5 rounded-md border border-slate-200 text-sm hover:border-blue-500 disabled:opacity-50 disabled:hover:border-slate-200"
        >
          Next
        </button>
      </div>
    </div>
  );
}
