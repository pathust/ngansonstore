import React, { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, Camera, Check, AlertCircle } from 'lucide-react';
import { Product, Category } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null means ADD mode, non-null means EDIT mode
  categories: Category[];
}

export const MobileProductModal: React.FC<MobileProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
}) => {
  const { addProduct, updateProduct, deleteProduct, showToast } = useApp();
  const isEdit = !!product;

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    category: categories[1]?.id || 'cat-dien',
    unit: 'Cái',
    cost_price: 0,
    selling_price: 0,
    stock: 0,
    min_stock: 5,
    status: 'ACTIVE',
    description: '',
  });

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        unit: product.unit,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        stock: product.stock,
        min_stock: product.min_stock,
        status: product.status,
        description: product.description || '',
        image: product.image,
      });
    } else {
      setFormData({
        name: '',
        sku: `SP-${Date.now().toString().slice(-4)}`,
        barcode: `893${Date.now().toString().slice(-10)}`,
        category: categories.find((c) => c.id !== 'cat-all')?.id || 'cat-dien',
        unit: 'Cái',
        cost_price: 0,
        selling_price: 0,
        stock: 10,
        min_stock: 5,
        status: 'ACTIVE',
        description: '',
      });
    }
  }, [product, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showToast('Vui lòng nhập tên hàng hoá!', 'warning');
      return;
    }
    if (Number(formData.selling_price) < 0 || Number(formData.cost_price) < 0) {
      showToast('Giá bán và giá vốn không được là số âm!', 'warning');
      return;
    }
    if (Number(formData.stock) < 0) {
      showToast('Tồn kho ban đầu không được là số âm!', 'warning');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {

    if (isEdit && product) {
      updateProduct(product.id, {
        name: formData.name.trim(),
        sku: formData.sku?.trim() || product.sku,
        barcode: formData.barcode?.trim() || product.barcode,
        category: formData.category || product.category,
        unit: formData.unit?.trim() || 'Cái',
        cost_price: Number(formData.cost_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        stock: Number(formData.stock) || 0,
        min_stock: Number(formData.min_stock) || 0,
        status: formData.status || 'ACTIVE',
        description: formData.description?.trim(),
      });
      showToast(`Đã cập nhật hàng hoá "${formData.name}"!`, 'success');
    } else {
      addProduct({
        name: formData.name.trim(),
        sku: formData.sku?.trim() || `SP-${Date.now().toString().slice(-4)}`,
        barcode: formData.barcode?.trim() || `893${Date.now().toString().slice(-10)}`,
        category: formData.category || 'cat-dien',
        unit: formData.unit?.trim() || 'Cái',
        cost_price: Number(formData.cost_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        stock: Number(formData.stock) || 0,
        min_stock: Number(formData.min_stock) || 0,
        status: formData.status || 'ACTIVE',
        description: formData.description?.trim(),
      });
      showToast(`Đã tạo mới hàng hoá "${formData.name}"!`, 'success');
    }

    onClose();

    } catch (error) {
      showToast?.('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (product) {
      deleteProduct(product.id);
      showToast(`Đã xoá hàng hoá "${product.name}" khỏi danh mục!`, 'info');
      setIsDeleteConfirmOpen(false);
      onClose();
    }
  };

  const commonUnits = ['Cái', 'Cuộn', 'Cây', 'Hộp', 'Bộ', 'Mét', 'Bình', 'Kg', 'Chiếc'];

  return (
    <div className="fixed inset-0 bg-[#F5F6F8] z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="bg-white px-4 py-3.5 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20 shadow-2xs">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="flex items-center gap-1.5 text-slate-800 font-bold text-base hover:text-[#0066FF] transition-colors py-1.5 px-2 -ml-2 rounded-xl active:bg-slate-100 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 text-slate-700" />
          <span>{isEdit ? 'Sửa hàng hoá' : 'Thêm hàng hoá'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
          }}
          className="bg-[#0066FF] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md hover:bg-blue-600 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Lưu</span>
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-28">
        {/* Image & Basic Info Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {/* Image placeholder / upload button */}
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-blue-500 cursor-pointer hover:bg-blue-100 transition-colors shrink-0 relative overflow-hidden">
              {formData.image ? (
                <img src={formData.image} alt="product" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-bold mt-0.5">Thêm ảnh</span>
                </>
              )}
            </div>

            <div className="flex-1">
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Tên hàng hoá <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nhập tên hàng (vd: Bóng LED 9W)"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Mã hàng (SKU)</label>
              <input
                type="text"
                placeholder="SP-XXXX"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full p-2 bg-[#F9FAFB] border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Mã vạch (Barcode)</label>
              <input
                type="text"
                placeholder="Mã vạch..."
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full p-2 bg-[#F9FAFB] border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Phân loại & Đơn vị tính */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
          <h3 className="font-extrabold text-sm text-slate-900">Phân loại & Đơn vị</h3>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Nhóm hàng</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white"
            >
              {categories
                .filter((c) => c.id !== 'cat-all')
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">Đơn vị tính</label>
            <div className="flex flex-wrap gap-1.5">
              {commonUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFormData({ ...formData, unit: u })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    formData.unit === u
                      ? 'bg-[#0066FF] text-white font-bold shadow-xs'
                      : 'bg-[#F3F4F6] text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Giá & Tồn kho */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
          <h3 className="font-extrabold text-sm text-slate-900">Giá bán & Tồn kho</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Giá bán (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={formData.selling_price || ''}
                onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                className="w-full p-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-sm font-black text-[#0066FF] focus:outline-none focus:border-[#0066FF] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Giá vốn (VNĐ)</label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={formData.cost_price || ''}
                onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                className="w-full p-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Tồn kho hiện tại</label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={formData.stock !== undefined ? formData.stock : ''}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full p-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Định mức tồn tối thiểu</label>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={formData.min_stock !== undefined ? formData.min_stock : ''}
                onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                className="w-full p-2.5 bg-[#F9FAFB] border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Trạng thái kinh doanh */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-slate-900">Trạng thái kinh doanh</span>
            <span className="text-xs text-slate-400">
              {formData.status === 'ACTIVE' ? 'Đang kinh doanh tại cửa hàng' : 'Ngừng kinh doanh'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, status: formData.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
            className={`w-12 h-7 rounded-full transition-colors relative p-0.5 ${
              formData.status === 'ACTIVE' ? 'bg-[#0066FF]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                formData.status === 'ACTIVE' ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Delete Product Button (if edit mode) */}
        {isEdit && (
          <button
            type="button"
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="w-full py-3.5 rounded-2xl border border-red-200 bg-red-50/50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors active:scale-98"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xoá hàng hoá này</span>
          </button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center gap-3 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Xác nhận xoá hàng hoá?</h3>
            <p className="text-xs text-slate-500">
              Bạn có chắc chắn muốn xoá mặt hàng <strong>"{product?.name}"</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md active:scale-98"
              >
                Xoá vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
