import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { useDebounce } from '../../utils/useDebounce';
import { useUiShell } from '../../context/slices/UiShellContext';
import { Pagination } from '../common/Pagination';
import { StockInVoucherModal } from './StockInVoucherModal';
import {
  formatCurrency,
  exportToExcel,
  downloadProductTemplate,
  parseExcelFile,
  parseCleanNumber,
  cleanTextForMatch,
  findHeaderValue,
} from '../../utils/formatters';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Calculator,
  X,
  Sparkles,
  FileSpreadsheet,
  Mic,
  Boxes,
  ShieldAlert,
  ShieldCheck,
  Check,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { PriceAuditModal, detectPriceAnomaly, PriceAnomalyType } from './PriceAuditModal';
import { useProductFilters, ProductSortField, SortDirection } from './useProductFilters';

interface ProductManagementScreenProps {
  isAddDrawerOpen?: boolean;
  setIsAddDrawerOpen?: (open: boolean) => void;
}

export const ProductManagementScreen: React.FC<ProductManagementScreenProps> = ({
  isAddDrawerOpen: externalDrawerOpen,
  setIsAddDrawerOpen: setExternalDrawerOpen,
}) => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    importProducts,
    receiveStockWithWeightedCost,
    setCurrentView,
    showToast,
    currentUser,
    isPriceAuditConfirmed,
  } = useApp();
  const { requestVoiceAssistant } = useUiShell();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sắp xếp theo cột: click lần 1 = tăng dần, lần 2 = giảm dần, lần 3 = bỏ sắp xếp (mặc định)
  const [sortField, setSortField] = useState<ProductSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: ProductSortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortField(null);
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: ProductSortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#0066FF]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#0066FF]" />
    );
  };

  // Stock-In Voucher Modal state
  const [isStockInVoucherOpen, setIsStockInVoucherOpen] = useState(false);

  // Direct Excel Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<Partial<Product>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'OVERWRITE' | 'APPEND'>('APPEND');
  const [isProcessing, setIsProcessing] = useState(false);

  // Drawer Add/Edit Product state
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const isDrawerOpen = externalDrawerOpen !== undefined ? externalDrawerOpen : internalDrawerOpen;
  const setDrawerOpen = setExternalDrawerOpen || setInternalDrawerOpen;

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'cat-electronics',
    unit: 'Cái',
    cost_price: 0,
    selling_price: 0,
    stock: 0,
    min_stock: 10,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    image: '',
    description: '',
  });

  // Modal: Nhập hàng & Giá vốn bình quân gia quyền
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInProduct, setStockInProduct] = useState<Product | null>(null);
  const [receivedQty, setReceivedQty] = useState<number>(10);
  const [receivedCost, setReceivedCost] = useState<number>(0);

  // Modal: Audit kiểm tra bảng giá bất thường
  const [isPriceAuditModalOpen, setIsPriceAuditModalOpen] = useState(false);
  const [priceAnomalyFilter, setPriceAnomalyFilter] = useState<PriceAnomalyType | 'CONFIRMED'>('ALL');

  const debouncedSearch = useDebounce(search, 200);

  const { priceAnomalies, filteredProducts, paginatedProducts } = useProductFilters({
    products,
    debouncedSearch,
    selectedCategory,
    stockFilter,
    priceAnomalyFilter,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    isPriceAuditConfirmed,
  });

  const handleOpenAddDrawer = () => {
    setEditingProduct(null);
    setFormData({
      sku: `SP-${Date.now().toString().slice(-4)}`,
      barcode: `893600${Math.floor(100000 + Math.random() * 900000)}`,
      name: '',
      category: categories[1]?.id || 'cat-electronics',
      unit: 'Cái',
      cost_price: 0,
      selling_price: 0,
      stock: 10,
      min_stock: 5,
      status: 'ACTIVE',
      image: '',
      description: '',
    });
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock: product.stock,
      min_stock: product.min_stock,
      status: product.status,
      image: product.image,
      description: product.description || '',
    });
    setDrawerOpen(true);
  };

  const handleSubmitDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên hàng hóa!', 'error');
      return;
    }
    if (formData.selling_price <= 0) {
      showToast('Giá bán phải lớn hơn 0!', 'error');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      addProduct(formData);
    }
    setDrawerOpen(false);
  };

  // Stock In Modal Handler
  const handleOpenStockIn = (product: Product) => {
    setStockInProduct(product);
    setReceivedQty(10);
    setReceivedCost(product.cost_price);
    setIsStockInModalOpen(true);
  };

  const handleExecuteStockIn = () => {
    if (!stockInProduct || receivedQty <= 0 || receivedCost < 0) return;
    receiveStockWithWeightedCost(stockInProduct.id, receivedQty, receivedCost);
    setIsStockInModalOpen(false);
  };

  // Calculated new weighted cost preview
  const currentStock = stockInProduct ? Math.max(0, stockInProduct.stock) : 0;
  const currentCost = stockInProduct ? stockInProduct.cost_price : 0;
  const calculatedTotalStock = currentStock + receivedQty;
  const calculatedWeightedCost =
    calculatedTotalStock > 0
      ? Math.round((currentStock * currentCost + receivedQty * receivedCost) / calculatedTotalStock)
      : receivedCost;

  const handleExportProductList = () => {
    const exportData = products.map((p) => ({
      'Mã SKU': p.sku,
      'Mã Barcode': p.barcode,
      'Tên Hàng Hóa': p.name,
      'Danh Mục': p.category,
      'Đơn Vị Tính': p.unit,
      'Giá Vốn (đ)': p.cost_price,
      'Giá Bán (đ)': p.selling_price,
      'Tồn Kho': p.stock,
      'Tồn Tối Thiểu': p.min_stock,
      'Trạng Thái': p.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
    }));
    exportToExcel(exportData, 'Danh_sach_hang_hoa', 'HangHoa');
    showToast('Đã xuất danh sách hàng hóa ra file Excel!', 'success');
  };

  const handleDirectProductExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportErrors([]);

    try {
      const { rows } = await parseExcelFile(file);
      if (!rows || rows.length === 0) {
        showToast('File Excel trống hoặc không tìm thấy dòng dữ liệu!', 'error');
        setIsProcessing(false);
        return;
      }

      const parsedList: Partial<Product>[] = [];
      const errors: string[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const rawSku = findHeaderValue(row, [
          'masku', 'mahang', 'mahanghoa', 'masp', 'masanpham', 'sku', 'code', 'itemcode', 'productcode', 'ma'
        ]);
        const sku = String(rawSku || '').trim() || `SP-${Date.now().toString().slice(-4)}${idx + 1}`;

        const rawName = findHeaderValue(row, [
          'tenhanghoa', 'tenhang', 'tensanpham', 'tensp', 'ten', 'name', 'productname', 'tieude', 'mota'
        ]);
        const name = String(rawName || '').trim();

        const rawBarcode = findHeaderValue(row, ['mabarcode', 'barcode', 'mavach', 'mavachbarcode', 'vach', 'ean', 'upc']);
        const barcode = String(rawBarcode || '').trim() || `893600${Math.floor(100000 + Math.random() * 900000)}`;

        const rawSellingPrice = findHeaderValue(row, [
          'giabanle', 'giaban', 'dongiaban', 'giale', 'banggia', 'gianiemyet', 'gia', 'price', 'sellingprice', 'dongia'
        ]);
        const sellingPrice = parseCleanNumber(rawSellingPrice, 0);

        const rawCostPrice = findHeaderValue(row, [
          'giavon', 'gianhap', 'dongiavon', 'dongianhap', 'giamua', 'cost', 'costprice'
        ]);
        const costPrice = parseCleanNumber(rawCostPrice, 0);

        const rawStock = findHeaderValue(row, [
          'tonkho', 'tonkhobandau', 'soluongton', 'slton', 'ton', 'soluong', 'sl', 'stock', 'qty', 'initialstock'
        ]);
        const stock = Math.round(parseCleanNumber(rawStock, 0));

        const rawMinStock = findHeaderValue(row, [
          'tontoithieu', 'dinhmuc', 'tonmin', 'minstock', 'dinhmuncton'
        ]);
        const minStock = Math.round(parseCleanNumber(rawMinStock, 5));

        const rawUnit = findHeaderValue(row, ['donvitinh', 'dvt', 'donvi', 'unit']);
        const unit = String(rawUnit || '').trim() || 'Cái';

        const rawCat = findHeaderValue(row, [
          'danhmuc', 'nhomhang', 'loaihang', 'nganhhang', 'category', 'group', 'nhom', 'nhomsanpham'
        ]);
        let category = 'cat-electronics';
        if (rawCat) {
          const cleanCat = cleanTextForMatch(rawCat);
          const found = categories.find((c) => cleanTextForMatch(c.name).includes(cleanCat) || cleanCat.includes(cleanTextForMatch(c.name)));
          if (found) category = found.id;
        }

        const rawDesc = findHeaderValue(row, ['mota', 'ghichu', 'diengiai', 'description', 'note', 'chitiet']);
        const description = String(rawDesc || '');

        if (!name) {
          errors.push(`Dòng ${rowNum}: Tự động tạo tên "Sản phẩm ${sku}" do ô tên bị trống`);
        }

        const finalSellingPrice = sellingPrice > 0 ? sellingPrice : (costPrice > 0 ? Math.round(costPrice * 1.25) : 10000);

        parsedList.push({
          sku,
          name: name || `Sản phẩm ${sku}`,
          barcode,
          category,
          unit,
          cost_price: costPrice,
          selling_price: finalSellingPrice,
          stock,
          min_stock: minStock,
          status: 'ACTIVE',
          image: '',
          description,
        });
      });

      setPreviewProducts(parsedList);
      setImportErrors(errors);
      setIsImportModalOpen(true);
      showToast(`Đã đọc ${parsedList.length} mặt hàng từ file Excel!`, 'success');
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(err);
      showToast('Lỗi đọc file: ' + (message || 'Không đúng định dạng Excel'), 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmDirectProductImport = () => {
    if (previewProducts.length === 0) return;
    const res = importProducts(previewProducts, importMode === 'OVERWRITE');
    setIsImportModalOpen(false);
    setPreviewProducts([]);
    showToast(`Đã lưu ${res.inserted + res.updated} hàng hóa thành công!`, 'success');
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0B63E5]" />
            Quản lý Hàng hóa & Bảng giá
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý {products.length} mặt hàng, phân bổ tồn kho và tính giá vốn bình quân gia quyền
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPriceAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer relative"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            <span>Audit Bảng Giá</span>
            {priceAnomalies.total > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                {priceAnomalies.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsStockInVoucherOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-white" />
            <span>Tạo Phiếu Nhập Kho</span>
          </button>

          <button
            onClick={() => requestVoiceAssistant('STOCK_IN')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-amber-300" />
            <span>Nhập kho giọng nói</span>
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-[#0B63E5] hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0B63E5]" />
              <span>Nhập hàng hóa</span>
            </button>
          )}

          <button
            onClick={downloadProductTemplate}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Tải file Excel mẫu Hàng Hóa"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
            <span>File Mẫu (.xlsx)</span>
          </button>

          <button
            onClick={handleExportProductList}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAddDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B63E5] hover:bg-[#0952C4] active:bg-blue-800 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Thêm mới hàng hóa</span>
          </button>
        </div>
      </div>

      {/* Cảnh báo Audit Bảng Giá Bất Thường */}
      {priceAnomalies.total > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
                <span>Phát hiện {priceAnomalies.total} mặt hàng có chênh lệch giá bất thường!</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                  Cần rà soát
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Gồm:{' '}
                {priceAnomalies.lossCount > 0 && (
                  <strong className="text-rose-700 font-bold">{priceAnomalies.lossCount} SP bán lỗ</strong>
                )}
                {priceAnomalies.lossCount > 0 && priceAnomalies.invertedCount > 0 && ', '}
                {priceAnomalies.invertedCount > 0 && (
                  <strong className="text-purple-700 font-bold">{priceAnomalies.invertedCount} SP vốn &gt; 3x bán (nhầm thùng/hộp)</strong>
                )}
                {(priceAnomalies.lossCount > 0 || priceAnomalies.invertedCount > 0) && priceAnomalies.highMarginCount > 0 && ', '}
                {priceAnomalies.highMarginCount > 0 && (
                  <strong className="text-amber-800 font-bold">{priceAnomalies.highMarginCount} SP bán &gt; 3x vốn</strong>
                )}
                . Vui lòng kiểm tra lại để tránh bán sai giá hoặc nhầm đơn vị tính!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => {
                setPriceAnomalyFilter(priceAnomalyFilter === 'ALL' ? 'LOSS' : 'ALL');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/70 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              {priceAnomalyFilter !== 'ALL' ? 'Hiện tất cả SP' : 'Lọc SP bất thường'}
            </button>
            <button
              onClick={() => setIsPriceAuditModalOpen(true)}
              className="px-3 py-1 rounded bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Xem & Sửa Bảng Giá</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-2.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên sản phẩm, mã SKU, Barcode... (Hoặc bấm mic để nói)"
            className="w-full pl-8 pr-14 py-1.5 bg-slate-50 text-xs text-slate-900 border border-slate-200 rounded-md focus:bg-white focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => requestVoiceAssistant('STOCK_IN')}
              className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Tìm kiếm hoặc nhập kho bằng giọng nói"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả danh mục ({products.length})</option>
          {categories.filter((c) => c.id !== 'cat-all').map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Stock status filter */}
        <select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value as any);
            setCurrentPage(1);
          }}
          className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs outline-none cursor-pointer"
        >
          <option value="ALL">Tất cả tồn kho</option>
          <option value="IN_STOCK">Tồn an toàn</option>
          <option value="LOW_STOCK">Sắp hết hàng</option>
          <option value="OUT_OF_STOCK">Hết hàng trong kho</option>
        </select>

        {/* Price Anomaly Filter */}
        <select
          value={priceAnomalyFilter}
          onChange={(e) => {
            setPriceAnomalyFilter(e.target.value as PriceAnomalyType | 'CONFIRMED');
            setCurrentPage(1);
          }}
          className={`border rounded-md px-2.5 py-1.5 text-xs font-medium shadow-2xs outline-none cursor-pointer ${
            priceAnomalyFilter !== 'ALL'
              ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <option value="ALL">Toàn bộ giá {priceAnomalies.total > 0 ? `(${priceAnomalies.total} cảnh báo)` : ''}</option>
          <option value="LOSS">🚨 Bán dưới vốn ({priceAnomalies.lossCount})</option>
          <option value="INVERTED_HIGH">⚠️ Vốn &gt; 3x Bán ({priceAnomalies.invertedCount})</option>
          <option value="HIGH_MARGIN">📈 Bán &gt; 3x Vốn ({priceAnomalies.highMarginCount})</option>
          <option value="ZERO_COST">⚪ Chưa có vốn ({priceAnomalies.zeroCostCount})</option>
          {priceAnomalies.confirmedCount > 0 && (
            <option value="CONFIRMED">✅ Đã duyệt OK ({priceAnomalies.confirmedCount})</option>
          )}
        </select>
      </div>

      {/* Product Data Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[880px]">
            <thead>
              <tr className="table-header border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3 min-w-[180px]">
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                    Ảnh & Sản phẩm <SortIcon field="name" />
                  </button>
                </th>
                <th className="py-2 px-3 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('sku')} className="flex items-center gap-1 hover:text-[#0066FF] transition-colors">
                    Mã SKU / Barcode <SortIcon field="sku" />
                  </button>
                </th>
                <th className="py-2 px-2.5 whitespace-nowrap">ĐVT</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('cost_price')} className="flex items-center gap-1 ml-auto hover:text-[#0066FF] transition-colors">
                    Giá vốn (VNĐ) <SortIcon field="cost_price" />
                  </button>
                </th>
                <th className="py-2 px-3 text-right whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('selling_price')} className="flex items-center gap-1 ml-auto hover:text-[#0066FF] transition-colors">
                    Giá bán lẻ (VNĐ) <SortIcon field="selling_price" />
                  </button>
                </th>
                <th className="py-2 px-3 text-center whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('stock')} className="flex items-center gap-1 mx-auto hover:text-[#0066FF] transition-colors">
                    Tồn kho <SortIcon field="stock" />
                  </button>
                </th>
                <th className="py-2 px-2.5 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-2 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= p.min_stock;
                  const anomaly = detectPriceAnomaly(p);
                  const isConfirmed = isPriceAuditConfirmed(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name & Thumbnail */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-8 h-8 object-cover rounded border border-slate-200 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 line-clamp-1">{p.name}</div>
                            <div className="text-[10px] text-slate-400">
                              Cảnh báo tối thiểu: {p.min_stock} {p.unit}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-2 px-3 font-mono whitespace-nowrap">
                        <div className="text-slate-900 font-semibold">{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode}</div>
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2.5 text-slate-700 font-medium whitespace-nowrap">{p.unit}</td>

                      {/* Cost Price */}
                      <td className="py-2 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                        <div>{formatCurrency(p.cost_price)}</div>
                        {!isConfirmed && anomaly?.type === 'INVERTED_HIGH' && (
                          <div
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200 mt-0.5 whitespace-nowrap shrink-0"
                            title={anomaly.description}
                          >
                            Vốn &gt; 3x Bán ({anomaly.ratio}x)
                          </div>
                        )}
                        {anomaly?.type === 'ZERO_COST' && (
                          <div className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">Chưa có vốn</div>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-2 px-3 text-right font-bold text-[#0B63E5] whitespace-nowrap">
                        <div>{formatCurrency(p.selling_price)}</div>
                        {isConfirmed ? (
                          <div
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5 whitespace-nowrap shrink-0"
                            title="Mức giá này đã được người dùng xác nhận duyệt OK"
                          >
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            Đã duyệt giá
                          </div>
                        ) : (
                          <>
                            {anomaly?.type === 'LOSS' && (
                              <div
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 mt-0.5 whitespace-nowrap shrink-0"
                                title={anomaly.description}
                              >
                                <TrendingDown className="w-2.5 h-2.5" />
                                Bán lỗ ({anomaly.ratio}x)
                              </div>
                            )}
                            {anomaly?.type === 'HIGH_MARGIN' && (
                              <div
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 mt-0.5 whitespace-nowrap shrink-0"
                                title={anomaly.description}
                              >
                                <TrendingUp className="w-2.5 h-2.5" />
                                Lãi &gt; 3x ({anomaly.ratio}x)
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Stock Badge */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="badge-red whitespace-nowrap">
                            <XCircle className="w-2.5 h-2.5 mr-1 inline" />
                            0 (Hết)
                          </span>
                        ) : isLowStock ? (
                          <span className="badge-orange whitespace-nowrap">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1 inline" />
                            {p.stock} (Sắp hết)
                          </span>
                        ) : (
                          <span className="badge-green whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />
                            {p.stock}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            p.status === 'ACTIVE'
                              ? 'bg-blue-50 text-[#0B63E5] border border-blue-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${p.status === 'ACTIVE' ? 'bg-[#0B63E5]' : 'bg-slate-400'}`}></span>
                          {p.status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center whitespace-nowrap sticky right-0 bg-white hover:bg-slate-50/80 transition-colors z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenStockIn(p)}
                            className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Nhập hàng (Tính giá vốn bình quân gia quyền)"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditDrawer(p)}
                            className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Sửa hàng hóa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Xóa hàng hóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="sản phẩm"
        />
      </div>

      {/* DRAWER: THÊM / SỬA SẢN PHẨM (RIGHT SLIDE-OVER) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingProduct ? 'Chỉnh sửa hàng hóa' : 'Thêm mới hàng hóa'}
                </h3>
                <p className="text-xs text-slate-500">Khai báo thông số kỹ thuật và định giá bán</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form id="product-form" onSubmit={handleSubmitDrawer} className="p-6 space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tên hàng hóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Laptop Pro 2026 M3 SuperSlim"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã SKU (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-semibold focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mã Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Danh mục</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-600 outline-none cursor-pointer"
                  >
                    {categories.filter((c) => c.id !== 'cat-all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Chiếc, Cái, Hộp, Gói..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Cost Price & Selling Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giá vốn (VNĐ)</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Giá bán lẻ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min="0"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-blue-700 font-extrabold focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Price Anomaly Warning in Drawer */}
              {formData.cost_price > 0 && formData.selling_price > 0 && (
                <div className="space-y-2">
                  {editingProduct &&
                  isPriceAuditConfirmed(editingProduct) &&
                  editingProduct.cost_price === formData.cost_price &&
                  editingProduct.selling_price === formData.selling_price ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <strong className="font-bold">Mức giá này đã được duyệt OK!</strong>
                        <p className="text-emerald-700 mt-0.5">
                          Bạn đã xác nhận thông tin giá vốn và giá bán này là chính xác. Hệ thống sẽ bỏ qua các cảnh báo lệch giá. Nếu thay đổi giá, hệ thống sẽ tự động kiểm tra lại.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {formData.cost_price > formData.selling_price * 3 && (
                        <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong className="font-bold">Cảnh báo: Vốn gấp {(formData.cost_price / formData.selling_price).toFixed(1)}x Giá bán!</strong>
                            <p className="text-purple-700 mt-0.5">
                              Giá vốn đang cao hơn 3 lần giá bán. Có thể bạn đang nhập giá vốn theo Thùng/Hộp nhưng đặt giá bán theo Cái?
                            </p>
                          </div>
                        </div>
                      )}
                      {formData.selling_price < formData.cost_price && formData.cost_price <= formData.selling_price * 3 && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong className="font-bold">Cảnh báo: Bán dưới giá vốn (Bán lỗ)!</strong>
                            <p className="text-rose-700 mt-0.5">
                              Giá bán ({formData.selling_price.toLocaleString()}đ) thấp hơn giá vốn ({formData.cost_price.toLocaleString()}đ), lỗ {(formData.cost_price - formData.selling_price).toLocaleString()}đ mỗi sản phẩm!
                            </p>
                          </div>
                        </div>
                      )}
                      {formData.selling_price > formData.cost_price * 3 && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <strong className="font-bold">Lưu ý: Giá bán gấp {(formData.selling_price / formData.cost_price).toFixed(1)}x Giá vốn!</strong>
                            <p className="text-amber-700 mt-0.5">
                              Giá bán chênh lệch rất cao so với giá vốn (lãi gộp {Math.round(((formData.selling_price - formData.cost_price) / formData.cost_price) * 100)}%). Hãy kiểm tra lại số liệu.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Initial Stock & Min Stock Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tồn kho ban đầu</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngưỡng cảnh báo tối thiểu</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đường dẫn hình ảnh (URL)</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú thêm về quy cách đóng gói, thông số..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none resize-none"
                />
              </div>
            </form>

            {/* Drawer Sticky Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                {editingProduct ? 'Lưu cập nhật' : 'Tạo hàng hóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NHẬP HÀNG & TÍNH GIÁ VỐN BÌNH QUÂN GIA QUYỀN */}
      {isStockInModalOpen && stockInProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                <h3 className="font-bold text-base">Nhập kho & Tính giá vốn BQGQ</h3>
              </div>
              <button
                onClick={() => setIsStockInModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{stockInProduct.name}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Mã: {stockInProduct.sku} | Tồn hiện tại: <strong>{stockInProduct.stock}</strong> {stockInProduct.unit}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Giá vốn hiện tại: <strong>{formatCurrency(stockInProduct.cost_price)}</strong>
                </div>
              </div>

              {/* Input: Qty and New Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Số lượng nhập thêm:</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min="1"
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đơn giá nhập đợt này:</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min="0"
                    value={receivedCost}
                    onChange={(e) => setReceivedCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              {/* Formula & Result Live Preview */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                <div className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Công thức bình quân gia quyền tự động:</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono leading-relaxed bg-white p-2 rounded border border-emerald-100">
                  (({currentStock} x {formatCurrency(currentCost)}) + ({receivedQty} x {formatCurrency(receivedCost)})) / {calculatedTotalStock}
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-slate-700">Giá vốn mới dự kiến:</span>
                  <span className="text-sm font-black text-emerald-700">
                    {formatCurrency(calculatedWeightedCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600">Tổng tồn mới:</span>
                  <span className="font-bold text-slate-900">
                    {calculatedTotalStock} {stockInProduct.unit}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsStockInModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleExecuteStockIn}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                Xác nhận nhập kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Direct Excel Import Preview with Schema Guide */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B63E5] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nhập Danh Sách Hàng Hóa từ Excel (Schema Chuẩn)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tương thích file Excel KiotViet, Sapo, Haravan, POS365 với các cột chuẩn hóa
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setPreviewProducts([]);
                  setImportErrors([]);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
              {/* SCHEMA GUIDE BOX */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0B63E5]" />
                    <span className="text-xs font-bold text-blue-950">
                      Cấu trúc Cột Dữ Liệu Hàng Hóa (Schema Mapping Chuẩn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadProductTemplate}
                      className="px-2.5 py-1 bg-white border border-blue-200 rounded-md text-[11px] font-bold text-[#0B63E5] hover:bg-blue-50 flex items-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3 h-3 text-[#0B63E5]" />
                      <span>Tải file Excel Mẫu Chuẩn</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Mã SKU (*)</div>
                    <div className="text-[10px] text-slate-500">Mã định danh SP</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Tên hàng hóa (*)</div>
                    <div className="text-[10px] text-slate-500">Tên sản phẩm đầy đủ</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Mã vạch / Barcode</div>
                    <div className="text-[10px] text-slate-500">Mã vạch EAN/UPC</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Đơn vị tính (ĐVT)</div>
                    <div className="text-[10px] text-slate-500">Cái, Lon, Chai, Hộp...</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Giá vốn & Giá bán (*)</div>
                    <div className="text-[10px] text-slate-500">Giá nhập & giá niêm yết</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Tồn kho hiện tại</div>
                    <div className="text-[10px] text-slate-500">Số lượng tồn ban đầu</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Nhóm / Danh mục</div>
                    <div className="text-[10px] text-slate-500">Phân loại ngành hàng</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Tồn tối thiểu</div>
                    <div className="text-[10px] text-slate-500">Cảnh báo nhập hàng</div>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20 rounded-xl p-5 text-center transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleDirectProductExcel}
                  className="hidden"
                  id="product-excel-file-modal-inner"
                />
                <label
                  htmlFor="product-excel-file-modal-inner"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0B63E5] flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Kéo thả file Excel Hàng Hóa vào đây hoặc <span className="text-[#0B63E5]">chọn file</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hỗ trợ .xlsx, .xls, .csv (Tự động nhận diện cột linh hoạt)
                  </div>
                </label>
              </div>

              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lưu ý khi đọc file:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {importErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importErrors.length > 5 && <li>...và {importErrors.length - 5} dòng khác đã được tự động xử lý.</li>}
                  </ul>
                </div>
              )}

              {/* Live Preview Table */}
              {previewProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Bảng Xem Trước ({previewProducts.length} mặt hàng)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setPreviewProducts([])}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Xóa bảng xem trước
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Mã SKU</th>
                          <th className="py-2 px-3">Mã Vạch</th>
                          <th className="py-2 px-3">Tên Hàng Hóa</th>
                          <th className="py-2 px-3">ĐVT</th>
                          <th className="py-2 px-3 text-right">Giá Vốn</th>
                          <th className="py-2 px-3 text-right">Giá Bán</th>
                          <th className="py-2 px-3 text-right">Tồn Kho</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#0B63E5]">{p.sku}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{p.barcode || '—'}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{p.name}</td>
                            <td className="py-2 px-3 text-slate-600">{p.unit || 'Cái'}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-600">
                              {formatCurrency(p.cost_price || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600">
                              {formatCurrency(p.selling_price || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">{p.stock || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Chế độ:</span>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none font-semibold text-slate-700"
                >
                  <option value="APPEND">Thêm mới & Cập nhật</option>
                  <option value="OVERWRITE">Ghi đè hoàn toàn</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={previewProducts.length === 0}
                  onClick={handleConfirmDirectProductImport}
                  className={`px-4 py-1.5 font-bold text-xs text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-all ${
                    previewProducts.length > 0
                      ? 'bg-[#0B63E5] hover:bg-blue-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác Nhận Lưu ({previewProducts.length} Hàng Hóa)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock-In Voucher Modal (Tạo Phiếu Nhập Kho & Nhập SP Mới / Gộp Kho) */}
      <StockInVoucherModal
        isOpen={isStockInVoucherOpen}
        onClose={() => setIsStockInVoucherOpen(false)}
      />

      {/* Price Audit Modal (Kiểm tra & Sửa bảng giá bất thường) */}
      <PriceAuditModal
        isOpen={isPriceAuditModalOpen}
        onClose={() => setIsPriceAuditModalOpen(false)}
        products={products}
        onUpdateProduct={(id, updates) => updateProduct(id, updates)}
        onSelectProductInTable={(p) => {
          setIsPriceAuditModalOpen(false);
          handleOpenEditDrawer(p);
        }}
      />
    </div>
  );
};
