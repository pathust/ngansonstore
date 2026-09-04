import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface ReturnVoucher {
  id: string;
  code: string;
  invoiceCode: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  totalRefund: number;
  refundMethod: 'CASH' | 'DEBT_DEDUCTION';
  createdAt: number;
}

interface MobileReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileReturnsModal: React.FC<MobileReturnsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { orders, addCashbookEntry, showToast } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInvoiceCode, setSelectedInvoiceCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('Khách đổi loại hàng khác');

  const [returnList, setReturnList] = useState<ReturnVoucher[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('nganson_returns');
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

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceCode) {
      showToast('Vui lòng chọn hoặc nhập mã hóa đơn trả hàng!', 'warning');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (refundAmount <= 0) {
        showToast('Vui lòng nhập số tiền hoàn trả lớn hơn 0!', 'warning');
        return;
      }

      const newCode = `TH${Date.now().toString().slice(-6)}`;
      const newVoucher: ReturnVoucher = {
        id: `ret-${Date.now()}`,
        code: newCode,
        invoiceCode: selectedInvoiceCode,
        customerName: customerName || 'Khách lẻ',
        items: [{ name: 'Hàng hoá hoàn lại', quantity: 1, price: refundAmount }],
        totalRefund: refundAmount,
        refundMethod: 'CASH',
        createdAt: Date.now(),
      };

      const updatedReturns = [newVoucher, ...returnList];
      setReturnList(updatedReturns);
      localStorage.setItem('nganson_returns', JSON.stringify(updatedReturns));

      // Create cash payment entry in Sổ Quỹ
      addCashbookEntry({
        type: 'OUT',
        category: 'Chi trả tiền khách trả hàng',
        amount: refundAmount,
        note: `Hoàn tiền phiếu trả ${newCode} (Hóa đơn ${selectedInvoiceCode})`,
        ref_code: newCode,
      });

      showToast(`Đã lập phiếu trả hàng ${newCode} và chi hoàn tiền ${formatCurrency(refundAmount)}!`, 'success');
      setIsCreating(false);
      setSelectedInvoiceCode('');
      setCustomerName('');
      setRefundAmount(0);

    } catch (error) {
      showToast?.('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isCreating ? 'Lập phiếu trả hàng mới' : 'Quản lý Đơn Trả Hàng'}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {isCreating ? 'Nhập thông tin hóa đơn & hàng nhận lại' : `${returnList.length} phiếu trả hàng`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isCreating ? (
            <form onSubmit={handleCreateReturn} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn mã Hóa đơn mua hàng
                </label>
                <select
                  value={selectedInvoiceCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedInvoiceCode(code);
                    const ord = orders.find((o) => o.code === code);
                    if (ord) {
                      setRefundAmount(ord.final_amount);
                      setCustomerName(ord.customer_name || 'Khách lẻ');
                    } else {
                      setCustomerName('');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="">-- Chọn hoá đơn trả hàng --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.code}>
                      {o.code} - {o.customer_name || 'Khách lẻ'} ({formatCurrency(o.final_amount)})
                    </option>
                  ))}
                </select>
                {customerName && (
                  <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-400">Khách hàng:</span>
                    <span className="font-bold text-slate-800">{customerName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số tiền hoàn trả cho khách (VNĐ)
                </label>
                <input
                  type="number"
                  value={refundAmount || ''}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  placeholder="Nhập số tiền hoàn..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-black text-rose-600 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Lý do trả hàng
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="p-3 bg-rose-50 rounded-xl text-xs text-rose-700 flex items-center gap-2 mt-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Hệ thống sẽ tự động tạo một phiếu chi tiền mặt tương ứng trong Sổ quỹ.</span>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
                >
                  Quay lại
                </button>
                <button disabled={isSubmitting}
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md active:scale-98"
                >
                  Xác nhận trả hàng & Hoàn tiền
                </button>
              </div>
            </form>
          ) : returnList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <RotateCcw className="w-8 h-8 text-rose-600" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 mb-1">Chưa có phiếu trả hàng nào</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-5">
                Các phiếu khách trả hàng hoặc đổi trả sẽ được ghi nhận và hiển thị tại đây.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md active:scale-98 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Lập phiếu trả hàng</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {returnList.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-rose-600">{v.code}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(v.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Thuộc hóa đơn:</span>
                    <span className="font-bold text-slate-900">{v.invoiceCode}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Khách hàng:</span>
                    <span className="font-bold text-slate-900">{v.customerName}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Tiền hoàn trả:</span>
                    <span className="text-base font-black text-rose-600">
                      {formatCurrency(v.totalRefund)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Button */}
        {!isCreating && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lập phiếu trả hàng</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
