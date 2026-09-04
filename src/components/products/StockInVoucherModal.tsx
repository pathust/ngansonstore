import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  Building2,
  Boxes,
  Printer,
  ShieldCheck,
  PackagePlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, StockInVoucherItem, StockInVoucher } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface StockInVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedProduct?: Product | null;
}

interface DraftVoucherItem {
  id: string; // Temporary unique ID for draft row
  product_id?: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  is_new?: boolean;
  current_stock: number;
  current_cost: number;
}

export const StockInVoucherModal: React.FC<StockInVoucherModalProps> = ({
  isOpen,
  onClose,
  preSelectedProduct,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const {
    products,
    categories,
    suppliers,
    receiveStockVoucher,
    showToast,
    currentUser,
    currentBranch,
  } = useApp();

  // Voucher header states
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'DEBT'>('CASH');
  const [voucherNote, setVoucherNote] = useState<string>('');

  // Draft items in the current voucher
  const [items, setItems] = useState<DraftVoucherItem[]>([]);

  // Search to add existing product
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Sub-form: Add brand new product directly in voucher
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'cat-electronics',
    unit: 'Cái',
    cost_price: 0,
    selling_price: 0,
    quantity: 10,
    min_stock: 5,
  });

  // Print slip preview state after save
  const [savedVoucher, setSavedVoucher] = useState<StockInVoucher | null>(null);
  const [isPreviewPrintOpen, setIsPreviewPrintOpen] = useState(false);

  // Populate if preSelectedProduct was passed
  useEffect(() => {
    if (preSelectedProduct) {
      setItems([
        {
          id: 'draft-' + Date.now(),
          product_id: preSelectedProduct.id,
          sku: preSelectedProduct.sku,
          barcode: preSelectedProduct.barcode,
          name: preSelectedProduct.name,
          category: preSelectedProduct.category,
          unit: preSelectedProduct.unit,
          quantity: 10,
          cost_price: preSelectedProduct.cost_price,
          selling_price: preSelectedProduct.selling_price,
          min_stock: preSelectedProduct.min_stock,
          is_new: false,
          current_stock: preSelectedProduct.stock,
          current_cost: preSelectedProduct.cost_price,
        },
      ]);
    }
  }, [preSelectedProduct]);

  // Real-time duplicate search function
  const findExistingProduct = (name: string, sku: string, barcode: string) => {
    const cleanName = name.trim().toLowerCase();
    const cleanSku = sku.trim().toLowerCase();
    const cleanBarcode = barcode.trim();

    return products.find((p) => {
      if (cleanSku && p.sku && p.sku.trim().toLowerCase() === cleanSku) return true;
      if (cleanBarcode && p.barcode && cleanBarcode !== '' && p.barcode.trim() === cleanBarcode) return true;
      if (cleanName && p.name && p.name.trim().toLowerCase() === cleanName) return true;
      return false;
    });
  };

  // Live duplicate detection for the "+ Thêm SP Mới" form
  const quickAddDuplicate = useMemo(() => {
    if (!quickAddForm.name.trim() && !quickAddForm.sku.trim() && !quickAddForm.barcode.trim()) {
      return null;
    }
    return findExistingProduct(quickAddForm.name, quickAddForm.sku, quickAddForm.barcode);
  }, [quickAddForm.name, quickAddForm.sku, quickAddForm.barcode, products]);

  // Filter existing products for fast search
  const filteredProducts = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)
      )
      .slice(0, 8);
  }, [searchProductQuery, products]);

  // Handler: Add existing product from catalog
  const handleAddExistingProduct = (prod: Product) => {
    const existingIndex = items.findIndex((i) => i.product_id === prod.id || i.sku === prod.sku);
    if (existingIndex >= 0) {
      // Increment quantity if already in the draft list
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex
            ? { ...it, quantity: it.quantity + 1 }
            : it
        )
      );
      showToast(
        `⚠️ Mặt hàng "${prod.name}" đã có trong phiếu nhập! Đã cộng dồn số lượng thành ${items[existingIndex].quantity + 1} ${prod.unit}.`,
        'info'
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          product_id: prod.id,
          sku: prod.sku,
          barcode: prod.barcode,
          name: prod.name,
          category: prod.category,
          unit: prod.unit,
          quantity: 1,
          cost_price: prod.cost_price,
          selling_price: prod.selling_price,
          min_stock: prod.min_stock,
          is_new: false,
          current_stock: prod.stock,
          current_cost: prod.cost_price,
        },
      ]);
    }
    setSearchProductQuery('');
    setIsSearchDropdownOpen(false);
  };

  // Handler: Confirm adding new product (or auto-merge if duplicate detected)
  const handleConfirmQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.name.trim()) {
      showToast('Vui lòng nhập tên sản phẩm!', 'warning');
      return;
    }

    const qty = Math.max(1, Number(quickAddForm.quantity) || 1);
    const cost = Math.max(0, Number(quickAddForm.cost_price) || 0);
    const selling = Number(quickAddForm.selling_price) > 0 ? Number(quickAddForm.selling_price) : Math.round(cost * 1.25);

    if (quickAddDuplicate) {
      // Product exists in system: Merge into draft items
      const existingInDraft = items.find(
        (i) => i.product_id === quickAddDuplicate.id || i.sku === quickAddDuplicate.sku
      );

      if (existingInDraft) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === existingInDraft.id
              ? {
                  ...i,
                  quantity: i.quantity + qty,
                  cost_price: cost > 0 ? cost : i.cost_price,
                }
              : i
          )
        );
      } else {
        setItems((prev) => [
          ...prev,
          {
            id: 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            product_id: quickAddDuplicate.id,
            sku: quickAddDuplicate.sku,
            barcode: quickAddDuplicate.barcode,
            name: quickAddDuplicate.name,
            category: quickAddDuplicate.category,
            unit: quickAddForm.unit || quickAddDuplicate.unit,
            quantity: qty,
            cost_price: cost > 0 ? cost : quickAddDuplicate.cost_price,
            selling_price: selling > 0 ? selling : quickAddDuplicate.selling_price,
            min_stock: quickAddDuplicate.min_stock,
            is_new: false,
            current_stock: quickAddDuplicate.stock,
            current_cost: quickAddDuplicate.cost_price,
          },
        ]);
      }

      showToast(
        `⚠️ Sản phẩm "${quickAddDuplicate.name}" đã tồn tại trong danh mục! Đã tự động gộp vào sản phẩm có sẵn (+${qty} ${quickAddDuplicate.unit}).`,
        'warning'
      );
    } else {
      // Completely new product
      const newSku = quickAddForm.sku.trim() || `SP-${Date.now().toString().slice(-4)}`;
      const newBarcode = quickAddForm.barcode.trim() || `893600${Math.floor(100000 + Math.random() * 900000)}`;

      setItems((prev) => [
        ...prev,
        {
          id: 'draft-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          sku: newSku,
          barcode: newBarcode,
          name: quickAddForm.name.trim(),
          category: quickAddForm.category,
          unit: quickAddForm.unit || 'Cái',
          quantity: qty,
          cost_price: cost,
          selling_price: selling,
          min_stock: quickAddForm.min_stock || 5,
          is_new: true,
          current_stock: 0,
          current_cost: cost,
        },
      ]);

      showToast(`Đã thêm sản phẩm mới "${quickAddForm.name}" vào phiếu nhập kho!`, 'success');
    }

    // Reset quick add form
    setQuickAddForm({
      sku: '',
      barcode: '',
      name: '',
      category: 'cat-electronics',
      unit: 'Cái',
      cost_price: 0,
      selling_price: 0,
      quantity: 10,
      min_stock: 5,
    });
    setIsQuickAddOpen(false);
  };

  // Row edit handlers
  const handleUpdateItemQuantity = (draftId: string, newQty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === draftId ? { ...it, quantity: Math.max(1, newQty) } : it))
    );
  };

  const handleUpdateItemCost = (draftId: string, newCost: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === draftId ? { ...it, cost_price: Math.max(0, newCost) } : it))
    );
  };

  const handleRemoveItem = (draftId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== draftId));
  };

  // Calculations
  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.cost_price, 0);

  // Submit and save stock-in voucher
  const handleSaveVoucher = () => {
    if (items.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 mặt hàng vào phiếu nhập kho!', 'warning');
      return;
    }

    const payloadItems: StockInVoucherItem[] = items.map((it) => ({
      product_id: it.product_id,
      sku: it.sku,
      barcode: it.barcode,
      name: it.name,
      category: it.category,
      unit: it.unit,
      quantity: it.quantity,
      cost_price: it.cost_price,
      selling_price: it.selling_price,
      min_stock: it.min_stock,
      is_new: it.is_new,
    }));

    const finalSupplier = suppliers.find((s) => s.id === supplierId);
    const finalSupplierName = finalSupplier ? finalSupplier.name : supplierName.trim() || undefined;

    const saved = receiveStockVoucher({
      supplier_id: supplierId || undefined,
      supplier_name: finalSupplierName,
      payment_method: paymentMethod,
      note: voucherNote,
      items: payloadItems,
    });

    setSavedVoucher(saved);
    setIsPreviewPrintOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 my-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                <Boxes className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    Tạo Phiếu Nhập Kho & Tính Giá Vốn BQGQ
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                    Kho Hàng
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Nhập hàng từ nhà cung cấp, thêm SP mới hoặc tự động nhận diện gộp kho & cập nhật giá vốn
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 1. Supplier & Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              {/* Supplier Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nhà Cung Cấp:</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    if (sup) setSupplierName(sup.name);
                  }}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:border-emerald-600 outline-none"
                >
                  <option value="">-- Chọn Nhà cung cấp hoặc nhập tay --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.phone}
                    </option>
                  ))}
                </select>
                {!supplierId && (
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Hoặc gõ tên NCC lẻ..."
                    className="w-full mt-1.5 text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-medium text-slate-800 focus:border-emerald-600 outline-none"
                  />
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Chuyển khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DEBT')}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      paymentMethod === 'DEBT'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Ghi nợ NCC
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {paymentMethod === 'DEBT'
                    ? '⚠️ Khoản tiền sẽ được cộng vào công nợ phải trả NCC'
                    : '✅ Hệ thống sẽ tự động hạch toán phiếu chi vào Sổ Quỹ'}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú nhập hàng:
                </label>
                <input
                  type="text"
                  value={voucherNote}
                  onChange={(e) => setVoucherNote(e.target.value)}
                  placeholder="VD: Nhập lô hàng dây điện & bóng đèn đợt 1 tháng này..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* 2. Product Selection & Quick Add Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Search catalog to add existing item */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchProductQuery}
                  onChange={(e) => {
                    setSearchProductQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  placeholder="🔍 Tìm nhanh SP trong danh mục (Tên, Mã SKU, Barcode)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white text-xs text-slate-900 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all shadow-2xs"
                />

                {/* Search Dropdown Results */}
                {isSearchDropdownOpen && filteredProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    {filteredProducts.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddExistingProduct(prod)}
                        className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{prod.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Mã: {prod.sku} | Barcode: {prod.barcode || '—'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-emerald-700">
                            Giá vốn: {formatCurrency(prod.cost_price)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Tồn: <strong>{prod.stock}</strong> {prod.unit}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Button: + Thêm Sản Phẩm Mới Trực Tiếp */}
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  isQuickAddOpen
                    ? 'bg-slate-700 text-white hover:bg-slate-800'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
                }`}
              >
                <PackagePlus className="w-4 h-4" />
                <span>{isQuickAddOpen ? 'Đóng Thêm Mới' : '+ Thêm Sản Phẩm Mới Trực Tiếp'}</span>
              </button>
            </div>

            {/* 3. Sub-form: Add brand new product directly inside voucher with LIVE DUPLICATE CHECK */}
            {isQuickAddOpen && (
              <form
                onSubmit={handleConfirmQuickAdd}
                className="bg-emerald-50/50 border-2 border-emerald-300/80 rounded-2xl p-4 space-y-3.5 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Thêm Mới Hàng Hóa Vào Danh Mục & Phiếu Nhập
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-700 italic">
                    * Nếu tên hoặc mã bị trùng, hệ thống sẽ tự động gộp vào kho chung
                  </span>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  {/* Tên hàng hóa */}
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      Tên hàng hóa / Quy cách <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={quickAddForm.name}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                      placeholder="VD: Dây điện Cadivi 2x2.5mm cuộn 100m..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* Mã SKU */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã SKU (Mã hàng):</label>
                    <input
                      type="text"
                      value={quickAddForm.sku}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, sku: e.target.value })}
                      placeholder="Tự sinh nếu để trống..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* Mã Barcode */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mã Vạch / Barcode:</label>
                    <input
                      type="text"
                      value={quickAddForm.barcode}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, barcode: e.target.value })}
                      placeholder="Quét hoặc tự sinh..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* Danh mục */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Danh mục:</label>
                    <select
                      value={quickAddForm.category}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, category: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-emerald-600 outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ĐVT */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Đơn vị tính (ĐVT):</label>
                    <input
                      type="text"
                      value={quickAddForm.unit}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, unit: e.target.value })}
                      placeholder="Cái, Cuộn, Mét, Bộ..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* Số lượng nhập */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Số lượng nhập <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quickAddForm.quantity}
                      onChange={(e) =>
                        setQuickAddForm({
                          ...quickAddForm,
                          quantity: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* Giá nhập đợt này */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Đơn giá nhập đợt này (VNĐ) <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      required
                      value={quickAddForm.cost_price}
                      onChange={(e) =>
                        setQuickAddForm({
                          ...quickAddForm,
                          cost_price: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:border-emerald-600 outline-none"
                    />
                  </div>

                  {/* Giá bán lẻ dự kiến */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Giá bán lẻ đề xuất (VNĐ):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={quickAddForm.selling_price}
                      onChange={(e) =>
                        setQuickAddForm({
                          ...quickAddForm,
                          selling_price: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      placeholder="Mặc định = Giá nhập x 1.25"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-emerald-700 focus:border-emerald-600 outline-none"
                    />
                  </div>
                </div>

                {/* PROMINENT DUPLICATE DETECTION WARNING CARD */}
                {quickAddDuplicate && (
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 flex items-start gap-3 text-amber-900 animate-in fade-in duration-100">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-sm text-amber-950">
                        ⚠️ ĐÃ TỒN TẠI TRONG KHO: &quot;{quickAddDuplicate.name}&quot;
                      </div>
                      <div className="text-[11px] leading-relaxed">
                        Sản phẩm trùng khớp với mã SKU: <strong>{quickAddDuplicate.sku}</strong> | Tồn
                        hiện tại: <strong>{quickAddDuplicate.stock} {quickAddDuplicate.unit}</strong> |
                        Giá vốn cũ: <strong>{formatCurrency(quickAddDuplicate.cost_price)}</strong>.
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-800 bg-white/80 p-2 rounded-md border border-amber-200">
                        ➡️ Khi bạn nhấn &quot;Thêm vào phiếu&quot;, hệ thống sẽ tự động{' '}
                        <strong>GỘP VÀO SẢN PHẨM CÓ SẴN</strong>, cộng dồn số lượng (+
                        {quickAddForm.quantity} {quickAddDuplicate.unit}) và tính lại giá vốn bình quân
                        gia quyền thay vì tạo sản phẩm trùng lặp.
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-form Submit buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                      quickAddDuplicate
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {quickAddDuplicate ? 'Xác Nhận Gộp Chung Vào Kho' : '+ Thêm Vào Phiếu Nhập'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* 4. Voucher Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>Danh sách mặt hàng nhập kho ({items.length} sản phẩm)</span>
                  {items.some((i) => i.is_new) && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Có {items.filter((i) => i.is_new).length} SP mới
                    </span>
                  )}
                </h4>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">Chưa có sản phẩm nào trong phiếu</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Sử dụng thanh tìm kiếm phía trên để chọn mặt hàng có sẵn, hoặc bấm &quot;+ Thêm Sản Phẩm Mới Trực Tiếp&quot; để nhập hàng mới.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">STT</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Hàng Hóa & Phân Loại</th>
                        <th className="py-2.5 px-3 w-16 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 w-20 text-center">Tồn Hiện Tại</th>
                        <th className="py-2.5 px-3 w-28 text-center">SL Nhập Thêm</th>
                        <th className="py-2.5 px-3 w-32 text-right">Đơn Giá Nhập</th>
                        <th className="py-2.5 px-3 w-32 text-right">Thành Tiền</th>
                        <th className="py-2.5 px-3 w-32 text-right">Giá Vốn BQ Dự Kiến</th>
                        <th className="py-2.5 px-3 w-12 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => {
                        const lineTotal = it.quantity * it.cost_price;
                        const totalNewStock = it.current_stock + it.quantity;
                        const weightedCost =
                          totalNewStock > 0
                            ? Math.round(
                                (it.current_stock * it.current_cost + it.quantity * it.cost_price) /
                                  totalNewStock
                              )
                            : it.cost_price;

                        return (
                          <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                            {/* STT */}
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>

                            {/* Hàng hóa */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">{it.name}</span>
                                {it.is_new ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                                    SP Mới
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">
                                    Gộp Kho
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                SKU: {it.sku} {it.barcode ? `| Barcode: ${it.barcode}` : ''}
                              </div>
                              {it.selling_price > 0 && it.cost_price > it.selling_price && (
                                <div className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-bold mt-0.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Giá nhập ({formatCurrency(it.cost_price)}) cao hơn Giá bán ({formatCurrency(it.selling_price)})!</span>
                                </div>
                              )}
                            </td>

                            {/* ĐVT */}
                            <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                              {it.unit}
                            </td>

                            {/* Tồn hiện tại */}
                            <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                              {it.current_stock}
                            </td>

                            {/* SL Nhập */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQuantity(it.id, it.quantity - 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQuantity(
                                      it.id,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-14 text-center font-bold text-slate-900 border border-slate-300 rounded py-0.5 text-xs outline-none focus:border-emerald-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQuantity(it.id, it.quantity + 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Đơn giá nhập */}
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="500"
                                value={it.cost_price}
                                onChange={(e) =>
                                  handleUpdateItemCost(it.id, parseInt(e.target.value) || 0)
                                }
                                className="w-24 text-right font-bold text-slate-800 border border-slate-300 rounded py-0.5 px-1.5 text-xs outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* Thành tiền */}
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatCurrency(lineTotal)}
                            </td>

                            {/* Giá vốn BQGQ dự kiến */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="font-bold text-emerald-700">
                                {formatCurrency(weightedCost)}
                              </div>
                              <div className="text-[9px] text-slate-400">
                                Tổng tồn: {totalNewStock} {it.unit}
                              </div>
                            </td>

                            {/* Delete row */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 5. Summary & Total Financials */}
            {items.length > 0 && (
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex items-center gap-4">
                    <span>
                      Tổng số mặt hàng: <strong>{items.length} loại</strong>
                    </span>
                    <span>
                      Tổng số lượng: <strong>{totalQuantity} sản phẩm</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Giá vốn bình quân gia quyền sẽ tự động được ghi nhận chính xác cho từng mặt hàng.
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-600 font-medium">Tổng tiền nhập hàng:</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700">
                    {formatCurrency(totalAmount)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={items.length === 0}
                onClick={handleSaveVoucher}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all ${
                  items.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-emerald-500/20 active:scale-95'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>💾 Xác Nhận Lưu Phiếu & Nhập Kho</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT PREVIEW RECEIPT MODAL */}
      {isPreviewPrintOpen && savedVoucher && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-sm">Phiếu Nhập Kho Hoàn Tất</h3>
              </div>
              <button
                onClick={() => {
                  setIsPreviewPrintOpen(false);
                  onClose();
                }}
                className="p-1 rounded hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Slip Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono text-slate-800 print:p-0">
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-sm text-slate-900">
                  CỬA HÀNG ĐIỆN NƯỚC & KIM KHÍ NGÂN SƠN
                </div>
                <div className="text-[11px] text-slate-600">
                  Địa chỉ: 318 Vũ Quang, TP. Hà Tĩnh | SĐT: 0912.345.678
                </div>
                <div className="font-black text-base text-emerald-800 pt-2">PHIẾU NHẬP KHO HÀNG HÓA</div>
                <div className="text-[10px] text-slate-500">Mã phiếu: {savedVoucher.code}</div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Ngày nhập:</span>
                  <span className="font-bold">{savedVoucher.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nhà cung cấp:</span>
                  <span className="font-bold">{savedVoucher.supplier_name || 'Nhà cung cấp lẻ'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Người lập phiếu:</span>
                  <span className="font-bold">{savedVoucher.created_by || currentUser.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hình thức:</span>
                  <span className="font-bold">
                    {savedVoucher.payment_method === 'CASH'
                      ? 'Tiền mặt'
                      : savedVoucher.payment_method === 'TRANSFER'
                      ? 'Chuyển khoản'
                      : 'Ghi nợ NCC'}
                  </span>
                </div>
                {savedVoucher.note && (
                  <div className="flex justify-between">
                    <span>Ghi chú:</span>
                    <span>{savedVoucher.note}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
                <div className="font-bold grid grid-cols-12 text-[10px] text-slate-600">
                  <div className="col-span-6">Tên Hàng Hóa</div>
                  <div className="col-span-2 text-center">SL</div>
                  <div className="col-span-4 text-right">Đơn Giá (đ)</div>
                </div>
                {savedVoucher.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px]">
                    <div className="col-span-6 font-medium truncate">{it.name}</div>
                    <div className="col-span-2 text-center font-bold">
                      {it.quantity} {it.unit}
                    </div>
                    <div className="col-span-4 text-right font-bold">
                      {formatCurrency(it.cost_price)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between font-bold text-xs">
                  <span>Tổng số lượng:</span>
                  <span>{savedVoucher.total_quantity} SP</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-800">
                  <span>TỔNG TIỀN HÀNG:</span>
                  <span>{formatCurrency(savedVoucher.total_amount)}</span>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 text-center text-[10px] border-t border-slate-200">
                <div>
                  <div className="font-bold">Người Giao Hàng</div>
                  <div className="text-slate-400 mt-6">(Ký & ghi rõ họ tên)</div>
                </div>
                <div>
                  <div className="font-bold">Thủ Kho / Người Nhận</div>
                  <div className="text-slate-400 mt-6">(Ký & ghi rõ họ tên)</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Phiếu Nhập</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPreviewPrintOpen(false);
                  onClose();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
