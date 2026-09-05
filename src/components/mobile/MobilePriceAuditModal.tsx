import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatNumber, exportToExcel } from '../../utils/formatters';
import {
  detectPriceAnomaly,
  PriceAnomalyType,
  PriceAnomalyInfo,
} from '../products/PriceAuditModal';
import {
  AlertTriangle,
  X,
  Check,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Save,
  Search,
  ShieldCheck,
  ChevronLeft,
  Filter,
  Sparkles,
  Percent,
  RefreshCw,
  Package,
} from 'lucide-react';

interface MobilePriceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
}

export const MobilePriceAuditModal: React.FC<MobilePriceAuditModalProps> = ({
  isOpen,
  onClose,
  products,
  onUpdateProduct,
}) => {
  const {
    confirmProductPriceAudit,
    unconfirmProductPriceAudit,
    confirmAllProductPriceAudits,
    isPriceAuditConfirmed,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<PriceAnomalyType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'UNCONFIRMED' | 'CONFIRMED' | 'ALL'>('UNCONFIRMED');
  const [search, setSearch] = useState<string>('');
  const [editingPrices, setEditingPrices] = useState<Record<string, { cost: number; sell: number }>>({});
  const [savedSuccessIds, setSavedSuccessIds] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Scan & detect anomalies with confirmation state
  const anomalies = useMemo(() => {
    const list: { product: Product; anomaly: PriceAnomalyInfo; isConfirmed: boolean }[] = [];
    products.forEach((p) => {
      const a = detectPriceAnomaly(p);
      if (a) {
        const isConfirmed = isPriceAuditConfirmed(p);
        list.push({ product: p, anomaly: a, isConfirmed });
      }
    });
    return list;
  }, [products, isPriceAuditConfirmed]);

  // Counters
  const totalUnconfirmed = useMemo(() => anomalies.filter((a) => !a.isConfirmed).length, [anomalies]);
  const totalConfirmed = useMemo(() => anomalies.filter((a) => a.isConfirmed).length, [anomalies]);

  const lossCount = useMemo(
    () => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'LOSS').length,
    [anomalies]
  );
  const highMarginCount = useMemo(
    () => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'HIGH_MARGIN').length,
    [anomalies]
  );
  const invertedHighCount = useMemo(
    () => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'INVERTED_HIGH').length,
    [anomalies]
  );
  const zeroCostCount = useMemo(
    () => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'ZERO_COST').length,
    [anomalies]
  );

  // Filtered list
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return anomalies.filter(({ product, anomaly, isConfirmed }) => {
      if (statusFilter === 'UNCONFIRMED' && isConfirmed) return false;
      if (statusFilter === 'CONFIRMED' && !isConfirmed) return false;

      const matchTab = activeTab === 'ALL' || anomaly.type === activeTab;
      const matchSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.barcode.includes(q);
      return matchTab && matchSearch;
    });
  }, [anomalies, activeTab, statusFilter, search]);

  const unconfirmedInView = useMemo(
    () => filteredList.filter((item) => !item.isConfirmed).map((item) => item.product.id),
    [filteredList]
  );

  const handleConfirmAllInView = () => {
    if (unconfirmedInView.length === 0) return;
    confirmAllProductPriceAudits(unconfirmedInView);
    showToast(`Đã duyệt OK ${unconfirmedInView.length} sản phẩm thành công!`, 'success');
  };

  const handlePriceChange = (id: string, field: 'cost' | 'sell', val: number) => {
    setEditingPrices((prev) => {
      const current = prev[id] || {
        cost: products.find((p) => p.id === id)?.cost_price || 0,
        sell: products.find((p) => p.id === id)?.selling_price || 0,
      };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: Math.max(0, val),
        },
      };
    });
  };

  // Quick preset margin calculation helper (+15%, +20%, +25%, +30%)
  const applyPresetMargin = (id: string, percentage: number) => {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;
    const currentCost = editingPrices[id]?.cost ?? p.cost_price;
    if (currentCost <= 0) {
      showToast('Cần có giá vốn trước khi tính tỷ lệ lãi!', 'warning');
      return;
    }
    const targetSell = Math.round((currentCost * (1 + percentage / 100)) / 1000) * 1000;
    handlePriceChange(id, 'sell', targetSell);
  };

  const handleSaveItem = (id: string) => {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;
    const edits = editingPrices[id];
    if (!edits) return;

    onUpdateProduct(id, {
      cost_price: edits.cost,
      selling_price: edits.sell,
    });

    setSavedSuccessIds((prev) => ({ ...prev, [id]: true }));
    showToast(`Đã cập nhật giá mới cho ${p.name}!`, 'success');
    setTimeout(() => {
      setSavedSuccessIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 2000);
  };

  const handleExportExcel = () => {
    const data = anomalies.map(({ product, anomaly, isConfirmed }, idx) => ({
      'STT': idx + 1,
      'Mã SKU': product.sku,
      'Tên Sản Phẩm': product.name,
      'Đơn Vị Tính': product.unit,
      'Giá Vốn Hiện Tại (đ)': product.cost_price,
      'Giá Bán Lẻ Hiện Tại (đ)': product.selling_price,
      'Chênh Lệch (đ)': product.selling_price - product.cost_price,
      'Tỷ Lệ Bán/Vốn': product.cost_price > 0 ? (product.selling_price / product.cost_price).toFixed(2) : 'N/A',
      'Loại Bất Thường': anomaly.label,
      'Chi Tiết Đánh Giá': anomaly.description,
      'Trạng Thái Duyệt': isConfirmed ? 'Đã xác nhận OK' : 'Cần xử lý',
      'Tồn Kho': product.stock,
    }));

    exportToExcel(data, `Audit_Bang_Gia_Mobile_${new Date().toISOString().slice(0, 10)}`, 'AuditGia');
    showToast('Đã xuất file Excel kiểm tra bảng giá!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F1F5F9] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Mobile Top Navigation Header */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-3 py-2.5 flex items-center justify-between shrink-0 shadow-md">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 font-bold text-sm text-white/95 active:scale-95 transition-transform py-1 px-1.5 -ml-1 rounded-lg hover:bg-white/10"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          <span>Audit Bảng Giá</span>
        </button>

        <div className="flex items-center gap-2">
          {totalUnconfirmed > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-black tracking-wider animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-200" />
              <span>{totalUnconfirmed} Cần xử lý</span>
            </span>
          )}

          <button
            onClick={handleExportExcel}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-colors"
            title="Xuất file Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Status Selector & Filter Bar (Segmented Pills) */}
      <div className="bg-white px-3 pt-2.5 pb-2 border-b border-slate-200/80 shadow-2xs shrink-0 flex flex-col gap-2.5">
        {/* Status Segmented Control */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('UNCONFIRMED')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 active:scale-98 ${
              statusFilter === 'UNCONFIRMED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚠️ Cần xử lý</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                statusFilter === 'UNCONFIRMED' ? 'bg-white/30 text-white' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {totalUnconfirmed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('CONFIRMED')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 active:scale-98 ${
              statusFilter === 'CONFIRMED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✅ Đã duyệt</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                statusFilter === 'CONFIRMED' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {totalConfirmed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 active:scale-98 ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                statusFilter === 'ALL' ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {anomalies.length}
            </span>
          </button>
        </div>

        {/* Horizontal Category Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({anomalies.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOSS')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
              activeTab === 'LOSS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Bán &lt; Vốn</span>
            <span className="text-[10px] font-black opacity-80">({lossCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HIGH_MARGIN')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
              activeTab === 'HIGH_MARGIN'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Bán &gt; 3x Vốn</span>
            <span className="text-[10px] font-black opacity-80">({highMarginCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVERTED_HIGH')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
              activeTab === 'INVERTED_HIGH'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Vốn &gt; 3x Bán</span>
            <span className="text-[10px] font-black opacity-80">({invertedHighCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ZERO_COST')}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 active:scale-95 ${
              activeTab === 'ZERO_COST'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Thiếu vốn (0đ)</span>
            <span className="text-[10px] font-black opacity-80">({zeroCostCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên sản phẩm, mã SKU, barcode..."
            className="w-full pl-9 pr-8 py-2 bg-slate-100 text-xs text-slate-800 font-medium rounded-xl outline-none border border-transparent focus:border-[#0066FF] focus:bg-white transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Product List (Card-based Layout) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-24">
        {filteredList.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9 stroke-[2]" />
            </div>
            <h4 className="font-extrabold text-slate-800 text-base">Bảng giá hoàn toàn hợp lý!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {statusFilter === 'UNCONFIRMED'
                ? 'Không còn sản phẩm nào cần xử lý trong mục này. Mọi biến động giá đã được kiểm duyệt an toàn.'
                : 'Không tìm thấy sản phẩm nào khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại.'}
            </p>
            {statusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="mt-3 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold active:scale-95"
              >
                Xem tất cả ({anomalies.length} SP)
              </button>
            )}
          </div>
        ) : (
          filteredList.map(({ product, anomaly, isConfirmed }) => {
            const edits = editingPrices[product.id] || {
              cost: product.cost_price,
              sell: product.selling_price,
            };
            const isEdited =
              edits.cost !== product.cost_price || edits.sell !== product.selling_price;
            const isSuccess = savedSuccessIds[product.id];
            const isExpanded = expandedId === product.id;

            // Compute dynamic profit & margin for current edited prices
            const currentCost = edits.cost;
            const currentSell = edits.sell;
            const profit = currentSell - currentCost;
            const marginPercent =
              currentCost > 0 ? Math.round((profit / currentCost) * 100) : 0;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  isConfirmed
                    ? 'border-emerald-200/80 bg-emerald-50/20'
                    : anomaly.type === 'LOSS'
                    ? 'border-rose-200/90 shadow-rose-100/50'
                    : anomaly.type === 'INVERTED_HIGH'
                    ? 'border-purple-200/90'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Card Top: Product Info & Badges */}
                <div className="p-3.5 pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.sku}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          ĐVT: {product.unit || 'Cái'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          Tồn: <b className="text-slate-800">{product.stock}</b>
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    {isConfirmed ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Đã duyệt OK</span>
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${anomaly.badgeColor}`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>{anomaly.label}</span>
                      </span>
                    )}
                  </div>

                  {/* Anomaly Description Banner */}
                  <div
                    className={`mt-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                      isConfirmed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                        : anomaly.type === 'LOSS'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        : anomaly.type === 'HIGH_MARGIN'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                        : anomaly.type === 'INVERTED_HIGH'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200/60'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isConfirmed ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="leading-tight">
                      {isConfirmed
                        ? 'Bảng giá này đã được duyệt và xác nhận bán bình thường.'
                        : anomaly.description}
                    </span>
                  </div>
                </div>

                {/* Price Edit Section */}
                <div className="px-3.5 py-2.5 bg-slate-50/70 border-t border-b border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Cost Price */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1">
                        <span>Giá vốn (VNĐ)</span>
                        {edits.cost !== product.cost_price && (
                          <span className="text-[9px] text-slate-400 line-through">
                            {formatNumber(product.cost_price)}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1000"
                          value={edits.cost === 0 ? '' : edits.cost}
                          onChange={(e) =>
                            handlePriceChange(
                              product.id,
                              'cost',
                              parseInt(e.target.value.replace(/\D/g, '')) || 0
                            )
                          }
                          placeholder="0"
                          className="w-full font-mono font-black text-sm text-slate-900 py-1 px-1.5 rounded-lg bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0066FF] outline-none"
                        />
                        <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">
                          đ
                        </span>
                      </div>
                    </div>

                    {/* Selling Price */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1">
                        <span>Giá bán lẻ (VNĐ)</span>
                        {edits.sell !== product.selling_price && (
                          <span className="text-[9px] text-slate-400 line-through">
                            {formatNumber(product.selling_price)}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1000"
                          value={edits.sell === 0 ? '' : edits.sell}
                          onChange={(e) =>
                            handlePriceChange(
                              product.id,
                              'sell',
                              parseInt(e.target.value.replace(/\D/g, '')) || 0
                            )
                          }
                          placeholder="0"
                          className="w-full font-mono font-black text-sm text-blue-700 py-1 px-1.5 rounded-lg bg-blue-50/40 focus:bg-white border border-blue-200 focus:border-[#0066FF] outline-none"
                        />
                        <span className="absolute right-2 text-xs font-bold text-blue-500 pointer-events-none">
                          đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Realtime Profit & Margin Indicator */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-slate-500 text-[11px]">Chênh lệch:</span>
                      {profit >= 0 ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+{formatCurrency(profit)}</span>
                          {currentCost > 0 && <span>(+{marginPercent}%)</span>}
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-0.5">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Lỗ {formatCurrency(Math.abs(profit))}</span>
                          {currentCost > 0 && <span>({marginPercent}%)</span>}
                        </span>
                      )}
                    </div>

                    {/* Button to toggle preset margin chips */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : product.id)}
                      className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline active:scale-95"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isExpanded ? 'Ẩn gợi ý lãi' : 'Gợi ý giá bán'}</span>
                    </button>
                  </div>

                  {/* Preset Margin Chips (Accordion) */}
                  {isExpanded && (
                    <div className="pt-1.5 pb-0.5 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">Đặt giá bán =</span>
                      {[15, 20, 25, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => applyPresetMargin(product.id, pct)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-md text-[10px] border border-blue-200 shrink-0 active:scale-95 transition-all"
                        >
                          Vốn +{pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-white flex items-center justify-between gap-2">
                  {/* Left: Duyệt OK or Đã duyệt */}
                  {isConfirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        unconfirmProductPriceAudit(product.id);
                        showToast(`Đã bỏ duyệt cho ${product.name}`, 'info');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Đã duyệt (Chạm để bỏ)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        confirmProductPriceAudit(product.id);
                        showToast(`Đã xác nhận bảng giá cho ${product.name}`, 'success');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Duyệt OK</span>
                    </button>
                  )}

                  {/* Right: Save Modified Prices */}
                  <button
                    type="button"
                    disabled={!isEdited}
                    onClick={() => handleSaveItem(product.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      isSuccess
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isEdited
                        ? 'bg-[#0066FF] hover:bg-blue-700 text-white shadow-xs active:scale-95 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Đã lưu giá!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{isEdited ? 'Lưu giá mới' : 'Chưa đổi giá'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Sticky Bottom Action Bar */}
      <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2.5 shrink-0 shadow-lg flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Hiển thị {filteredList.length} / {anomalies.length} SP
          </span>
          <span className="text-xs font-black text-slate-800">
            {unconfirmedInView.length > 0 ? (
              <span className="text-rose-600">{unconfirmedInView.length} SP cần duyệt</span>
            ) : (
              <span className="text-emerald-600">Đã duyệt toàn bộ trong danh sách</span>
            )}
          </span>
        </div>

        {unconfirmedInView.length > 0 ? (
          <button
            type="button"
            onClick={handleConfirmAllInView}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Duyệt OK tất cả ({unconfirmedInView.length})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            <span>Xong & Đóng</span>
          </button>
        )}
      </div>
    </div>
  );
};
