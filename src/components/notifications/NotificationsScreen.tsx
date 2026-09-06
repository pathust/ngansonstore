import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  Package,
  ShoppingCart,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCheck,
  Clock,
  Sparkles,
  Inbox,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotifications, AppNotification, formatRelativeTime } from '../../hooks/useNotifications';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { formatDateTime } from '../../utils/formatters';

type FilterTab = 'ALL' | 'UNREAD' | 'STOCK' | 'ORDER' | 'CASHBOOK' | 'AUDIT';

export const NotificationsScreen: React.FC = () => {
  const { setCurrentView } = useApp();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    refetch,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  // Counts by category
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = unreadCount;
    const stock = notifications.filter((n) => n.type === 'STOCK').length;
    const order = notifications.filter((n) => n.type === 'ORDER').length;
    const cashbook = notifications.filter((n) => n.type === 'CASHBOOK').length;
    const audit = notifications.filter((n) => n.type === 'AUDIT').length;
    return { total, unread, stock, order, cashbook, audit };
  }, [notifications, unreadCount]);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'UNREAD' && n.isRead) return false;
      if (activeTab === 'STOCK' && n.type !== 'STOCK') return false;
      if (activeTab === 'ORDER' && n.type !== 'ORDER') return false;
      if (activeTab === 'CASHBOOK' && n.type !== 'CASHBOOK') return false;
      if (activeTab === 'AUDIT' && n.type !== 'AUDIT') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchDesc = n.description ? n.description.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchTerm]);

  // Infinite Scroll lazy loading
  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll(
    filteredNotifications.length,
    40,
    20,
    [activeTab, searchTerm],
    'notifications-scroll-container'
  );

  const visibleList = useMemo(() => {
    return filteredNotifications.slice(0, visibleCount);
  }, [filteredNotifications, visibleCount]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleNavigateTarget = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.type === 'STOCK') {
      setCurrentView('products');
    } else if (n.type === 'ORDER') {
      setCurrentView('orders');
    } else if (n.type === 'CASHBOOK') {
      setCurrentView('customers');
    } else if (n.type === 'AUDIT') {
      setCurrentView('inventory');
    }
  };

  const getNotificationIcon = (n: AppNotification) => {
    switch (n.type) {
      case 'STOCK':
        return n.meta?.stockState === 'OUT' ? (
          <div className="w-9 h-9 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 stroke-[2.2]" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
      case 'ORDER':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
      case 'CASHBOOK':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
      case 'AUDIT':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
        );
    }
  };

  const getTypeBadge = (n: AppNotification) => {
    switch (n.type) {
      case 'STOCK':
        if (n.meta?.stockState === 'OUT') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
              Hết hàng
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
            Sắp hết hàng
          </span>
        );
      case 'ORDER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">
            Đơn hàng
          </span>
        );
      case 'CASHBOOK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
            Công nợ
          </span>
        );
      case 'AUDIT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">
            Kiểm kê
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B63E5] flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Trung tâm Thông báo</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ lịch sử thông báo, cảnh báo kho và giao dịch bán hàng
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            title="Làm mới thông báo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0B63E5]' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              unreadCount > 0
                ? 'bg-[#0B63E5] hover:bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Đọc tất cả ({unreadCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmClearAll(true)}
            disabled={notifications.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
              notifications.length > 0
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => setActiveTab('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-blue-50/50 border-[#0B63E5] shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500">Tất cả thông báo</div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div
          onClick={() => setActiveTab('UNREAD')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'UNREAD'
              ? 'bg-rose-50/50 border-rose-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Chưa đọc</span>
            {stats.unread > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" />}
          </div>
          <div className="text-xl font-black text-rose-600 mt-1">{stats.unread}</div>
        </div>

        <div
          onClick={() => setActiveTab('STOCK')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'STOCK'
              ? 'bg-amber-50/50 border-amber-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500">Cảnh báo Hàng hoá</div>
          <div className="text-xl font-black text-amber-600 mt-1">{stats.stock}</div>
        </div>

        <div
          onClick={() => setActiveTab('ORDER')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'ORDER'
              ? 'bg-blue-50/50 border-blue-400 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500">Đơn hàng mới</div>
          <div className="text-xl font-black text-blue-600 mt-1">{stats.order}</div>
        </div>
      </div>

      {/* ── Search & Filter Tabs Bar ── */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-[#0B63E5] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UNREAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'UNREAD'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Chưa đọc ({stats.unread})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'STOCK'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hàng hoá ({stats.stock})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ORDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'ORDER'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Đơn hàng ({stats.order})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CASHBOOK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'CASHBOOK'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Công nợ ({stats.cashbook})
          </button>
          {stats.audit > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'AUDIT'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Kiểm kê ({stats.audit})
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo nội dung, tên hàng..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B63E5] focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable Notifications List Container (Infinite Lazy Scroll) ── */}
      <div
        id="notifications-scroll-container"
        className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100"
      >
        {filteredNotifications.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Không có thông báo nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchTerm
                ? 'Không tìm thấy thông báo phù hợp với từ khóa tìm kiếm.'
                : 'Hiện tại chưa có thông báo mới. Các cập nhật về tồn kho, đơn hàng và công nợ sẽ hiển thị tại đây.'}
            </p>
          </div>
        ) : (
          <>
            {visibleList.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNavigateTarget(n)}
                className={`p-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50 group relative ${
                  !n.isRead ? 'bg-blue-50/30' : 'bg-white'
                }`}
              >
                {/* Type Icon */}
                {getNotificationIcon(n)}

                {/* Main Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {getTypeBadge(n)}
                    <h4
                      className={`text-sm tracking-tight ${
                        !n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#0B63E5] shrink-0" />
                    )}
                  </div>

                  {n.description && (
                    <p className="text-xs text-slate-600 leading-relaxed mb-1.5 line-clamp-2">
                      {n.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatRelativeTime(n.timestamp)}
                    </span>
                    <span>•</span>
                    <span>{formatDateTime(new Date(n.timestamp).toISOString())}</span>
                    {n.meta?.isResolved && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã nạp đầy kho
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateTarget(n);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0B63E5] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Xem chi tiết"
                  >
                    <span>Xem</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(n.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa thông báo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* ── Sentinel for Infinite Scroll ── */}
            <div ref={sentinelRef} className="h-6" />
            {hasMore && (
              <div className="py-4 flex justify-center items-center gap-2 text-xs text-slate-500">
                <div className="w-4 h-4 border-2 border-[#0B63E5] border-t-transparent rounded-full animate-spin" />
                <span>Đang tải thêm thông báo...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Status Bar / Footer ── */}
      <div className="px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Đang hiển thị <strong className="text-slate-800">{Math.min(visibleCount, filteredNotifications.length)}</strong> / {filteredNotifications.length} thông báo
        </span>
        <span className="text-[11px] text-slate-400">
          Sắp xếp theo trình tự thời gian sự kiện gốc
        </span>
      </div>

      {/* ── Confirm Clear All Dialog ── */}
      {showConfirmClearAll && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-base text-slate-900 mb-2">Xóa toàn bộ thông báo?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa tất cả thông báo không? Hành động này sẽ xóa dữ liệu thông báo trên cả hệ thống và máy của bạn.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllNotifications();
                  setShowConfirmClearAll(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
