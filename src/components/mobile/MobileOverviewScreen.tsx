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

    // Chart granularity adapts to the selected period instead of always showing daily bars —
    // a full month as 31 daily bars doesn't fit a small dashboard card, and "all time" has no
    // natural day range at all. Each case picks whatever bucket size keeps the bar count small
    // and the trend still readable: single day -> 1 bar, a week -> daily, a month -> daily while
    // short (early in the month) else weekly, all time -> yearly.
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sumRevenueInRange = (startTs: number, endTs: number) =>
      completedOrders
        .filter((o) => {
          const ts = parseDateToTimestamp(o.created_at);
          return ts >= startTs && ts <= endTs;
        })
        .reduce((sum, o) => sum + (o.final_amount || 0), 0);
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    const isSameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

    const pushDailyBuckets = (buckets: { dayLabel: string; revenue: number; isToday: boolean }[], start: Date, endInclusive: Date) => {
      const count = Math.round((endInclusive.getTime() - start.getTime()) / 86400000) + 1;
      for (let i = 0; i < count; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        buckets.push({
          dayLabel: pad(d.getDate()),
          revenue: sumRevenueInRange(d.getTime(), endOfDay(d)),
          isToday: isSameDay(d, todayAtMidnight),
        });
      }
    };

    const pushHourlyBuckets = (buckets: { dayLabel: string; revenue: number; isToday: boolean }[], day: Date, isCurrentDay: boolean) => {
      const bucketSizeHours = 3; // a handful of hours per bar, not all 24 individually
      const nowHour = now.getHours();
      for (let h = 0; h < 24; h += bucketSizeHours) {
        const bucketEndHourExclusive = Math.min(h + bucketSizeHours, 24);
        const bucketStartTs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0).getTime();
        const bucketEndTs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), bucketEndHourExclusive - 1, 59, 59, 999).getTime();
        buckets.push({
          dayLabel: `${h}h`,
          revenue: sumRevenueInRange(bucketStartTs, bucketEndTs),
          isToday: isCurrentDay && nowHour >= h && nowHour < bucketEndHourExclusive,
        });
      }
    };

    const pushWeeklyBuckets = (buckets: { dayLabel: string; revenue: number; isToday: boolean }[], monthStart: Date, monthEndInclusive: Date) => {
      let weekIndex = 1;
      let cursor = monthStart;
      while (cursor.getTime() <= monthEndInclusive.getTime()) {
        const weekEndCandidate = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6);
        const weekEnd = weekEndCandidate.getTime() < monthEndInclusive.getTime() ? weekEndCandidate : monthEndInclusive;
        const weekEndTs = endOfDay(weekEnd);
        const containsToday = todayAtMidnight.getTime() >= cursor.getTime() && todayAtMidnight.getTime() <= weekEndTs;
        buckets.push({
          dayLabel: `Tuần ${weekIndex}`,
          revenue: sumRevenueInRange(cursor.getTime(), weekEndTs),
          isToday: containsToday,
        });
        weekIndex++;
        cursor = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate() + 1);
      }
    };

    const chartDaysData: { dayLabel: string; revenue: number; isToday: boolean }[] = [];

    if (timeRange === 'today' || timeRange === 'yesterday') {
      const d = timeRange === 'today' ? todayAtMidnight : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      pushHourlyBuckets(chartDaysData, d, timeRange === 'today');
    } else if (timeRange === 'this_month' || timeRange === 'last_month') {
      const monthStart = timeRange === 'this_month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEndInclusive = timeRange === 'this_month' ? todayAtMidnight : new Date(now.getFullYear(), now.getMonth(), 0);
      const daysSoFar = Math.round((monthEndInclusive.getTime() - monthStart.getTime()) / 86400000) + 1;
      if (daysSoFar <= 10) {
        // Early in the month (or viewing a short partial month) — daily is still the clearest view.
        pushDailyBuckets(chartDaysData, monthStart, monthEndInclusive);
      } else {
        pushWeeklyBuckets(chartDaysData, monthStart, monthEndInclusive);
      }
    } else if (timeRange === 'all') {
      // Aggregate by year across the actual span of order data (falls back to the current year
      // alone if there's no data yet, rather than an arbitrary/empty range).
      const orderTimestamps = completedOrders.map((o) => parseDateToTimestamp(o.created_at)).filter((ts) => ts > 0);
      const minYear = orderTimestamps.length > 0 ? new Date(Math.min(...orderTimestamps)).getFullYear() : now.getFullYear();
      const maxYear = now.getFullYear();
      for (let y = minYear; y <= maxYear; y++) {
        const yStart = new Date(y, 0, 1).getTime();
        const yEnd = new Date(y, 11, 31, 23, 59, 59, 999).getTime();
        chartDaysData.push({ dayLabel: `${y}`, revenue: sumRevenueInRange(yStart, yEnd), isToday: y === now.getFullYear() });
      }
    } else {
      // 'last_7_days' (and any unrecognized value) — the original, still-appropriate 7-day daily view.
      pushDailyBuckets(chartDaysData, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), todayAtMidnight);
    }

    const maxChartRev = Math.max(...chartDaysData.map((d) => d.revenue), 1000000);

    return {
      orderCount,
      revenue,
      profit,
      returnCount,
      returnTotal,
      chartDays: chartDaysData,
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
            {(() => {
              // Ticks are computed straight from the actual max revenue (in đ) and formatted
              // with formatShortCurrency (K/M/tỷ), instead of forcing everything into whole
              // "triệu" units first — the old version rounded to whole millions before taking
              // any fraction, so any day under 1.000.000đ (the common case for a small store)
              // rounded every tick up to the same "1Tr" label.
              const maxRev = Math.max(0, metrics.maxChartRev);
              const ticks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => maxRev * fraction);
              const dayCount = metrics.chartDays.length;
              // A week or so of bars fits and spreads evenly across the card as before. A full
              // month (up to 31 bars, e.g. "Tháng trước") does not — instead of squeezing them
              // down to illegibility or clipping days off the edge, give each column a fixed
              // minimum width and let that area scroll horizontally, while the Y-axis stays put.
              const needsScroll = dayCount > 10;
              const columnMinWidthPx = 30;

              return (
                <div className="h-44 w-full flex">
                  {/* Fixed Y-axis labels — never scrolls */}
                  <div className="w-12 shrink-0 h-full flex flex-col justify-between text-[10px] text-slate-400 font-mono text-right pr-2 pb-4">
                    {ticks.map((val, idx) => (
                      <span key={idx}>{val > 0 ? formatShortCurrency(val) : '0'}</span>
                    ))}
                  </div>

                  {/* Scrollable chart area: grid lines + bars share the same (possibly wider than
                      the card) width so they always line up regardless of day count. */}
                  <div className="flex-1 min-w-0 h-full overflow-x-auto">
                    <div
                      className="relative h-full"
                      style={needsScroll ? { minWidth: `${dayCount * columnMinWidthPx}px` } : undefined}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pb-4">
                        {ticks.map((_, idx) => (
                          <div key={idx} className="border-b border-slate-100" />
                        ))}
                      </div>

                      {/* Bars */}
                      <div
                        className={`absolute inset-x-0 bottom-4 top-2 flex items-end ${
                          needsScroll ? 'justify-start gap-1 px-1' : 'justify-around pl-4'
                        }`}
                      >
                        {metrics.chartDays.map((d, index) => {
                          const percent = metrics.maxChartRev > 0 ? Math.min(100, Math.round((d.revenue / metrics.maxChartRev) * 100)) : 0;
                          return (
                            <div
                              key={index}
                              className={`flex flex-col items-center gap-1.5 h-full justify-end ${
                                needsScroll ? 'w-6 shrink-0' : 'flex-1 max-w-[48px]'
                              }`}
                            >
                              <div
                                className={`w-5 rounded-t-xs transition-all hover:brightness-110 ${
                                  d.revenue > 0 ? 'bg-[#0066FF]' : 'bg-slate-200'
                                }`}
                                style={{ height: `${Math.max(4, percent)}%` }}
                                title={`Ngày ${d.dayLabel}: ${formatCurrency(d.revenue)}`}
                              />
                              <span className={`text-[10px] whitespace-nowrap ${d.isToday ? 'font-bold text-[#0066FF]' : 'font-medium text-slate-500'}`}>
                                {d.dayLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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
