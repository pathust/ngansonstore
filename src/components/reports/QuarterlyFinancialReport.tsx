import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatShortCurrency, parseOrderDate } from '../../utils/formatters';
import {
  Wallet,
  Package,
  TrendingUp,
  PiggyBank,
  ShoppingCart,
  Download,
  Calendar,
  Layers,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Sparkles,
  ShoppingBag,
  Store,
  Clock,
  CheckCircle2,
  Receipt,
  Award,
  AlertTriangle,
  Lightbulb,
  QrCode,
  CreditCard,
  Banknote,
  Flame,
  Activity,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';

type ViewMode = 'WEEK' | 'MONTH' | 'QUARTER';

export const QuarterlyFinancialReport: React.FC = () => {
  const { products, orders, categories, showToast, setCurrentView } = useApp();

  // Navigation Mode: WEEK | MONTH | QUARTER
  const [viewMode, setViewMode] = useState<ViewMode>('WEEK');

  // Selected periods
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' =
    currentMonth <= 3 ? 'Q1' : currentMonth <= 6 ? 'Q2' : currentMonth <= 9 ? 'Q3' : 'Q4';
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeekType, setSelectedWeekType] = useState<'THIS_WEEK' | 'LAST_WEEK' | 'LAST_7_DAYS'>('THIS_WEEK');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(currentQuarter);
  const [monthlySubView, setMonthlySubView] = useState<'ALL_MONTHS' | 'SELECTED_MONTH'>('ALL_MONTHS');
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState<boolean>(true);

  // Category palette
  const CATEGORY_COLORS = ['#0B63E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  // Parse all real orders in the system
  const completedOrderStats = useMemo(() => {
    return orders
      .filter((o) => o.status === 'COMPLETED')
      .map((ord) => {
        const parsed = parseOrderDate(ord.created_at);
        return {
          ...ord,
          parsedDate: parsed.date,
          dayOfMonth: parsed.day,
          month: parsed.month,
          year: parsed.year,
          dayOfWeek: parsed.dayOfWeek, // 0 = Sun, 1 = Mon ... 6 = Sat
          hour: parsed.date.getHours(),
          timestamp: parsed.timestamp,
          formattedDate: parsed.formattedDisplay,
        };
      });
  }, [orders]);

  // Overall system metrics directly from actual orders
  const overallSystemMetrics = useMemo(() => {
    const totalActualRevenue = completedOrderStats.reduce((s, o) => s + (o.final_amount || 0), 0);
    const totalActualCogs = completedOrderStats.reduce((s, o) => s + (o.total_cost || 0), 0);
    const totalActualProfit = completedOrderStats.reduce((s, o) => s + (o.profit || 0), 0);
    const totalActualOrders = completedOrderStats.length;
    const actualAov = totalActualOrders > 0 ? Math.round(totalActualRevenue / totalActualOrders) : 0;
    const actualMargin = totalActualRevenue > 0 ? Number(((totalActualProfit / totalActualRevenue) * 100).toFixed(1)) : 0;

    return {
      totalActualRevenue,
      totalActualCogs,
      totalActualProfit,
      totalActualOrders,
      actualAov,
      actualMargin,
    };
  }, [completedOrderStats]);

  // Filtered orders for the selected week view
  const filteredWeekOrders = useMemo(() => {
    const now = new Date();
    const nowTimestamp = now.getTime();

    if (selectedWeekType === 'LAST_7_DAYS') {
      const sevenDaysAgo = nowTimestamp - 7 * 24 * 60 * 60 * 1000;
      return completedOrderStats.filter((o) => o.timestamp >= sevenDaysAgo && o.timestamp <= nowTimestamp);
    } else if (selectedWeekType === 'THIS_WEEK') {
      // Current Monday to Sunday
      const currentDay = now.getDay();
      const distanceToMon = (currentDay + 6) % 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMon, 0, 0, 0);
      const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return completedOrderStats.filter((o) => o.timestamp >= monday.getTime() && o.timestamp <= sunday.getTime());
    } else if (selectedWeekType === 'LAST_WEEK') {
      // Last week Monday to Sunday
      const currentDay = now.getDay();
      const distanceToMon = (currentDay + 6) % 7;
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMon - 7, 0, 0, 0);
      const lastSunday = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return completedOrderStats.filter((o) => o.timestamp >= lastMonday.getTime() && o.timestamp <= lastSunday.getTime());
    }
    return completedOrderStats;
  }, [completedOrderStats, selectedWeekType]);

  // --- 1. WEEKLY DATA CALCULATION (100% REAL ORDERS) ---
  const weeklyReportData = useMemo(() => {

    // Days mapping: Thứ 2 (1), Thứ 3 (2), Thứ 4 (3), Thứ 5 (4), Thứ 6 (5), Thứ 7 (6), Chủ Nhật (0)
    const dayConfig = [
      { dayIndex: 1, name: 'Thứ 2' },
      { dayIndex: 2, name: 'Thứ 3' },
      { dayIndex: 3, name: 'Thứ 4' },
      { dayIndex: 4, name: 'Thứ 5' },
      { dayIndex: 5, name: 'Thứ 6' },
      { dayIndex: 6, name: 'Thứ 7' },
      { dayIndex: 0, name: 'Chủ Nhật' },
    ];

    const daysAggregation = dayConfig.map((item) => {
      const matchingOrders = filteredWeekOrders.filter((o) => o.dayOfWeek === item.dayIndex);
      const revenue = matchingOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
      const cogs = matchingOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
      const profit = matchingOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
      const ordersCount = matchingOrders.length;
      const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
      const margin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

      return {
        day: item.name,
        revenue,
        cogs,
        profit,
        orders: ordersCount,
        aov,
        margin,
      };
    });

    const totalRevenue = daysAggregation.reduce((s, d) => s + d.revenue, 0);
    const totalCogs = daysAggregation.reduce((s, d) => s + d.cogs, 0);
    const totalProfit = daysAggregation.reduce((s, d) => s + d.profit, 0);
    const totalOrders = daysAggregation.reduce((s, d) => s + d.orders, 0);
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const margin = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      days: daysAggregation,
      totalRevenue,
      totalCogs,
      totalProfit,
      totalOrders,
      aov,
      margin,
    };
  }, [filteredWeekOrders]);

  // --- 2. MONTHLY DATA CALCULATION (100% REAL ORDERS) ---
  const monthlyReportData = useMemo(() => {
    // 12 Months for the selectedYear
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthLabel = `Tháng ${monthNum}`;
      const matchOrders = completedOrderStats.filter((o) => o.year === selectedYear && o.month === monthNum);

      const revenue = matchOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
      const cogs = matchOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
      const profit = matchOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
      const ordersCount = matchOrders.length;
      const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
      const margin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

      return {
        monthNum,
        month: monthLabel,
        revenue,
        cogs,
        profit,
        orders: ordersCount,
        aov,
        margin,
      };
    });

    // Specific Month detail & 4 weeks breakdown
    const targetMonthDetail = monthsData.find((m) => m.monthNum === selectedMonth) || monthsData[0];
    const monthOrders = completedOrderStats.filter((o) => o.year === selectedYear && o.month === selectedMonth);

    const weekRanges = [
      { week: 'Tuần 1 (01-07)', startDay: 1, endDay: 7 },
      { week: 'Tuần 2 (08-14)', startDay: 8, endDay: 14 },
      { week: 'Tuần 3 (15-21)', startDay: 15, endDay: 21 },
      { week: 'Tuần 4 (22-hết tháng)', startDay: 22, endDay: 31 },
    ];

    const monthWeeks = weekRanges.map((w) => {
      const matchInWeek = monthOrders.filter((o) => o.dayOfMonth >= w.startDay && o.dayOfMonth <= w.endDay);
      const revenue = matchInWeek.reduce((s, o) => s + (o.final_amount || 0), 0);
      const cogs = matchInWeek.reduce((s, o) => s + (o.total_cost || 0), 0);
      const profit = matchInWeek.reduce((s, o) => s + (o.profit || 0), 0);
      const ordersCount = matchInWeek.length;
      const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
      const margin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

      return {
        week: w.week,
        revenue,
        cogs,
        profit,
        orders: ordersCount,
        aov,
        margin,
      };
    });

    const totalYearRevenue = monthsData.reduce((s, m) => s + m.revenue, 0);
    const totalYearProfit = monthsData.reduce((s, m) => s + m.profit, 0);
    const totalYearCogs = monthsData.reduce((s, m) => s + m.cogs, 0);
    const totalYearOrders = monthsData.reduce((s, m) => s + m.orders, 0);

    return {
      allMonths: monthsData,
      selectedMonthDetail: targetMonthDetail,
      monthWeeks,
      totalYearRevenue,
      totalYearProfit,
      totalYearCogs,
      totalYearOrders,
    };
  }, [completedOrderStats, selectedYear, selectedMonth]);

  // --- 3. QUARTERLY DATA CALCULATION (100% REAL ORDERS) ---
  const quarterlyReportData = useMemo(() => {
    const quarterMap = {
      Q1: { months: [1, 2, 3], label: 'Quý 1' },
      Q2: { months: [4, 5, 6], label: 'Quý 2' },
      Q3: { months: [7, 8, 9], label: 'Quý 3' },
      Q4: { months: [10, 11, 12], label: 'Quý 4' },
    };

    const targetMonthsNums = quarterMap[selectedQuarter].months;
    const qMonthsData = monthlyReportData.allMonths.filter((m) => targetMonthsNums.includes(m.monthNum));

    const revenue = qMonthsData.reduce((s, m) => s + m.revenue, 0);
    const cogs = qMonthsData.reduce((s, m) => s + m.cogs, 0);
    const grossProfit = qMonthsData.reduce((s, m) => s + m.profit, 0);
    const ordersCount = qMonthsData.reduce((s, m) => s + m.orders, 0);
    const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
    const margin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0;

    return {
      label: quarterMap[selectedQuarter].label,
      months: qMonthsData,
      revenue,
      cogs,
      grossProfit,
      orders: ordersCount,
      aov,
      margin,
    };
  }, [monthlyReportData, selectedQuarter]);

  // --- Pre-index products and categories into O(1) Maps to avoid O(N^2) inner loop overhead ---
  const { productByIdOrSku, categoryById } = useMemo(() => {
    const pMap = new Map<string, (typeof products)[0]>();
    for (const p of products) {
      if (p.id) pMap.set(p.id, p);
      if (p.sku) pMap.set(p.sku, p);
    }
    const cMap = new Map<string, (typeof categories)[0]>();
    for (const c of categories) {
      if (c.id) cMap.set(c.id, c);
    }
    return { productByIdOrSku: pMap, categoryById: cMap };
  }, [products, categories]);

  // Currently active orders corresponding to the selected view mode and filters
  const currentViewOrders = useMemo(() => {
    if (viewMode === 'WEEK') {
      return filteredWeekOrders;
    }
    if (viewMode === 'MONTH') {
      if (monthlySubView === 'SELECTED_MONTH') {
        return completedOrderStats.filter((o) => o.year === selectedYear && o.month === selectedMonth);
      }
      return completedOrderStats.filter((o) => o.year === selectedYear);
    }
    if (viewMode === 'QUARTER') {
      const qMonths = { Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12] }[selectedQuarter];
      return completedOrderStats.filter((o) => o.year === selectedYear && qMonths.includes(o.month));
    }
    return completedOrderStats;
  }, [viewMode, filteredWeekOrders, completedOrderStats, monthlySubView, selectedYear, selectedMonth, selectedQuarter]);

  // --- 4. REAL CATEGORY REVENUE BREAKDOWN ---
  const categoryData = useMemo(() => {
    const catRevenueMap = new Map<string, number>();

    currentViewOrders.forEach((order) => {
      order.items.forEach((item) => {
        const prod = (item.product_id && productByIdOrSku.get(item.product_id)) || (item.sku && productByIdOrSku.get(item.sku));
        const catId = prod?.category || 'cat-fmcg';
        const catObj = categoryById.get(catId);
        const catName = catObj?.name || 'Hàng hóa khác';
        const itemRevenue = (item.price || 0) * (item.quantity || 1);
        catRevenueMap.set(catName, (catRevenueMap.get(catName) || 0) + itemRevenue);
      });
    });

    const totalCatRevenue = Array.from(catRevenueMap.values()).reduce((a, b) => a + b, 0);

    if (totalCatRevenue === 0) {
      return categories.slice(0, 5).map((c) => ({
        name: c.name,
        amount: 0,
        value: 0,
      }));
    }

    return Array.from(catRevenueMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        value: Number(((amount / totalCatRevenue) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentViewOrders, productByIdOrSku, categoryById, categories]);

  // --- 5. REAL TOP SELLING PRODUCTS (FROM ACTUAL INVOICES FOR CURRENT VIEW) ---
  const topProducts = useMemo(() => {
    const itemMap = new Map<
      string,
      { id: string; name: string; sku: string; qty: number; revenue: number; profit: number; img: string }
    >();

    currentViewOrders.forEach((order) => {
      order.items.forEach((item) => {
        const prod = (item.product_id && productByIdOrSku.get(item.product_id)) || (item.sku && productByIdOrSku.get(item.sku));
        const key = item.sku || item.name;
        const current = itemMap.get(key) || {
          id: item.product_id,
          name: item.name,
          sku: item.sku || 'SKU-N/A',
          qty: 0,
          revenue: 0,
          profit: 0,
          img: prod?.image || '',
        };

        const itemRev = (item.price || 0) * (item.quantity || 1);
        const itemCost = (item.cost_price || 0) * (item.quantity || 1);

        current.qty += item.quantity || 1;
        current.revenue += itemRev;
        current.profit += itemRev - itemCost;

        itemMap.set(key, current);
      });
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [currentViewOrders, productByIdOrSku]);

  // Export current view data to Excel
  const handleExportExcel = () => {
    let exportRows: any[] = [];
    let fileName = '';

    if (viewMode === 'WEEK') {
      fileName = `Bao_cao_doanh_thu_tuan_${selectedYear}`;
      exportRows = weeklyReportData.days.map((d) => ({
        'Thứ / Ngày': d.day,
        'Số đơn hàng thực': d.orders,
        'Doanh thu thuần thực (đ)': d.revenue,
        'Giá vốn thực (COGS) (đ)': d.cogs,
        'Lợi nhuận gộp thực (đ)': d.profit,
        'Tỷ suất lợi nhuận (%)': `${d.margin}%`,
        'Doanh thu TB/đơn (AOV)': d.aov,
      }));
    } else if (viewMode === 'MONTH') {
      fileName = `Bao_cao_doanh_thu_thang_${selectedMonth}_${selectedYear}`;
      if (monthlySubView === 'ALL_MONTHS') {
        exportRows = monthlyReportData.allMonths.map((m) => ({
          'Kỳ (Tháng)': m.month,
          'Số đơn hàng thực': m.orders,
          'Doanh thu thuần thực (đ)': m.revenue,
          'Giá vốn thực (COGS) (đ)': m.cogs,
          'Lợi nhuận gộp thực (đ)': m.profit,
          'Tỷ suất lợi nhuận (%)': `${m.margin}%`,
          'Doanh thu TB/đơn (AOV)': m.aov,
        }));
      } else {
        exportRows = monthlyReportData.monthWeeks.map((w) => ({
          'Giai đoạn': `${w.week} - Tháng ${selectedMonth}/${selectedYear}`,
          'Số đơn hàng thực': w.orders,
          'Doanh thu thuần thực (đ)': w.revenue,
          'Giá vốn thực (COGS) (đ)': w.cogs,
          'Lợi nhuận gộp thực (đ)': w.profit,
          'Tỷ suất lợi nhuận (%)': `${w.margin}%`,
          'Doanh thu TB/đơn (AOV)': w.aov,
        }));
      }
    } else {
      fileName = `Bao_cao_doanh_thu_${selectedQuarter}_${selectedYear}`;
      exportRows = quarterlyReportData.months.map((m) => ({
        'Kỳ báo cáo': `${m.month} - ${selectedQuarter}/${selectedYear}`,
        'Số đơn hàng thực': m.orders,
        'Doanh thu thuần thực (đ)': m.revenue,
        'Giá vốn thực (COGS) (đ)': m.cogs,
        'Lợi nhuận gộp thực (đ)': m.profit,
        'Tỷ suất lợi nhuận (%)': `${m.margin}%`,
        'Doanh thu TB/đơn (AOV)': m.aov,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoDoanhThuThuc');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    showToast(`Đã xuất báo cáo doanh thu thực ra file Excel (${fileName}.xlsx)!`, 'success');
  };

  // Get active numbers for cards
  const activeRevenue =
    viewMode === 'WEEK'
      ? weeklyReportData.totalRevenue
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData.totalYearRevenue
        : monthlyReportData.selectedMonthDetail.revenue
      : quarterlyReportData.revenue;

  const activeCogs =
    viewMode === 'WEEK'
      ? weeklyReportData.totalCogs
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData.totalYearCogs
        : monthlyReportData.selectedMonthDetail.cogs
      : quarterlyReportData.cogs;

  const activeProfit =
    viewMode === 'WEEK'
      ? weeklyReportData.totalProfit
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData.totalYearProfit
        : monthlyReportData.selectedMonthDetail.profit
      : quarterlyReportData.grossProfit;

  const activeOrdersCount =
    viewMode === 'WEEK'
      ? weeklyReportData.totalOrders
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData.totalYearOrders
        : monthlyReportData.selectedMonthDetail.orders
      : quarterlyReportData.orders;

  const activeAov =
    viewMode === 'WEEK'
      ? weeklyReportData.aov
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? Math.round(monthlyReportData.totalYearRevenue / (monthlyReportData.totalYearOrders || 1))
        : monthlyReportData.selectedMonthDetail.aov
      : quarterlyReportData.aov;

  const activeMargin =
    viewMode === 'WEEK'
      ? weeklyReportData.margin
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData.totalYearRevenue > 0
          ? Number(((monthlyReportData.totalYearProfit / monthlyReportData.totalYearRevenue) * 100).toFixed(1))
          : 0
        : monthlyReportData.selectedMonthDetail.margin
      : quarterlyReportData.margin;

  const chartData =
    viewMode === 'WEEK'
      ? weeklyReportData.days
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData.allMonths
        : monthlyReportData.monthWeeks
      : quarterlyReportData.months;

  const xDataKey = viewMode === 'WEEK' ? 'day' : viewMode === 'MONTH' ? (monthlySubView === 'ALL_MONTHS' ? 'month' : 'week') : 'month';

  // --- 6. PEAK SALES HOURS DISTRIBUTION (FROM ACTUAL ORDERS) ---
  const hourlySalesData = useMemo(() => {
    const timeSlots = [
      { key: '06-09', label: '06h - 09h', fullLabel: '06h - 09h (Sáng sớm)', start: 6, end: 9, revenue: 0, orders: 0 },
      { key: '09-12', label: '09h - 12h', fullLabel: '09h - 12h (Buổi sáng)', start: 9, end: 12, revenue: 0, orders: 0 },
      { key: '12-14', label: '12h - 14h', fullLabel: '12h - 14h (Buổi trưa)', start: 12, end: 14, revenue: 0, orders: 0 },
      { key: '14-17', label: '14h - 17h', fullLabel: '14h - 17h (Buổi chiều)', start: 14, end: 17, revenue: 0, orders: 0 },
      { key: '17-20', label: '17h - 20h', fullLabel: '17h - 20h (Giờ vàng)', start: 17, end: 20, revenue: 0, orders: 0 },
      { key: '20-23', label: '20h - 23h', fullLabel: '20h - 23h (Tối muộn)', start: 20, end: 23, revenue: 0, orders: 0 },
    ];

    currentViewOrders.forEach((order) => {
      const parsed = parseOrderDate(order.created_at);
      const h = parsed.date.getHours();
      const slot = timeSlots.find((s) => h >= s.start && h < s.end);
      if (slot) {
        slot.revenue += order.final_amount || 0;
        slot.orders += 1;
      } else {
        if (h < 6) {
          timeSlots[0].revenue += order.final_amount || 0;
          timeSlots[0].orders += 1;
        } else {
          timeSlots[5].revenue += order.final_amount || 0;
          timeSlots[5].orders += 1;
        }
      }
    });

    const maxSlotRev = Math.max(...timeSlots.map((s) => s.revenue), 1);
    const peakSlot = [...timeSlots].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      slots: timeSlots,
      maxSlotRev,
      peakSlot,
    };
  }, [currentViewOrders]);

  // --- 7. PAYMENT METHOD ANALYSIS ---
  const paymentMethodData = useMemo(() => {
    let cashRev = 0;
    let transferRev = 0;
    let cardRev = 0;
    let cashCount = 0;
    let transferCount = 0;
    let cardCount = 0;

    currentViewOrders.forEach((order) => {
      const amount = order.final_amount || 0;
      if (order.payment_method === 'CASH') {
        cashRev += amount;
        cashCount += 1;
      } else if (order.payment_method === 'TRANSFER') {
        transferRev += amount;
        transferCount += 1;
      } else if (order.payment_method === 'CARD') {
        cardRev += amount;
        cardCount += 1;
      }
    });

    const totalRev = cashRev + transferRev + cardRev;
    const totalCount = cashCount + transferCount + cardCount;

    const breakdown = [
      {
        name: 'Tiền mặt',
        code: 'CASH',
        amount: cashRev,
        count: cashCount,
        percent: totalRev > 0 ? Number(((cashRev / totalRev) * 100).toFixed(1)) : 0,
        color: '#10B981', // Emerald
      },
      {
        name: 'Chuyển khoản VietQR',
        code: 'TRANSFER',
        amount: transferRev,
        count: transferCount,
        percent: totalRev > 0 ? Number(((transferRev / totalRev) * 100).toFixed(1)) : 0,
        color: '#0B63E5', // Blue
      },
      {
        name: 'Quẹt thẻ ATM/Visa',
        code: 'CARD',
        amount: cardRev,
        count: cardCount,
        percent: totalRev > 0 ? Number(((cardRev / totalRev) * 100).toFixed(1)) : 0,
        color: '#8B5CF6', // Purple
      },
    ].filter((item) => item.count > 0 || totalCount === 0);

    const nonCashPercent = totalRev > 0 ? Number((((transferRev + cardRev) / totalRev) * 100).toFixed(1)) : 0;

    return {
      breakdown: breakdown.length > 0 ? breakdown : [{ name: 'Tiền mặt', code: 'CASH', amount: 0, count: 0, percent: 100, color: '#10B981' }],
      cashRev,
      transferRev,
      cardRev,
      nonCashPercent,
      totalCount,
    };
  }, [currentViewOrders]);

  // --- 8. AUTOMATED BUSINESS EVALUATION & STRATEGIC INSIGHTS ---
  const businessEvaluation = useMemo(() => {
    // 1. Health Score calculation (0 to 100)
    const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
    const totalOrdersAll = orders.length;
    const completionRate = totalOrdersAll > 0 ? ((totalOrdersAll - cancelledCount) / totalOrdersAll) * 100 : 100;

    let marginScore = Math.min(35, Math.round((activeMargin / 22) * 35));
    let completionScore = Math.min(25, Math.round((completionRate / 98) * 25));
    let digitalScore = Math.min(20, Math.round((paymentMethodData.nonCashPercent / 50) * 20));
    let aovScore = Math.min(20, Math.round((activeAov / 150000) * 20));

    const totalScore = Math.min(100, Math.max(25, marginScore + completionScore + digitalScore + aovScore));

    let rating = {
      label: 'Rất Tốt (Tăng Trưởng Vững Chắc)',
      color: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    if (totalScore < 60) {
      rating = {
        label: 'Cần Lưu Ý & Cải Thiện',
        color: 'text-rose-600',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    } else if (totalScore < 80) {
      rating = {
        label: 'Tăng Trưởng Ổn Định',
        color: 'text-[#0B63E5]',
        badge: 'bg-blue-50 text-[#0B63E5] border-blue-200',
      };
    }

    // 2. Revenue & Trend commentary
    let revenueInsight = '';
    if (viewMode === 'WEEK') {
      const sortedDays = [...weeklyReportData.days].sort((a, b) => b.revenue - a.revenue);
      const topDay = sortedDays[0];
      const lowDay = sortedDays[sortedDays.length - 1];
      revenueInsight = `Doanh số tuần đạt đỉnh vào ${topDay?.day || 'Thứ 7'} (${formatCurrency(topDay?.revenue || 0)}), thấp nhất vào ${lowDay?.day || 'Đầu tuần'}. Nhịp độ mua sắm tăng vọt vào ngày cuối tuần.`;
    } else if (viewMode === 'MONTH') {
      if (monthlySubView === 'ALL_MONTHS') {
        const sortedMonths = [...monthlyReportData.allMonths].sort((a, b) => b.revenue - a.revenue);
        const topM = sortedMonths[0];
        revenueInsight = `Tháng có doanh thu cao nhất năm ${selectedYear} là ${topM?.month} với ${formatCurrency(topM?.revenue || 0)} (${topM?.orders} đơn). Tốc độ bán hàng duy trì ổn định trung bình ${formatCurrency(Math.round(activeRevenue / 12))}/tháng.`;
      } else {
        revenueInsight = `Tháng ${selectedMonth}/${selectedYear} đạt tổng doanh số ${formatCurrency(activeRevenue)} với ${activeOrdersCount} hóa đơn. Giá trị giỏ hàng trung bình mỗi khách chi tiêu đạt ${formatCurrency(activeAov)}.`;
      }
    } else {
      revenueInsight = `${selectedQuarter}/${selectedYear} ghi nhận tổng ${formatCurrency(activeRevenue)} doanh thu thuần. Cửa hàng duy trì giao dịch ổn định với ${activeOrdersCount} lượt mua hàng.`;
    }

    // 3. Margin & Cost commentary
    let marginInsight = '';
    if (activeMargin >= 22) {
      marginInsight = `Tỷ suất lợi nhuận gộp rất tốt (${activeMargin}%), vượt trên mức chuẩn 18-20% của ngành bán lẻ. Tỷ lệ giá vốn (COGS) được kiểm soát an toàn ở mức ${(100 - activeMargin).toFixed(1)}% doanh thu.`;
    } else if (activeMargin >= 15) {
      marginInsight = `Tỷ suất lợi nhuận gộp đạt mức ổn định (${activeMargin}%). Giá vốn hàng bán chiếm ${(100 - activeMargin).toFixed(1)}% doanh số. Có thể tối ưu thêm bằng cách ghép combo sản phẩm hoặc thương lượng chiết khấu nguồn hàng.`;
    } else {
      marginInsight = `Biên lợi nhuận gộp hiện tại khá mỏng (${activeMargin}%). Giá vốn chiếm ${(100 - activeMargin).toFixed(1)}% doanh số. Cửa hàng nên rà soát lại giá bán và hạn chế giảm giá quá sâu.`;
    }

    // 4. Category & Concentration Risk commentary
    let categoryInsight = '';
    const topCat = categoryData[0];
    if (topCat && topCat.value > 50) {
      categoryInsight = `Cơ cấu doanh thu phụ thuộc lớn vào ngành hàng "${topCat.name}" (chiếm ${topCat.value}% doanh số). Nên đẩy mạnh tiếp thị thêm các nhóm hàng khác để phân tán rủi ro.`;
    } else if (topCat) {
      categoryInsight = `Cơ cấu ngành hàng phân bổ hài hòa. Nhóm hàng dẫn đầu là "${topCat.name}" đóng góp ${topCat.value}% (${formatCurrency(topCat.amount)}), giữ nhịp doanh thu chủ lực cho cửa hàng.`;
    } else {
      categoryInsight = `Danh mục hàng hóa đa dạng và đồng đều giữa các nhóm sản phẩm tiêu dùng và thực phẩm.`;
    }

    // 5. Strategic Action Recommendations
    const topProd = topProducts[0];
    const peakHour = hourlySalesData.peakSlot?.fullLabel || '17h - 20h (Giờ vàng)';

    const recommendations = [
      {
        title: 'Tồn kho & Nguồn hàng',
        desc: topProd
          ? `Mặt hàng "${topProd.name}" đang bán chạy nhất (${topProd.qty} món, +${formatCurrency(topProd.profit)} lãi). Cần dự phòng tồn kho an toàn tối thiểu 10-15 ngày bán.`
          : 'Duy trì kiểm đếm định kỳ các mặt hàng chủ lực để hạn chế thiếu hàng vào ngày cuối tuần.',
        badge: 'Ưu tiên số 1',
        badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
      },
      {
        title: 'Khung giờ cao điểm & Nhân sự',
        desc: `Cao điểm mua sắm tập trung nhiều nhất vào khung giờ ${peakHour}. Cần bố trí đủ 2 nhân viên quầy và thu ngân để phục vụ nhanh chóng.`,
        badge: 'Vận hành',
        badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
      },
      {
        title: 'Chính sách giá & Combo kích cầu',
        desc: `Với AOV hiện tại đạt ${formatCurrency(activeAov)}, nên triển khai chương trình "Hóa đơn trên ${formatCurrency(Math.round(activeAov * 1.3 / 10000) * 10000)} tặng quà nhỏ" để tăng thêm 20-30% giá trị giỏ hàng.`,
        badge: 'Tăng trưởng',
        badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      },
      {
        title: 'Dòng tiền & Đối soát sổ quỹ',
        desc: `Thanh toán VietQR & thẻ chiếm ${paymentMethodData.nonCashPercent}%. Dòng tiền vào tài khoản tốt, cần đối soát sao kê định kỳ với sổ quỹ để kiểm soát thất thoát.`,
        badge: 'Dòng tiền',
        badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      },
    ];

    return {
      healthScore: totalScore,
      rating,
      revenueInsight,
      marginInsight,
      categoryInsight,
      recommendations,
      completionRate: Number(completionRate.toFixed(1)),
    };
  }, [activeMargin, activeRevenue, activeAov, activeOrdersCount, viewMode, selectedYear, selectedMonth, selectedQuarter, weeklyReportData, monthlyReportData, categoryData, paymentMethodData, hourlySalesData, topProducts, orders]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150 pb-8">
      {/* 100% Real Invoices Reconciliation Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-lg p-3.5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm tracking-tight text-white">
                BÁO CÁO DOANH THU ĐỐI SOÁT 100% HÓA ĐƠN THỰC
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                Khớp {completedOrderStats.length} Hóa đơn hoàn thành
              </span>
            </div>
            <p className="text-xs text-blue-200/90 mt-0.5">
              Toàn bộ số liệu doanh thu, giá vốn và lợi nhuận được tổng hợp chuẩn xác từ lịch sử hóa đơn bán lẻ của Cửa hàng Ngân Sơn (318 Vũ Quang).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => setCurrentView('orders')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Xem Danh Sách Hóa Đơn ({orders.length})</span>
          </button>
        </div>
      </div>

      {/* Header & Main Period Mode Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0B63E5]" />
                Báo cáo Thống kê Doanh thu & Lợi nhuận
              </h1>
              <span className="badge-blue text-[10px] font-bold">Cửa hàng Ngân Sơn</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phân tích doanh số theo Hóa đơn thực tế: Theo Tuần, Theo Tháng và Theo Quý / Năm
            </p>
          </div>

          {/* Timeframe Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode('WEEK')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'WEEK'
                    ? 'bg-[#0B63E5] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Theo Tuần</span>
              </button>

              <button
                onClick={() => setViewMode('MONTH')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'MONTH'
                    ? 'bg-[#0B63E5] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Theo Tháng</span>
              </button>

              <button
                onClick={() => setViewMode('QUARTER')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'QUARTER'
                    ? 'bg-[#0B63E5] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Theo Quý / Năm</span>
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Xuất Excel Báo Cáo</span>
            </button>
          </div>
        </div>

        {/* Sub Filter Toolbar according to Selected ViewMode */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
              <span className="text-slate-500 font-medium">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            {/* Weekly Filters */}
            {viewMode === 'WEEK' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Kỳ tuần:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'THIS_WEEK', label: 'Tuần này' },
                    { id: 'LAST_WEEK', label: 'Tuần trước' },
                    { id: 'LAST_7_DAYS', label: '7 ngày gần nhất' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWeekType(w.id as any)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        selectedWeekType === w.id
                          ? 'bg-blue-100 text-[#0B63E5] border border-blue-200 font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Filters */}
            {viewMode === 'MONTH' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    onClick={() => setMonthlySubView('ALL_MONTHS')}
                    className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                      monthlySubView === 'ALL_MONTHS'
                        ? 'bg-white text-[#0B63E5] shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cả năm (12 Tháng)
                  </button>
                  <button
                    onClick={() => setMonthlySubView('SELECTED_MONTH')}
                    className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                      monthlySubView === 'SELECTED_MONTH'
                        ? 'bg-white text-[#0B63E5] shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chi tiết từng Tháng
                  </button>
                </div>

                {monthlySubView === 'SELECTED_MONTH' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
                    <span className="text-slate-500 font-medium">Chọn tháng:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Quarterly Filters */}
            {viewMode === 'QUARTER' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Chọn Quý:</span>
                <div className="flex items-center gap-1">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedQuarter(q)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        selectedQuarter === q
                          ? 'bg-blue-100 text-[#0B63E5] border border-blue-200 font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-slate-500 text-[11px] flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Tự động cập nhật tức thì khi có hóa đơn mới</span>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS (100% REAL STATS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Doanh thu thuần thực */}
        <div className="stat-card flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Doanh thu thuần</span>
            <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-[#0B63E5]">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">
              {formatCurrency(activeRevenue)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Khớp {activeOrdersCount} đơn thực tế</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Giá vốn (COGS) */}
        <div className="stat-card flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng giá vốn (COGS)</span>
            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-700">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">
              {formatCurrency(activeCogs)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Chiếm {activeRevenue > 0 ? ((activeCogs / activeRevenue) * 100).toFixed(1) : 0}% doanh thu
            </div>
          </div>
        </div>

        {/* KPI 3: Lợi nhuận gộp thực */}
        <div className="stat-card flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lợi nhuận gộp</span>
            <div className="w-7 h-7 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600 tracking-tight">
              {formatCurrency(activeProfit)}
            </div>
            <div className="flex items-center gap-1 mt-1 text-emerald-700 text-xs font-semibold">
              <span>Tỷ suất LN: {activeMargin}%</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Số lượng đơn hàng */}
        <div className="stat-card flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng đơn hoàn thành</span>
            <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center text-amber-600">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">
              {activeOrdersCount.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đơn</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {orders.filter((o) => o.status === 'CANCELLED').length > 0
                ? `${orders.filter((o) => o.status === 'CANCELLED').length} đơn đã hủy`
                : '100% đơn giao dịch tốt'}
            </div>
          </div>
        </div>

        {/* KPI 5: Giá trị trung bình đơn (AOV) */}
        <div className="stat-card flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Doanh thu TB / Đơn (AOV)</span>
            <div className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Store className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 tracking-tight">
              {formatCurrency(activeAov)}
            </div>
            <div className="text-xs text-slate-400 mt-1">Giá trị trung bình/lần mua</div>
          </div>
        </div>
      </div>

      {/* TRUNG TÂM PHÂN TÍCH & NHẬN XÉT TÌNH HÌNH KINH DOANH (TỰ ĐỘNG) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden transition-all">
        {/* Header with Health Score & Toggle */}
        <div 
          onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
          className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-3 hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-tight text-white uppercase">
                  Trung Tâm Đánh Giá & Nhận Xét Tình Hình Kinh Doanh
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  AI Tự Động
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Tổng hợp phân tích chuyên sâu về tăng trưởng doanh số, biên lợi nhuận, cấu trúc ngành hàng và hiệu suất bán lẻ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Health Score Pill */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1.5 rounded-lg">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-right">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Điểm sức khỏe</div>
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>{businessEvaluation.healthScore}/100</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${businessEvaluation.rating.color}`}>
                    {businessEvaluation.rating.label}
                  </span>
                </div>
              </div>
            </div>

            <button 
              type="button"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title={isAnalysisExpanded ? "Thu gọn phân tích" : "Mở rộng phân tích"}
            >
              {isAnalysisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isAnalysisExpanded && (
          <div className="p-4 bg-slate-50/50 space-y-4">
            {/* 3 Core Pillars: Revenue Growth, Gross Margin, Category Mix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Pillar 1: Revenue Trend */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-blue-50 text-[#0B63E5] flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Xu Hướng & Quy Mô
                    </span>
                  </div>
                  <span className="badge-blue text-[10px]">Doanh số</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {businessEvaluation.revenueInsight}
                </p>
              </div>

              {/* Pillar 2: Profit Margin */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Biên Lợi Nhuận & Giá Vốn
                    </span>
                  </div>
                  <span className="badge-green text-[10px]">Tỷ suất: {activeMargin}%</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {businessEvaluation.marginInsight}
                </p>
              </div>

              {/* Pillar 3: Category Risk */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Cơ Cấu Ngành Hàng
                    </span>
                  </div>
                  <span className="badge-gray text-[10px]">{categoryData.length} nhóm hàng</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {businessEvaluation.categoryInsight}
                </p>
              </div>
            </div>

            {/* Strategic Action Recommendations Grid */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Khuyến Nghị Hành Động Chiến Lược Cho Cửa Hàng
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 italic">Dựa trên dữ liệu bán hàng thực tế</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {businessEvaluation.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="text-xs font-bold text-slate-800">{rec.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${rec.badgeColor}`}>
                          {rec.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        {rec.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REVENUE CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart: Doanh thu & Lợi nhuận gộp */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#0B63E5]" />
                Biểu Đồ Doanh Thu & Lợi Nhuận Thực Tế
              </h2>
              <p className="text-xs text-slate-500">
                {viewMode === 'WEEK' && 'Phân bổ doanh số theo các ngày trong tuần'}
                {viewMode === 'MONTH' &&
                  (monthlySubView === 'ALL_MONTHS'
                    ? `Biến động doanh thu 12 tháng năm ${selectedYear}`
                    : `Chi tiết doanh thu 4 tuần trong Tháng ${selectedMonth}/${selectedYear}`)}
                {viewMode === 'QUARTER' && `Doanh thu các tháng trong ${selectedQuarter}/${selectedYear}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#0B63E5]"></span>
                <span className="text-slate-600 font-medium">Doanh thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Lợi nhuận</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey={xDataKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => formatShortCurrency(val)}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    formatCurrency(Number(val)),
                    name === 'revenue' ? 'Doanh thu thuần' : name === 'profit' ? 'Lợi nhuận gộp' : 'Giá vốn (COGS)',
                  ]}
                  labelStyle={{ fontWeight: 'bold', color: '#1E293B', fontSize: '12px' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="revenue" fill="#0B63E5" radius={[4, 4, 0, 0]} maxBarSize={38} name="revenue" />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} name="profit" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0B63E5]" />
                Cơ Cấu Doanh Thu Danh Mục
              </h2>
              <span className="badge-blue text-[10px]">Tỷ trọng</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Tỷ trọng doanh số thực từ các nhóm sản phẩm</p>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Doanh số']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-medium">Doanh số</span>
                <span className="text-xs font-bold text-slate-800">{formatShortCurrency(activeRevenue)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 mt-2 border-t border-slate-100 pt-2 text-xs">
            {categoryData.slice(0, 4).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  ></span>
                  <span className="text-slate-700 truncate">{cat.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900">{formatCurrency(cat.amount)}</span>
                  <span className="text-slate-400 text-[10px] ml-1">({cat.value}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW ANALYTICAL CHARTS: PEAK HOURS & CASHFLOW / OPERATIONAL HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Phân bổ doanh số theo khung giờ trong ngày (Khung Giờ Vàng) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Phân Bổ Doanh Thu Theo Khung Giờ (Giờ Vàng)
                  </h3>
                  <p className="text-xs text-slate-500">Nhận diện giờ cao điểm để xếp ca trực & bổ sung hàng hóa</p>
                </div>
              </div>
              {hourlySalesData.peakSlot && (
                <span className="px-2 py-1 rounded bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold self-start sm:self-center flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-600" />
                  Cao điểm: {hourlySalesData.peakSlot.slot}
                </span>
              )}
            </div>

            <div className="h-56 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlySalesData.slots} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="slot" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(val) => formatShortCurrency(val)}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [
                      formatCurrency(Number(val)),
                      name === 'revenue' ? 'Doanh thu' : 'Số đơn',
                    ]}
                    labelFormatter={(label) => `Khung giờ: ${label}`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    {hourlySalesData.slots.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isPeak ? '#F59E0B' : '#0B63E5'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-slate-50">
              <div className="text-[10px] text-slate-500">Giờ sáng (06-12h)</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {formatShortCurrency(
                  (hourlySalesData.slots[0]?.revenue || 0) + (hourlySalesData.slots[1]?.revenue || 0)
                )}
              </div>
            </div>
            <div className="p-2 rounded bg-slate-50">
              <div className="text-[10px] text-slate-500">Giờ trưa - chiều (12-17h)</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {formatShortCurrency(
                  (hourlySalesData.slots[2]?.revenue || 0) + (hourlySalesData.slots[3]?.revenue || 0)
                )}
              </div>
            </div>
            <div className="p-2 rounded bg-amber-50/70 border border-amber-200/50">
              <div className="text-[10px] text-amber-700 font-semibold">Giờ tối (17-23h)</div>
              <div className="font-bold text-amber-900 mt-0.5">
                {formatShortCurrency(
                  (hourlySalesData.slots[4]?.revenue || 0) + (hourlySalesData.slots[5]?.revenue || 0)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Cơ Cấu Phương Thức Thanh Toán & Sức Khỏe Vận Hành */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cơ Cấu Thanh Toán & Sức Khỏe Vận Hành
                  </h3>
                  <p className="text-xs text-slate-500">Tỷ trọng dòng tiền số hóa & các chỉ số đánh giá chuẩn bán lẻ</p>
                </div>
              </div>
              <span className="badge-blue text-[10px]">
                {paymentMethodData.nonCashPercent}% số hóa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {/* Payment Donut */}
              <div className="flex flex-col items-center justify-center">
                <div className="h-40 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentMethodData.chartData.map((entry, index) => (
                          <Cell key={`pay-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Số tiền']}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '11px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-medium">Không tiền mặt</span>
                    <span className="text-xs font-bold text-[#0B63E5]">{paymentMethodData.nonCashPercent}%</span>
                  </div>
                </div>

                <div className="w-full space-y-1 mt-1 text-[11px]">
                  {paymentMethodData.chartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatShortCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retail Health Gauges */}
              <div className="space-y-3 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-4 pt-3 sm:pt-0">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Thước Đo Vận Hành Chuẩn
                </div>

                {/* Gauge 1: Gross margin */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Biên lợi nhuận gộp</span>
                    <span className="font-bold text-emerald-600">{activeMargin}% <span className="text-[10px] text-slate-400 font-normal">(Chuẩn ≥ 20%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${activeMargin >= 20 ? 'bg-emerald-500' : activeMargin >= 12 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (activeMargin / 30) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Gauge 2: Order Completion Rate */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Tỷ lệ đơn thành công</span>
                    <span className="font-bold text-blue-600">{businessEvaluation.completionRate}% <span className="text-[10px] text-slate-400 font-normal">(Chuẩn ≥ 98%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, businessEvaluation.completionRate)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Gauge 3: Cashless Adoption */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Thanh toán số hóa</span>
                    <span className="font-bold text-indigo-600">{paymentMethodData.nonCashPercent}% <span className="text-[10px] text-slate-400 font-normal">(Chuẩn ≥ 40%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, paymentMethodData.nonCashPercent)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Gauge 4: Top Category Risk */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Phân tán danh mục</span>
                    <span className="font-bold text-slate-700">
                      {categoryData[0] ? `${categoryData[0].value}% top ngành` : 'Đồng đều'} 
                      <span className="text-[10px] text-slate-400 font-normal"> (Chuẩn &lt; 50%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${(categoryData[0]?.value || 0) > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (categoryData[0]?.value || 30))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED DATA TABLE: 100% RECONCILED WITH INVOICES */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Bảng Kê Chi Tiết Doanh Thu, Giá Vốn & Lợi Nhuận Theo Kỳ</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                100% Khớp Hóa Đơn
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Toàn bộ số lượng đơn hàng, doanh số và lợi nhuận được hạch toán trực tiếp từ dữ liệu hóa đơn bán lẻ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Thời gian / Kỳ</th>
                <th className="py-2.5 px-3 text-right">Số hóa đơn thực</th>
                <th className="py-2.5 px-3 text-right">Doanh thu thuần (đ)</th>
                <th className="py-2.5 px-3 text-right">Giá vốn (COGS) (đ)</th>
                <th className="py-2.5 px-3 text-right">Lợi nhuận gộp (đ)</th>
                <th className="py-2.5 px-3 text-right">Tỷ suất LN (%)</th>
                <th className="py-2.5 px-3 text-right">Doanh thu TB / Đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viewMode === 'WEEK' &&
                weeklyReportData.days.map((row) => (
                  <tr key={row.day} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.day}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.orders.toLocaleString('vi-VN')} đơn</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0B63E5]">{formatCurrency(row.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(row.cogs)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCurrency(row.profit)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="badge-blue text-[10px]">{row.margin}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">{formatCurrency(row.aov)}</td>
                  </tr>
                ))}

              {viewMode === 'MONTH' &&
                monthlySubView === 'ALL_MONTHS' &&
                monthlyReportData.allMonths.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.month}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.orders.toLocaleString('vi-VN')} đơn</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0B63E5]">{formatCurrency(row.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(row.cogs)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCurrency(row.profit)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="badge-blue text-[10px]">{row.margin}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">{formatCurrency(row.aov)}</td>
                  </tr>
                ))}

              {viewMode === 'MONTH' &&
                monthlySubView === 'SELECTED_MONTH' &&
                monthlyReportData.monthWeeks.map((row) => (
                  <tr key={row.week} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.week}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.orders.toLocaleString('vi-VN')} đơn</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0B63E5]">{formatCurrency(row.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(row.cogs)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCurrency(row.profit)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="badge-blue text-[10px]">{row.margin}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">{formatCurrency(row.aov)}</td>
                  </tr>
                ))}

              {viewMode === 'QUARTER' &&
                quarterlyReportData.months.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.month}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.orders.toLocaleString('vi-VN')} đơn</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0B63E5]">{formatCurrency(row.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(row.cogs)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{formatCurrency(row.profit)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="badge-blue text-[10px]">{row.margin}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">{formatCurrency(row.aov)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/70 border-t-2 border-blue-200 font-bold text-slate-900">
                <td className="py-3 px-3 uppercase tracking-wide">TỔNG CỘNG</td>
                <td className="py-3 px-3 text-right">{activeOrdersCount.toLocaleString('vi-VN')} đơn</td>
                <td className="py-3 px-3 text-right text-[#0B63E5] font-extrabold text-sm">{formatCurrency(activeRevenue)}</td>
                <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(activeCogs)}</td>
                <td className="py-3 px-3 text-right text-emerald-700 font-extrabold text-sm">{formatCurrency(activeProfit)}</td>
                <td className="py-3 px-3 text-right">
                  <span className="badge-blue text-[10px]">{activeMargin}%</span>
                </td>
                <td className="py-3 px-3 text-right">{formatCurrency(activeAov)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* BOTTOM SECTION: TOP PRODUCTS (100% REAL) & SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Selling Products from actual orders */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#0B63E5]" />
                Top Sản Phẩm Bán Chạy Nhất (Từ Hóa Đơn)
              </h3>
              <p className="text-[11px] text-slate-400">Các mặt hàng đóng góp doanh thu cao nhất theo hóa đơn bán hàng</p>
            </div>
            <span className="badge-blue text-[10px]">Cửa hàng Ngân Sơn</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Chưa có sản phẩm phát sinh doanh số bán hàng trong hệ thống.
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, index) => (
                <div
                  key={p.sku || index}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        index === 0
                          ? 'bg-amber-400 text-amber-950 font-extrabold'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="w-9 h-9 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-slate-400">
                      {p.img ? (
                        <img
                          src={p.img}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400">
                        SKU: {p.sku} | Đã bán: <span className="font-bold text-slate-700">{p.qty}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#0B63E5]">{formatCurrency(p.revenue)}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">LN: +{formatCurrency(p.profit)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations and Live Store Advice */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Đối Soát Dữ Liệu & Thao Tác Nhanh
                </h3>
                <p className="text-[11px] text-slate-400">Quản trị hóa đơn và nguồn dữ liệu bán lẻ</p>
              </div>
              <span className="badge-blue text-[10px]">Thời gian thực</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Lịch sử Hóa đơn Bán hàng</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tổng cộng <span className="font-bold text-[#0B63E5]">{orders.length} hóa đơn</span> trong cơ sở dữ liệu
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('orders')}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-[#0B63E5] hover:bg-blue-700 text-white cursor-pointer transition-colors"
                >
                  Quản lý HĐ
                </button>
              </div>

              <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Thu Ngân Bán Hàng POS</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tạo đơn hàng mới với mã vạch, VietQR và in bill K80
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('pos')}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
                >
                  Mở POS
                </button>
              </div>

              <div className="p-3 rounded-lg border border-purple-100 bg-purple-50/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Trung Tâm Xuất Nhập Dữ Liệu</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Nhập hóa đơn từ Excel/KiotViet, tự động cảnh báo & xử lý trùng lặp
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('products')}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-colors"
                >
                  Nhập/Xuất File
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-slate-900">
              <Store className="w-3.5 h-3.5 text-[#0B63E5]" />
              Cửa hàng Ngân Sơn - 318 Vũ Quang
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Mọi thay đổi khi chỉnh sửa, cập nhật hoặc hủy hóa đơn cũ sẽ được tự động đồng bộ ngay lập tức vào bảng báo cáo doanh thu và sổ quỹ tiền mặt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
