import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { Product } from '../../types';
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Check,
  ImageIcon,
  X,
} from 'lucide-react';
import { MobileFilterDrawer, MobileFilterOptions } from './MobileFilterDrawer';
import { MobileProductModal } from './MobileProductModal';

interface MobileProductsScreenProps {
  onOpenAddProduct?: () => void;
}

export const MobileProductsScreen: React.FC<MobileProductsScreenProps> = () => {
  const { products, categories, showToast } = useApp();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [priceType, setPriceType] = useState<'selling_price' | 'cost_price'>('selling_price');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc'>('newest');
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(['STANDARD', 'COMBO', 'SERVICE']);
  const [viewMode, setViewMode] = useState<'FLAT' | 'GROUPED'>('FLAT');
  
  // Product Edit & Add Modal State
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Modals & Bottom Sheets
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isPriceTypeSheetOpen, setIsPriceTypeSheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isProductTypeSheetOpen, setIsProductTypeSheetOpen] = useState(false);

  // Advanced Filters
  const [filterOptions, setFilterOptions] = useState<MobileFilterOptions>({
    stockStatus: 'ALL',
    selectedCategoryIds: [],
    selectedBrands: [],
    businessStatus: 'ACTIVE',
  });

  // Calculate totals
  const totalStock = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock || 0), 0);
  }, [products]);

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Search
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode.includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }

      // Stock status filter
      if (filterOptions.stockStatus === 'OUT_OF_STOCK' && p.stock > 0) return false;
      if (filterOptions.stockStatus === 'IN_STOCK' && p.stock <= 0) return false;
      if (filterOptions.stockStatus === 'BELOW_MIN' && p.stock > p.min_stock) return false;
      if (filterOptions.stockStatus === 'ABOVE_MAX' && p.stock <= 100) return false;

      // Category filter
      if (filterOptions.selectedCategoryIds.length > 0) {
        const matchesCat = filterOptions.selectedCategoryIds.some((catId) => {
          const cat = categories.find((c) => c.id === catId);
          return (
            p.category === catId ||
            (p as any).category_id === catId ||
            (cat && (p.category === cat.name || (p as any).category_id === cat.name))
          );
        });
        if (!matchesCat) return false;
      }

      // Business status
      if (filterOptions.businessStatus === 'ACTIVE' && p.status === 'INACTIVE') return false;
      if (filterOptions.businessStatus === 'INACTIVE' && p.status !== 'INACTIVE') return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'price_asc') {
        return (a[priceType] || 0) - (b[priceType] || 0);
      }
      if (sortOption === 'price_desc') {
        return (b[priceType] || 0) - (a[priceType] || 0);
      }
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name, 'vi');
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name, 'vi');
      }
      return 0; // Default order
    });

    return result;
  }, [products, searchQuery, filterOptions, priceType, sortOption, categories]);

  // Grouped products by category
  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach((p) => {
      const catObj = categories.find((c) => c.id === p.category || c.name === p.category || (c.id === (p as any).category_id));
      const catName = catObj?.name || p.category || 'Khác';
      if (!map.has(catName)) map.set(catName, []);
      map.get(catName)!.push(p);
    });
    return Array.from(map.entries()).map(([categoryName, prods]) => ({
      categoryName,
      prods,
    }));
  }, [filteredProducts, categories]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F6F8] pb-24 text-slate-800">
      {/* Top Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        {isSearchActive ? (
          <div className="flex items-center gap-2 w-full animate-in fade-in">
            <div className="flex-1 flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Tìm tên, mã SKU, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full text-slate-700"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearchActive(false);
                setSearchQuery('');
              }}
              className="text-xs font-bold text-[#0066FF] px-1"
            >
              Hủy
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Hàng hoá</h1>
            <div className="flex items-center gap-3 text-slate-600">
              <button
                onClick={() => setIsSearchActive(true)}
                className="p-1 hover:text-[#0066FF] transition-colors"
                title="Tìm kiếm"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSortSheetOpen(true)}
                className="p-1 hover:text-[#0066FF] transition-colors"
                title="Sắp xếp"
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMoreSheetOpen(true)}
                className="p-1 hover:text-[#0066FF] transition-colors"
                title="Chế độ hiển thị"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter Row Pills */}
      <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-slate-100 overflow-x-auto scroll-hide">
        <button
          onClick={() => setIsFilterDrawerOpen(true)}
          className={`p-2 rounded-xl border flex items-center justify-center transition-colors ${
            filterOptions.stockStatus !== 'ALL' || filterOptions.selectedCategoryIds.length > 0
              ? 'bg-[#EAF2FF] border-[#0066FF] text-[#0066FF]'
              : 'bg-[#F8FAFC] border-slate-200 text-slate-600'
          }`}
          title="Mở bộ lọc"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsProductTypeSheetOpen(true)}
          className="flex items-center gap-1.5 bg-[#F3F4F6] text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-slate-200 whitespace-nowrap transition-colors"
        >
          <span>
            {selectedProductTypes.length === 3 ? 'Tất cả loại hàng' : `${selectedProductTypes.length} loại hàng`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={() => setIsPriceTypeSheetOpen(true)}
          className="flex items-center gap-1.5 bg-[#F3F4F6] text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-slate-200 whitespace-nowrap transition-colors"
        >
          <span>{priceType === 'selling_price' ? 'Giá bán' : 'Giá vốn'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Summary Banner */}
      <div className="bg-[#F8FAFC] px-4 py-3 flex items-center justify-between border-b border-slate-200/80">
        <div>
          <span className="font-extrabold text-sm text-slate-900">Tổng tồn</span>
          <div className="text-[11px] text-slate-500 font-medium">
            {filteredProducts.length} hàng hoá {viewMode === 'GROUPED' ? '• Danh sách gộp' : ''}
          </div>
        </div>
        <div className="font-black text-base text-slate-900 tracking-tight">
          {totalStock.toLocaleString('vi-VN')}
        </div>
      </div>

      {/* Product List Items */}
      <div className="p-3 flex flex-col gap-2">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center gap-2 border border-slate-100 mt-4">
            <ImageIcon className="w-10 h-10 text-slate-300 stroke-[1.5]" />
            <span className="text-sm font-medium">Không tìm thấy hàng hoá phù hợp</span>
          </div>
        ) : viewMode === 'GROUPED' ? (
          groupedProducts.map((grp) => (
            <div key={grp.categoryName} className="flex flex-col gap-2 mb-2">
              <div className="px-2 pt-1 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                  {grp.categoryName}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {grp.prods.length} sản phẩm
                </span>
              </div>
              {grp.prods.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProductForEdit(p);
                    setIsProductModalOpen(true);
                  }}
                  className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 shadow-2xs hover:shadow-xs transition-all active:bg-blue-50/50 cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-center shrink-0 text-[#0066FF]">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-900 truncate leading-snug">{p.name}</span>
                      <span className="text-xs text-slate-400 font-mono mt-0.5">{p.sku}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <div className="font-black text-sm text-slate-900 tracking-tight">
                      {(p[priceType] || 0).toLocaleString('vi-VN')}
                    </div>
                    <div
                      className={`text-xs mt-0.5 font-medium ${
                        p.stock <= 0 ? 'text-red-500 font-bold' : p.stock <= p.min_stock ? 'text-amber-600' : 'text-slate-500'
                      }`}
                    >
                      Tồn: {p.stock} {p.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSelectedProductForEdit(p);
                setIsProductModalOpen(true);
              }}
              className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 shadow-2xs hover:shadow-xs transition-all active:bg-blue-50/50 cursor-pointer"
            >
              {/* Left Column: Image & Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-center shrink-0 text-[#0066FF]">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-slate-900 truncate leading-snug">{p.name}</span>
                  <span className="text-xs text-slate-400 font-mono mt-0.5">{p.sku}</span>
                </div>
              </div>

              {/* Right Column: Price & Stock */}
              <div className="text-right shrink-0 flex flex-col items-end">
                <div className="font-black text-sm text-slate-900 tracking-tight">
                  {(p[priceType] || 0).toLocaleString('vi-VN')}
                </div>
                <div
                  className={`text-xs mt-0.5 font-medium ${
                    p.stock <= 0 ? 'text-red-500 font-bold' : p.stock <= p.min_stock ? 'text-amber-600' : 'text-slate-500'
                  }`}
                >
                  Tồn: {p.stock} {p.unit}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Product Button (+) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedProductForEdit(null);
          setIsProductModalOpen(true);
        }}
        className="fixed right-4 bottom-22 w-14 h-14 rounded-full bg-[#0066FF] text-white flex items-center justify-center shadow-2xl hover:bg-blue-600 active:scale-95 transition-all z-40 cursor-pointer border-2 border-white"
        title="Thêm hàng hoá mới"
      >
        <Plus className="w-8 h-8 stroke-[2.5]" />
      </button>

      {/* Product Detail & Edit Modal */}
      <MobileProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProductForEdit}
        categories={categories}
      />

      {/* Filter Drawer */}
      <MobileFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        categories={categories}
        currentFilter={filterOptions}
        onApply={(opts) => setFilterOptions(opts)}
      />

      {/* Bottom Sheet: Loại giá (Giá bán / Giá vốn) */}
      {isPriceTypeSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsPriceTypeSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <h3 className="font-extrabold text-base text-slate-900 mb-1">Loại giá</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              <button
                onClick={() => {
                  setPriceType('selling_price');
                  setIsPriceTypeSheetOpen(false);
                }}
                className="py-3 flex items-center justify-between text-sm font-medium text-slate-800"
              >
                <span>Giá bán</span>
                {priceType === 'selling_price' && <Check className="w-4 h-4 text-[#0066FF]" />}
              </button>
              <button
                onClick={() => {
                  setPriceType('cost_price');
                  setIsPriceTypeSheetOpen(false);
                }}
                className="py-3 flex items-center justify-between text-sm font-medium text-slate-800"
              >
                <span>Giá vốn</span>
                {priceType === 'cost_price' && <Check className="w-4 h-4 text-[#0066FF]" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet: Sắp xếp hàng hoá */}
      {isSortSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsSortSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 max-h-[80vh] overflow-y-auto flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <h3 className="font-extrabold text-base text-slate-900 mb-1">Sắp xếp hàng hoá</h3>

            <div className="flex flex-col gap-4 text-xs font-bold text-slate-400">
              {/* Thời gian */}
              <div>
                <span className="uppercase tracking-wider">Thời gian</span>
                <div className="mt-1 flex flex-col divide-y divide-slate-100 text-sm font-medium text-slate-800">
                  <button
                    onClick={() => {
                      setSortOption('newest');
                      setIsSortSheetOpen(false);
                    }}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span>Mới nhất</span>
                    {sortOption === 'newest' && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('oldest');
                      setIsSortSheetOpen(false);
                    }}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span>Cũ nhất</span>
                    {sortOption === 'oldest' && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </button>
                </div>
              </div>

              {/* Giá */}
              <div>
                <span className="uppercase tracking-wider">Giá</span>
                <div className="mt-1 flex flex-col divide-y divide-slate-100 text-sm font-medium text-slate-800">
                  <button
                    onClick={() => {
                      setSortOption('price_asc');
                      setIsSortSheetOpen(false);
                    }}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span>Tăng dần</span>
                    {sortOption === 'price_asc' && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('price_desc');
                      setIsSortSheetOpen(false);
                    }}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span>Giảm dần</span>
                    {sortOption === 'price_desc' && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </button>
                </div>
              </div>

              {/* Tên */}
              <div>
                <span className="uppercase tracking-wider">Tên hàng</span>
                <div className="mt-1 flex flex-col divide-y divide-slate-100 text-sm font-medium text-slate-800">
                  <button
                    onClick={() => {
                      setSortOption('name_asc');
                      setIsSortSheetOpen(false);
                    }}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span>A - Z</span>
                    {sortOption === 'name_asc' && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </button>
                  <button
                    onClick={() => {
                      setSortOption('name_desc');
                      setIsSortSheetOpen(false);
                    }}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span>Z - A</span>
                    {sortOption === 'name_desc' && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet: Loại hàng (Image 9) */}
      {isProductTypeSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsProductTypeSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Loại hàng</h3>
              <button
                onClick={() => setSelectedProductTypes([])}
                className="text-xs font-semibold text-[#0066FF] hover:underline"
              >
                Bỏ chọn tất cả
              </button>
            </div>
            <div className="flex flex-col divide-y divide-slate-100">
              {[
                { id: 'STANDARD', name: 'Hàng hoá thường' },
                { id: 'COMBO', name: 'Combo - đóng gói' },
                { id: 'SERVICE', name: 'Dịch vụ' },
              ].map((item) => {
                const isChecked = selectedProductTypes.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedProductTypes(selectedProductTypes.filter((t) => t !== item.id));
                      } else {
                        setSelectedProductTypes([...selectedProductTypes, item.id]);
                      }
                    }}
                    className="py-3 flex items-center justify-between text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span>{item.name}</span>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setIsProductTypeSheetOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm"
              >
                Huỷ
              </button>
              <button
                onClick={() => {
                  setIsProductTypeSheetOpen(false);
                  showToast(`Đã áp dụng ${selectedProductTypes.length} loại hàng`, 'info');
                }}
                className="py-2.5 rounded-xl bg-[#0066FF] text-white font-bold text-sm shadow-md active:scale-98"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet: Chế độ hiển thị (Image 8) */}
      {isMoreSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsMoreSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <h3 className="font-extrabold text-base text-slate-900 mb-1">Chế độ hiển thị</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              <button
                onClick={() => {
                  setViewMode('FLAT');
                  setIsMoreSheetOpen(false);
                  showToast('Đã chuyển sang Danh sách không gộp', 'info');
                }}
                className="py-3 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors text-left"
              >
                <span>Danh sách không gộp</span>
                {viewMode === 'FLAT' && <Check className="w-4 h-4 text-[#0066FF]" />}
              </button>
              <button
                onClick={() => {
                  setViewMode('GROUPED');
                  setIsMoreSheetOpen(false);
                  showToast('Đã chuyển sang Danh sách gộp theo nhóm', 'info');
                }}
                className="py-3 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors text-left"
              >
                <span>Danh sách gộp theo nhóm</span>
                {viewMode === 'GROUPED' && <Check className="w-4 h-4 text-[#0066FF]" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
