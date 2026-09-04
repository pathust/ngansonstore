import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Package,
  Wallet,
  CheckCheck,
  Trash2,
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

interface MobileNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE') => void;
}

export const MobileNotificationsModal: React.FC<MobileNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { products, customers, orders } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  React.useEffect(() => {
    const newNotifications: (NotificationItem & { timestamp: number })[] = [];
    
    products.forEach((p) => {
      if (p.stock <= 5) {
        newNotifications.push({
          id: `stock-${p.id}`,
          type: 'STOCK',
          title: 'Cảnh báo sắp hết hàng',
          description: `Cảnh báo sắp hết hàng: ${p.name} chỉ còn ${p.stock} ${p.unit || 'Cái'}`,
          time: 'Vừa xong',
          isRead: false,
          timestamp: Date.now(),
        });
      }
    });

    customers.forEach((c) => {
      if ((c.debt || 0) > 0) {
        newNotifications.push({
          id: `debt-${c.id}`,
          type: 'CASHBOOK',
          title: 'Công nợ quá hạn',
          description: `Công nợ quá hạn: ${c.name} còn nợ ${(c.debt || 0).toLocaleString('vi-VN')}đ`,
          time: 'Hôm nay',
          isRead: false,
          timestamp: Date.now() - 1000,
        });
      }
    });

    const today = new Date().toDateString();
    orders.forEach((o) => {
      newNotifications.push({
        id: `order-${o.id}`,
        type: 'ORDER',
        title: 'Đơn hàng mới',
        description: `Đơn hàng mới #${o.code} - ${(o.final_amount || 0).toLocaleString('vi-VN')}đ`,
        time: 'Hôm nay',
        isRead: false,
        timestamp: o.created_at ? new Date(o.created_at).getTime() : Date.now() - 2000,
      });
    });

    if (products.length < 10) {
      newNotifications.push({
        id: 'low-variety',
        type: 'AUDIT',
        title: 'Danh mục hàng hoá ít',
        description: 'Danh mục hàng hoá ít, cần bổ sung thêm sản phẩm',
        time: 'Hôm nay',
        isRead: false,
        timestamp: Date.now() - 3000,
      });
    }

    newNotifications.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(newNotifications.map(({ timestamp, ...rest }) => rest));
  }, [products, customers, orders]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleItemClick = (n: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
    );
    onClose();
    if (n.type === 'STOCK' && onNavigateTab) {
      onNavigateTab('PRODUCTS');
    } else if (n.type === 'ORDER' && onNavigateTab) {
      onNavigateTab('INVOICES');
    } else if (n.type === 'CASHBOOK' && onNavigateTab) {
      onNavigateTab('MORE');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Trung tâm thông báo</h3>
              <span className="text-xs text-slate-400 font-medium">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Đã đọc tất cả'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 font-semibold ${
              unreadCount > 0 ? 'text-[#0066FF] hover:underline' : 'text-slate-400'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Đánh dấu đã đọc tất cả</span>
          </button>

          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-1 font-semibold text-slate-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xoá hết</span>
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-[200px]">
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-300 stroke-[1.5] mb-2" />
              <span className="text-sm font-bold text-slate-600">Không có thông báo mới</span>
              <span className="text-xs text-slate-400 mt-1">Các thông báo mới về hàng hoá, doanh thu sẽ hiển thị tại đây</span>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                  item.isRead
                    ? 'bg-white border-slate-100 opacity-75'
                    : 'bg-blue-50/40 border-blue-100 shadow-2xs'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'STOCK'
                      ? 'bg-amber-100 text-amber-700'
                      : item.type === 'ORDER'
                      ? 'bg-blue-100 text-[#0066FF]'
                      : item.type === 'CASHBOOK'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {item.type === 'STOCK' && <AlertTriangle className="w-4 h-4" />}
                  {item.type === 'ORDER' && <CreditCard className="w-4 h-4" />}
                  {item.type === 'CASHBOOK' && <Wallet className="w-4 h-4" />}
                  {item.type === 'AUDIT' && <Package className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                </div>

                {!item.isRead && (
                  <div className="w-2 h-2 rounded-full bg-[#0066FF] self-center shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
