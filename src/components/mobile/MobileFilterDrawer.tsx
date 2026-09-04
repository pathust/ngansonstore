import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, Search } from 'lucide-react';
import { Category } from '../../types';

export interface MobileFilterOptions {
  stockStatus: 'ALL' | 'BELOW_MIN' | 'ABOVE_MAX' | 'IN_STOCK' | 'OUT_OF_STOCK';
  selectedCategoryIds: string[];
  selectedBrands: string[];
  businessStatus: 'ACTIVE' | 'INACTIVE' | 'ALL';
}

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currentFilter: MobileFilterOptions;
  onApply: (filter: MobileFilterOptions) => void;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  categories,
  currentFilter,
  onApply,
}) => {
  const [filter, setFilter] = useState<MobileFilterOptions>({ ...currentFilter });
  const [activeSubView, setActiveSubView] = useState<'MAIN' | 'CATEGORIES' | 'BRANDS'>('MAIN');
  const [categorySearch, setCategorySearch] = useState('');

  // Accordion toggle states
  const [isStockOpen, setIsStockOpen] = useState(true);
  const [isPointsOpen, setIsPointsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(true);

  // Sample brands for electrical & plumbing
  const sampleBrands = ['Rạng Đông', 'Cadivi', 'Panasonic', 'Tiền Phong', 'Miha', 'Stanley', 'Sino', 'Dekko'];

  if (!isOpen) return null;

  const handleReset = () => {
    const defaultFilter: MobileFilterOptions = {
      stockStatus: 'ALL',
      selectedCategoryIds: [],
      selectedBrands: [],
      businessStatus: 'ACTIVE',
    };
    setFilter(defaultFilter);
  };

  const handleApply = () => {
    onApply(filter);
    onClose();
  };

  // Sub-view: Select Categories
  if (activeSubView === 'CATEGORIES') {
    const filteredCats = categories.filter(
      (c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()) && c.id !== 'cat-all'
    );

    return (
      <div className="fixed inset-0 bg-[#F5F6F8] z-50 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <button
            onClick={() => setActiveSubView('MAIN')}
            className="flex items-center gap-1 text-slate-800 font-bold text-base"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
            <span>Chọn nhóm hàng</span>
          </button>
          <button
            onClick={() => {
              if (filter.selectedCategoryIds.length === categories.length - 1) {
                setFilter({ ...filter, selectedCategoryIds: [] });
              } else {
                setFilter({
                  ...filter,
                  selectedCategoryIds: categories.filter((c) => c.id !== 'cat-all').map((c) => c.id),
                });
              }
            }}
            className="text-xs font-semibold text-[#0066FF]"
          >
            {filter.selectedCategoryIds.length === categories.length - 1 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>

        {/* Search bar inside category */}
        <div className="p-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Category List with rounded checkboxes */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {filteredCats.map((cat) => {
            const isChecked = filter.selectedCategoryIds.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => {
                  if (isChecked) {
                    setFilter({
                      ...filter,
                      selectedCategoryIds: filter.selectedCategoryIds.filter((id) => id !== cat.id),
                    });
                  } else {
                    setFilter({
                      ...filter,
                      selectedCategoryIds: [...filter.selectedCategoryIds, cat.id],
                    });
                  }
                }}
                className="bg-white rounded-xl p-3 flex items-center justify-between border border-slate-100 cursor-pointer active:scale-99 transition-all"
              >
                <span className="text-sm font-medium text-slate-800">{cat.name}</span>
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

        {/* Bottom Button */}
        <div className="p-4 bg-white border-t border-slate-100">
          <button
            onClick={() => setActiveSubView('MAIN')}
            className="w-full py-3 bg-[#0066FF] text-white font-bold text-sm rounded-xl active:scale-98 transition-all shadow-md"
          >
            Xong
          </button>
        </div>
      </div>
    );
  }

  // Sub-view: Select Brands
  if (activeSubView === 'BRANDS') {
    return (
      <div className="fixed inset-0 bg-[#F5F6F8] z-50 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <button
            onClick={() => setActiveSubView('MAIN')}
            className="flex items-center gap-1 text-slate-800 font-bold text-base"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
            <span>Thương hiệu</span>
          </button>
          <button
            onClick={() => {
              if (filter.selectedBrands.length === sampleBrands.length) {
                setFilter({ ...filter, selectedBrands: [] });
              } else {
                setFilter({ ...filter, selectedBrands: [...sampleBrands] });
              }
            }}
            className="text-xs font-semibold text-[#0066FF]"
          >
            {filter.selectedBrands.length === sampleBrands.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {sampleBrands.map((brand) => {
            const isChecked = filter.selectedBrands.includes(brand);
            return (
              <div
                key={brand}
                onClick={() => {
                  if (isChecked) {
                    setFilter({
                      ...filter,
                      selectedBrands: filter.selectedBrands.filter((b) => b !== brand),
                    });
                  } else {
                    setFilter({
                      ...filter,
                      selectedBrands: [...filter.selectedBrands, brand],
                    });
                  }
                }}
                className="bg-white rounded-xl p-3 flex items-center justify-between border border-slate-100 cursor-pointer"
              >
                <span className="text-sm font-medium text-slate-800">{brand}</span>
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

        <div className="p-4 bg-white border-t border-slate-100">
          <button
            onClick={() => setActiveSubView('MAIN')}
            className="w-full py-3 bg-[#0066FF] text-white font-bold text-sm rounded-xl shadow-md"
          >
            Xong
          </button>
        </div>
      </div>
    );
  }

  // Main Filter Drawer View (Image 1, 6)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F6F8] animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center border-b border-slate-100 sticky top-0 z-20">
        <button onClick={onClose} className="flex items-center gap-1 text-slate-800 font-bold text-base">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
          <span>Bộ lọc</span>
        </button>
      </div>

      {/* Filter Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {/* Accordion: Tồn kho */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
          <button
            onClick={() => setIsStockOpen(!isStockOpen)}
            className="w-full px-4 py-3 flex items-center justify-between font-bold text-sm text-slate-800"
          >
            <span>Tồn kho</span>
            {isStockOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {isStockOpen && (
            <div className="border-t border-slate-50 flex flex-col">
              {[
                { id: 'ALL', label: 'Tất cả hàng hoá' },
                { id: 'BELOW_MIN', label: 'Dưới định mức tồn' },
                { id: 'ABOVE_MAX', label: 'Vượt định mức tồn' },
                { id: 'IN_STOCK', label: 'Còn hàng' },
                { id: 'OUT_OF_STOCK', label: 'Hết hàng' },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setFilter({ ...filter, stockStatus: opt.id as any })}
                  className="px-4 py-3 flex items-center justify-between border-b border-slate-50 last:border-none cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className={`text-sm ${filter.stockStatus === opt.id ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                    {opt.label}
                  </span>
                  {filter.stockStatus === opt.id && <Check className="w-4 h-4 text-[#0066FF]" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Nhóm hàng */}
        <div
          onClick={() => setActiveSubView('CATEGORIES')}
          className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-slate-800">Nhóm hàng</span>
            {filter.selectedCategoryIds.length > 0 && (
              <span className="text-xs text-[#0066FF] font-medium">Đã chọn {filter.selectedCategoryIds.length} nhóm</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Section: Thương hiệu */}
        <div
          onClick={() => setActiveSubView('BRANDS')}
          className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm text-slate-800">Thương hiệu</span>
            {filter.selectedBrands.length > 0 && (
              <span className="text-xs text-[#0066FF] font-medium">Đã chọn {filter.selectedBrands.length} thương hiệu</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Section: Thuộc tính */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 shadow-2xs transition-colors">
          <span className="font-bold text-sm text-slate-800">Thuộc tính</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Section: Vị trí */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 shadow-2xs transition-colors">
          <span className="font-bold text-sm text-slate-800">Vị trí</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Accordion: Trạng thái hàng hoá */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs">
          <button
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="w-full px-4 py-3 flex items-center justify-between font-bold text-sm text-slate-800"
          >
            <span>Trạng thái hàng hoá</span>
            {isStatusOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {isStatusOpen && (
            <div className="border-t border-slate-50 flex flex-col">
              <div
                onClick={() => setFilter({ ...filter, businessStatus: filter.businessStatus === 'ACTIVE' ? 'ALL' : 'ACTIVE' })}
                className="px-4 py-3 flex items-center justify-between border-b border-slate-50 cursor-pointer"
              >
                <span className="text-sm text-slate-700">Đang kinh doanh</span>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    filter.businessStatus === 'ACTIVE' ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-slate-300'
                  }`}
                >
                  {filter.businessStatus === 'ACTIVE' && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div
                onClick={() => setFilter({ ...filter, businessStatus: filter.businessStatus === 'INACTIVE' ? 'ALL' : 'INACTIVE' })}
                className="px-4 py-3 flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm text-slate-700">Ngừng kinh doanh</span>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    filter.businessStatus === 'INACTIVE' ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-slate-300'
                  }`}
                >
                  {filter.businessStatus === 'INACTIVE' && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Đặt lại & Áp dụng */}
      <div className="p-4 bg-white border-t border-slate-100 grid grid-cols-2 gap-3 sticky bottom-0">
        <button
          onClick={handleReset}
          className="py-3 px-4 rounded-xl border border-[#0066FF] text-[#0066FF] font-bold text-sm hover:bg-blue-50 active:scale-98 transition-all"
        >
          Đặt lại
        </button>
        <button
          onClick={handleApply}
          className="py-3 px-4 rounded-xl bg-[#0066FF] text-white font-bold text-sm shadow-md hover:bg-blue-600 active:scale-98 transition-all"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
};
