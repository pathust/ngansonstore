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
} from 'lucide-react';

import { useApp } from '../../context/AppContext';

interface NotificationItem {
  id: string;
  type: 'STOCK' | 'ORDER' | 'CASHBOOK' | 'AUDIT';
  title: string;
  description: string;
  time: string;
  isRead: boolean;
}

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

/** Format milliseconds offset as Vietnamese relative time */
function relativeTime(msAgo: number): string {
  const sec = Math.floor(msAgo / 1000);
  if (sec < 60) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
}

export const MobileNotificationsModal: React.FC<MobileNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { products, customers, orders } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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

  // Build notification list from store data
  React.useEffect(() => {
    const now = Date.now();
    const items: (NotificationItem & { timestamp: number })[] = [];

    products.forEach((p) => {
      if (p.stock <= 5) {
        items.push({
          id: `stock-${p.id}`,
          type: 'STOCK',
          title: 'Có hàng hóa dưới định mức tồn',
          description: `${p.name} chỉ còn ${p.stock} ${p.unit || 'Cái'}`,
          time: relativeTime(now - (now - Math.random() * 3_600_000)),
          isRead: false,
          timestamp: now - Math.random() * 3_600_000,
        });
      }
    });

    customers.forEach((c) => {
      if ((c.debt || 0) > 0) {
        items.push({
          id: `debt-${c.id}`,
          type: 'CASHBOOK',
          title: `${c.name} còn công nợ chưa thanh toán`,
          description: `Số tiền nợ: ${(c.debt || 0).toLocaleString('vi-VN')}đ`,
          time: relativeTime(3_600_000 * 2),
          isRead: false,
          timestamp: now - 3_600_000 * 2,
        });
      }
    });

    orders.forEach((o) => {
      const ts = o.created_at ? new Date(o.created_at).getTime() : now - 1_800_000;
      items.push({
        id: `order-${o.id}`,
        type: 'ORDER',
        title: `Đã bán đơn hàng trị giá ${(o.final_amount || 0).toLocaleString('vi-VN')}đ`,
        description: `Mã đơn: #${o.code}`,
        time: relativeTime(now - ts),
        isRead: true,
        timestamp: ts,
      });
    });

    if (products.length < 10) {
      items.push({
        id: 'low-variety',
        type: 'AUDIT',
        title: 'Danh mục hàng hoá ít',
        description: 'Cần bổ sung thêm sản phẩm để phục vụ kinh doanh',
        time: relativeTime(7_200_000),
        isRead: false,
        timestamp: now - 7_200_000,
      });
    }

    items.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(items.map(({ timestamp, ...rest }) => rest));
  }, [products, customers, orders]);

  if (!isOpen) return null;

  const filtered =
    filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const handleItemClick = (n: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
    );
    onClose();
    if (n.type === 'STOCK' && onNavigateTab) onNavigateTab('PRODUCTS');
    else if (n.type === 'ORDER' && onNavigateTab) onNavigateTab('INVOICES');
    else if (n.type === 'CASHBOOK' && onNavigateTab) onNavigateTab('MORE');
  };

  const iconFor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'STOCK':   return <Package className="w-5 h-5 text-slate-500" />;
      case 'ORDER':   return <ShoppingBag className="w-5 h-5 text-slate-500" />;
      case 'CASHBOOK':return <BookOpen className="w-5 h-5 text-slate-500" />;
      case 'AUDIT':   return <AlertTriangle className="w-5 h-5 text-slate-500" />;
    }
  };

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-slate-100">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-slate-700 active:text-slate-900"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-slate-900">Thông báo</h1>
        <button className="p-1 text-slate-500 active:text-slate-700">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu((v) => !v)}
            className="flex items-center gap-1 text-sm font-bold text-slate-800"
          >
            {TYPE_LABELS[filter]}
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
              {(Object.keys(TYPE_LABELS) as FilterType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setFilter(key); setShowFilterMenu(false); setVisibleCount(10); }}
                  className={`w-full text-left px-4 py-2.5 text-sm ${
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
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className={`text-sm font-semibold ${
            unreadCount > 0 ? 'text-[#0066FF]' : 'text-slate-300'
          }`}
        >
          Đọc tất cả
        </button>
      </div>

      {/* ── List ── */}
      <div
        className="flex-1 overflow-y-auto bg-white"
        onClick={() => showFilterMenu && setShowFilterMenu(false)}
      >
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-8">
            <CheckCircle2 className="w-14 h-14 text-slate-200 stroke-[1.5] mb-3" />
            <p className="text-sm font-bold text-slate-500">Không có thông báo</p>
            <p className="text-xs text-slate-400 mt-1">
              Các thông báo mới về hàng hoá, đơn hàng sẽ hiển thị tại đây
            </p>
          </div>
        ) : (
          <>
            {visible.map((item, idx) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left flex items-start gap-3.5 px-4 py-4 active:bg-slate-50 transition-colors ${
                    !item.isRead ? 'bg-[#EEF4FF]' : 'bg-white'
                  }`}
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {iconFor(item.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13.5px] leading-snug ${
                      item.isRead ? 'font-normal text-slate-600' : 'font-bold text-slate-900'
                    }`}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1 font-medium">{item.time}</p>
                  </div>

                  {/* Unread dot */}
                  {!item.isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0066FF] shrink-0 mt-1.5" />
                  )}
                </button>

                {/* Divider */}
                {idx < visible.length - 1 && (
                  <div className="ml-[68px] h-px bg-slate-100" />
                )}
              </div>
            ))}

            {/* Xem thêm */}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + 10)}
                className="w-full py-4 text-sm font-semibold text-[#0066FF] border-t border-slate-100 bg-white active:bg-blue-50 transition-colors"
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
