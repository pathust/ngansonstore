import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'mục',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const fromItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const toItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (safePage < totalPages - 2) {
        pages.push('...');
      }
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`px-3 py-2.5 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600 select-none ${className}`}
    >
      {/* Left: Summary & Page Size selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="text-slate-600">
          Hiển thị{' '}
          <strong className="text-slate-900 font-semibold">
            {fromItem} - {toItem}
          </strong>{' '}
          trên{' '}
          <strong className="text-slate-900 font-semibold">{totalItems}</strong> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="hidden md:inline text-[11px]">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 font-semibold text-xs outline-none focus:border-[#0B63E5] cursor-pointer shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          title="Trang đầu"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev Page */}
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          title="Trang trước"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Desktop Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-medium select-none">
                  ...
                </span>
              );
            }
            const isActive = p === safePage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-1.5 rounded font-semibold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B63E5] text-white shadow-2xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Mobile Compact Page Display */}
        <div className="sm:hidden px-2 py-1 font-semibold text-slate-800 text-[11px] bg-white border border-slate-200 rounded">
          {safePage} / {totalPages}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          title="Trang kế tiếp"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          title="Trang cuối"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
