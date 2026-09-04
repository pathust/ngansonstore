import React, { useState } from 'react';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface PreOrder {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  itemsSummary: string;
  totalAmount: number;
  depositAmount: number;
  deliveryDate: string;
  status: 'PENDING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
  createdAt: number;
}

interface MobileOrdersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPos?: () => void;
}

export const MobileOrdersManagementModal: React.FC<MobileOrdersManagementModalProps> = ({
  isOpen,
  onClose,
  onOpenPos,
}) => {
  const { showToast } = useApp();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const [orders, setOrders] = useState<PreOrder[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('nganson_preorders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  if (!isOpen) return null;

  const filtered = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  const handleConvertToSale = (order: PreOrder) => {
    const updated = orders.map((o) => (o.id === order.id ? { ...o, status: 'COMPLETED' as const } : o));
    setOrders(updated);
    localStorage.setItem('nganson_preorders', JSON.stringify(updated));
    showToast(`Đã chuyển đơn đặt hàng ${order.code} thành Hóa đơn bán hàng thành công!`, 'success');
  };

  const handleCancelOrder = (order: PreOrder) => {
    const updated = orders.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' as const } : o));
    setOrders(updated);
    localStorage.setItem('nganson_preorders', JSON.stringify(updated));
    showToast(`Đã hủy đơn đặt hàng ${order.code}!`, 'info');
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Quản lý Đặt hàng</h3>
              <span className="text-xs text-slate-400 font-medium">
                {filtered.length} đơn đặt hàng
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex px-4 py-2 border-b border-slate-100 gap-2 bg-slate-50/50">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ giao / Chờ hàng' },
            { id: 'COMPLETED', label: 'Đã hoàn thành' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filterStatus === tab.id
                  ? 'bg-[#0066FF] text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-[#0066FF]" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 mb-1">Chưa có đơn đặt hàng nào</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Các đơn đặt trước của khách hàng sẽ xuất hiện ở đây khi được tạo mới.
              </p>
            </div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col gap-2.5"
              >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-[#0066FF]">{o.code}</span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    o.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : o.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {o.status === 'COMPLETED'
                    ? 'HOÀN THÀNH'
                    : o.status === 'CANCELLED'
                    ? 'ĐÃ HUỶ'
                    : 'CHỜ GIAO'}
                </span>
              </div>

              <div>
                <span className="font-bold text-sm text-slate-900 block">{o.customerName}</span>
                <span className="text-xs text-slate-500 font-medium">{o.phone}</span>
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg leading-relaxed">
                  {o.itemsSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tổng tiền:</span>
                  <span className="font-black text-slate-900">{formatCurrency(o.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Đã nhận cọc:</span>
                  <span className="font-black text-emerald-600">{formatCurrency(o.depositAmount)}</span>
                </div>
              </div>

              {o.status === 'PENDING' && (
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => handleCancelOrder(o)}
                    className="py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                  >
                    Hủy đơn
                  </button>
                  <button
                    onClick={() => handleConvertToSale(o)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#0066FF] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm active:scale-98"
                  >
                    <span>Xuất hóa đơn bán ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )))}
        </div>

        {/* Bottom button: Tạo đơn đặt hàng mới qua POS */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={() => {
              onClose();
              if (onOpenPos) onOpenPos();
            }}
            className="w-full py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đơn đặt hàng mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
