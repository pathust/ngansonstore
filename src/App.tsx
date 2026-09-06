import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { ToastContainer } from './components/common/ToastContainer';
import { ThermalReceiptModal } from './components/common/ThermalReceiptModal';
import { UserSwitcherModal } from './components/common/UserSwitcherModal';
import { AccessDeniedView } from './components/common/AccessDeniedView';
import { GlobalLoadingBar } from './components/common/GlobalLoadingBar';
import { BackgroundTaskBar } from './components/common/BackgroundTaskBar';
import { GlobalVoiceAssistant } from './components/common/GlobalVoiceAssistant';
import { MobileAppContainer } from './components/mobile/MobileAppContainer';
import { LoginScreen } from './components/auth/LoginScreen';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { Menu } from 'lucide-react';

const QuarterlyFinancialReport = React.lazy(() => import('./components/reports/QuarterlyFinancialReport').then(m => ({ default: m.QuarterlyFinancialReport })));
const PosSalesScreen = React.lazy(() => import('./components/pos/PosSalesScreen').then(m => ({ default: m.PosSalesScreen })));
const ProductManagementScreen = React.lazy(() => import('./components/products/ProductManagementScreen').then(m => ({ default: m.ProductManagementScreen })));
const InventoryAuditScreen = React.lazy(() => import('./components/inventory/InventoryAuditScreen').then(m => ({ default: m.InventoryAuditScreen })));
const CashbookScreen = React.lazy(() => import('./components/cashbook/CashbookScreen').then(m => ({ default: m.CashbookScreen })));
const SupplierManagementScreen = React.lazy(() => import('./components/suppliers/SupplierManagementScreen').then(m => ({ default: m.SupplierManagementScreen })));
const CustomerManagementScreen = React.lazy(() => import('./components/customers/CustomerManagementScreen').then(m => ({ default: m.CustomerManagementScreen })));
const InvoiceManagementScreen = React.lazy(() => import('./components/orders/InvoiceManagementScreen').then(m => ({ default: m.InvoiceManagementScreen })));
const StoreSettingsScreen = React.lazy(() => import('./components/settings/StoreSettingsScreen').then(m => ({ default: m.StoreSettingsScreen })));
const UserManagementScreen = React.lazy(() => import('./components/users/UserManagementScreen').then(m => ({ default: m.UserManagementScreen })));

const MainLayout: React.FC = () => {
  const {
    currentView,
    currentUser,
    isAuthenticated,
    isUserSwitcherOpen,
    setIsUserSwitcherOpen,
    isUserProfileOpen,
    setIsUserProfileOpen,
    isChangePasswordOpen,
    setIsChangePasswordOpen,
    syncState,
    isLoading,
    loadingMessage,
    syncWithServer,
  } = useApp();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCreateAuditOpen, setIsCreateAuditOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  // Auto-detect mobile screen or allow manual toggle with localStorage persistence
  const [manualModeOverride, setManualModeOverride] = useState<'AUTO' | 'MOBILE' | 'DESKTOP'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nganson_view_mode_preference');
      if (saved === 'MOBILE' || saved === 'DESKTOP') return saved;
    }
    return 'AUTO';
  });

  const [windowIsMobile, setWindowIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileScreen = manualModeOverride === 'MOBILE' ? true : manualModeOverride === 'DESKTOP' ? false : windowIsMobile;

  const switchToDesktop = () => {
    setManualModeOverride('DESKTOP');
    localStorage.setItem('nganson_view_mode_preference', 'DESKTOP');
  };

  const switchToMobile = () => {
    setManualModeOverride('MOBILE');
    localStorage.setItem('nganson_view_mode_preference', 'MOBILE');
  };

  const resetToAutoView = () => {
    setManualModeOverride('AUTO');
    localStorage.removeItem('nganson_view_mode_preference');
  };

  // Authentication Guard: Require login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] w-full overflow-y-auto font-sans antialiased text-slate-800 relative">
        <LoginScreen />
        <ToastContainer />
      </div>
    );
  }

  if (isMobileScreen) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#F5F6F8] font-sans antialiased text-slate-800 relative">
        <MobileAppContainer
          onOpenDesktopMode={switchToDesktop}
          isManualOverride={manualModeOverride !== 'AUTO'}
          onResetAutoView={resetToAutoView}
        />
        <GlobalLoadingBar isLoading={isLoading} syncState={syncState} loadingMessage={loadingMessage} />
        <GlobalVoiceAssistant />
        <ToastContainer />
        <ThermalReceiptModal />
        <UserSwitcherModal isOpen={isUserSwitcherOpen} onClose={() => setIsUserSwitcherOpen(false)} />
        <UserProfileModal
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
          onOpenChangePassword={() => {
            setIsUserProfileOpen(false);
            setIsChangePasswordOpen(true);
          }}
        />
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F3F4F6] font-sans antialiased text-slate-800 relative">
      {/* KiotViet Top Navigation Bar */}
      <TopNavbar onOpenMobileMode={switchToMobile} />

      {/* Navigation Sidebar Drawer for Small/Tablet Screens */}
      {isMobileOpen && (
        <Sidebar
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          onOpenMobileMode={switchToMobile}
          isManualOverride={manualModeOverride !== 'AUTO'}
          onResetAutoView={resetToAutoView}
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto relative p-2.5 md:p-3.5 scroll-hide">
          <React.Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400 font-medium text-sm animate-pulse">Đang tải phân hệ...</div>}>
            {currentView === 'pos' && <PosSalesScreen />}
          
          {currentView === 'products' && (
            <ProductManagementScreen
              isAddDrawerOpen={isAddProductOpen}
              setIsAddDrawerOpen={setIsAddProductOpen}
            />
          )}

          {currentView === 'inventory' && (
            currentUser.permissions.canAuditInventory ? (
              <InventoryAuditScreen
                isCreateAuditModalOpen={isCreateAuditOpen}
                setIsCreateAuditModalOpen={setIsCreateAuditOpen}
              />
            ) : (
              <AccessDeniedView moduleName="Sổ kho & Kiểm kê" />
            )
          )}

          {currentView === 'orders' && <InvoiceManagementScreen />}
          {currentView === 'invoices' && <InvoiceManagementScreen />}

          {currentView === 'reports' && (
            currentUser.permissions.canViewReports ? (
              <QuarterlyFinancialReport />
            ) : (
              <AccessDeniedView moduleName="Báo cáo Doanh thu & Lợi nhuận" />
            )
          )}

          {currentView === 'cashbook' && (
            currentUser.permissions.canManageCashbook ? (
              <CashbookScreen
                isCashModalOpen={isCashModalOpen}
                setIsCashModalOpen={setIsCashModalOpen}
              />
            ) : (
              <AccessDeniedView moduleName="Sổ quỹ (Thu / Chi)" />
            )
          )}

          {currentView === 'customers' && (
            currentUser.permissions.canManageCustomers ? (
              <CustomerManagementScreen />
            ) : (
              <AccessDeniedView moduleName="Quản lý Khách hàng & Công nợ" />
            )
          )}

          {currentView === 'suppliers' && (
            currentUser.permissions.canManageSuppliers ? (
              <SupplierManagementScreen />
            ) : (
              <AccessDeniedView moduleName="Quản lý Nhà cung cấp & Công nợ" />
            )
          )}

          {currentView === 'settings' && (
            currentUser.permissions.canEditSystemSettings ? (
              <StoreSettingsScreen />
            ) : (
              <AccessDeniedView moduleName="Cài đặt Cửa hàng & Mã QR" />
            )
          )}

          {currentView === 'users' && (
            currentUser.role === 'ADMIN' || currentUser.permissions.canManageUsers ? (
              <UserManagementScreen />
            ) : (
              <AccessDeniedView moduleName="Quản trị Tài khoản & Phân quyền" />
            )
          )}
          </React.Suspense>
        </main>

        {/* Status Bar Footer */}
        <footer className="h-7 bg-white border-t border-slate-200 px-4 md:px-6 flex items-center justify-between text-[10px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => syncWithServer()}
              className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer"
              title="Nhấn để đồng bộ lại với máy chủ"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncState === 'SYNCING'
                    ? 'bg-blue-500 animate-ping'
                    : syncState === 'OFFLINE'
                    ? 'bg-amber-500'
                    : syncState === 'ERROR'
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
              ></span>
              <span>
                {syncState === 'SYNCING'
                  ? 'Đang đồng bộ...'
                  : syncState === 'OFFLINE'
                  ? 'Chế độ Offline'
                  : syncState === 'ERROR'
                  ? 'Lỗi kết nối máy chủ'
                  : 'Đồng bộ Máy chủ & Mobile: Hoạt động'}
              </span>
            </button>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline">Đang đăng nhập: <strong>{currentUser.name}</strong> ({currentUser.roleTitle})</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline">Máy in K80: Sẵn sàng</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={switchToMobile}
              className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer text-[10px]"
              title="Chuyển sang giao diện di động KiotViet"
            >
              <span>📱 Xem Giao diện Mobile</span>
            </button>
            <span className="hidden md:inline">Phiên bản: 4.3-PRO (Backend & Mobile Sync)</span>
            <span className="font-bold text-slate-700 uppercase tracking-wider">NGÂN SƠN STORE</span>
          </div>
        </footer>
      </div>

      {/* Global Top Progress & Status Bar */}
      <GlobalLoadingBar
        isLoading={isLoading}
        syncState={syncState}
        loadingMessage={loadingMessage}
      />

      {/* Background Task Floating Bar */}
      <BackgroundTaskBar />

      {/* Global AI Voice Assistant (One-touch & Alt+V) */}
      <GlobalVoiceAssistant />

      {/* Global Notifications */}
      <ToastContainer />

      {/* K80 Thermal Receipt Modal */}
      <ThermalReceiptModal />

      {/* User Switcher Modal */}
      <UserSwitcherModal
        isOpen={isUserSwitcherOpen}
        onClose={() => setIsUserSwitcherOpen(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        onOpenChangePassword={() => {
          setIsUserProfileOpen(false);
          setIsChangePasswordOpen(true);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
