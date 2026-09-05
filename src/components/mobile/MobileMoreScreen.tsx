import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User,
  Edit2,
  ChevronRight,
  ShoppingBag,
  FileText,
  RotateCcw,
  Wallet,
  Package,
  CheckSquare,
  ArrowDownToLine,
  Truck,
  Users,
  Calendar,
  Clock,
  Settings,
  BarChart3,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Lock,
  Monitor,
  RefreshCw,
  ShieldAlert,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { MobileCustomerModal } from './MobileCustomerModal';
import { MobileSupplierModal } from './MobileSupplierModal';
import { MobileCashbookModal } from './MobileCashbookModal';
import { MobileInventoryAuditModal } from './MobileInventoryAuditModal';
import { MobileStoreSettingsModal } from './MobileStoreSettingsModal';
import { MobileReportsModal } from './MobileReportsModal';
import { MobileOrdersManagementModal } from './MobileOrdersManagementModal';
import { MobileReturnsModal } from './MobileReturnsModal';
import { MobileShiftModal } from './MobileShiftModal';
import { MobilePurchaseOrderModal } from './MobilePurchaseOrderModal';
import { MobileStaffModal } from './MobileStaffModal';
import { PriceAuditModal, detectPriceAnomaly } from '../products/PriceAuditModal';

interface MobileMoreScreenProps {
  onNavigateTab: (tab: 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE') => void;
  onOpenSettings?: () => void;
  onOpenDesktopMode?: () => void;
  isManualOverride?: boolean;
  onResetAutoView?: () => void;
}

export const MobileMoreScreen: React.FC<MobileMoreScreenProps> = ({
  onNavigateTab,
  onOpenSettings,
  onOpenDesktopMode,
  isManualOverride,
  onResetAutoView,
}) => {
  const {
    storeSettings,
    currentUser,
    products,
    updateProduct,
    setIsUserSwitcherOpen,
    setIsUserProfileOpen,
    setIsChangePasswordOpen,
    logout,
    showToast,
  } = useApp();

  // Role & Permissions checks
  const canManageProducts = currentUser.role === 'ADMIN' || currentUser.permissions.canManageProducts;
  const canManageCustomers = currentUser.role === 'ADMIN' || currentUser.permissions.canManageCustomers;
  const canManageSuppliers = currentUser.role === 'ADMIN' || currentUser.permissions.canManageSuppliers;
  const canManageStaff = currentUser.role === 'ADMIN';
  const canManageCashbook = currentUser.role === 'ADMIN' || currentUser.permissions.canManageCashbook;
  const canAuditInventory = currentUser.role === 'ADMIN' || currentUser.permissions.canAuditInventory;
  const canStockIn = currentUser.role === 'ADMIN' || currentUser.permissions.canStockIn || currentUser.permissions.canManageSuppliers;
  const canViewReports = currentUser.role === 'ADMIN' || currentUser.permissions.canViewReports;
  const canEditSettings = currentUser.role === 'ADMIN' || currentUser.permissions.canEditSystemSettings;

  const requirePermission = (allowed: boolean, action: () => void, message = 'Bạn không có quyền truy cập chức năng này!') => {
    if (!allowed) {
      showToast(message, 'warning');
      return;
    }
    action();
  };

  // Modals state
  const [isPriceAuditOpen, setIsPriceAuditOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [isCashbookOpen, setIsCashbookOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const priceAnomalyCount = useMemo(() => {
    return products.filter((p) => detectPriceAnomaly(p) !== null).length;
  }, [products]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [reportMode, setReportMode] = useState<'SALES' | 'END_OF_DAY'>('SALES');

  // New sub-modals
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isReturnsOpen, setIsReturnsOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);

  const handleOpenSettingsModal = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setIsSettingsOpen(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F6F8] pb-24 text-slate-800">
      {/* Top Store / User Profile Card (Image 12) */}
      <div className="bg-white p-4 m-3 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 p-1 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Ngân Sơn" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base text-slate-900 leading-snug">
                {storeSettings?.name || 'Cửa hàng Ngân Sơn'}
              </span>
              <span className="text-xs text-slate-400 font-medium">Chi nhánh 318 Vũ Quang</span>
            </div>
          </div>

          <button
            onClick={() => setIsUserSwitcherOpen(true)}
            className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:text-[#0066FF] transition-colors"
            title="Đổi tài khoản"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Current User Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div
            onClick={() => setIsUserProfileOpen(true)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
          >
            <div className="relative shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white"></span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 truncate">{currentUser.roleTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
              title="Đổi mật khẩu"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsUserSwitcherOpen(true)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Đổi tài khoản"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2.5">
          <button
            onClick={() => requirePermission(canEditSettings, handleOpenSettingsModal)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-[#0066FF] transition-colors"
          >
            <span>Thông tin cửa hàng & Cài đặt VietQR</span>
            <div className="flex items-center gap-1">
              {!canEditSettings && <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>
      </div>

      {/* Main Menu Groups */}
      <div className="px-3 flex flex-col gap-3">
        {/* Nhóm: Đối tác & Nhân sự */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Đối tác & Nhân sự</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <button
              onClick={() => requirePermission(canManageCustomers, () => setIsCustomersOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canManageCustomers ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Khách hàng</span>
                  <span className="text-[10px] text-slate-400 truncate">Quản lý & Công nợ</span>
                </div>
              </div>
              {!canManageCustomers && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canManageSuppliers, () => setIsSuppliersOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canManageSuppliers ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Nhà cung cấp</span>
                  <span className="text-[10px] text-slate-400 truncate">Nhập hàng & Nợ</span>
                </div>
              </div>
              {!canManageSuppliers && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canManageStaff, () => setIsUserSwitcherOpen(true), 'Chỉ Quản trị viên (Admin) mới có quyền quản lý nhân sự & phân quyền!')}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canManageStaff ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Nhân viên</span>
                  <span className="text-[10px] text-slate-400 truncate">Phân quyền & PIN</span>
                </div>
              </div>
              {!canManageStaff && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>
          </div>
        </div>

        {/* Nhóm: Giao dịch */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Giao dịch</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <button
              onClick={() => onNavigateTab('POS')}
              className="flex items-center gap-2.5 p-1.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 truncate">Bán hàng</span>
                <span className="text-[10px] text-slate-400 truncate">Thu ngân & POS</span>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('INVOICES')}
              className="flex items-center gap-2.5 p-1.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 truncate">Hóa đơn</span>
                <span className="text-[10px] text-slate-400 truncate">Lịch sử bán hàng</span>
              </div>
            </button>

            <button
              onClick={() => requirePermission(canManageCashbook, () => setIsCashbookOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canManageCashbook ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Sổ quỹ</span>
                  <span className="text-[10px] text-slate-400 truncate">Tồn quỹ & Thu chi</span>
                </div>
              </div>
              {!canManageCashbook && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => setIsOrdersOpen(true)}
              className="flex items-center gap-2.5 p-1.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 truncate">Đặt hàng</span>
                <span className="text-[10px] text-slate-400 truncate">Đơn hàng đặt trước</span>
              </div>
            </button>

            <button
              onClick={() => setIsReturnsOpen(true)}
              className="flex items-center gap-2.5 p-1.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 truncate">Trả hàng</span>
                <span className="text-[10px] text-slate-400 truncate">Đổi trả & Hoàn tiền</span>
              </div>
            </button>

            <button
              onClick={() => setIsShiftOpen(true)}
              className="flex items-center gap-2.5 p-1.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 truncate">Phiếu giao ca</span>
                <span className="text-[10px] text-slate-400 truncate">Kết ca & Kiểm tiền</span>
              </div>
            </button>
          </div>
        </div>

        {/* Nhóm: Hàng hoá & Kho */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Hàng hoá & Kho</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <button
              onClick={() => onNavigateTab('PRODUCTS')}
              className="flex items-center gap-2.5 p-1.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 truncate">Hàng hoá</span>
                <span className="text-[10px] text-slate-400 truncate">Danh mục & Tồn kho</span>
              </div>
            </button>

            <button
              onClick={() => requirePermission(canManageProducts, () => setIsPriceAuditOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canManageProducts ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900 truncate">Audit Giá</span>
                    {priceAnomalyCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                        {priceAnomalyCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">Quét bất thường giá</span>
                </div>
              </div>
              {!canManageProducts && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canAuditInventory, () => setIsInventoryOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canAuditInventory ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Audit Kiểm kho</span>
                  <span className="text-[10px] text-slate-400 truncate">Cân bằng tồn kho</span>
                </div>
              </div>
              {!canAuditInventory && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canStockIn, () => setIsPurchaseOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canStockIn ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Nhập hàng</span>
                  <span className="text-[10px] text-slate-400 truncate">Tạo phiếu nhập NCC</span>
                </div>
              </div>
              {!canStockIn && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canManageSuppliers, () => setIsReturnsOpen(true))}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canManageSuppliers ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-900 truncate">Trả hàng nhập</span>
                  <span className="text-[10px] text-slate-400 truncate">Xuất trả nhà CC</span>
                </div>
              </div>
              {!canManageSuppliers && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>
          </div>
        </div>

        {/* Nhóm: Báo cáo & Cài đặt */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Báo cáo & Cài đặt</h3>
          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <button
              onClick={() => requirePermission(canViewReports, () => {
                setReportMode('SALES');
                setIsReportsOpen(true);
              })}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canViewReports ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="truncate">Báo cáo bán hàng</span>
              </div>
              {!canViewReports && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canViewReports, () => {
                setReportMode('END_OF_DAY');
                setIsReportsOpen(true);
              })}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canViewReports ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="truncate">Báo cáo cuối ngày</span>
              </div>
              {!canViewReports && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canEditSettings, handleOpenSettingsModal)}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canEditSettings ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <span className="truncate">Ngân hàng VietQR</span>
              </div>
              {!canEditSettings && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>

            <button
              onClick={() => requirePermission(canEditSettings, handleOpenSettingsModal)}
              className={`flex items-center justify-between p-1.5 rounded-xl text-left text-xs font-medium transition-all ${
                canEditSettings ? 'text-slate-800 hover:text-[#0066FF] active:scale-95' : 'text-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="truncate">Cài đặt hệ thống</span>
              </div>
              {!canEditSettings && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />}
            </button>
          </div>
        </div>

        {/* Nhóm: Chế độ hiển thị & Thiết bị */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-2">Giao diện & Chế độ xem</h3>
          <p className="text-xs text-slate-500 mb-3">
            Đang hiển thị: <strong className="text-blue-600 font-bold">Chế độ Điện thoại (Mobile)</strong>
          </p>

          <div className="flex flex-col gap-2">
            {onOpenDesktopMode && (
              <button
                onClick={onOpenDesktopMode}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 flex items-center justify-between transition-all active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900">Chuyển sang bản Máy tính (Desktop)</span>
                    <span className="text-[10px] text-slate-500">Xem đầy đủ bảng biểu, phím tắt & báo cáo chuyên sâu</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            )}

            {isManualOverride && onResetAutoView && (
              <button
                onClick={onResetAutoView}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center gap-2 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Khôi phục tự động theo kích thước màn hình</span>
              </button>
            )}
          </div>
        </div>

        {/* Logout Section */}
        <div className="bg-white p-3 rounded-2xl border border-rose-100 shadow-2xs">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc này?')) {
                logout();
              }
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>

      {/* Render All Sub-Modals */}
      <MobileCustomerModal
        isOpen={isCustomersOpen}
        onClose={() => setIsCustomersOpen(false)}
      />

      <MobileSupplierModal
        isOpen={isSuppliersOpen}
        onClose={() => setIsSuppliersOpen(false)}
      />

      <MobileCashbookModal
        isOpen={isCashbookOpen}
        onClose={() => setIsCashbookOpen(false)}
      />

      <MobileInventoryAuditModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
      />

      <MobileStoreSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <MobileReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        reportType={reportMode}
      />

      <MobileOrdersManagementModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        onSelectOrderForPOS={(order) => {
          setIsOrdersOpen(false);
          onNavigateTab('POS');
        }}
      />

      <MobileReturnsModal
        isOpen={isReturnsOpen}
        onClose={() => setIsReturnsOpen(false)}
      />

      <MobileShiftModal
        isOpen={isShiftOpen}
        onClose={() => setIsShiftOpen(false)}
      />

      <MobilePurchaseOrderModal
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
      />

      <MobileStaffModal
        isOpen={isStaffOpen}
        onClose={() => setIsStaffOpen(false)}
      />

      {/* Price Audit Modal */}
      <PriceAuditModal
        isOpen={isPriceAuditOpen}
        onClose={() => setIsPriceAuditOpen(false)}
        products={products}
        onUpdateProduct={updateProduct}
      />
    </div>
  );
};
