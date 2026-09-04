import React, { useState } from 'react';
import {
  ChevronLeft,
  Search,
  Plus,
  Truck,
  Phone,
  MapPin,
  Check,
  Trash2,
  AlertCircle,
  Building2,
  DollarSign,
  X,
} from 'lucide-react';
import { Supplier } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSupplierModal: React.FC<MobileSupplierModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'DEBT'>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    phone: '',
    code: '',
    address: '',
    company: '',
    group: 'Thiết bị điện',
    debt: 0,
    note: '',
    status: 'ACTIVE',
  });

  if (!isOpen) return null;

  const filteredSuppliers = suppliers.filter((s) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      s.name.toLowerCase().includes(term) ||
      (s.phone && s.phone.includes(term)) ||
      (s.code && s.code.toLowerCase().includes(term)) ||
      (s.company && s.company.toLowerCase().includes(term));

    if (!matchesSearch) return false;
    if (filterType === 'DEBT') return (s.debt || 0) > 0;
    return true;
  });

  const totalPayable = suppliers.reduce((sum, s) => sum + (s.debt || 0), 0);

  const openAddForm = () => {
    setFormData({
      name: '',
      phone: '',
      code: `NCC${String(suppliers.length + 1).padStart(6, '0')}`,
      address: '',
      company: '',
      group: 'Thiết bị điện',
      debt: 0,
      note: '',
      status: 'ACTIVE',
    });
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const openEditForm = (s: Supplier) => {
    setSelectedSupplier(s);
    setFormData({
      name: s.name,
      phone: s.phone || '',
      code: s.code || '',
      address: s.address || '',
      company: s.company || '',
      group: s.group || 'Thiết bị điện',
      debt: s.debt || 0,
      note: s.note || '',
      status: s.status || 'ACTIVE',
    });
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Vui lòng nhập tên nhà cung cấp!', 'error');
      return;
    }
    const phoneTrimmed = formData.phone?.trim();
    if (phoneTrimmed && !/^(0|\+84)[0-9]{8,10}$/.test(phoneTrimmed.replace(/\s+/g, ''))) {
      showToast('Số điện thoại không hợp lệ! (Ví dụ: 0912345678)', 'warning');
      return;
    }
    if (formData.debt !== undefined && Number(formData.debt) < 0) {
      showToast('Số nợ nhà cung cấp không được là số âm!', 'warning');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {

    if (isEditMode && selectedSupplier) {
      updateSupplier(selectedSupplier.id, formData);
      setIsFormOpen(false);
      setSelectedSupplier(null);
    } else {
      addSupplier(formData as Omit<Supplier, 'id'>);
      setIsFormOpen(false);
    }

    } catch (error) {
      showToast?.('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedSupplier) return;
    deleteSupplier(selectedSupplier.id);
    setIsDeleteConfirmOpen(false);
    setIsFormOpen(false);
    setSelectedSupplier(null);
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
          <span>Nhà cung cấp & Công nợ</span>
        </button>

        <button
          onClick={openAddForm}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm NCC</span>
        </button>
      </div>

      {/* Top Banner KPI Nợ NCC */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs shrink-0">
        <div>
          <span className="text-xs text-slate-500 font-medium">Tổng số NCC</span>
          <p className="text-base font-extrabold text-slate-900">{suppliers.length} đối tác</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-medium">Tổng nợ cần trả</span>
          <p className="text-base font-black text-amber-600">
            {totalPayable.toLocaleString('vi-VN')} đ
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
            placeholder="Tìm theo tên NCC, SĐT hoặc công ty..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:bg-white text-slate-800"
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
            Tất cả ({suppliers.length})
          </button>
          <button
            onClick={() => setFilterType('DEBT')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${
              filterType === 'DEBT'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Còn nợ ({suppliers.filter((s) => (s.debt || 0) > 0).length})
          </button>
        </div>
      </div>

      {/* Supplier List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-20">
        {filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Truck className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm font-medium">Không tìm thấy nhà cung cấp nào</p>
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              onClick={() => openEditForm(s)}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 font-bold shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-900 leading-snug">
                    {s.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {s.phone ? (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">Chưa có SĐT</span>
                    )}
                    <span>•</span>
                    <span className="text-slate-400">{s.code}</span>
                  </div>
                  {s.company && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      {s.company}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {(s.debt || 0) > 0 ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-amber-600 font-semibold uppercase">Cần trả</span>
                    <span className="font-black text-sm text-amber-600">
                      {(s.debt || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Đã thanh toán hết
                  </span>
                )}
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {s.group || 'Thiết bị điện'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={openAddForm}
        className="fixed bottom-6 right-5 w-14 h-14 bg-[#0066FF] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40 border-2 border-white"
        title="Thêm nhà cung cấp"
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
              <span>{isEditMode ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</span>
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
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0066FF]" />
                <span>Thông tin nhà cung cấp</span>
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên nhà cung cấp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Cty Thiết Bị Điện Rạng Đông"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] focus:bg-white text-slate-800"
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
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mã NCC</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Công ty / Tổ chức</label>
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Tên công ty đại diện..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ kho / văn phòng NCC..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Nhóm & Công nợ phải trả</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nhóm hàng cung cấp</label>
                  <select
                    value={formData.group || 'Thiết bị điện'}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                  >
                    <option value="Thiết bị điện">Thiết bị điện</option>
                    <option value="Ống & Phụ kiện nước">Ống & Phụ kiện nước</option>
                    <option value="Kim khí & Dụng cụ">Kim khí & Dụng cụ</option>
                    <option value="Sơn & Hoá chất">Sơn & Hoá chất</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nợ cần trả NCC (đ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.debt || 0}
                    onChange={(e) => setFormData({ ...formData, debt: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm font-bold text-amber-600 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú về nhà cung cấp..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
                />
              </div>
            </div>

            {isEditMode && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:bg-rose-100 transition-colors border border-rose-100"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xoá nhà cung cấp này</span>
                </button>
              </div>
            )}
          </form>

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
                      Bạn có chắc muốn xoá nhà cung cấp &quot;{selectedSupplier?.name}&quot;?
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
