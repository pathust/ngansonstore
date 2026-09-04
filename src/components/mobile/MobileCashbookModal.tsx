import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Minus,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Check,
  Trash2,
  AlertCircle,
  Calendar,
  DollarSign,
  X,
} from 'lucide-react';
import { CashbookEntry } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileCashbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAction?: 'IN' | 'OUT' | null; // If opening directly into create receipt/voucher mode
}

export const MobileCashbookModal: React.FC<MobileCashbookModalProps> = ({
  isOpen,
  onClose,
  defaultAction = null,
}) => {
  const { cashbookEntries, addCashbookEntry, deleteCashbookEntry, showToast } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(defaultAction !== null);
  const [formType, setFormType] = useState<'IN' | 'OUT'>(defaultAction || 'IN');

  const [formData, setFormData] = useState({
    amount: '',
    category: formType === 'IN' ? 'Thu nợ khách hàng' : 'Chi tiền nhập hàng hóa',
    target: '',
    note: '',
  });

  if (!isOpen) return null;

  // KPI Calculations
  const totalIn = cashbookEntries
    .filter((e) => e.type === 'IN')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOut = cashbookEntries
    .filter((e) => e.type === 'OUT')
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = totalIn - totalOut;

  const filteredEntries = cashbookEntries.filter((e) => {
    if (filterType !== 'ALL' && e.type !== filterType) return false;
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      return (
        e.code.toLowerCase().includes(term) ||
        (e.note && e.note.toLowerCase().includes(term)) ||
        (e.category && e.category.toLowerCase().includes(term)) ||
        (e.ref_code && e.ref_code.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleOpenForm = (type: 'IN' | 'OUT') => {
    setFormType(type);
    setFormData({
      amount: '',
      category: type === 'IN' ? 'Thu nợ khách hàng' : 'Chi tiền nhập hàng hóa',
      target: '',
      note: '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(formData.amount.replace(/\D/g, ''), 10);
    if (!parsedAmount || parsedAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0!', 'error');
      return;
    }
    if (!formData.category?.trim()) {
      showToast('Vui lòng chọn loại khoản thu/chi!', 'warning');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {

    addCashbookEntry({
      type: formType,
      amount: parsedAmount,
      category: formData.category,
      note: `${formData.note || ''}${formData.target ? ` [Đối tác: ${formData.target}]` : ''}`.trim(),
    });

    showToast(
      `Đã lập thành công ${formType === 'IN' ? 'Phiếu thu' : 'Phiếu chi'} ${parsedAmount.toLocaleString('vi-VN')} đ!`,
      'success'
    );
    setIsFormOpen(false);

    } catch (error) {
      showToast?.('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F6F8] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Sticky Header */}
      <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Sổ quỹ Thu - Chi</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenForm('IN')}
            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95 text-white"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Thu</span>
          </button>
          <button
            onClick={() => handleOpenForm('OUT')}
            className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95 text-white"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Chi</span>
          </button>
        </div>
      </div>

      {/* KPI Balances Banner */}
      <div className="bg-white border-b border-slate-200/80 p-3 shadow-2xs shrink-0">
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] text-white flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Tồn quỹ tiền mặt
              </span>
              <p className="text-lg font-black text-[#0066FF]">
                {balance.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-700 font-medium">Tổng thu</span>
              <p className="text-xs font-extrabold text-emerald-800">
                +{totalIn.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] text-rose-700 font-medium">Tổng chi</span>
              <p className="text-xs font-extrabold text-rose-800">
                -{totalOut.toLocaleString('vi-VN')} đ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white px-3 py-2 border-b border-slate-200/80 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phiếu, lý do thu chi..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filterType === 'ALL'
                ? 'bg-[#0066FF] text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Tất cả ({cashbookEntries.length})
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filterType === 'IN'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Phiếu thu ({cashbookEntries.filter((e) => e.type === 'IN').length})
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filterType === 'OUT'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Phiếu chi ({cashbookEntries.filter((e) => e.type === 'OUT').length})
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-24">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Wallet className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm font-medium">Chưa có giao dịch thu chi nào</p>
          </div>
        ) : (
          filteredEntries.map((e) => {
            const isIncome = e.type === 'IN';
            return (
              <div
                key={e.id}
                className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-900 leading-snug">
                      {e.category || (isIncome ? 'Thu tiền' : 'Chi tiền')}
                    </span>
                    <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {e.note || e.code}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{e.code}</span>
                      <span>•</span>
                      <span>{e.created_at}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  <span
                    className={`font-black text-sm ${
                      isIncome ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {e.amount.toLocaleString('vi-VN')} đ
                  </span>
                  <button
                    onClick={() => deleteCashbookEntry(e.id)}
                    className="text-slate-300 hover:text-rose-500 p-1 transition-colors mt-1"
                    title="Xoá phiếu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="h-16 bg-white border-t border-slate-200/90 px-4 flex items-center justify-between gap-3 fixed bottom-0 inset-x-0 z-40 shadow-sm">
        <button
          onClick={() => handleOpenForm('IN')}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Lập phiếu thu</span>
        </button>

        <button
          onClick={() => handleOpenForm('OUT')}
          className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-xs"
        >
          <Minus className="w-4 h-4 stroke-[3]" />
          <span>- Lập phiếu chi</span>
        </button>
      </div>

      {/* Create Receipt / Payment Voucher Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 bg-[#F5F6F8] flex flex-col animate-in slide-in-from-bottom duration-200">
          <div
            className={`h-14 text-white flex items-center justify-between px-3 shrink-0 shadow-sm ${
              formType === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            <button
              onClick={() => setIsFormOpen(false)}
              className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>{formType === 'IN' ? 'Lập Phiếu Thu Tiền' : 'Lập Phiếu Chi Tiền'}</span>
            </button>

            <button disabled={isSubmitting}
              onClick={handleSubmitForm}
              className="flex items-center gap-1 bg-white px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs active:scale-95 transition-all text-slate-900"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}</span>
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-16">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('IN');
                    setFormData((prev) => ({ ...prev, category: 'Thu nợ khách hàng' }));
                  }}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                    formType === 'IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Phiếu Thu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('OUT');
                    setFormData((prev) => ({ ...prev, category: 'Chi tiền nhập hàng hóa' }));
                  }}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                    formType === 'OUT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  - Phiếu Chi
                </button>
              </div>

              {/* Số tiền */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số tiền (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="VD: 500000"
                    className={`w-full pl-3 pr-10 py-3 text-lg font-black rounded-xl border focus:outline-none transition-colors ${
                      formType === 'IN'
                        ? 'text-emerald-600 border-emerald-200 focus:border-emerald-500 bg-emerald-50/30'
                        : 'text-rose-600 border-rose-200 focus:border-rose-500 bg-rose-50/30'
                    }`}
                    autoFocus
                  />
                  <span className="absolute right-3 top-3.5 text-xs font-bold text-slate-400">
                    đ
                  </span>
                </div>
              </div>

              {/* Loại thu / chi */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Loại {formType === 'IN' ? 'thu' : 'chi'}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                >
                  {formType === 'IN' ? (
                    <>
                      <option value="Thu nợ khách hàng">Thu nợ khách hàng</option>
                      <option value="Thu tiền bán hàng POS">Thu tiền bán hàng POS</option>
                      <option value="Thu hoàn tiền NCC">Thu hoàn tiền từ NCC</option>
                      <option value="Thu nhập khác">Thu nhập khác</option>
                    </>
                  ) : (
                    <>
                      <option value="Chi tiền nhập hàng hóa">Chi tiền nhập hàng hóa</option>
                      <option value="Chi trả nợ NCC">Chi trả nợ nhà cung cấp</option>
                      <option value="Chi tiền thuê mặt bằng">Chi tiền thuê mặt bằng</option>
                      <option value="Chi lương nhân viên">Chi lương nhân viên</option>
                      <option value="Chi điện, nước, internet">Chi điện, nước, internet</option>
                      <option value="Chi phí khác">Chi phí vận hành khác</option>
                    </>
                  )}
                </select>
              </div>

              {/* Người nộp / nhận */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {formType === 'IN' ? 'Người nộp tiền' : 'Người nhận tiền'}
                </label>
                <input
                  type="text"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  placeholder={formType === 'IN' ? 'Tên khách hàng nộp tiền...' : 'Tên nhân viên / đối tác nhận...'}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú lý do</label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Diễn giải chi tiết nội dung thu chi..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                />
              </div>

              {/* Nút lưu lớn ở dưới form */}
              <button disabled={isSubmitting}
                type="submit"
                className={`w-full py-3.5 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform mt-2 ${
                  formType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmitting ? 'Đang xử lý...' : (formType === 'IN' ? 'Tạo phiếu thu tiền' : 'Tạo phiếu chi tiền')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
