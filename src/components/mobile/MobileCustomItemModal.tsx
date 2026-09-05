import React, { useState } from 'react';
import {
  X,
  Plus,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: (item: { name: string; price: number; quantity: number; unit: string }) => void;
}

export const MobileCustomItemModal: React.FC<MobileCustomItemModalProps> = ({
  isOpen,
  onClose,
  onItemAdded,
}) => {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [price, setPrice] = useState<number>(50000);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState('Cái');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!name.trim()) {
      showToast('Vui lòng nhập tên mặt hàng hoặc dịch vụ!', 'warning');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
    if (price <= 0) {
      showToast('Đơn giá phải lớn hơn 0!', 'warning');
      return;
    }

    onItemAdded({
      name: name.trim(),
      price,
      quantity: Math.max(1, quantity),
      unit,
    });

    showToast(`Đã thêm \"${name.trim()}\" vào đơn hàng!`, 'success');
    setName('');
    setPrice(50000);
    setQuantity(1);
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
        className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Thêm mặt hàng nhanh</h3>
              <span className="text-xs text-slate-400 font-medium">Hàng ngoài danh mục / Dịch vụ phát sinh</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên mặt hàng / Dịch vụ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Công lắp đặt bóng đèn, Khớp nối ren ngoài..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#0066FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Đơn giá (VNĐ)</label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                step={5000}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#0066FF] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số lượng</label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Đơn vị tính</label>
            <div className="flex flex-wrap gap-1.5">
              {['Cái', 'Công', 'Lần', 'Mét', 'Bộ', 'Gói'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`py-1 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    unit === u
                      ? 'bg-[#EAF2FF] border-[#0066FF] text-[#0066FF]'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <button disabled={isSubmitting}
            type="submit"
            className="mt-3 py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm shadow-md active:scale-98 transition-all"
          >
            Thêm vào giỏ hàng ngay
          </button>
        </form>
      </div>
    </div>
  );
};
