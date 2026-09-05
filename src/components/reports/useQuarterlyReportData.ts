import { useMemo } from 'react';
import { Product, Order, Category } from '../../types';
import { formatCurrency, parseOrderDate } from '../../utils/formatters';

type ViewMode = 'WEEK' | 'MONTH' | 'QUARTER';

interface UseQuarterlyReportDataParams {
  products: Product[];
  orders: Order[];
  categories: Category[];
  viewMode: ViewMode;
  selectedYear: number;
  selectedMonth: number;
  selectedWeekType: 'THIS_WEEK' | 'LAST_WEEK' | 'LAST_7_DAYS';
  selectedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  monthlySubView: 'ALL_MONTHS' | 'SELECTED_MONTH';
}

// Rút thuần toàn bộ chuỗi tính toán báo cáo tài chính từ QuarterlyFinancialReport.tsx —
// 100% suy sinh từ orders/products/categories + filter đang chọn, không side-effect.
export function useQuarterlyReportData({
  products,
  orders,
  categories,
  viewMode,
  selectedYear,
  selectedMonth,
  selectedWeekType,
  selectedQuarter,
  monthlySubView,
}: UseQuarterlyReportDataParams) {
  const completedOrderStats = useMemo(() => {
    return (orders || [])
      .filter((o) => o && o.status === 'COMPLETED')
      .map((ord) => {
        const parsed = parseOrderDate(ord.created_at);
        return {
          ...ord,
          parsedDate: parsed.date,
          dayOfMonth: parsed.day,
          month: parsed.month,
          year: parsed.year,
          dayOfWeek: parsed.dayOfWeek,
          hour: parsed.date.getHours(),
          timestamp: parsed.timestamp,
          formattedDate: parsed.formattedDisplay,
        };
      });
  }, [orders]);

  const overallSystemMetrics = useMemo(() => {
    const totalActualRevenue = completedOrderStats.reduce((s, o) => s + (o.final_amount || 0), 0);
    const totalActualCogs = completedOrderStats.reduce((s, o) => s + (o.total_cost || 0), 0);
    const totalActualProfit = completedOrderStats.reduce((s, o) => s + (o.profit || 0), 0);
    const totalActualOrders = completedOrderStats.length;
    const actualAov = totalActualOrders > 0 ? Math.round(totalActualRevenue / totalActualOrders) : 0;
    const actualMargin = totalActualRevenue > 0 ? Number(((totalActualProfit / totalActualRevenue) * 100).toFixed(1)) : 0;

    return { totalActualRevenue, totalActualCogs, totalActualProfit, totalActualOrders, actualAov, actualMargin };
  }, [completedOrderStats]);

  const filteredWeekOrders = useMemo(() => {
    const now = new Date();
    const nowTimestamp = now.getTime();

    if (selectedWeekType === 'LAST_7_DAYS') {
      const sevenDaysAgo = nowTimestamp - 7 * 24 * 60 * 60 * 1000;
      return completedOrderStats.filter((o) => o.timestamp >= sevenDaysAgo && o.timestamp <= nowTimestamp);
    } else if (selectedWeekType === 'THIS_WEEK') {
      const currentDay = now.getDay();
      const distanceToMon = (currentDay + 6) % 7;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMon, 0, 0, 0);
      const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return completedOrderStats.filter((o) => o.timestamp >= monday.getTime() && o.timestamp <= sunday.getTime());
    } else if (selectedWeekType === 'LAST_WEEK') {
      const currentDay = now.getDay();
      const distanceToMon = (currentDay + 6) % 7;
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMon - 7, 0, 0, 0);
      const lastSunday = new Date(lastMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return completedOrderStats.filter((o) => o.timestamp >= lastMonday.getTime() && o.timestamp <= lastSunday.getTime());
    }
    return completedOrderStats;
  }, [completedOrderStats, selectedWeekType]);

  const weeklyReportData = useMemo(() => {
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

      return { day: item.name, revenue, cogs, profit, orders: ordersCount, aov, margin };
    });

    const totalRevenue = daysAggregation.reduce((s, d) => s + d.revenue, 0);
    const totalCogs = daysAggregation.reduce((s, d) => s + d.cogs, 0);
    const totalProfit = daysAggregation.reduce((s, d) => s + d.profit, 0);
    const totalOrders = daysAggregation.reduce((s, d) => s + d.orders, 0);
    const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const margin = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

    return { days: daysAggregation, totalRevenue, totalCogs, totalProfit, totalOrders, aov, margin };
  }, [filteredWeekOrders]);

  const monthlyReportData = useMemo(() => {
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

      return { monthNum, month: monthLabel, revenue, cogs, profit, orders: ordersCount, aov, margin };
    });

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

      return { week: w.week, revenue, cogs, profit, orders: ordersCount, aov, margin };
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

    return { label: quarterMap[selectedQuarter].label, months: qMonthsData, revenue, cogs, grossProfit, orders: ordersCount, aov, margin };
  }, [monthlyReportData, selectedQuarter]);

  const { productByIdOrSku, categoryById } = useMemo(() => {
    const pMap = new Map<string, (typeof products)[0]>();
    for (const p of products || []) {
      if (p?.id) pMap.set(p.id, p);
      if (p?.sku) pMap.set(p.sku, p);
    }
    const cMap = new Map<string, (typeof categories)[0]>();
    for (const c of categories || []) {
      if (c?.id) cMap.set(c.id, c);
    }
    return { productByIdOrSku: pMap, categoryById: cMap };
  }, [products, categories]);

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

  const categoryData = useMemo(() => {
    const catRevenueMap = new Map<string, number>();

    (currentViewOrders || []).forEach((order) => {
      (order?.items || []).forEach((item) => {
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
      return (categories || []).slice(0, 5).map((c) => ({ name: c.name, amount: 0, value: 0 }));
    }

    return Array.from(catRevenueMap.entries())
      .map(([name, amount]) => ({ name, amount, value: Number(((amount / totalCatRevenue) * 100).toFixed(1)) }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentViewOrders, productByIdOrSku, categoryById, categories]);

  const topProducts = useMemo(() => {
    const itemMap = new Map<
      string,
      { id: string; name: string; sku: string; qty: number; revenue: number; profit: number; img: string }
    >();

    (currentViewOrders || []).forEach((order) => {
      (order?.items || []).forEach((item) => {
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

  const activeRevenue =
    viewMode === 'WEEK'
      ? weeklyReportData?.totalRevenue || 0
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData?.totalYearRevenue || 0
        : monthlyReportData?.selectedMonthDetail?.revenue || 0
      : quarterlyReportData?.revenue || 0;

  const activeCogs =
    viewMode === 'WEEK'
      ? weeklyReportData?.totalCogs || 0
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData?.totalYearCogs || 0
        : monthlyReportData?.selectedMonthDetail?.cogs || 0
      : quarterlyReportData?.cogs || 0;

  const activeProfit =
    viewMode === 'WEEK'
      ? weeklyReportData?.totalProfit || 0
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData?.totalYearProfit || 0
        : monthlyReportData?.selectedMonthDetail?.profit || 0
      : quarterlyReportData?.grossProfit || 0;

  const activeOrdersCount =
    viewMode === 'WEEK'
      ? weeklyReportData?.totalOrders || 0
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData?.totalYearOrders || 0
        : monthlyReportData?.selectedMonthDetail?.orders || 0
      : quarterlyReportData?.orders || 0;

  const activeAov =
    viewMode === 'WEEK'
      ? weeklyReportData?.aov || 0
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? Math.round((monthlyReportData?.totalYearRevenue || 0) / (monthlyReportData?.totalYearOrders || 1))
        : monthlyReportData?.selectedMonthDetail?.aov || 0
      : quarterlyReportData?.aov || 0;

  const activeMargin =
    viewMode === 'WEEK'
      ? weeklyReportData?.margin || 0
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? (monthlyReportData?.totalYearRevenue || 0) > 0
          ? Number((((monthlyReportData?.totalYearProfit || 0) / (monthlyReportData?.totalYearRevenue || 1)) * 100).toFixed(1))
          : 0
        : monthlyReportData?.selectedMonthDetail?.margin || 0
      : quarterlyReportData?.margin || 0;

  const chartData =
    viewMode === 'WEEK'
      ? weeklyReportData?.days || []
      : viewMode === 'MONTH'
      ? monthlySubView === 'ALL_MONTHS'
        ? monthlyReportData?.allMonths || []
        : monthlyReportData?.monthWeeks || []
      : quarterlyReportData?.months || [];

  const xDataKey = viewMode === 'WEEK' ? 'day' : viewMode === 'MONTH' ? (monthlySubView === 'ALL_MONTHS' ? 'month' : 'week') : 'month';

  const hourlySalesData = useMemo(() => {
    const timeSlots = [
      { key: '06-09', slot: '06h - 09h', label: '06h - 09h', fullLabel: '06h - 09h (Sáng sớm)', start: 6, end: 9, revenue: 0, orders: 0 },
      { key: '09-12', slot: '09h - 12h', label: '09h - 12h', fullLabel: '09h - 12h (Buổi sáng)', start: 9, end: 12, revenue: 0, orders: 0 },
      { key: '12-14', slot: '12h - 14h', label: '12h - 14h', fullLabel: '12h - 14h (Buổi trưa)', start: 12, end: 14, revenue: 0, orders: 0 },
      { key: '14-17', slot: '14h - 17h', label: '14h - 17h', fullLabel: '14h - 17h (Buổi chiều)', start: 14, end: 17, revenue: 0, orders: 0 },
      { key: '17-20', slot: '17h - 20h', label: '17h - 20h', fullLabel: '17h - 20h (Giờ vàng)', start: 17, end: 20, revenue: 0, orders: 0 },
      { key: '20-23', slot: '20h - 23h', label: '20h - 23h', fullLabel: '20h - 23h (Tối muộn)', start: 20, end: 23, revenue: 0, orders: 0 },
    ];

    (currentViewOrders || []).forEach((order) => {
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
    const enrichedSlots = timeSlots.map((s) => ({
      ...s,
      slot: s.label,
      isPeak: Boolean(peakSlot && peakSlot.key === s.key && s.revenue > 0),
    }));

    return {
      slots: enrichedSlots,
      maxSlotRev,
      peakSlot: peakSlot ? { ...peakSlot, slot: peakSlot.label } : null,
    };
  }, [currentViewOrders]);

  const paymentMethodData = useMemo(() => {
    let cashRev = 0;
    let transferRev = 0;
    let cardRev = 0;
    let cashCount = 0;
    let transferCount = 0;
    let cardCount = 0;

    (currentViewOrders || []).forEach((order) => {
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
      { name: 'Tiền mặt', code: 'CASH', amount: cashRev, value: cashRev, count: cashCount, percent: totalRev > 0 ? Number(((cashRev / totalRev) * 100).toFixed(1)) : 0, color: '#10B981' },
      { name: 'Chuyển khoản VietQR', code: 'TRANSFER', amount: transferRev, value: transferRev, count: transferCount, percent: totalRev > 0 ? Number(((transferRev / totalRev) * 100).toFixed(1)) : 0, color: '#0B63E5' },
      { name: 'Quẹt thẻ ATM/Visa', code: 'CARD', amount: cardRev, value: cardRev, count: cardCount, percent: totalRev > 0 ? Number(((cardRev / totalRev) * 100).toFixed(1)) : 0, color: '#8B5CF6' },
    ].filter((item) => item.count > 0 || totalCount === 0);

    const nonCashPercent = totalRev > 0 ? Number((((transferRev + cardRev) / totalRev) * 100).toFixed(1)) : 0;
    const finalBreakdown = breakdown.length > 0 ? breakdown : [{ name: 'Tiền mặt', code: 'CASH', amount: 0, value: 0, count: 0, percent: 100, color: '#10B981' }];
    const chartDataPm = finalBreakdown.map((item) => ({ ...item, value: item.amount }));

    return { breakdown: finalBreakdown, chartData: chartDataPm, cashRev, transferRev, cardRev, nonCashPercent, totalCount };
  }, [currentViewOrders]);

  const businessEvaluation = useMemo(() => {
    const cancelledCount = (orders || []).filter((o) => o?.status === 'CANCELLED').length;
    const totalOrdersAll = (orders || []).length;
    const completionRate = totalOrdersAll > 0 ? ((totalOrdersAll - cancelledCount) / totalOrdersAll) * 100 : 100;

    const marginScore = Math.min(35, Math.round(((activeMargin || 0) / 22) * 35));
    const completionScore = Math.min(25, Math.round((completionRate / 98) * 25));
    const digitalScore = Math.min(20, Math.round(((paymentMethodData?.nonCashPercent || 0) / 50) * 20));
    const aovScore = Math.min(20, Math.round(((activeAov || 0) / 150000) * 20));

    const totalScore = Math.min(100, Math.max(25, marginScore + completionScore + digitalScore + aovScore));

    let rating = {
      label: 'Rất Tốt (Tăng Trưởng Vững Chắc)',
      color: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    if (totalScore < 60) {
      rating = { label: 'Cần Lưu Ý & Cải Thiện', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
    } else if (totalScore < 80) {
      rating = { label: 'Tăng Trưởng Ổn Định', color: 'text-[#0B63E5]', badge: 'bg-blue-50 text-[#0B63E5] border-blue-200' };
    }

    let revenueInsight = '';
    if (viewMode === 'WEEK') {
      const sortedDays = [...(weeklyReportData?.days || [])].sort((a, b) => b.revenue - a.revenue);
      const topDay = sortedDays[0];
      const lowDay = sortedDays[sortedDays.length - 1];
      revenueInsight = `Doanh số tuần đạt đỉnh vào ${topDay?.day || 'Thứ 7'} (${formatCurrency(topDay?.revenue || 0)}), thấp nhất vào ${lowDay?.day || 'Đầu tuần'}. Nhịp độ mua sắm tăng vọt vào ngày cuối tuần.`;
    } else if (viewMode === 'MONTH') {
      if (monthlySubView === 'ALL_MONTHS') {
        const sortedMonths = [...(monthlyReportData?.allMonths || [])].sort((a, b) => b.revenue - a.revenue);
        const topM = sortedMonths[0];
        revenueInsight = `Tháng có doanh thu cao nhất năm ${selectedYear} là ${topM?.month || 'N/A'} với ${formatCurrency(topM?.revenue || 0)} (${topM?.orders || 0} đơn). Tốc độ bán hàng duy trì ổn định trung bình ${formatCurrency(Math.round(activeRevenue / 12))}/tháng.`;
      } else {
        revenueInsight = `Tháng ${selectedMonth}/${selectedYear} đạt tổng doanh số ${formatCurrency(activeRevenue)} với ${activeOrdersCount} hóa đơn. Giá trị giỏ hàng trung bình mỗi khách chi tiêu đạt ${formatCurrency(activeAov)}.`;
      }
    } else {
      revenueInsight = `${selectedQuarter}/${selectedYear} ghi nhận tổng ${formatCurrency(activeRevenue)} doanh thu thuần. Cửa hàng duy trì giao dịch ổn định với ${activeOrdersCount} lượt mua hàng.`;
    }

    let marginInsight = '';
    if (activeMargin >= 22) {
      marginInsight = `Tỷ suất lợi nhuận gộp rất tốt (${activeMargin}%), vượt trên mức chuẩn 18-20% của ngành bán lẻ. Tỷ lệ giá vốn (COGS) được kiểm soát an toàn ở mức ${(100 - activeMargin).toFixed(1)}% doanh thu.`;
    } else if (activeMargin >= 15) {
      marginInsight = `Tỷ suất lợi nhuận gộp đạt mức ổn định (${activeMargin}%). Giá vốn hàng bán chiếm ${(100 - activeMargin).toFixed(1)}% doanh số. Có thể tối ưu thêm bằng cách ghép combo sản phẩm hoặc thương lượng chiết khấu nguồn hàng.`;
    } else {
      marginInsight = `Biên lợi nhuận gộp hiện tại khá mỏng (${activeMargin}%). Giá vốn chiếm ${(100 - activeMargin).toFixed(1)}% doanh số. Cửa hàng nên rà soát lại giá bán và hạn chế giảm giá quá sâu.`;
    }

    let categoryInsight = '';
    const topCat = (categoryData || [])[0];
    if (topCat && topCat.value > 50) {
      categoryInsight = `Cơ cấu doanh thu phụ thuộc lớn vào ngành hàng "${topCat.name}" (chiếm ${topCat.value}% doanh số). Nên đẩy mạnh tiếp thị thêm các nhóm hàng khác để phân tán rủi ro.`;
    } else if (topCat) {
      categoryInsight = `Cơ cấu ngành hàng phân bổ hài hòa. Nhóm hàng dẫn đầu là "${topCat.name}" đóng góp ${topCat.value}% (${formatCurrency(topCat.amount)}), giữ nhịp doanh thu chủ lực cho cửa hàng.`;
    } else {
      categoryInsight = `Danh mục hàng hóa đa dạng và đồng đều giữa các nhóm sản phẩm tiêu dùng và thực phẩm.`;
    }

    const topProd = (topProducts || [])[0];
    const peakHour = hourlySalesData?.peakSlot?.fullLabel || '17h - 20h (Giờ vàng)';

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
        desc: `Với AOV hiện tại đạt ${formatCurrency(activeAov)}, nên triển khai chương trình "Hóa đơn trên ${formatCurrency(Math.round((activeAov * 1.3) / 10000) * 10000)} tặng quà nhỏ" để tăng thêm 20-30% giá trị giỏ hàng.`,
        badge: 'Tăng trưởng',
        badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      },
      {
        title: 'Dòng tiền & Đối soát sổ quỹ',
        desc: `Thanh toán VietQR & thẻ chiếm ${paymentMethodData?.nonCashPercent || 0}%. Dòng tiền vào tài khoản tốt, cần đối soát sao kê định kỳ với sổ quỹ để kiểm soát thất thoát.`,
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

  return {
    completedOrderStats,
    overallSystemMetrics,
    filteredWeekOrders,
    weeklyReportData,
    monthlyReportData,
    quarterlyReportData,
    productByIdOrSku,
    categoryById,
    currentViewOrders,
    categoryData,
    topProducts,
    hourlySalesData,
    paymentMethodData,
    businessEvaluation,
    activeRevenue,
    activeCogs,
    activeProfit,
    activeOrdersCount,
    activeAov,
    activeMargin,
    chartData,
    xDataKey,
  };
}
