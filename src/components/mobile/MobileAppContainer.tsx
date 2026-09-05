import React, { useState } from 'react';
import {
  BarChart2,
  Package,
  ShoppingBag,
  FileText,
  Menu as MenuIcon,
} from 'lucide-react';
import { MobileOverviewScreen } from './MobileOverviewScreen';
import { MobileProductsScreen } from './MobileProductsScreen';
import { MobilePosScreen } from './MobilePosScreen';
import { MobileInvoicesScreen } from './MobileInvoicesScreen';
import { MobileMoreScreen } from './MobileMoreScreen';
import { useApp } from '../../context/AppContext';

export type MobileTab = 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE';

interface MobileAppContainerProps {
  onOpenDesktopMode?: () => void;
  isManualOverride?: boolean;
  onResetAutoView?: () => void;
}

export const MobileAppContainer: React.FC<MobileAppContainerProps> = ({
  onOpenDesktopMode,
  isManualOverride,
  onResetAutoView,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('OVERVIEW');
  const { setIsVoiceAssistantOpen } = useApp();

  const tabs = [
    { id: 'OVERVIEW' as const, label: 'Tổng quan', icon: BarChart2 },
    { id: 'PRODUCTS' as const, label: 'Hàng hoá', icon: Package },
    { id: 'POS' as const, label: 'Bán hàng', icon: ShoppingBag },
    { id: 'INVOICES' as const, label: 'Hoá đơn', icon: FileText },
    { id: 'MORE' as const, label: 'Nhiều hơn', icon: MenuIcon },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F5F6F8] font-sans antialiased text-slate-800 select-none">
      {/* Active Screen View */}
      <div id="mobile-scroll-root" className="flex-1 overflow-y-auto scroll-hide relative">
        {activeTab === 'OVERVIEW' && <MobileOverviewScreen onNavigateTab={(tab) => setActiveTab(tab)} />}
        {activeTab === 'PRODUCTS' && <MobileProductsScreen />}
        {activeTab === 'POS' && <MobilePosScreen />}
        {activeTab === 'INVOICES' && <MobileInvoicesScreen onOpenPos={() => setActiveTab('POS')} />}
        {activeTab === 'MORE' && (
          <MobileMoreScreen
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenDesktopMode={onOpenDesktopMode}
            isManualOverride={isManualOverride}
            onResetAutoView={onResetAutoView}
          />
        )}
      </div>

      {/* 5-Tab Fixed Bottom Navigation Bar (Image 2, 4, 5, 7, 12, 17) */}
      <nav className="h-16 bg-white border-t border-slate-200/90 px-2 flex items-center justify-around fixed bottom-0 inset-x-0 z-40 shadow-sm">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-1 gap-1 transition-colors active:scale-95 ${
                isActive ? 'text-[#0066FF]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5] scale-105' : 'stroke-[1.75]'}`} />
              <span className={`text-[10px] ${isActive ? 'font-black tracking-tight' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
