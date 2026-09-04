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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
  const [timeRange, setTimeRange] = useState<'TODAY' | 'MONTH' | 'ALL'>('TODAY');

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  const filteredOrders = completedOrders.filter((o) => {
    if (timeRange === 'TODAY') {
      return o.created_at?.includes(todayStr) || (o as any).date?.includes(todayStr);
    }
    if (timeRange === 'MONTH') {
      return o.created_at?.includes(currentMonthStr) || (o as any).date?.includes(currentMonthStr);
    }
    return true;
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
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
        <div className="flex items-center gap-1 bg-white/20 p-1 rounded-xl">
          <button
            onClick={() => setTimeRange('TODAY')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
              timeRange === 'TODAY' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setTimeRange('MONTH')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
              timeRange === 'MONTH' ? 'bg-white text-[#0066FF]' : 'text-white'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-colors ${
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

        {/* Phương thức thanh toán */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-3">
          <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#0066FF]" />
            <span>Phương thức thanh toán</span>
          </h4>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="flex items-center gap-2 text-slate-700">
                <Wallet className="w-4 h-4 text-emerald-600" />
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
