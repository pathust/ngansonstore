import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownToLine,
  Plus,
  Truck,
  CheckCircle2,
  Package,
  CreditCard,
  Building2,
  Boxes,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface PurchaseOrder {
  id: string;
  code: string;
  supplierName: string;
  items: { name: string; quantity: number; costPrice: number }[];
  totalAmount: number;
  paidAmount: number;
  status: 'COMPLETED' | 'DRAFT';
  createdAt: number;
}

interface MobilePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'nganson_purchase_orders';

export const MobilePurchaseOrderModal: React.FC<MobilePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { suppliers, products, updateProduct, updateSupplier, addCashbookEntry, showToast } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [importQty, setImportQty] = useState(10);
  const [importCost, setImportCost] = useState(100000);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
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

  const handleCreatePurchase = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Vui lòng chọn Nhà cung cấp!', 'warning');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
    if (!selectedProductId) {
      showToast('Vui lòng chọn Sản phẩm cần nhập!', 'warning');
      return;
    }
    if (importQty <= 0) {
      showToast('Số lượng nhập phải lớn hơn 0!', 'warning');
      return;
    }

    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    const prod = products.find((p) => p.id === selectedProductId);
    if (!sup || !prod) return;

    const totalAmount = importQty * importCost;
    const newCode = `PN${Date.now().toString().slice(-6)}`;

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      code: newCode,
      supplierName: sup.name,
      items: [{ name: prod.name, quantity: importQty, costPrice: importCost }],
      totalAmount,
      paidAmount,
      status: 'COMPLETED',
      createdAt: Date.now(),
    };

    // 1. Calculate weighted average cost & update product stock
    const currentStock = Math.max(0, prod.stock);
    const currentCost = prod.cost_price || 0;
    const totalValue = currentStock * currentCost + importQty * importCost;
    const newTotalStock = currentStock + importQty;
    const newWeightedCost = newTotalStock > 0 ? Math.round(totalValue / newTotalStock) : importCost;

    updateProduct(prod.id, {
      stock: newTotalStock,
      cost_price: newWeightedCost,
      last_received_date: new Date().toISOString().slice(0, 10),
    });

    // 2. Update supplier debt if not fully paid
    const remainingDebt = totalAmount - paidAmount;
    updateSupplier(sup.id, {
      total_purchased: (sup.total_purchased || 0) + totalAmount,
      debt: (sup.debt || 0) + Math.max(0, remainingDebt),
    });

    // 3. Add cash payment entry if paidAmount > 0
    if (paidAmount > 0) {
      addCashbookEntry({
        type: 'OUT',
        category: 'Chi tiền trả hàng nhập NCC',
        amount: paidAmount,
        note: `Thanh toán phiếu nhập ${newCode} (${prod.name} x${importQty}) - NCC: ${sup.name}`,
        ref_code: newCode,
      });
    }

    const updatedOrders = [newPO, ...purchaseOrders];
    setPurchaseOrders(updatedOrders);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));

    showToast(`Đã hoàn tất phiếu nhập hàng ${newCode}! Tồn kho đã tăng thêm +${importQty} ${prod.unit}.`, 'success');
    setIsCreating(false);
    setSelectedSupplierId('');
    setSelectedProductId('');
    setImportQty(10);
    setPaidAmount(0);

    } catch (error) {
      showToast?.('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePO = (id: string, code: string) => {
    const updated = purchaseOrders.filter((po) => po.id !== id);
    setPurchaseOrders(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    showToast(`Đã xóa phiếu nhập ${code}`, 'info');
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
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isCreating ? 'Lập phiếu nhập hàng mới' : 'Nhập hàng từ Nhà cung cấp'}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {isCreating ? 'Cập nhật kho và công nợ NCC' : `${purchaseOrders.length} đơn nhập`}
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
            <form onSubmit={handleCreatePurchase} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nhà cung cấp</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Nợ hiện tại: {formatCurrency(s.debt)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mặt hàng nhập kho</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setImportCost(prod.cost_price || 0);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Tồn hiện tại: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Số lượng nhập</label>
                  <input
                    type="number"
                    value={importQty}
                    onChange={(e) => setImportQty(Number(e.target.value))}
                    min={1}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Giá nhập (VNĐ)</label>
                  <input
                    type="number"
                    value={importCost}
                    onChange={(e) => setImportCost(Number(e.target.value))}
                    step={1000}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Tổng tiền hàng nhập:</span>
                <span className="font-black text-[#0066FF] text-sm">
                  {formatCurrency(importQty * importCost)}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tiền mặt trả ngay cho NCC (VNĐ)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-emerald-600"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Còn lại {formatCurrency(Math.max(0, importQty * importCost - paidAmount))} sẽ tự động ghi nợ vào NCC.
                </span>
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
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md active:scale-98"
                >
                  Hoàn tất nhập kho
                </button>
              </div>
            </form>
          ) : purchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                <Boxes className="w-8 h-8 text-teal-600" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 mb-1">Chưa có phiếu nhập hàng nào</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-5">
                Các phiếu nhập hàng từ Nhà cung cấp sẽ hiển thị tại đây sau khi bạn tạo mới.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-md active:scale-98 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tạo phiếu nhập hàng</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-teal-700">{po.code}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDateTime(po.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePO(po.id, po.code);
                        }}
                        className="p-2 -mr-1.5 text-slate-400 hover:text-rose-600 active:scale-90 transition-all cursor-pointer"
                        title="Xóa phiếu nhập"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <span className="font-bold text-sm text-slate-900">{po.supplierName}</span>

                  <div className="bg-slate-50 p-2 rounded-xl text-xs text-slate-700 flex flex-col gap-1">
                    {po.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.name} x{it.quantity}</span>
                        <span className="font-bold">{formatCurrency(it.quantity * it.costPrice)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Tổng tiền:</span>
                      <span className="font-black text-slate-900">{formatCurrency(po.totalAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[11px]">Đã thanh toán:</span>
                      <span className="font-black text-emerald-600">{formatCurrency(po.paidAmount)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isCreating && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo phiếu nhập hàng</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
