import React, { useState, useMemo } from 'react';
import { useOrdersData } from '../../context/slices/OrdersDataContext';
import { formatCurrency, formatShortCurrency, parseDateToTimestamp } from '../../utils/formatters';
import {
  Phone,
  Bell,
  Mail,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  BarChart2,
  BarChart3,
  Maximize2,
  ShoppingCart,
  Receipt,
  Wallet,
} from 'lucide-react';
import { MobileNotificationsModal } from './MobileNotificationsModal';
import { MobileSupportModal } from './MobileSupportModal';
import { MobileCashbookModal } from './MobileCashbookModal';
import { MobileStaffModal } from './MobileStaffModal';
import { MobileReturnsModal } from './MobileReturnsModal';
import { MobileReportsModal } from './MobileReportsModal';

interface MobileOverviewScreenProps {
  onNavigateTab: (tab: 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE') => void;
}

export const MobileOverviewScreen: React.FC<MobileOverviewScreenProps> = ({ onNavigateTab }) => {
  const { orders } = useOrdersData();
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'last_month' | 'all'>('this_month');
  const [showProfit, setShowProfit] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Sub-modals state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportTab, setSupportTab] = useState<'HOTLINE' | 'FEEDBACK'>('HOTLINE');
  const [isCashbookOpen, setIsCashbookOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isReturnsOpen, setIsReturnsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  // Return vouchers from localStorage
  const returnsData = useMemo(() => {
    let returnVouchers: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nganson_returns');
        if (saved) returnVouchers = JSON.parse(saved);
      } catch {
        returnVouchers = [];
      }
    }
    return returnVouchers;
  }, [isReturnsOpen]);

  // Dynamic time filter labels
  const timeLabels = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatShortDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    const prevMonthNumber = today.getMonth() === 0 ? 12 : today.getMonth();

    return {
      today: `Hôm nay (${formatShortDate(today)})`,
      yesterday: `Hôm qua (${formatShortDate(yesterday)})`,
      last_7_days: '7 ngày qua',
      this_month: `Tháng này (T${today.getMonth() + 1})`,
      last_month: `Tháng trước (T${prevMonthNumber})`,
      all: 'Tất cả thời gian',
    };
  }, []);

  // Calculate metrics based on actual orders for selected timeRange
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).getTime();

    const startOf7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime();

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

    const isInRange = (ts: number) => {
      if (timeRange === 'all') return true;
      if (ts === 0) return false;
      if (timeRange === 'today') return ts >= startOfToday && ts <= endOfToday;
      if (timeRange === 'yesterday') return ts >= startOfYesterday && ts <= endOfYesterday;
      if (timeRange === 'last_7_days') return ts >= startOf7Days && ts <= endOfToday;
      if (timeRange === 'this_month') return ts >= startOfThisMonth && ts <= endOfThisMonth;
      if (timeRange === 'last_month') return ts >= startOfLastMonth && ts <= endOfLastMonth;
      return true;
    };

    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    const filtered = completedOrders.filter((o) => isInRange(parseDateToTimestamp(o.created_at)));

    const orderCount = filtered.length;
    const revenue = filtered.reduce((sum, o) => sum + (o.final_amount || 0), 0);
    const profit = filtered.reduce((sum, o) => sum + (o.profit ?? ((o.final_amount || 0) - (o.total_cost || 0))), 0);

    // Calculate return vouchers and cancelled orders in selected period
    const filteredReturns = returnsData.filter((r: any) => isInRange(parseDateToTimestamp(r.createdAt || r.created_at)));
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED' && isInRange(parseDateToTimestamp(o.created_at)));
    const returnCount = filteredReturns.length + cancelledOrders.length;
    const returnTotal =
      filteredReturns.reduce((sum: number, r: any) => sum + (r.totalRefund || r.refundAmount || 0), 0) +
      cancelledOrders.reduce((sum: number, o: any) => sum + (o.final_amount || 0), 0);

    // Calculate last 7 days daily revenue for chart
    const pad = (n: number) => n.toString().padStart(2, '0');
    const sevenDaysData: { dayLabel: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
      const dRev = completedOrders
        .filter((o) => {
          const ts = parseDateToTimestamp(o.created_at);
          return ts >= dStart && ts <= dEnd;
        })
        .reduce((sum, o) => sum + (o.final_amount || 0), 0);

      sevenDaysData.push({
        dayLabel: pad(d.getDate()),
        revenue: dRev,
      });
    }

    const maxChartRev = Math.max(...sevenDaysData.map((d) => d.revenue), 1000000);

    return {
      orderCount,
      revenue,
      profit,
      returnCount,
      returnTotal,
      chartDays: sevenDaysData,
      maxChartRev,
    };
  }, [orders, timeRange, returnsData]);

  const formatShortMillion = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)} triệu`;
    }
    return formatCurrency(amount);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F6F8] pb-24 text-slate-800">
      {/* Top Header */}
      <div className="bg-white px-4 pt-3 pb-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 p-0.5 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Ngân Sơn Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">Ngân Sơn Store</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-4 text-slate-600">
          <button
            onClick={() => {
              setSupportTab('HOTLINE');
              setIsSupportOpen(true);
            }}
            aria-label="Gọi hỗ trợ"
            className="p-1 hover:text-[#0066FF] active:scale-95 transition-all"
            title="Gọi hỗ trợ"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsNotificationsOpen(true)}
            aria-label="Thông báo"
            className="relative p-1 hover:text-[#0066FF] active:scale-95 transition-all"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </button>
          <button
            onClick={() => {
              setSupportTab('FEEDBACK');
              setIsSupportOpen(true);
            }}
            aria-label="Tin nhắn"
            className="p-1 hover:text-[#0066FF] active:scale-95 transition-all"
            title="Tin nhắn"
          >
            <Mail className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="p-4 flex flex-col gap-4">
        {/* Time Selector Dropdown */}
        <div className="relative inline-block self-start">
          <button
            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
            className="flex items-center gap-1.5 bg-[#EAF2FF] text-[#0066FF] px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-100 active:scale-95 transition-all shadow-2xs"
          >
            <span>{timeLabels[timeRange]}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

            {isTimeDropdownOpen && (
              <div className="absolute top-9 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 w-52 text-xs font-medium animate-in fade-in zoom-in-95">
                {(['today', 'yesterday', 'last_7_days', 'this_month', 'last_month', 'all'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTimeRange(key);
                      setIsTimeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                      timeRange === key ? 'text-[#0066FF] font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{timeLabels[key]}</span>
                    {timeRange === key && <span className="text-[#0066FF]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Revenue & Profit Summary Card */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Orders & Revenue */}
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1">{metrics.orderCount} hoá đơn</div>
                <div className="text-2xl font-black text-[#0066FF] tracking-tight">
                  {formatShortMillion(metrics.revenue)}
                </div>
              </div>

              {/* Profit */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
                  <span>Lợi nhuận</span>
                  <button
                    onClick={() => setShowProfit(!showProfit)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title={showProfit ? 'Ẩn lợi nhuận' : 'Hiện lợi nhuận'}
                  >
                    {showProfit ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  {showProfit ? formatShortMillion(metrics.profit) : '*** ***'}
                </div>
              </div>
            </div>

            <div
              onClick={() => setIsReturnsOpen(true)}
              className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs text-slate-500 font-medium cursor-pointer hover:text-[#0066FF] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <span>
                  {metrics.returnCount > 0
                    ? `${metrics.returnCount} đơn trả hàng - ${formatCurrency(metrics.returnTotal)}`
                    : '0 đơn trả hàng - 0 đ'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

        {/* 5 Quick Action Shortcuts (Bán hàng, Hàng hóa, Hóa đơn, Sổ quỹ, Báo cáo) */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-100 grid grid-cols-5 gap-1 text-center">
          <button
            onClick={() => onNavigateTab('POS')}
            className="flex flex-col items-center gap-1.5 p-1 hover:bg-slate-50 rounded-xl transition-colors active:scale-95 cursor-pointer"
            aria-label="Truy cập nhanh Bán hàng"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center shadow-2xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Bán hàng</span>
          </button>

          <button
            onClick={() => onNavigateTab('PRODUCTS')}
            className="flex flex-col items-center gap-1.5 p-1 hover:bg-slate-50 rounded-xl transition-colors active:scale-95 cursor-pointer"
            aria-label="Truy cập nhanh Hàng hóa"
          >
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Hàng hóa</span>
          </button>

          <button
            onClick={() => onNavigateTab('INVOICES')}
            className="flex flex-col items-center gap-1.5 p-1 hover:bg-slate-50 rounded-xl transition-colors active:scale-95 cursor-pointer"
            aria-label="Truy cập nhanh Hóa đơn"
          >
            <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Hóa đơn</span>
          </button>

          <button
            onClick={() => setIsCashbookOpen(true)}
            className="flex flex-col items-center gap-1.5 p-1 hover:bg-slate-50 rounded-xl transition-colors active:scale-95 cursor-pointer"
            aria-label="Truy cập nhanh Sổ quỹ"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Sổ quỹ</span>
          </button>

          <button
            onClick={() => setIsReportsOpen(true)}
            className="flex flex-col items-center gap-1.5 p-1 hover:bg-slate-50 rounded-xl transition-colors active:scale-95 cursor-pointer"
            aria-label="Truy cập nhanh Báo cáo doanh thu"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">Báo cáo</span>
          </button>
        </div>

        {/* Revenue Bar Chart Section */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsReportsOpen(true)}
              className="flex items-center gap-1 text-base font-bold text-slate-800 hover:text-[#0066FF] transition-colors"
            >
              <span>Doanh thu</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <div className="flex items-center gap-2 text-slate-400">
              <BarChart2 className="w-4 h-4 text-[#0066FF]" />
              <button
                onClick={() => setIsReportsOpen(true)}
                className="p-1 hover:text-slate-600 transition-colors"
                title="Phóng to báo cáo doanh thu"
              >
                <Maximize2 className="w-4 h-4 cursor-pointer" />
              </button>
            </div>
          </div>

          {/* Bar Chart Canvas / SVG */}
          <div className="pt-2 pb-1">
            <div className="h-44 w-full flex flex-col justify-between relative">
              {/* Y Axis Grid lines — ticks are computed straight from the actual max revenue
                  (in đ) and formatted with formatShortCurrency (K/M/tỷ), instead of forcing
                  everything into whole "triệu" units. The old version rounded to whole millions
                  first, so any day under 1.000.000đ (the common case for a small store) rounded
                  every tick up to the same "1Tr" label. */}
              {(() => {
                const maxRev = Math.max(0, metrics.maxChartRev);
                const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => maxRev * fraction);
                return ticks.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2 w-full text-[10px] text-slate-400">
                    <span className="w-12 text-right font-mono">{val > 0 ? formatShortCurrency(val) : '0'}</span>
                    <div className="flex-1 border-b border-slate-100" />
                  </div>
                ));
              })()}

              {/* Bar Columns Container */}
              <div className="absolute inset-x-8 bottom-4 top-2 flex items-end justify-around pl-4">
                {metrics.chartDays.map((d, index) => {
                  const percent = metrics.maxChartRev > 0 ? Math.min(100, Math.round((d.revenue / metrics.maxChartRev) * 100)) : 0;
                  const isToday = index === metrics.chartDays.length - 1;
                  return (
                    <div key={d.dayLabel} className="flex flex-col items-center gap-1.5 h-full justify-end flex-1 max-w-[36px]">
                      <div
                        className={`w-5 rounded-t-xs transition-all hover:brightness-110 ${
                          d.revenue > 0 ? 'bg-[#0066FF]' : 'bg-slate-200'
                        }`}
                        style={{ height: `${Math.max(4, percent)}%` }}
                        title={`Ngày ${d.dayLabel}: ${formatCurrency(d.revenue)}`}
                      />
                      <span className={`text-[10px] ${isToday ? 'font-bold text-[#0066FF]' : 'font-medium text-slate-500'}`}>
                        {d.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render all sub-modals */}
      <MobileNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateTab={onNavigateTab}
      />

      <MobileSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        initialTab={supportTab}
      />

      <MobileCashbookModal
        isOpen={isCashbookOpen}
        onClose={() => setIsCashbookOpen(false)}
      />

      <MobileStaffModal
        isOpen={isStaffOpen}
        onClose={() => setIsStaffOpen(false)}
      />

      <MobileReturnsModal
        isOpen={isReturnsOpen}
        onClose={() => setIsReturnsOpen(false)}
      />

      <MobileReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        reportType="SALES"
      />
    </div>
  );
};
