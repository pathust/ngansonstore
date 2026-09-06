import React, { useState } from 'react';
import {
  ChevronLeft,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  BookOpen,
  Package,
  ChevronDown,
  Trash2,
} from 'lucide-react';

import { useNotifications, AppNotification, formatRelativeTime } from '../../hooks/useNotifications';

type FilterType = 'ALL' | 'STOCK' | 'ORDER' | 'CASHBOOK' | 'AUDIT';

interface MobileNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE') => void;
}

const TYPE_LABELS: Record<FilterType, string> = {
  ALL: 'TẤT CẢ',
  STOCK: 'Hàng hoá',
  ORDER: 'Đơn hàng',
  CASHBOOK: 'Công nợ',
  AUDIT: 'Kiểm kê',
};

export const MobileNotificationsModal: React.FC<MobileNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications();

  const [visibleCount, setVisibleCount] = useState(10);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setVisibleCount(10);
      setShowFilterMenu(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Lọc theo loại thông báo
  const filtered =
    filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter);

  const handleItemClick = (n: AppNotification) => {
    markAsRead(n.id);
    onClose();
    if (n.type === 'STOCK' && onNavigateTab) onNavigateTab('PRODUCTS');
    else if (n.type === 'ORDER' && onNavigateTab) onNavigateTab('INVOICES');
    else if (n.type === 'CASHBOOK' && onNavigateTab) onNavigateTab('MORE');
  };

  const iconFor = (item: AppNotification) => {
    switch (item.type) {
      case 'STOCK':
        return item.meta?.stockState === 'OUT' ? (
          <Package className="w-5 h-5 text-rose-500" />
        ) : (
          <Package className="w-5 h-5 text-amber-500" />
        );
      case 'ORDER':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      case 'CASHBOOK':
        return <BookOpen className="w-5 h-5 text-rose-500" />;
      case 'AUDIT':
        return <AlertTriangle className="w-5 h-5 text-purple-500" />;
    }
  };

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-150">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="p-1 -ml-1 text-slate-700 active:text-slate-900 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-slate-900">Thông báo</h1>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
        {/* Filter dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu((v) => !v)}
            className="flex items-center gap-1 text-sm font-bold text-slate-800 cursor-pointer"
          >
            {TYPE_LABELS[filter]}
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
              {(Object.keys(TYPE_LABELS) as FilterType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilter(key);
                    setShowFilterMenu(false);
                    setVisibleCount(10);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer ${
                    filter === key
                      ? 'font-bold text-[#0066FF] bg-blue-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {TYPE_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mark all read */}
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className={`text-sm font-semibold cursor-pointer ${
            unreadCount > 0 ? 'text-[#0066FF] hover:underline' : 'text-slate-300 cursor-default'
          }`}
        >
          Đọc tất cả ({unreadCount})
        </button>
      </div>

      {/* ── List (Sắp xếp theo trình tự thời gian, không lặp lại cùng nội dung) ── */}
      <div
        className="flex-1 overflow-y-auto bg-white"
        onClick={() => showFilterMenu && setShowFilterMenu(false)}
      >
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-8">
            <CheckCircle2 className="w-14 h-14 text-slate-200 stroke-[1.5] mb-3" />
            <p className="text-sm font-bold text-slate-500">Không có thông báo</p>
            <p className="text-xs text-slate-400 mt-1">
              Các thông báo mới về hàng hoá, đơn hàng sẽ hiển thị tại đây theo trình tự thời gian
            </p>
          </div>
        ) : (
          <>
            {visible.map((item, idx) => (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left flex items-start gap-3.5 px-4 py-3.5 active:bg-slate-50 transition-colors cursor-pointer ${
                    !item.isRead ? 'bg-[#EEF4FF]' : 'bg-white'
                  }`}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {iconFor(item)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p
                      className={`text-[13.5px] leading-snug ${
                        item.isRead ? 'font-normal text-slate-700' : 'font-bold text-slate-900'
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!item.isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0066FF] shrink-0 mt-1.5" />
                  )}
                </button>

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(item.id);
                  }}
                  className="absolute right-3 top-3.5 p-1 text-slate-300 hover:text-slate-500 rounded transition-colors cursor-pointer"
                  title="Ẩn thông báo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Divider */}
                {idx < visible.length - 1 && <div className="ml-[68px] h-px bg-slate-100" />}
              </div>
            ))}

            {/* Xem thêm */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 10)}
                className="w-full py-4 text-sm font-semibold text-[#0066FF] border-t border-slate-100 bg-white active:bg-blue-50 transition-colors cursor-pointer"
              >
                Xem thêm ({filtered.length - visibleCount} thông báo)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
