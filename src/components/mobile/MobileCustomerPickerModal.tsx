import React, { useState } from 'react';
import {
  ChevronLeft,
  Search,
  Plus,
  User,
  Phone,
  Check,
  X,
  UserCheck,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileCustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerName: string;
  onSelectCustomer: (customerName: string, customerPhone: string, customer?: Customer) => void;
}

export const MobileCustomerPickerModal: React.FC<MobileCustomerPickerModalProps> = ({
  isOpen,
  onClose,
  selectedCustomerName,
  onSelectCustomer,
}) => {
  const { customers, addCustomer, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  if (!isOpen) return null;

  const filteredCustomers = customers.filter((c) => {
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return (
      c.name.toLowerCase().includes(s) ||
      (c.phone && c.phone.includes(s)) ||
      (c.code && c.code.toLowerCase().includes(s))
    );
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Vui lòng nhập tên khách hàng!', 'error');
      return;
    }
    const created = addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      code: `KH${String(customers.length + 1).padStart(7, '0')}`,
      group: 'Khách lẻ',
      customer_type: 'Cá nhân',
      debt: 0,
      total_purchased: 0,
      status: 1,
    });
    onSelectCustomer(created.name, created.phone, created);
    setIsQuickAddOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/50 flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-[#F5F6F8] rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0066FF]" />
            <h3 className="font-extrabold text-sm text-slate-900">Chọn khách hàng</h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Add button */}
        <div className="bg-white p-3 border-b border-slate-200/80 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khách theo tên hoặc SĐT..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:bg-white text-slate-800"
              autoFocus
            />
          </div>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-3 py-2 bg-blue-50 text-[#0066FF] rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-8">
          {/* Mặc định: Khách lẻ */}
          <div
            onClick={() => {
              onSelectCustomer('Khách lẻ', '');
              onClose();
            }}
            className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
              !selectedCustomerName || selectedCustomerName === 'Khách lẻ'
                ? 'bg-blue-50/80 border-[#0066FF] text-[#0066FF]'
                : 'bg-white border-slate-100 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                KL
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-slate-900">Khách lẻ</span>
                <span className="text-xs text-slate-400">Khách vãng lai, không lưu công nợ</span>
              </div>
            </div>
            {(!selectedCustomerName || selectedCustomerName === 'Khách lẻ') && (
              <Check className="w-5 h-5 text-[#0066FF] stroke-[3]" />
            )}
          </div>

          {filteredCustomers.map((c) => {
            const isSelected = selectedCustomerName === c.name;
            return (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCustomer(c.name, c.phone || '', c);
                  onClose();
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#0066FF]'
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-sm text-slate-900">{c.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {c.phone && (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </span>
                      )}
                      <span>•</span>
                      <span className="text-slate-400">{c.group || 'Khách quen'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {(c.debt || 0) > 0 && (
                    <span className="text-xs font-black text-rose-600 block">
                      Nợ: {(c.debt || 0).toLocaleString('vi-VN')} đ
                    </span>
                  )}
                  {isSelected && <Check className="w-5 h-5 text-[#0066FF] stroke-[3] ml-auto mt-1" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add Form Sheet */}
        {isQuickAddOpen && (
          <div className="fixed inset-0 z-70 bg-black/50 flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-900">Thêm nhanh khách hàng</h4>
                <button
                  onClick={() => setIsQuickAddOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAdd} className="flex flex-col gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tên khách hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Anh Nam điện nước"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#0066FF] text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    Tạo & Chọn luôn
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
