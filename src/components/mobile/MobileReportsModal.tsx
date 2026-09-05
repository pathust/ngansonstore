import React, { useState } from 'react';
import {
  ChevronLeft,
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  Package,
  CreditCard,
  Wallet,
  ShoppingBag,
  Sparkles,
  Activity,
  Lightbulb,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { parseDateToTimestamp } from '../../utils/formatters';

interface MobileReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType?: 'SALES' | 'END_OF_DAY';
}

export const MobileReportsModal: React.FC<MobileReportsModalProps> = ({
  isOpen,
  onClose,
  reportType = 'SALES',
}) => {
  const { orders } = useApp();
  const [timeRange, setTimeRange] = useState<'TODAY' | 'YESTERDAY' | 'MONTH' | 'LAST_MONTH' | 'ALL'>('TODAY');

  if (!isOpen) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).getTime();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  const filteredOrders = completedOrders.filter((o) => {
    const orderTs = parseDateToTimestamp(o.created_at);
    if (timeRange === 'ALL') return true;
    if (orderTs === 0) return false;
    if (timeRange === 'TODAY') return orderTs >= startOfToday && orderTs <= endOfToday;
    if (timeRange === 'YESTERDAY') return orderTs >= startOfYesterday && orderTs <= endOfYesterday;
    if (timeRange === 'MONTH') return orderTs >= startOfMonth && orderTs <= endOfThisMonth;
    if (timeRange === 'LAST_MONTH') return orderTs >= startOfLastMonth && orderTs <= endOfLastMonth;
    return true;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
  const totalProfit = filteredOrders.reduce(
    (sum, o) => sum + (o.profit ?? ((o.final_amount || 0) - (o.total_cost || 0))),
    0
  );
  const totalOrdersCount = filteredOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Payments breakdown
  const cashAmount = filteredOrders
    .filter((o) => o.payment_method === 'CASH')
    .reduce((sum, o) => sum + (o.final_amount || 0), 0);

  const transferAmount = filteredOrders
    .filter((o) => o.payment_method === 'TRANSFER')
    .reduce((sum, o) => sum + (o.final_amount || 0), 0);

  // Top products
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  filteredOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const existing = productSalesMap.get(item.product_id) || {
        name: item.name,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue += item.quantity * item.price;
      productSalesMap.set(item.product_id, existing);
    });
  });

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Business Evaluation & Situational Commentary
  const marginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
  const nonCashPercent = totalRevenue > 0 ? Math.round((transferAmount / totalRevenue) * 100) : 0;

  const hourlyCounts = new Array(24).fill(0);
  filteredOrders.forEach((o) => {
    const ts = parseDateToTimestamp(o.created_at);
    const h = new Date(ts).getHours();
    hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
  });
  let peakHour = 17;
  let maxOrders = 0;
  hourlyCounts.forEach((cnt, h) => {
    if (cnt > maxOrders) {
      maxOrders = cnt;
      peakHour = h;
    }
  });

  const healthScore = Math.min(
    100,
    Math.max(
      50,
      Math.round(
        (marginPercent >= 20 ? 30 : (marginPercent / 20) * 30) +
          (totalOrdersCount > 0 ? 35 : 10) +
          (nonCashPercent >= 40 ? 25 : (nonCashPercent / 40) * 25) +
          10
      )
    )
  );

  const healthRating =
    healthScore >= 85
      ? { label: 'Rất Tốt', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
      : healthScore >= 70
      ? { label: 'Ổn Định', color: 'bg-blue-100 text-blue-800 border-blue-200' }
      : { label: 'Cần Lưu Ý', color: 'bg-amber-100 text-amber-800 border-amber-200' };

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F6F8] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{reportType === 'END_OF_DAY' ? 'Báo cáo cuối ngày' : 'Báo cáo bán hàng'}</span>
        </button>

        {/* Time range pills */}
        <div className="flex items-center gap-1 bg-white/20 p-1 rounded-xl overflow-x-auto max-w-[65%]">
          <button
            onClick={() => setTimeRange('TODAY')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${
              timeRange === 'TODAY' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setTimeRange('YESTERDAY')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${
              timeRange === 'YESTERDAY' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Hôm qua
          </button>
          <button
            onClick={() => setTimeRange('MONTH')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${
              timeRange === 'MONTH' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setTimeRange('LAST_MONTH')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${
              timeRange === 'LAST_MONTH' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Tháng trước
          </button>
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap transition-colors ${
              timeRange === 'ALL' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 pb-20">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Doanh thu thuần</span>
            <p className="text-base font-black text-[#0066FF] mt-1">
              {totalRevenue.toLocaleString('vi-VN')} đ
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Lợi nhuận gộp</span>
            <p className="text-base font-black text-emerald-600 mt-1">
              {totalProfit.toLocaleString('vi-VN')} đ
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Số đơn hoàn thành</span>
            <p className="text-base font-black text-slate-900 mt-1">
              {totalOrdersCount} hoá đơn
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Trung bình / đơn</span>
            <p className="text-base font-black text-purple-600 mt-1">
              {avgOrderValue.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>

        {/* Đánh Giá & Nhận Xét Tình Hình Kinh Doanh (Mobile) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase">
                Đánh Giá Tình Hình Kinh Doanh
              </h4>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${healthRating.color}`}>
              {healthScore}/100 • {healthRating.label}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Activity className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Biên lợi nhuận gộp: {marginPercent}%</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {marginPercent >= 20
                    ? 'Rất tốt! Cửa hàng đang tối ưu giá vốn và lợi nhuận bán lẻ hiệu quả.'
                    : 'Biên lợi nhuận ổn định. Nên tập trung đẩy thêm các sản phẩm có biên lãi cao.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Khung giờ vàng: {peakHour}h - {peakHour + 1}h</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thời điểm đón nhiều lượt khách mua sắm nhất. Cần chú ý quầy thu ngân và bổ sung hàng lên kệ.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
              <Lightbulb className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#0066FF]">Khuyến nghị vận hành</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {nonCashPercent > 40
                    ? `Thanh toán VietQR đạt ${nonCashPercent}%. Tiếp tục duy trì QR tại quầy để đẩy nhanh tốc độ phục vụ.`
                    : 'Tỷ lệ tiền mặt còn cao. Khuyến khích khách quét mã VietQR để rút ngắn thời gian thối tiền.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0066FF]" />
              <span>Phương thức thanh toán</span>
            </h4>
            <span className="text-[10px] font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md">
              {nonCashPercent}% số hóa
            </span>
          </div>

          {/* Visual progress bar */}
          {totalRevenue > 0 && (
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.round((cashAmount / totalRevenue) * 100)}%` }}
                />
                <div
                  className="h-full bg-[#0066FF] transition-all"
                  style={{ width: `${Math.round((transferAmount / totalRevenue) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Tiền mặt: {Math.round((cashAmount / totalRevenue) * 100)}%</span>
                <span>VietQR: {Math.round((transferAmount / totalRevenue) * 100)}%</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 border-t border-slate-50">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="flex items-center gap-2 text-slate-700">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span>Tiền mặt</span>
              </span>
              <span className="font-black text-slate-900">
                {cashAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="flex items-center gap-2 text-slate-700">
                <TrendingUp className="w-4 h-4 text-[#0066FF]" />
                <span>Chuyển khoản VietQR</span>
              </span>
              <span className="font-black text-slate-900">
                {transferAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 sản phẩm bán chạy */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-3">
          <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" />
            <span>Top 5 sản phẩm bán chạy</span>
          </h4>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">Chưa có dữ liệu bán hàng</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#0066FF] block">{p.qty} cái</span>
                    <span className="text-[10px] text-slate-400">
                      {p.revenue.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
