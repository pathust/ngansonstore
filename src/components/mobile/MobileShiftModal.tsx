import React, { useState } from 'react';
import {
  X,
  Clock,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime, parseDateToTimestamp } from '../../utils/formatters';

interface MobileShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileShiftModal: React.FC<MobileShiftModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { orders, cashbookEntries, currentUser, showToast } = useApp();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();

  const startCash = 500000; // 500K initial float
  const cashSales = orders
    .filter((o) => o.status === 'COMPLETED' && o.payment_method === 'CASH' && parseDateToTimestamp(o.created_at) >= startOfToday)
    .reduce((sum, o) => sum + (o.final_amount || 0), 0);

  const cashReceipts = cashbookEntries
    .filter((c) => c.type === 'IN' && c.category !== 'Thu tiền bán hàng POS' && parseDateToTimestamp(c.created_at) >= startOfToday)
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const cashPayments = cashbookEntries
    .filter((c) => c.type === 'OUT' && parseDateToTimestamp(c.created_at) >= startOfToday)
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const expectedCash = startCash + cashSales + cashReceipts - cashPayments;
  const [actualCash, setActualCash] = useState<number>(expectedCash);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const difference = actualCash - expectedCash;

  const handleCloseShift = async (e: React.FormEvent) => {

    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
    showToast(`Đã chốt và in phiếu giao ca thành công! Tiền bàn giao: ${formatCurrency(actualCash)}`, 'success');
    onClose();

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
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Phiếu Giao Ca Thu Ngân</h3>
              <span className="text-xs text-slate-400 font-medium">
                Thu ngân: {currentUser?.name || 'Phan Minh'} • Ca sáng
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCloseShift} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Shift Time Info */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Giờ vào ca:</span>
            <span className="font-bold text-slate-800">07:30 - Hôm nay</span>
          </div>

          {/* Cash calculation sheet */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-2.5">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Bảng kê tiền mặt trong ca
            </span>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-600">1. Tiền mặt đầu ca (tiền thối):</span>
              <span className="font-bold text-slate-900">{formatCurrency(startCash)}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-600">2. Doanh thu tiền mặt bán hàng:</span>
              <span className="font-bold text-emerald-600">+{formatCurrency(cashSales)}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-600">3. Thu tiền mặt khác (phiếu thu):</span>
              <span className="font-bold text-emerald-600">+{formatCurrency(cashReceipts)}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-600">4. Chi tiền mặt trong ca (phiếu chi):</span>
              <span className="font-bold text-rose-600">-{formatCurrency(cashPayments)}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 bg-slate-50 px-2 rounded-xl">
              <span className="font-bold text-slate-800">Tiền mặt lý thuyết trong két:</span>
              <span className="font-black text-[#0066FF] text-sm">
                {formatCurrency(expectedCash)}
              </span>
            </div>
          </div>

          {/* Count actual cash input */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-800">
              Tiền mặt thực tế kiểm đếm (VNĐ)
            </label>
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={actualCash}
              onChange={(e) => setActualCash(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-slate-200 text-lg font-black text-slate-900 outline-none focus:border-[#0066FF]"
            />

            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-500 font-medium">Chênh lệch:</span>
              <span
                className={`font-black ${
                  difference === 0
                    ? 'text-emerald-600'
                    : difference > 0
                    ? 'text-blue-600'
                    : 'text-rose-600'
                }`}
              >
                {difference > 0 ? `+${formatCurrency(difference)} (Thừa)` : difference < 0 ? `${formatCurrency(difference)} (Thiếu)` : 'Khớp 100%'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú bàn giao</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú cho ca sau (nếu có)..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none"
            />
          </div>

          <button disabled={isSubmitting}
            type="submit"
            className="mt-2 py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang xử lý...' : 'Kết ca & In phiếu bàn giao'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
