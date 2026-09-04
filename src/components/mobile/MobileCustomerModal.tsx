import React, { useState } from 'react';
import {
  ChevronLeft,
  Search,
  Plus,
  User,
  Phone,
  MapPin,
  Check,
  Trash2,
  AlertCircle,
  DollarSign,
  X,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export const MobileCustomerModal: React.FC<MobileCustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'DEBT' | 'CLEAR'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    code: '',
    address: '',
    customer_type: 'Cá nhân',
    group: 'Khách lẻ',
    debt: 0,
    note: '',
    status: 1,
  });

  if (!isOpen) return null;

  const filteredCustomers = customers.filter((c) => {
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      c.name.toLowerCase().includes(s) ||
      (c.phone && c.phone.includes(s)) ||
      (c.code && c.code.toLowerCase().includes(s));

    if (!matchesSearch) return false;

    if (filterType === 'DEBT') return (c.debt || 0) > 0;
    if (filterType === 'CLEAR') return (c.debt || 0) <= 0;
    return true;
  });

  const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

  const openAddForm = () => {
    setFormData({
      name: '',
      phone: '',
      code: `KH${String(customers.length + 1).padStart(7, '0')}`,
      address: '',
      customer_type: 'Cá nhân',
      group: 'Khách lẻ',
      debt: 0,
      note: '',
      status: 1,
    });
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const openEditForm = (c: Customer) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      code: c.code || '',
      address: c.address || '',
      customer_type: c.customer_type || 'Cá nhân',
      group: c.group || 'Khách lẻ',
      debt: c.debt || 0,
      note: c.note || '',
      status: c.status !== undefined ? c.status : 1,
    });
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Vui lòng nhập tên khách hàng!', 'error');
      return;
    }
    const phoneTrimmed = formData.phone?.trim();
    if (phoneTrimmed && !/^(0|\+84)[0-9]{8,10}$/.test(phoneTrimmed.replace(/\s+/g, ''))) {
      showToast('Số điện thoại không hợp lệ! (Ví dụ: 0912345678)', 'warning');
      return;
    }
    if (formData.debt !== undefined && Number(formData.debt) < 0) {
      showToast('Số tiền nợ không được là số âm!', 'warning');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {

    if (isEditMode && selectedCustomer) {
      updateCustomer(selectedCustomer.id, formData);
      setIsFormOpen(false);
      setSelectedCustomer(null);
    } else {
      const created = addCustomer(formData as Omit<Customer, 'id'>);
      setIsFormOpen(false);
      if (onSelectCustomer) {
        onSelectCustomer(created);
        onClose();
      }
    }

    } catch (error) {
      showToast?.('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedCustomer) return;
    deleteCustomer(selectedCustomer.id);
    setIsDeleteConfirmOpen(false);
    setIsFormOpen(false);
    setSelectedCustomer(null);
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
          <span>Khách hàng & Công nợ</span>
        </button>

        <button
          onClick={openAddForm}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm khách</span>
        </button>
      </div>

      {/* Top Banner KPI Công nợ */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs shrink-0">
        <div>
          <span className="text-xs text-slate-500 font-medium">Tổng số khách hàng</span>
          <p className="text-base font-extrabold text-slate-900">{customers.length} khách</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-medium">Tổng nợ phải thu</span>
          <p className="text-base font-black text-rose-600">
            {totalDebt.toLocaleString('vi-VN')} đ
          </p>
        </div>
      </div>

      {/* Search & Filter Pills */}
      <div className="bg-white px-3 py-2.5 border-b border-slate-200/80 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, SĐT hoặc mã KH..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:bg-white transition-all text-slate-800"
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

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-hide">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${
              filterType === 'ALL'
                ? 'bg-[#0066FF] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('DEBT')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${
              filterType === 'DEBT'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Còn nợ ({customers.filter((c) => (c.debt || 0) > 0).length})
          </button>
          <button
            onClick={() => setFilterType('CLEAR')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${
              filterType === 'CLEAR'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hết nợ ({customers.filter((c) => (c.debt || 0) <= 0).length})
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-20">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <User className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm font-medium">Không tìm thấy khách hàng nào</p>
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                if (onSelectCustomer) {
                  onSelectCustomer(c);
                  onClose();
                } else {
                  openEditForm(c);
                }
              }}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] font-bold shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-900 leading-snug">
                    {c.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {c.phone ? (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">Chưa có SĐT</span>
                    )}
                    <span>•</span>
                    <span className="text-slate-400">{c.code}</span>
                  </div>
                  {c.address && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {c.address}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {(c.debt || 0) > 0 ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-rose-500 font-semibold uppercase">Nợ hiện tại</span>
                    <span className="font-black text-sm text-rose-600">
                      {(c.debt || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Hết nợ
                  </span>
                )}
                {c.total_purchased !== undefined && c.total_purchased > 0 && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Tổng mua: {c.total_purchased.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={openAddForm}
        className="fixed bottom-6 right-5 w-14 h-14 bg-[#0066FF] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40 border-2 border-white"
        title="Thêm khách hàng"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 bg-[#F5F6F8] flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
            <button
              onClick={() => setIsFormOpen(false)}
              className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>{isEditMode ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}</span>
            </button>

            <button disabled={isSubmitting}
              onClick={handleSaveForm}
              className="flex items-center gap-1 bg-white text-[#0066FF] px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Đang xử lý...' : 'Lưu'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-16">
            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0066FF]" />
                <span>Thông tin cá nhân</span>
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Anh Minh thợ điện"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mã khách hàng</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Số nhà, đường, phường/xã..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors text-slate-800"
                />
              </div>
            </div>

            {/* Phân loại & Công nợ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Phân loại & Công nợ</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nhóm khách hàng</label>
                  <select
                    value={formData.group || 'Khách lẻ'}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors text-slate-800"
                  >
                    <option value="Khách lẻ">Khách lẻ</option>
                    <option value="Thợ điện nước">Thợ điện nước</option>
                    <option value="Nhà thầu xây dựng">Nhà thầu xây dựng</option>
                    <option value="Khách mua sỉ">Khách mua sỉ</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Công nợ hiện tại (đ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.debt || 0}
                    onChange={(e) => setFormData({ ...formData, debt: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-bold text-rose-600 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú về khách hàng..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors text-slate-800"
                />
              </div>
            </div>

            {/* Nút Xoá (chỉ hiện khi ở chế độ Edit) */}
            {isEditMode && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:bg-rose-100 transition-colors border border-rose-100"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xoá khách hàng này</span>
                </button>
              </div>
            )}
          </form>

          {/* Delete Confirm Modal */}
          {isDeleteConfirmOpen && (
            <div className="fixed inset-0 z-70 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">Xác nhận xoá?</h4>
                    <p className="text-xs text-slate-500">
                      Bạn có chắc muốn xoá khách hàng &quot;{selectedCustomer?.name}&quot;?
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs shadow-xs"
                  >
                    Xoá luôn
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
