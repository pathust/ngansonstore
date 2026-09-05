import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  CheckSquare,
  Search,
  Check,
  AlertCircle,
  Clock,
  Package,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react';
import { InventoryAudit, Product } from '../../types';
import { useApp } from '../../context/AppContext';

interface MobileInventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileInventoryAuditModal: React.FC<MobileInventoryAuditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    inventoryAudits,
    createInventoryAudit,
    balanceInventoryAudit,
    products,
    currentUser,
    showToast,
  } = useApp();

  const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [auditorName, setAuditorName] = useState(currentUser?.name || 'Admin');
  const [auditNotes, setAuditNotes] = useState('');
  const [auditItems, setAuditItems] = useState<
    Array<{
      product: Product;
      actualStock: number;
    }>
  >([]);
  const [productSearch, setProductSearch] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    // Pre-populate with first 10 products or empty
    const initial = products.slice(0, 8).map((p) => ({
      product: p,
      actualStock: p.stock,
    }));
    setAuditItems(initial);
    setAuditorName(currentUser?.name || 'Admin');
    setAuditNotes('');
    setIsCreateOpen(true);
  };

  const handleAddProductToAudit = (p: Product) => {
    if (auditItems.some((item) => item.product.id === p.id)) {
      showToast('Sản phẩm đã có trong phiếu kiểm kê!', 'warning');
      return;
    }
    setAuditItems((prev) => [{ product: p, actualStock: p.stock }, ...prev]);
    setProductSearch('');
  };

  const handleUpdateStock = (productId: string, actual: number) => {
    setAuditItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, actualStock: Math.max(0, actual) } : item
      )
    );
  };

  const handleSaveAudit = (shouldBalance: boolean = false) => {
    if (auditItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để kiểm kê!', 'warning');
      return;
    }

    const formattedItems = auditItems.map((item) => {
      const diff = item.actualStock - item.product.stock;
      return {
        product_id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        unit: item.product.unit || 'Cái',
        system_stock: item.product.stock,
        actual_stock: item.actualStock,
        diff: diff,
        diff_stock: diff,
        cost_price: item.product.cost_price,
        diff_value: diff * item.product.cost_price,
        reason: '' as const,
      };
    });

    createInventoryAudit(
      auditorName,
      formattedItems,
      auditNotes,
      shouldBalance ? 'BALANCED' : 'DRAFT'
    );
    setIsCreateOpen(false);
  };

  const searchResults = productSearch.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F6F8] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Sổ kho & Kiểm kê</span>
        </button>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo phiếu</span>
        </button>
      </div>

      {/* Audits History List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 pb-20">
        {inventoryAudits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <CheckSquare className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm font-medium">Chưa có phiếu kiểm kho nào</p>
            <button
              onClick={handleStartCreate}
              className="mt-2 px-4 py-2 bg-[#0066FF] text-white rounded-xl text-xs font-bold"
            >
              + Tạo phiếu kiểm kê đầu tiên
            </button>
          </div>
        ) : (
          inventoryAudits.map((a) => {
            const isBalanced = a.status === 'BALANCED';
            return (
              <div
                key={a.id}
                onClick={() => setSelectedAudit(a)}
                className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between active:scale-[0.99] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isBalanced
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}
                  >
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-sm text-slate-900 leading-snug">
                      {a.code}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{a.date}</span>
                      <span>•</span>
                      <span>{a.items?.length || 0} sản phẩm</span>
                    </div>
                    {a.notes && (
                      <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {a.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isBalanced
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isBalanced ? 'Đã cân bằng' : 'Phiếu tạm'}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 block mt-1">
                    Lệch: {a.total_diff_items || 0} SP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleStartCreate}
        className="fixed bottom-6 right-5 w-14 h-14 bg-[#0066FF] text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40 border-2 border-white"
        title="Tạo phiếu kiểm kê"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Create Audit Form Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-60 bg-[#F5F6F8] flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Kiểm kê kho mới</span>
            </button>

            <button
              onClick={() => handleSaveAudit(false)}
              className="flex items-center gap-1 bg-white text-[#0066FF] px-3 py-1.5 rounded-lg text-xs font-black shadow-xs active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Lưu tạm</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 pb-24">
            {/* Meta Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Người kiểm kê
                  </label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Kiểm kho định kỳ..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              </div>
            </div>

            {/* Product Add Bar */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Gõ tên hoặc mã SP để thêm vào kiểm kê..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              {/* Suggestions dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-3 right-3 top-12 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-20">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProductToAudit(p)}
                      className="p-2.5 border-b border-slate-100 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-slate-900">{p.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {p.sku} • Tồn máy: {p.stock} {p.unit}
                        </span>
                      </div>
                      <Plus className="w-4 h-4 text-[#0066FF]" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items Counting Table */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-xs text-slate-800">
                  Danh sách sản phẩm đếm ({auditItems.length})
                </span>
                <span className="text-[11px] text-slate-400">Thực tế / Sổ sách</span>
              </div>

              {auditItems.map((item) => {
                const diff = item.actualStock - item.product.stock;
                return (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none"
                  >
                    <div className="flex flex-col flex-1 pr-2">
                      <span className="font-extrabold text-xs text-slate-900 line-clamp-1">
                        {item.product.name}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Tồn sổ: {item.product.stock}</span>
                        <span>•</span>
                        <span
                          className={`font-bold ${
                            diff === 0
                              ? 'text-slate-400'
                              : diff > 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          Lệch: {diff > 0 ? `+${diff}` : diff} {item.product.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min="0"
                        value={item.actualStock}
                        onChange={(e) =>
                          handleUpdateStock(item.product.id, parseInt(e.target.value) || 0)
                        }
                        className="w-16 px-2 py-1.5 text-center font-black text-sm bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0066FF]"
                      />
                      <span className="text-xs text-slate-500 font-semibold w-7">
                        {item.product.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action */}
          <div className="h-16 bg-white border-t border-slate-200/90 px-4 flex items-center justify-between gap-3 fixed bottom-0 inset-x-0 z-40 shadow-sm">
            <button
              onClick={() => handleSaveAudit(false)}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold active:scale-98 transition-transform"
            >
              Lưu Phiếu Tạm
            </button>
            <button
              onClick={() => handleSaveAudit(true)}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-98 transition-transform shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Cân Bằng Kho Ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Audit Detail & Balance Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-60 bg-[#F5F6F8] flex flex-col animate-in slide-in-from-bottom duration-200">
          <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
            <button
              onClick={() => setSelectedAudit(null)}
              className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Chi tiết phiếu: {selectedAudit.code}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-24">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Mã phiếu</span>
                <span className="font-extrabold text-xs text-slate-900">{selectedAudit.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Ngày kiểm</span>
                <span className="font-bold text-xs text-slate-800">{selectedAudit.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Người kiểm</span>
                <span className="font-bold text-xs text-slate-800">{selectedAudit.auditor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Trạng thái</span>
                <span
                  className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                    selectedAudit.status === 'BALANCED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedAudit.status === 'BALANCED' ? 'Đã cân bằng kho' : 'Phiếu tạm (chưa cân bằng)'}
                </span>
              </div>
            </div>

            {/* Items list */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
              <h4 className="font-extrabold text-xs text-slate-900 border-b border-slate-100 pb-2">
                Hàng hoá kiểm đếm ({selectedAudit.items?.length || 0})
              </h4>

              {selectedAudit.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-slate-900">{item.name}</span>
                    <span className="text-[10px] text-slate-400">
                      Sổ sách: {item.system_stock} | Thực tế: {item.actual_stock}
                    </span>
                  </div>

                  <span
                    className={`font-black text-xs ${
                      item.diff_stock === 0
                        ? 'text-slate-400'
                        : item.diff_stock > 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {item.diff_stock > 0 ? `+${item.diff_stock}` : item.diff_stock}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Balance Action */}
          {selectedAudit.status !== 'BALANCED' && (
            <div className="h-16 bg-white border-t border-slate-200/90 px-4 flex items-center justify-center fixed bottom-0 inset-x-0 z-40 shadow-sm">
              <button
                onClick={() => {
                  balanceInventoryAudit(selectedAudit.id);
                  setSelectedAudit((prev) => (prev ? { ...prev, status: 'BALANCED' } : null));
                }}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Cân bằng kho (Cập nhật tồn thực tế vào sổ)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
