import React, { useState } from 'react';
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

interface MobileMoreScreenProps {
  onNavigateTab: (tab: 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE') => void;
  onOpenSettings?: () => void;
}

export const MobileMoreScreen: React.FC<MobileMoreScreenProps> = ({ onNavigateTab, onOpenSettings }) => {
  const { storeSettings, currentUser, setIsUserSwitcherOpen } = useApp();

  // Modals state
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isSuppliersOpen, setIsSuppliersOpen] = useState(false);
  const [isCashbookOpen, setIsCashbookOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
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

        <div className="border-t border-slate-100 pt-2.5">
          <button
            onClick={handleOpenSettingsModal}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-[#0066FF] transition-colors"
          >
            <span>Thông tin cửa hàng & Cài đặt VietQR</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main Menu Groups */}
      <div className="px-3 flex flex-col gap-3">
        {/* Nhóm: Đối tác & Nhân sự */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Đối tác & Nhân sự</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <button
              onClick={() => setIsCustomersOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Khách hàng</span>
                <span className="text-[10px] text-slate-400">Quản lý & Công nợ</span>
              </div>
            </button>

            <button
              onClick={() => setIsSuppliersOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Nhà cung cấp</span>
                <span className="text-[10px] text-slate-400">Nhập hàng & Nợ NCC</span>
              </div>
            </button>

            <button
              onClick={() => setIsStaffOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Nhân viên</span>
                <span className="text-[10px] text-slate-400">Phân quyền & PIN</span>
              </div>
            </button>
          </div>
        </div>

        {/* Nhóm: Giao dịch (Image 12) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Giao dịch</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <button
              onClick={() => onNavigateTab('POS')}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Bán hàng</span>
                <span className="text-[10px] text-slate-400">Thu ngân & POS</span>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('INVOICES')}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Hóa đơn</span>
                <span className="text-[10px] text-slate-400">Lịch sử bán hàng</span>
              </div>
            </button>

            <button
              onClick={() => setIsCashbookOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Sổ quỹ</span>
                <span className="text-[10px] text-slate-400">Tồn quỹ & Thu chi</span>
              </div>
            </button>

            <button
              onClick={() => setIsOrdersOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Đặt hàng</span>
                <span className="text-[10px] text-slate-400">Đơn hàng đặt trước</span>
              </div>
            </button>

            <button
              onClick={() => setIsReturnsOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Trả hàng</span>
                <span className="text-[10px] text-slate-400">Đổi trả & Hoàn tiền</span>
              </div>
            </button>

            <button
              onClick={() => setIsShiftOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Phiếu giao ca</span>
                <span className="text-[10px] text-slate-400">Kết ca & Kiểm tiền</span>
              </div>
            </button>
          </div>
        </div>

        {/* Nhóm: Hàng hoá (Image 12) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Hàng hoá & Kho</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <button
              onClick={() => onNavigateTab('PRODUCTS')}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Hàng hoá</span>
                <span className="text-[10px] text-slate-400">Danh mục & Tồn kho</span>
              </div>
            </button>

            <button
              onClick={() => setIsInventoryOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Kiểm kho</span>
                <span className="text-[10px] text-slate-400">Cân bằng tồn kho</span>
              </div>
            </button>

            <button
              onClick={() => setIsPurchaseOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Nhập hàng</span>
                <span className="text-[10px] text-slate-400">Tạo phiếu nhập NCC</span>
              </div>
            </button>

            <button
              onClick={() => setIsReturnsOpen(true)}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900">Trả hàng nhập</span>
                <span className="text-[10px] text-slate-400">Xuất trả nhà CC</span>
              </div>
            </button>
          </div>
        </div>


        {/* Nhóm: Báo cáo & Cài đặt */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <h3 className="font-extrabold text-sm text-slate-900 mb-3">Báo cáo & Cài đặt</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <button
              onClick={() => {
                setReportMode('SALES');
                setIsReportsOpen(true);
              }}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>Báo cáo bán hàng</span>
            </button>

            <button
              onClick={() => {
                setReportMode('END_OF_DAY');
                setIsReportsOpen(true);
              }}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span>Báo cáo cuối ngày</span>
            </button>

            <button
              onClick={handleOpenSettingsModal}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <span>Ngân hàng VietQR</span>
            </button>

            <button
              onClick={handleOpenSettingsModal}
              className="flex items-center gap-2.5 text-left text-xs font-medium text-slate-800 hover:text-[#0066FF] active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <span>Cài đặt hệ thống</span>
            </button>
          </div>
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
    </div>
  );
};
