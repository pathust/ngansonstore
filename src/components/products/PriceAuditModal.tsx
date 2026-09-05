import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/formatters';
import { MobilePriceAuditModal } from '../mobile/MobilePriceAuditModal';
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
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export type PriceAnomalyType = 'ALL' | 'LOSS' | 'HIGH_MARGIN' | 'INVERTED_HIGH' | 'ZERO_COST';

export interface PriceAnomalyInfo {
  type: 'LOSS' | 'HIGH_MARGIN' | 'INVERTED_HIGH' | 'ZERO_COST';
  label: string;
  badgeColor: string;
  ratio?: number;
  diff?: number;
  description: string;
}

export function detectPriceAnomaly(p: Product): PriceAnomalyInfo | null {
  const cost = Number(p.cost_price || 0);
  const sell = Number(p.selling_price || 0);

  if (cost > 0 && sell > 0) {
    if (cost > sell * 3) {
      const ratio = Number((cost / sell).toFixed(1));
      return {
        type: 'INVERTED_HIGH',
        label: 'Vốn gấp > 3 lần Giá bán',
        badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
        ratio,
        diff: cost - sell,
        description: `Giá vốn gấp ${ratio}x giá bán (Nghi ngờ nhập giá theo thùng/hộp)`,
      };
    }
    if (sell < cost) {
      const ratio = cost > 0 ? Number((cost / sell).toFixed(1)) : 1;
      return {
        type: 'LOSS',
        label: 'Bán dưới giá vốn',
        badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
        ratio,
        diff: cost - sell,
        description: `Bán lỗ ${formatCurrency(cost - sell)} (-${Math.round(((cost - sell) / cost) * 100)}%)`,
      };
    }
    if (sell > cost * 3) {
      const ratio = Number((sell / cost).toFixed(1));
      return {
        type: 'HIGH_MARGIN',
        label: 'Giá bán gấp > 3 lần Vốn',
        badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
        ratio,
        diff: sell - cost,
        description: `Giá bán gấp ${ratio}x giá vốn (Lãi gộp ${Math.round(((sell - cost) / cost) * 100)}%)`,
      };
    }
  } else if (cost <= 0 && sell > 0) {
    return {
      type: 'ZERO_COST',
      label: 'Chưa có giá vốn (0 đ)',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'Chưa cập nhật giá vốn đầu vào',
    };
  }

  return null;
}

interface PriceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onSelectProductInTable?: (p: Product) => void;
}

export const PriceAuditModal: React.FC<PriceAuditModalProps> = ({
  isOpen,
  onClose,
  products,
  onUpdateProduct,
  onSelectProductInTable,
}) => {
  const {
    confirmProductPriceAudit,
    unconfirmProductPriceAudit,
    confirmAllProductPriceAudits,
    isPriceAuditConfirmed,
  } = useApp();

  const [activeTab, setActiveTab] = useState<PriceAnomalyType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'UNCONFIRMED' | 'CONFIRMED' | 'ALL'>('UNCONFIRMED');
  const [search, setSearch] = useState<string>('');
  const [editingPrices, setEditingPrices] = useState<Record<string, { cost: number; sell: number }>>({});
  const [savedSuccessIds, setSavedSuccessIds] = useState<Record<string, boolean>>({});

  // Analyze all products with confirmation status
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

  const totalUnconfirmed = useMemo(() => anomalies.filter((a) => !a.isConfirmed).length, [anomalies]);
  const totalConfirmed = useMemo(() => anomalies.filter((a) => a.isConfirmed).length, [anomalies]);

  const lossCount = useMemo(() => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'LOSS').length, [anomalies]);
  const highMarginCount = useMemo(() => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'HIGH_MARGIN').length, [anomalies]);
  const invertedHighCount = useMemo(() => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'INVERTED_HIGH').length, [anomalies]);
  const zeroCostCount = useMemo(() => anomalies.filter((a) => !a.isConfirmed && a.anomaly.type === 'ZERO_COST').length, [anomalies]);

  // Filtered by tab, status and search
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

    exportToExcel(data, `Audit_Bang_Gia_Bat_Thuong_${new Date().toISOString().slice(0, 10)}`, 'AuditGia');
  };

  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  if (isMobileViewport) {
    return (
      <MobilePriceAuditModal
        isOpen={isOpen}
        onClose={onClose}
        products={products}
        onUpdateProduct={onUpdateProduct}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">
                  Audit Kiểm Tra Bảng Giá Bất Thường
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider">
                  {anomalies.length} Sản phẩm
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Tự động quét sản phẩm bán dưới giá gốc (bán lỗ) hoặc chênh lệch bất thường &gt; 3 lần
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('LOSS')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'LOSS'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
                : 'bg-white border-slate-200 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-rose-700 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Bán dưới giá gốc
              </span>
            </div>
            <div className="text-xl font-black text-rose-600">{lossCount} sp</div>
            <div className="text-[10px] text-rose-500 font-medium mt-0.5">Bán &lt; Vốn (Nguy cơ lỗ)</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HIGH_MARGIN')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'HIGH_MARGIN'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                : 'bg-white border-slate-200 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-amber-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Bán gấp &gt; 3x Vốn
              </span>
            </div>
            <div className="text-xl font-black text-amber-600">{highMarginCount} sp</div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">Chênh lệch bán quá cao</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVERTED_HIGH')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'INVERTED_HIGH'
                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400'
                : 'bg-white border-slate-200 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-purple-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Vốn gấp &gt; 3x Bán
              </span>
            </div>
            <div className="text-xl font-black text-purple-600">{invertedHighCount} sp</div>
            <div className="text-[10px] text-purple-500 font-medium mt-0.5">Vốn quá cao so với bán</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ZERO_COST')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'ZERO_COST'
                ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-bold text-slate-700">Chưa có giá vốn</span>
            </div>
            <div className="text-xl font-black text-slate-700">{zeroCostCount} sp</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Giá vốn = 0 đ</div>
          </button>
        </div>

        {/* Status Selector & Bulk Action Bar */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('UNCONFIRMED')}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === 'UNCONFIRMED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                ⚠️ Cần xử lý ({totalUnconfirmed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === 'CONFIRMED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                ✅ Đã duyệt OK ({totalConfirmed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Tất cả ({anomalies.length})
              </button>
            </div>
          </div>

          {unconfirmedInView.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmAllInView}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
              title="Xác nhận tất cả sản phẩm đang hiển thị trong danh sách này là OK"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Duyệt OK tất cả ({unconfirmedInView.length} SP)</span>
            </button>
          )}
        </div>

        {/* Toolbar Filter & Search */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả loại ({anomalies.length})
            </button>
            <button
              onClick={() => setActiveTab('LOSS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'LOSS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Bán &lt; Vốn ({lossCount})
            </button>
            <button
              onClick={() => setActiveTab('HIGH_MARGIN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'HIGH_MARGIN'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Bán &gt; 3x Vốn ({highMarginCount})
            </button>
            <button
              onClick={() => setActiveTab('INVERTED_HIGH')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'INVERTED_HIGH'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              Vốn &gt; 3x Bán ({invertedHighCount})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm SKU, tên sản phẩm..."
                className="w-full pl-8 pr-3 py-1 bg-slate-50 text-xs border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#0B63E5]"
              />
            </div>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="Xuất file Excel danh sách giá bất thường"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Anomaly Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
              <div className="font-bold text-sm text-slate-800">Không có sản phẩm nào thuộc nhóm này!</div>
              <div className="text-xs text-slate-500 mt-1">
                Bảng giá sản phẩm đã được kiểm tra, không phát hiện sự chênh lệch bất thường nào.
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[10px] text-slate-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Sản phẩm &amp; Mã SKU</th>
                    <th className="py-2.5 px-2.5 text-center">ĐVT</th>
                    <th className="py-2.5 px-3 text-right">Giá vốn (VNĐ)</th>
                    <th className="py-2.5 px-3 text-right">Giá bán lẻ (VNĐ)</th>
                    <th className="py-2.5 px-3">Đánh giá Audit</th>
                    <th className="py-2.5 px-3 text-center">Xác nhận &amp; Lưu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map(({ product, anomaly, isConfirmed }) => {
                    const edits = editingPrices[product.id] || {
                      cost: product.cost_price,
                      sell: product.selling_price,
                    };
                    const isEdited =
                      edits.cost !== product.cost_price || edits.sell !== product.selling_price;
                    const isSuccess = savedSuccessIds[product.id];

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isConfirmed ? 'bg-slate-50/40' : anomaly.type === 'LOSS' ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        {/* Product Info */}
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-bold text-slate-900 leading-snug">{product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1 py-0.2 rounded">
                              {product.sku}
                            </span>
                            <span>• Tồn: {product.stock} {product.unit}</span>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="py-3 px-2.5 text-center text-slate-600 font-medium">
                          {product.unit}
                        </td>

                        {/* Cost Price Edit Input */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={edits.cost}
                              onChange={(e) =>
                                handlePriceChange(product.id, 'cost', parseInt(e.target.value) || 0)
                              }
                              className="w-24 text-right font-mono font-bold text-xs py-1 px-1.5 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none"
                            />
                            <span className="text-[10px] text-slate-400">đ</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Gốc: {formatCurrency(product.cost_price)}
                          </div>
                        </td>

                        {/* Selling Price Edit Input */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={edits.sell}
                              onChange={(e) =>
                                handlePriceChange(product.id, 'sell', parseInt(e.target.value) || 0)
                              }
                              className="w-24 text-right font-mono font-bold text-xs py-1 px-1.5 border border-slate-300 rounded bg-white focus:border-blue-500 outline-none"
                            />
                            <span className="text-[10px] text-slate-400">đ</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Gốc: {formatCurrency(product.selling_price)}
                          </div>
                        </td>

                        {/* Anomaly Badge */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                Đã duyệt OK
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${anomaly.badgeColor}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {anomaly.label}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">{anomaly.description}</div>
                        </td>

                        {/* Actions: Confirm / Unconfirm + Inline Save & Link */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {isConfirmed ? (
                              <button
                                type="button"
                                onClick={() => unconfirmProductPriceAudit(product.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
                                title="Giá này đã được duyệt OK. Nhấn để bỏ duyệt / kích hoạt lại cảnh báo."
                              >
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Đã duyệt</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => confirmProductPriceAudit(product.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all shadow-2xs cursor-pointer"
                                title="Xác nhận giá này là hợp lý, bỏ qua cảnh báo"
                              >
                                <Check className="w-3 h-3" />
                                <span>Duyệt OK</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={!isEdited}
                              onClick={() => handleSaveItem(product.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all shadow-2xs ${
                                isSuccess
                                  ? 'bg-emerald-600 text-white'
                                  : isEdited
                                  ? 'bg-[#0B63E5] hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                              title={isEdited ? 'Lưu cập nhật giá ngay' : 'Chưa có thay đổi'}
                            >
                              {isSuccess ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                  <span>Đã lưu!</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3" />
                                  <span>Lưu giá</span>
                                </>
                              )}
                            </button>

                            {onSelectProductInTable && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectProductInTable(product);
                                  onClose();
                                }}
                                className="p-1 text-slate-400 hover:text-[#0B63E5] hover:bg-slate-100 rounded"
                                title="Mở sản phẩm trong bảng chính"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>
              Mẹo: Kiểm tra đơn vị tính (hộp, cuộn, mét, chiếc) để tránh nhầm lẫn giữa giá nhập sỉ và giá bán lẻ.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
