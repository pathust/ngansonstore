import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime, parseDateToTimestamp, parseOrderDate } from '../../utils/formatters';
import { Order } from '../../types';
import {
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Receipt,
  Printer,
  X,
  Check,
} from 'lucide-react';

interface MobileInvoicesScreenProps {
  onOpenPos?: () => void;
}

export const MobileInvoicesScreen: React.FC<MobileInvoicesScreenProps> = ({ onOpenPos }) => {
  const { orders, openOrderReceipt, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'this_month' | 'last_month'>('this_month');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Sort & Filter & Summary Metric states
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('NEWEST');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'TRANSFER'>('ALL');
  const [summaryMetric, setSummaryMetric] = useState<'REVENUE' | 'PROFIT' | 'ITEMS'>('REVENUE');

  const timeLabels: Record<string, string> = {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    this_month: 'Tháng này',
    last_month: 'Tháng trước',
  };

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => o.status !== 'CANCELLED');

    // Time filter
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const endOfYesterday = startOfToday - 1;

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0).getTime();
    const endOfLastMonth = startOfThisMonth - 1;

    result = result.filter((o) => {
      const ts = parseDateToTimestamp(o.created_at);
      if (timeRange === 'today') return ts >= startOfToday && ts <= endOfToday;
      if (timeRange === 'yesterday') return ts >= startOfYesterday && ts <= endOfYesterday;
      if (timeRange === 'this_month') return ts >= startOfThisMonth && ts <= endOfToday;
      if (timeRange === 'last_month') return ts >= startOfLastMonth && ts <= endOfLastMonth;
      return true;
    });

    // Payment method filter
    if (paymentFilter !== 'ALL') {
      result = result.filter((o) => o.payment_method === paymentFilter);
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.phone && o.phone.includes(q))
      );
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sortOption === 'NEWEST') return parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at);
      if (sortOption === 'OLDEST') return parseDateToTimestamp(a.created_at) - parseDateToTimestamp(b.created_at);
      if (sortOption === 'AMOUNT_DESC') return (b.final_amount || 0) - (a.final_amount || 0);
      if (sortOption === 'AMOUNT_ASC') return (a.final_amount || 0) - (b.final_amount || 0);
      return 0;
    });

    return result;
  }, [orders, timeRange, searchQuery, paymentFilter, sortOption]);

  // Group orders by date (e.g. "THỨ HAI, 03/08/2026")
  const groupedOrders = useMemo(() => {
    const groups: { dateLabel: string; orders: Order[] }[] = [];

    if (filteredOrders.length > 0) {
      const map: Record<string, Order[]> = {};
      const dayNames = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];

      filteredOrders.forEach((order) => {
        const parsed = parseOrderDate(order.created_at);
        const dayName = dayNames[parsed.dayOfWeek];
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateStr = `${pad(parsed.day)}/${pad(parsed.month)}/${parsed.year}`;
        const key = `${dayName}, ${dateStr}`;
        if (!map[key]) map[key] = [];
        map[key].push(order);
      });

      Object.entries(map).forEach(([dateLabel, ords]) => {
        groups.push({ dateLabel, orders: ords });
      });
    }

    return groups;
  }, [filteredOrders]);

  const summaryDisplay = useMemo(() => {
    if (summaryMetric === 'REVENUE') {
      const rev = filteredOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
      return { label: 'Tổng tiền hàng', value: `${rev.toLocaleString('vi-VN')}` };
    }
    if (summaryMetric === 'PROFIT') {
      const profit = filteredOrders.reduce((sum, o) => sum + ((o.final_amount || 0) - (o.total_cost || 0)), 0);
      return { label: 'Tổng lợi nhuận', value: `${profit.toLocaleString('vi-VN')}` };
    }
    const totalItems = filteredOrders.reduce(
      (sum, o) => sum + (o.items?.reduce((s, i) => s + i.quantity, 0) || 0),
      0
    );
    return { label: 'Tổng số lượng hàng', value: `${totalItems} món` };
  }, [filteredOrders, summaryMetric]);

  const totalInvoicesCount = useMemo(() => {
    return filteredOrders.length;
  }, [filteredOrders]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F6F8] pb-24 text-slate-800">
      {/* Top Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        {isSearchActive ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in">
            <div className="flex-1 flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Tìm mã HD, khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-slate-700"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearchActive(false);
                setSearchQuery('');
              }}
              className="text-xs font-bold text-[#0066FF] px-1"
            >
              Hủy
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Hoá đơn</h1>
            <div className="flex items-center gap-3 text-slate-600">
              <button
                onClick={() => setIsSearchActive(true)}
                className="p-1 hover:text-[#0066FF] transition-colors"
                title="Tìm kiếm"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSortSheetOpen(true)}
                className="p-1 hover:text-[#0066FF] active:scale-95 transition-all"
                title="Sắp xếp"
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter Row Pills */}
      <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-slate-100">
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className={`p-2 rounded-xl border transition-colors ${
            paymentFilter !== 'ALL'
              ? 'bg-[#EAF2FF] border-[#0066FF] text-[#0066FF]'
              : 'border-slate-200 bg-[#F8FAFC] text-slate-600'
          }`}
          title="Lọc hoá đơn"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
            className="flex items-center gap-1.5 bg-[#EAF2FF] text-[#0066FF] px-3 py-1.5 rounded-full text-xs font-semibold"
          >
            <span>{timeLabels[timeRange]}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {isTimeDropdownOpen && (
            <div className="absolute top-9 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 w-36 text-xs font-medium">
              {(['today', 'yesterday', 'this_month', 'last_month'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTimeRange(key);
                    setIsTimeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                    timeRange === key ? 'text-[#0066FF] font-bold bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  {timeLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        {paymentFilter !== 'ALL' && (
          <span className="text-xs bg-blue-50 text-[#0066FF] px-2.5 py-1 rounded-full font-bold">
            {paymentFilter === 'CASH' ? 'Tiền mặt' : 'VietQR'}
          </span>
        )}
      </div>

      {/* Summary Banner (Image 17) */}
      <div className="bg-[#F8FAFC] px-4 py-3 flex items-center justify-between border-b border-slate-200/80">
        <div>
          <button
            onClick={() => {
              if (summaryMetric === 'REVENUE') setSummaryMetric('PROFIT');
              else if (summaryMetric === 'PROFIT') setSummaryMetric('ITEMS');
              else setSummaryMetric('REVENUE');
            }}
            className="flex items-center gap-1 font-extrabold text-sm text-slate-900 hover:text-[#0066FF] transition-colors"
            title="Bấm để chuyển đổi: Doanh thu / Lợi nhuận / Số lượng"
          >
            <span>{summaryDisplay.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <div className="text-[11px] text-slate-500 font-medium">{totalInvoicesCount} hóa đơn</div>
        </div>
        <div className="font-black text-base text-slate-900 tracking-tight">
          {summaryDisplay.value}
        </div>
      </div>

      {/* Invoices Grouped By Date (Image 17) */}
      <div className="p-3 flex flex-col gap-4">
        {groupedOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Không có hóa đơn nào
          </div>
        ) : (
          groupedOrders.map((group) => (
            <div key={group.dateLabel} className="flex flex-col gap-2">
              {/* Date Group Title */}
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                {group.dateLabel}
              </span>

              {/* Invoices in this date */}
              <div className="flex flex-col gap-2">
                {group.orders.map((order) => {
                  const firstItem = order.items?.[0];
                  const otherItemsCount = (order.items?.length || 1) - 1;

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white rounded-2xl p-4 flex flex-col gap-1.5 border border-slate-100 shadow-2xs hover:shadow-xs active:bg-slate-50 cursor-pointer transition-all"
                    >
                      {/* Top line: Customer & Amount */}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-slate-900">
                          {order.customer_name || 'Khách lẻ'}
                        </span>
                        <span className="font-black text-base text-slate-900">
                          {order.final_amount.toLocaleString('vi-VN')}
                        </span>
                      </div>

                      {/* Second line: Time & Code, Payment Method */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {order.created_at ? new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'} · {order.code}
                        </span>
                        <span className="text-slate-600">
                          {order.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </span>
                      </div>

                      {/* Third line: Product preview snippet */}
                      {firstItem && (
                        <div className="text-xs text-slate-600 mt-1">
                          <span>{firstItem.name}</span>
                          <span className="font-bold text-slate-900 ml-1">x{firstItem.quantity}</span>
                        </div>
                      )}

                      {otherItemsCount > 0 && (
                        <span className="text-[11px] text-slate-400">
                          +{otherItemsCount} mặt hàng khác
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button (+) */}
      <button
        onClick={onOpenPos}
        className="fixed right-4 bottom-20 w-13 h-13 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-lg hover:bg-blue-600 active:scale-95 transition-all z-30"
        title="Tạo hóa đơn mới"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Invoice Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={() => setSelectedOrder(null)}>
          <div
            className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col p-5 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-2" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedOrder.code}</h3>
                <span className="text-xs text-slate-400">{formatDateTime(selectedOrder.created_at)}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Khách hàng:</span>
                <span className="font-bold text-slate-900">{selectedOrder.customer_name || 'Khách lẻ'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Hình thức:</span>
                <span className="font-bold text-slate-900">{selectedOrder.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
              </div>

              <div className="border-t border-slate-100 pt-2 flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Danh sách sản phẩm</span>
                {selectedOrder.items.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <span className="flex-1 truncate text-slate-800">{i.name} x{i.quantity}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">Tổng thanh toán:</span>
                <span className="text-xl font-black text-[#0066FF]">{formatCurrency(selectedOrder.final_amount)}</span>
              </div>

              <button
                onClick={() => {
                  openOrderReceipt(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>In Hóa Đơn K80</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort Bottom Sheet */}
      {isSortSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsSortSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <h3 className="font-extrabold text-base text-slate-900">Sắp xếp hoá đơn</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {[
                { id: 'NEWEST', label: 'Thời gian: Mới nhất' },
                { id: 'OLDEST', label: 'Thời gian: Cũ nhất' },
                { id: 'AMOUNT_DESC', label: 'Giá trị: Cao đến thấp' },
                { id: 'AMOUNT_ASC', label: 'Giá trị: Thấp đến cao' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    setSortOption(opt.id as any);
                    setIsSortSheetOpen(false);
                    showToast(`Đã sắp xếp theo: ${opt.label}`, 'info');
                  }}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                  {sortOption === opt.id && <Check className="w-4 h-4 text-[#0066FF]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsFilterSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Lọc hình thức thanh toán</h3>
              {paymentFilter !== 'ALL' && (
                <button
                  onClick={() => {
                    setPaymentFilter('ALL');
                    setIsFilterSheetOpen(false);
                  }}
                  className="text-xs font-bold text-[#0066FF]"
                >
                  Tất cả
                </button>
              )}
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {[
                { id: 'ALL', label: 'Tất cả hình thức' },
                { id: 'CASH', label: 'Tiền mặt' },
                { id: 'TRANSFER', label: 'Chuyển khoản VietQR' },
              ].map((pf) => (
                <div
                  key={pf.id}
                  onClick={() => {
                    setPaymentFilter(pf.id as any);
                    setIsFilterSheetOpen(false);
                  }}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800">{pf.label}</span>
                  {paymentFilter === pf.id && <Check className="w-4 h-4 text-[#0066FF]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
