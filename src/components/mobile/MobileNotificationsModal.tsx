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
  ArrowRight,
} from 'lucide-react';

import { useNotifications, AppNotification, formatRelativeTime } from '../../hooks/useNotifications';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

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

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isViewingAll, setIsViewingAll] = useState(false);

  // Tự động trở về trạng thái danh sách cắt ngắn (20 thông báo gần đây nhất) khi đóng/mở lại
  React.useEffect(() => {
    if (!isOpen) {
      setShowFilterMenu(false);
      setIsViewingAll(false);
    }
  }, [isOpen]);

  // Lọc theo loại thông báo
  const filtered =
    filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter);

  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll(
    filtered.length,
    40,
    20,
    [filter, isOpen, isViewingAll],
    'mobile-notifications-scroll-root'
  );

  const handleBack = () => {
    if (isViewingAll) {
      // Khi nhấn quay lại từ chế độ xem tất cả: trở về danh sách cắt ngắn 20 gần đây nhất
      setIsViewingAll(false);
    } else {
      onClose();
    }
  };

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

  const visible = isViewingAll ? filtered.slice(0, visibleCount) : filtered.slice(0, 20);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in fade-in duration-150">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-slate-100">
        <button
          type="button"
          onClick={handleBack}
          className="p-1 -ml-1 text-slate-700 active:text-slate-900 cursor-pointer"
          title={isViewingAll ? 'Quay lại thông báo gần đây' : 'Đóng'}
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              {isViewingAll ? 'Tất cả thông báo' : 'Thông báo'}
            </h1>
            {isViewingAll ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-[#0066FF]">
                {filtered.length}
              </span>
            ) : filtered.length > 20 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                20 gần nhất
              </span>
            ) : null}
          </div>
          {!isViewingAll && filtered.length > 20 && (
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Hiển thị 20 thông báo gần đây nhất
            </p>
          )}
        </div>
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
                    setIsViewingAll(false);
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
        id="mobile-notifications-scroll-root"
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

            {/* Nút xem tất cả thông báo khi ở danh sách cắt ngắn (20 gần nhất) */}
            {!isViewingAll && filtered.length > 20 && (
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col items-center gap-2 mt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Đang hiển thị 20 / {filtered.length} thông báo gần đây
                </span>
                <button
                  type="button"
                  onClick={() => setIsViewingAll(true)}
                  className="w-full py-3 px-4 bg-[#0066FF] hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Xem tất cả thông báo ({filtered.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chế độ xem tất cả: Sentinel trigger load more khi scroll đến cuối */}
            {isViewingAll && (
              <>
                <div ref={sentinelRef} className="h-4" />
                {hasMore && (
                  <div className="py-3 flex justify-center">
                    <div className="w-5 h-5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!hasMore && filtered.length > 20 && (
                  <div className="py-4 text-center text-xs text-slate-400 font-medium">
                    Đã hiển thị toàn bộ {filtered.length} thông báo
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
