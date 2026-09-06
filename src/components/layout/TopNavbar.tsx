import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingCart,
  Store,
  LogOut,
  User,
  KeyRound,
  UserCheck,
  ChevronDown,
  RefreshCw,
  PhoneCall,
  HelpCircle,
  MessageSquare,
  Globe,
  Settings as SettingsIcon,
  Bell,
  Package,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useNotifications, formatRelativeTime, AppNotification } from '../../hooks/useNotifications';

interface TopNavbarProps {
  onOpenMobileMode?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenMobileMode }) => {
  const {
    currentView,
    setCurrentView,
    orders,
    products,
    customers,
    currentUser,
    setIsUserSwitcherOpen,
    setIsUserProfileOpen,
    setIsChangePasswordOpen,
    logout,
    currentBranch,
    syncState,
    syncWithServer,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD' | 'STOCK' | 'ORDER'>('ALL');
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'UNREAD') return !n.isRead;
    if (notifFilter === 'STOCK') return n.type === 'STOCK';
    if (notifFilter === 'ORDER') return n.type === 'ORDER';
    return true;
  });

  const navItems = [
    {
      id: 'reports',
      label: 'Tổng quan',
      isRestricted: !currentUser.permissions.canViewReports,
    },
    {
      id: 'products',
      label: 'Hàng hóa',
      badge: products.length > 0 ? `${products.length}` : undefined,
      isRestricted: !currentUser.permissions.canManageProducts,
    },
    {
      id: 'inventory',
      label: 'Mua hàng',
      isRestricted: !currentUser.permissions.canAuditInventory,
    },
    {
      id: 'orders',
      label: 'Đơn hàng',
      badge: orders.length > 0 ? `${orders.length}` : undefined,
      isRestricted: !currentUser.permissions.canViewInvoices,
    },
    {
      id: 'customers',
      label: 'Khách hàng',
      badge: customers.length > 0 ? `${customers.length}` : undefined,
      isRestricted: !currentUser.permissions.canManageCustomers,
    },
    {
      id: 'users',
      label: 'Nhân viên',
      isRestricted: currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers,
    },
    {
      id: 'cashbook',
      label: 'Sổ quỹ',
      isRestricted: !currentUser.permissions.canManageCashbook,
    },
    {
      id: 'reports_detail',
      label: 'Báo cáo',
      targetView: 'reports',
      isRestricted: !currentUser.permissions.canViewReports,
    },
    {
      id: 'suppliers',
      label: 'Nhà cung cấp',
      isRestricted: !currentUser.permissions.canManageSuppliers,
    },
  ];

  return (
    <header className="h-12 bg-[#23374D] text-white shrink-0 select-none shadow-md z-30 flex items-center justify-between px-4">
      {/* Left: Brand Logo + Nav Menu */}
      <div className="flex items-center h-full gap-2 lg:gap-3">
        {/* Brand Logo KiotViet style */}
        <div
          onClick={() => setCurrentView('reports')}
          className="flex items-center gap-2 pr-3 cursor-pointer select-none"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0B63E5] text-white flex items-center justify-center font-black text-sm shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-sm tracking-tight text-white">Ngân Sơn</span>
            <span className="text-[10px] text-blue-300 ml-1 font-bold">POS</span>
          </div>
        </div>

        {/* Navigation Tabs (KiotViet style) */}
        <nav className="flex items-center h-full overflow-x-auto scroll-hide">
          {navItems.map((item) => {
            if (item.isRestricted) return null;
            const target = item.targetView || item.id;
            const isActive =
              currentView === target ||
              (item.id === 'orders' && (currentView === 'orders' || currentView === 'invoices'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(target as any)}
                className={`h-full px-3 text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer relative ${
                  isActive
                    ? 'bg-[#314E73] text-white shadow-inner font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-[#2a415b]'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B63E5]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: POS Sale Button + Help + User profile */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Sync Status Icon */}
        <button
          type="button"
          onClick={() => syncWithServer()}
          title="Đồng bộ dữ liệu"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[#2a415b] rounded transition-colors cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${syncState === 'SYNCING' ? 'animate-spin text-blue-400' : ''}`}
          />
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Thông báo"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#2a415b] rounded transition-colors cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-slate-800 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              style={{
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.08)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-semibold text-[#0B63E5] hover:underline cursor-pointer"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 bg-white">
                {(
                  [
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'UNREAD', label: `Chưa đọc (${unreadCount})` },
                    { id: 'STOCK', label: 'Kho hàng' },
                    { id: 'ORDER', label: 'Đơn hàng' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNotifFilter(tab.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      notifFilter === tab.id
                        ? 'bg-blue-50 text-[#0B63E5] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification Items List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {filteredNotifications.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-medium">Không có thông báo nào</p>
                  </div>
                ) : (
                  filteredNotifications.slice(0, 30).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        setIsNotifOpen(false);
                        if (n.type === 'STOCK') setCurrentView('products');
                        else if (n.type === 'ORDER') setCurrentView('orders');
                        else if (n.type === 'CASHBOOK') setCurrentView('customers');
                      }}
                      className={`p-3 flex items-start gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 ${
                        !n.isRead ? 'bg-blue-50/40' : 'bg-white'
                      }`}
                    >
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {n.type === 'STOCK' ? (
                          n.meta?.stockState === 'OUT' ? (
                            <Package className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Package className="w-4 h-4 text-amber-600" />
                          )
                        ) : n.type === 'ORDER' ? (
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={`text-xs leading-snug line-clamp-2 ${
                              !n.isRead ? 'font-bold text-slate-900' : 'font-normal text-slate-700'
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[#0B63E5] shrink-0 mt-1" />
                          )}
                        </div>
                        {n.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {n.description}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 font-medium">
                          {formatRelativeTime(n.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* POS Sales button (KiotViet style prominent button) */}
        {currentUser.permissions.canSellPOS && (
          <button
            type="button"
            onClick={() => setCurrentView('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B63E5] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition-all cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Bán hàng</span>
          </button>
        )}

        {/* User Account Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 p-1 rounded hover:bg-[#2a415b] transition-colors cursor-pointer text-xs"
          >
            <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-[11px]">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:inline font-medium text-slate-200 text-xs max-w-[90px] truncate">
              {currentUser.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-100"
              style={{
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 4px 10px -2px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500">{currentUser.username} ({currentUser.role})</p>
                {currentBranch && (
                  <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                    Chi nhánh: {currentBranch.name}
                  </p>
                )}
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsUserProfileOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Hồ sơ tài khoản</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  <span>Đổi mật khẩu</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsUserSwitcherOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                >
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span>Chuyển tài khoản</span>
                </button>

                {currentUser.permissions.canEditSystemSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setCurrentView('settings');
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400" />
                    <span>Cài đặt cửa hàng</span>
                  </button>
                )}

                {onOpenMobileMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenMobileMode();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-blue-600 font-medium"
                  >
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>Chuyển giao diện di động</span>
                  </button>
                )}
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
