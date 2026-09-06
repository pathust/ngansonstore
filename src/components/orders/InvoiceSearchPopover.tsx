import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

export interface InvoiceSearchParams {
  code: string;
  productKeyword: string;
  customerKeyword: string;
}

interface InvoiceSearchPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  searchParams: InvoiceSearchParams;
  onChangeParams: (params: InvoiceSearchParams) => void;
  onSearch: () => void;
  onReset?: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export const InvoiceSearchPopover: React.FC<InvoiceSearchPopoverProps> = ({
  isOpen,
  onClose,
  searchParams,
  onChangeParams,
  onSearch,
  onReset,
  containerRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!containerRef?.current || !containerRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, containerRef]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 w-full min-w-[340px] max-w-[420px] animate-in fade-in zoom-in-95 duration-150 text-xs"
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="space-y-2.5">
        {/* Field 1: Theo mã hóa đơn */}
        <div>
          <input
            type="text"
            value={searchParams.code}
            onChange={(e) => onChangeParams({ ...searchParams, code: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Theo mã hóa đơn"
            className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-lg focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all placeholder:text-slate-400"
            autoFocus
          />
        </div>

        {/* Field 2: Theo mã, tên hàng */}
        <div>
          <input
            type="text"
            value={searchParams.productKeyword}
            onChange={(e) => onChangeParams({ ...searchParams, productKeyword: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Theo mã, tên hàng"
            className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-lg focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Field 3: Theo mã, tên, số điện thoại khách hàng */}
        <div>
          <input
            type="text"
            value={searchParams.customerKeyword}
            onChange={(e) => onChangeParams({ ...searchParams, customerKeyword: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Theo mã, tên, số điện thoại khách hàng"
            className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-lg focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Footer: Mở rộng / Đặt lại (trái) & Tìm kiếm (phải) */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
        {onReset && (searchParams.code || searchParams.productKeyword || searchParams.customerKeyword) ? (
          <button
            type="button"
            onClick={() => {
              onReset();
            }}
            className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer transition-colors"
          >
            Xóa tìm kiếm
          </button>
        ) : (
          <span className="text-slate-400 text-[11px]">Nhấn Enter để tìm</span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onSearch();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#2d4f82] hover:bg-[#233d65] active:bg-[#1a2e4c] text-white font-bold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm kiếm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
