import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingCart,
  Package,
  Warehouse,
  BarChart3,
  ReceiptText,
  Receipt,
  Building2,
  Lock,
  ArrowRightLeft,
  Users,
  Settings,
  X,
  Smartphone,
  UserCheck,
  KeyRound,
  LogOut,
  User,
  ChevronUp,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  onOpenMobileMode?: () => void;
  isManualOverride?: boolean;
  onResetAutoView?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  onOpenMobileMode,
  isManualOverride,
  onResetAutoView,
}) => {
  const {
    currentView,
    setCurrentView,
    orders,
    customers,
    products,
    users,
    currentUser,
    setIsUserSwitcherOpen,
    setIsUserProfileOpen,
    setIsChangePasswordOpen,
    logout,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  // Tách riêng "hết hàng hoàn toàn" và "dưới ngưỡng tồn kho tối thiểu đã cấu hình" — gộp chung
  // vào 1 số "báo động" trước đây gây hiểu lầm vì phần lớn sản phẩm chưa từng đặt min_stock
  // (mặc định 0), nên hễ hết hàng (stock=0) là tự động bị tính vào "báo động" dù không phải
  // cảnh báo tồn kho tối thiểu thực sự.
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const belowMinStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length;

  const navGroups = [
    {
      group: 'Chính',
      items: [
        {
          id: 'pos',
          label: 'Bán hàng (POS)',
          icon: ShoppingCart,
          isRestricted: !currentUser.permissions.canSellPOS,
        },
        {
          id: 'orders',
          label: 'Quản lý Hóa đơn',
          icon: Receipt,
          badge: orders.length > 0 ? `${orders.length}` : undefined,
          isRestricted: !currentUser.permissions.canViewInvoices,
        },
        {
          id: 'reports',
          label: 'Báo cáo Doanh thu',
          icon: BarChart3,
          isRestricted: !currentUser.permissions.canViewReports,
        },
      ],
    },
    {
      group: 'Kho vận & Đối tác',
      items: [
        {
          id: 'products',
          label: 'Hàng hóa & Giá',
          icon: Package,
          // A single compact badge — the sidebar row is too narrow to safely fit 2 verbose text
          // pills (they overflowed the nav item and pushed the label down to "H..."). Colored by
          // severity; the full "N hết hàng / M dưới ngưỡng" breakdown lives on the Products page
          // itself (as clickable filter chips), where there's actual room to show it clearly.
          badge:
            outOfStockCount > 0 || belowMinStockCount > 0
              ? `${outOfStockCount + belowMinStockCount} cảnh báo`
              : `${products.length}`,
          badgeColor: outOfStockCount > 0 ? 'bg-rose-100 text-rose-700' : belowMinStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
          badgeTitle:
            outOfStockCount > 0 || belowMinStockCount > 0
              ? `${outOfStockCount} hết hàng, ${belowMinStockCount} dưới ngưỡng tối thiểu`
              : undefined,
          isRestricted: !currentUser.permissions.canManageProducts,
        },
        {
          id: 'customers',
          label: 'Khách hàng',
          icon: Users,
          badge: customers.length > 0 ? `${customers.length}` : undefined,
          isRestricted: !currentUser.permissions.canManageCustomers,
        },
        {
          id: 'suppliers',
          label: 'Nhà cung cấp',
          icon: Building2,
          isRestricted: !currentUser.permissions.canManageSuppliers,
        },
        {
          id: 'inventory',
          label: 'Sổ kho & Kiểm kê',
          icon: Warehouse,
          isRestricted: !currentUser.permissions.canAuditInventory,
        },
      ],
    },
    {
      group: 'Tài chính',
      items: [
        {
          id: 'cashbook',
          label: 'Sổ quỹ (Thu/Chi)',
          icon: ReceiptText,
          isRestricted: !currentUser.permissions.canManageCashbook,
        },
      ],
    },
    {
      group: 'Hệ thống',
      items: [
        {
          id: 'settings',
          label: 'Cài đặt Cửa hàng & QR',
          icon: Settings,
          badge: 'MỚI',
          isRestricted: !currentUser.permissions.canEditSystemSettings,
        },
        {
          id: 'users',
          label: 'Nhân sự & Phân quyền',
          icon: UserCheck,
          badge: users.length > 0 ? `${users.length}` : undefined,
          isRestricted: !currentUser.permissions.canManageUsers && currentUser.role !== 'ADMIN',
        },
      ],
    },
  ];

  const getRoleDisplay = () => {
    switch (currentUser.role) {
      case 'ADMIN':
        return {
          title: 'Full Access Admin',
          color: 'text-purple-700 bg-purple-100 border-purple-200',
          dot: 'bg-purple-600',
        };
      case 'MANAGER':
        return {
          title: 'Quản lý cửa hàng',
          color: 'text-blue-700 bg-blue-100 border-blue-200',
          dot: 'bg-blue-600',
        };
      case 'STAFF':
        return {
          title: 'Nhân viên bán hàng',
          color: 'text-amber-800 bg-amber-100 border-amber-200',
          dot: 'bg-amber-600',
        };
    }
  };

  const roleInfo = getRoleDisplay();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 p-0.5 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Cửa Hàng Ngân Sơn" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs uppercase tracking-tight text-slate-900 truncate">Ngân Sơn Store</span>
                <span className="text-[9px] font-bold bg-blue-100 text-[#0B63E5] px-1.5 py-0.5 rounded-full shrink-0">v4.3</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-[10px] text-slate-500 font-medium truncate" title="318 Vũ Quang">318 Vũ Quang</span>
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen?.(false)}
            className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-3 scroll-hide">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.group}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const isRestricted = item.isRestricted;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id as any);
                      setIsMobileOpen?.(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'sidebar-item-active text-[#0B63E5] font-semibold'
                        : isRestricted
                        ? 'text-slate-400 hover:bg-slate-50/80 hover:text-slate-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B63E5]' : isRestricted ? 'text-slate-300' : 'text-slate-400'}`} />
                      <span className={`truncate ${isRestricted ? 'opacity-75' : ''}`}>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isRestricted && (
                        <span title="Chức năng yêu cầu quyền Quản lý / Admin" className="p-0.5 rounded text-amber-600 bg-amber-50">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                      {item.badge && !isRestricted && (
                        <span
                          title={(item as any).badgeTitle}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                            isActive
                              ? 'bg-[#0B63E5] text-white'
                              : (item as any).badgeColor || (item.badge === 'HOT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Mobile Viewport Toggle Button */}
        {onOpenMobileMode && (
          <div className="px-3 py-2 border-t border-slate-200/80 bg-slate-50/50 flex flex-col gap-1 shrink-0">
            <button
              onClick={onOpenMobileMode}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer group"
              title="Chuyển sang giao diện xem trên điện thoại di động"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Giao diện Mobile</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Điện thoại</span>
            </button>
            {isManualOverride && onResetAutoView && (
              <button
                onClick={onResetAutoView}
                className="text-[10px] text-slate-400 hover:text-slate-600 text-center py-0.5 cursor-pointer"
              >
                (Khôi phục tự động theo màn hình)
              </button>
            )}
          </div>
        )}

        {/* User Card Footer with Dropdown Actions */}
        <div className="relative border-t border-slate-200 bg-slate-50">
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2.5">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 truncate">{currentUser.roleTitle}</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsUserProfileOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hồ sơ cá nhân</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đổi mật khẩu</span>
                </button>

                {(currentUser.role === 'ADMIN' || currentUser.permissions.canManageUsers) && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setCurrentView('users');
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quản lý nhân viên</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsUserSwitcherOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-cyan-600 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đổi tài khoản trực ca</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                      logout();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}

          <div
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="p-3 hover:bg-slate-100/90 transition-all cursor-pointer group"
            title="Tùy chọn tài khoản người dùng"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${roleInfo.dot}`}></span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    {roleInfo.title}
                  </span>
                </div>
              </div>

              <div className="p-1 rounded bg-white border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 transition-all shrink-0">
                <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

