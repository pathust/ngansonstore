import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { formatCurrency, getVietQRUrl } from '../../utils/formatters';
import { generateOfflineQrDataUrl } from '../../utils/vietqr';
import { useDebounce } from '../../utils/useDebounce';
import { VoiceActionModal } from '../common/VoiceActionModal';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Phone,
  X,
  ShoppingBag,
  ShoppingCart,
  RotateCcw,
  ArrowRight,
  Package,
  PackageOpen,
  Receipt,
  Mic
} from 'lucide-react';

export const PosSalesScreen: React.FC = () => {
  const {
    products,
    categories,
    orderTabs,
    activeTabId,
    setActiveTabId,
    createNewTab,
    closeTab,
    addToCart,
    updateCartItemQuantity,
    setCartItemQuantity,
    removeFromCart,
    clearActiveCart,
    updateActiveTabInfo,
    completeCheckout,
    currentBranch,
    showToast,
    setCurrentView,
    orders,
    storeSettings,
    isPriceAuditConfirmed,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-all');
  const [productSearch, setProductSearch] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'PRODUCTS' | 'CART'>('PRODUCTS');

  const debouncedSearch = useDebounce(productSearch, 200);

  const activeTab = useMemo(
    () => orderTabs.find((t) => t.id === activeTabId) || orderTabs[0],
    [orderTabs, activeTabId]
  );

  // Filter products by category and search (memoized)
  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'cat-all' || p.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    });
  }, [products, selectedCategory, debouncedSearch]);

  // Calculate totals (memoized)
  const subtotal = useMemo(() => {
    return activeTab.items.reduce((sum, item) => {
      const discountedPrice = item.price * (1 - item.discount_percent / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);
  }, [activeTab.items]);

  const discountVal =
    activeTab.discount_type === 'PERCENT'
      ? (subtotal * activeTab.discount_amount) / 100
      : activeTab.discount_amount;

  const totalAmountToPay = Math.max(0, Math.round(subtotal - discountVal));
  const changeDue = Math.max(0, cashGiven - totalAmountToPay);

  const { productByIdMap, productByBarcodeOrSku } = useMemo(() => {
    const byId = new Map<string, Product>();
    const byBarcodeOrSku = new Map<string, Product>();
    for (const p of products) {
      if (p.id) byId.set(p.id, p);
      if (p.barcode) byBarcodeOrSku.set(p.barcode.trim(), p);
      if (p.sku) byBarcodeOrSku.set(p.sku.trim().toLowerCase(), p);
    }
    return { productByIdMap: byId, productByBarcodeOrSku: byBarcodeOrSku };
  }, [products]);

  // Quick Barcode Scan Simulation
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = barcodeInput.trim();
    if (!term) return;
    const found = productByBarcodeOrSku.get(term) || productByBarcodeOrSku.get(term.toLowerCase());
    if (found) {
      addToCart(found, 1);
      setBarcodeInput('');
      setShowBarcodeScanner(false);
      showToast(`Đã quét mã: ${found.name}`, 'success');
    } else {
      showToast(`Không tìm thấy mã vạch "${barcodeInput}"!`, 'error');
    }
  };

  const handleOpenPayment = () => {
    if (activeTab.items.length === 0) {
      showToast('Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán!', 'warning');
      return;
    }
    setCashGiven(totalAmountToPay);
    setIsPaymentModalOpen(true);
  };

  const handleFinishCheckout = () => {
    const order = completeCheckout(selectedPaymentMethod, cashGiven);
    if (order) {
      setIsPaymentModalOpen(false);
    }
  };

  const [posOfflineQrUrl, setPosOfflineQrUrl] = useState<string>('');
  const [posQrError, setPosQrError] = useState<boolean>(false);

  // Dynamic VietQR payment URL using store settings
  const qrTransferMemo = storeSettings.transferSyntaxPrefix
    ? storeSettings.transferSyntaxPrefix.replace('{order_code}', activeTab.title)
    : `NGANSON ${activeTab.title}`;

  const qrPaymentUrl = storeSettings.useCustomQr && storeSettings.customQrImage
    ? storeSettings.customQrImage
    : getVietQRUrl(
        storeSettings.bankId || 'MB',
        storeSettings.accountNumber || '0912345678',
        storeSettings.qrTemplate || 'compact2',
        totalAmountToPay,
        qrTransferMemo,
        storeSettings.accountHolder || 'PHAN ANH TAI'
      );

  // Pre-generate offline QR for instant POS payment display
  useEffect(() => {
    if (isPaymentModalOpen && selectedPaymentMethod === 'TRANSFER') {
      generateOfflineQrDataUrl(
        storeSettings.bankId || 'MB',
        storeSettings.accountNumber || '0912345678',
        totalAmountToPay,
        qrTransferMemo
      ).then((url) => setPosOfflineQrUrl(url)).catch(console.error);
    }
  }, [isPaymentModalOpen, selectedPaymentMethod, totalAmountToPay, qrTransferMemo, storeSettings]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // POS Keyboard Shortcuts (F2: Search, F3: Barcode, F4: New Tab, F9: Payment, Esc: Cancel/Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If payment modal is open
      if (isPaymentModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsPaymentModalOpen(false);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleFinishCheckout();
        }
        return;
      }

      // If voice modal is open
      if (isVoiceModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsVoiceModalOpen(false);
        }
        return;
      }

      // F2: Focus product search input
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F3: Toggle & focus barcode input
      else if (e.key === 'F3') {
        e.preventDefault();
        setShowBarcodeScanner((prev) => !prev);
        setTimeout(() => barcodeInputRef.current?.focus(), 80);
      }
      // F4: Create new order tab
      else if (e.key === 'F4') {
        e.preventDefault();
        createNewTab();
        showToast('Đã mở tab đơn hàng mới (F4)', 'info');
      }
      // F9: Open payment checkout modal
      else if (e.key === 'F9') {
        e.preventDefault();
        handleOpenPayment();
      }
      // Escape: Close barcode input or clear search
      else if (e.key === 'Escape') {
        if (showBarcodeScanner) {
          setShowBarcodeScanner(false);
        } else if (productSearch) {
          setProductSearch('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaymentModalOpen,
    isVoiceModalOpen,
    showBarcodeScanner,
    productSearch,
    activeTab.items,
    totalAmountToPay,
    selectedPaymentMethod,
    cashGiven,
  ]);

  const totalCartItemCount = activeTab.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden bg-slate-100 rounded-lg border border-slate-200 shadow-2xs">
      {/* Mobile Top Navigation Tabs (Only visible on small screens) */}
      <div className="md:hidden bg-white border-b border-slate-200 p-1.5 flex items-center gap-1.5 shrink-0 z-10">
        <button
          onClick={() => setMobileTab('PRODUCTS')}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'PRODUCTS'
              ? 'bg-[#0B63E5] text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Hàng Hóa ({products.length})</span>
        </button>

        <button
          onClick={() => setMobileTab('CART')}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'CART'
              ? 'bg-[#0B63E5] text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Giỏ Hàng</span>
          {totalCartItemCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              mobileTab === 'CART' ? 'bg-white text-[#0B63E5]' : 'bg-[#0B63E5] text-white'
            }`}>
              {totalCartItemCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* LEFT PANEL: Product Catalog (65% on Desktop, Full screen on Mobile when mobileTab === 'PRODUCTS') */}
        <div className={`${mobileTab === 'PRODUCTS' ? 'flex' : 'hidden'} md:flex flex-[65] flex-col h-full border-r border-slate-200 bg-slate-50 overflow-hidden relative`}>
          {/* Top Search & Filter Bar */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm mặt hàng theo tên, mã SKU, Barcode... (F2 hoặc bấm mic để nói)"
                  className="w-full pl-9 pr-14 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-900 border border-slate-200 rounded-md focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all"
                  aria-label="Tìm kiếm hàng hóa (Phím tắt F2)"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {productSearch && (
                    <button
                      onClick={() => setProductSearch('')}
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Nói để tìm kiếm hoặc tạo đơn (VD: Bán 2 bóng rạng đông 9w)"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Barcode Scanner Button */}
              <button
                onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                  showBarcodeScanner
                    ? 'bg-[#0B63E5] text-white border-[#0B63E5] shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Quét Barcode máy tính"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quét Barcode</span>
              </button>

              {/* Voice AI POS Assistant Button */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                title="Lập hóa đơn bằng giọng nói AI (VD: Bán 2 quạt panasonic giảm 50k cho anh Minh)"
              >
                <Mic className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span className="hidden sm:inline">Lập đơn giọng nói</span>
              </button>

              {/* Invoices List / Edit past invoice Quick Link */}
              <button
                onClick={() => setCurrentView('orders')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-[#0B63E5] transition-all cursor-pointer shadow-2xs"
                title="Xem danh sách & Cập nhật hóa đơn cũ"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hóa đơn cũ</span>
                {orders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#0B63E5] text-white text-[10px] font-bold">
                    {orders.length}
                  </span>
                )}
              </button>
            </div>

            {/* Barcode Quick Input Popup */}
            {showBarcodeScanner && (
              <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 bg-blue-50 p-2 rounded-md border border-blue-200 animate-in fade-in duration-100">
                <span className="text-xs font-semibold text-[#0B63E5] shrink-0">Nhập mã vạch (F3):</span>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Ví dụ: 893600100101 (Nhấn Enter)"
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0B63E5]"
                  aria-label="Nhập mã vạch sản phẩm"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#0B63E5] hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer active:scale-95"
                >
                  Nhận
                </button>
              </form>
            )}

            {/* Category Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B63E5] text-white font-semibold shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 pb-16 md:pb-3">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <PackageOpen className="w-10 h-10 stroke-[1.5] mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Không tìm thấy sản phẩm phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng thử từ khóa tìm kiếm hoặc danh mục khác</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.min_stock;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product, 1)}
                      className={`group bg-white rounded-lg border p-2 flex flex-col justify-between transition-all duration-100 relative select-none ${
                        isOutOfStock
                          ? 'opacity-60 cursor-not-allowed border-rose-200 bg-rose-50/20'
                          : 'hover:shadow-sm hover:border-[#0B63E5] active:scale-[0.98] cursor-pointer border-slate-200'
                      }`}
                    >
                      {/* Stock Badge */}
                      <div className="absolute top-1.5 right-1.5 z-10">
                        {isOutOfStock ? (
                          <span className="badge-red text-[9px]">
                            Hết
                          </span>
                        ) : isLowStock ? (
                          <span className="badge-orange text-[9px]">
                            Tồn {product.stock}
                          </span>
                        ) : (
                          <span className="badge-green text-[9px]">
                            Tồn {product.stock}
                          </span>
                        )}
                      </div>

                      {/* Thumbnail Image */}
                      <div className="w-full aspect-4/3 rounded overflow-hidden bg-slate-100 mb-1.5 relative flex items-center justify-center text-slate-300">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-7 h-7 text-slate-300 stroke-[1.5]" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-800 line-clamp-1 leading-snug group-hover:text-[#0B63E5] transition-colors">
                          {product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                          <span>{product.sku}</span>
                          <span>{product.unit}</span>
                        </div>
                      </div>

                      {/* Price Tag */}
                      <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs font-bold text-[#0B63E5]">
                          {formatCurrency(product.selling_price)}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0B63E5] flex items-center justify-center text-xs group-hover:bg-[#0B63E5] group-hover:text-white transition-colors">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating Cart Bar on Mobile (when user is browsing products & has items in cart) */}
          {totalCartItemCount > 0 && (
            <div className="md:hidden absolute bottom-3 left-3 right-3 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl backdrop-blur-xs flex items-center justify-between gap-3 z-20 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {totalCartItemCount}
                  </span>
                </div>
                <div className="truncate">
                  <div className="text-[10px] text-slate-300">Tổng tạm tính:</div>
                  <div className="text-xs font-black text-white">{formatCurrency(totalAmountToPay)}</div>
                </div>
              </div>

              <button
                onClick={() => setMobileTab('CART')}
                className="px-3.5 py-1.5 bg-[#0B63E5] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md transition-all shrink-0"
              >
                <span>Xem Giỏ & Trả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: 35% Multi-Tab Cart & Checkout (Full screen on Mobile when mobileTab === 'CART') */}
        <div className={`${mobileTab === 'CART' ? 'flex' : 'hidden'} md:flex flex-[35] flex-col h-full bg-white border-l border-slate-200 shadow-sm overflow-hidden`}>
          {/* Mobile Back Button to Products */}
          <div className="md:hidden bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setMobileTab('PRODUCTS')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>← Tiếp tục chọn hàng hóa</span>
            </button>
            <span className="text-[10px] text-slate-500 font-medium">Chi nhánh: {currentBranch.name}</span>
          </div>

          {/* Multi-Tab Header ("Đơn 1", "Đơn 2", "+") */}
          <div className="bg-slate-50 border-b border-slate-200 px-2.5 pt-2 flex items-center gap-1 overflow-x-auto shrink-0">
            {orderTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const itemCount = tab.items.reduce((s, i) => s + i.quantity, 0);

              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md text-xs font-semibold cursor-pointer border-t border-x transition-all ${
                    isActive
                      ? 'bg-white border-slate-200 text-[#0B63E5] shadow-2xs font-bold'
                      : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{tab.title}</span>
                  {itemCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                        isActive ? 'bg-[#0B63E5] text-white' : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {itemCount}
                    </span>
                  )}
                  {orderTabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={createNewTab}
              className="p-1 mb-0.5 text-slate-500 hover:text-[#0B63E5] hover:bg-blue-50 rounded transition-colors cursor-pointer"
              title="Tạo thêm đơn hàng mới"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Customer Information Row */}
          <div className="p-2.5 bg-white border-b border-slate-100 flex items-center gap-2 text-xs shrink-0">
            <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus-within:border-[#0B63E5] focus-within:bg-white transition-all">
              <User className="w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={activeTab.customer_name}
                onChange={(e) => updateActiveTabInfo({ customer_name: e.target.value })}
                placeholder="Tên khách hàng"
                className="bg-transparent text-xs text-slate-900 outline-none w-full font-medium"
              />
            </div>
            <div className="w-32 flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus-within:border-[#0B63E5] focus-within:bg-white transition-all">
              <Phone className="w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={activeTab.customer_phone}
                onChange={(e) => updateActiveTabInfo({ customer_phone: e.target.value })}
                placeholder="Số điện thoại"
                className="bg-transparent text-xs text-slate-900 outline-none w-full"
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-2.5 divide-y divide-slate-100">
            {activeTab.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingBag className="w-8 h-8 stroke-[1.5] mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Giỏ hàng đang trống</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Click vào các sản phẩm để thêm vào đơn</p>
              </div>
            ) : (
              activeTab.items.map((item) => {
              const prod = productByIdMap.get(item.product_id);
              const isConfirmed = prod ? isPriceAuditConfirmed(prod) : false;
              const isBelowCost = !isConfirmed && prod && prod.cost_price > 0 && item.price < prod.cost_price;
              const isHighMargin = !isConfirmed && prod && prod.cost_price > 0 && item.price > prod.cost_price * 3;

              return (
                <div key={item.product_id} className="py-2 flex items-start justify-between gap-2 group">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 leading-snug truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{item.sku}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#0B63E5]">{formatCurrency(item.price)}</span>
                      {isBelowCost && (
                        <span
                          className="text-[9px] text-rose-700 font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-200"
                          title={`Giá vốn: ${formatCurrency(prod!.cost_price)}`}
                        >
                          ⚠️ Bán dưới vốn
                        </span>
                      )}
                      {isHighMargin && (
                        <span
                          className="text-[9px] text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200"
                          title={`Giá vốn: ${formatCurrency(prod!.cost_price)} (Lãi ${(item.price / prod!.cost_price).toFixed(1)}x)`}
                        >
                          📈 Lãi &gt; 3x
                        </span>
                      )}
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex items-center border border-slate-200 rounded bg-slate-50 overflow-hidden shadow-2xs">
                        <button
                          onClick={() => updateCartItemQuantity(item.product_id, -1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.max_stock}
                          value={item.quantity}
                          onChange={(e) => setCartItemQuantity(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-9 h-7 text-center text-xs font-bold text-slate-800 bg-white border-x border-slate-200 focus:outline-none"
                        />
                        <button
                          onClick={() => updateCartItemQuantity(item.product_id, 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400">{item.unit}</span>
                    </div>
                  </div>

                  {/* Right: Item Total & Remove */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      {formatCurrency(item.price * item.quantity * (1 - item.discount_percent / 100))}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="mt-1 text-slate-300 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>

          {/* Cart Calculation & Action Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Tổng tiền hàng ({totalCartItemCount} món):</span>
              <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount Field */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Chiết khấu đơn:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={activeTab.discount_amount || ''}
                  onChange={(e) =>
                    updateActiveTabInfo({ discount_amount: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  placeholder="0"
                  className="w-20 px-2 py-0.5 text-right text-xs bg-white border border-slate-200 rounded focus:border-[#0B63E5] outline-none font-medium"
                />
                <span className="text-xs text-slate-500 font-medium">đ</span>
              </div>
            </div>

            {/* Final Amount Required */}
            <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-slate-200 text-slate-950">
              <span>KHÁCH CẦN TRẢ:</span>
              <span className="text-base text-[#0B63E5] font-extrabold tracking-tight">
                {formatCurrency(totalAmountToPay)}
              </span>
            </div>

            {/* Buttons: Clear & Checkout */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={clearActiveCart}
                disabled={activeTab.items.length === 0}
                className="p-2.5 rounded-md border border-slate-200 hover:bg-slate-200/60 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
                title="Hủy giỏ hàng"
                aria-label="Hủy giỏ hàng hiện tại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenPayment}
                disabled={activeTab.items.length === 0}
                className="flex-1 bg-[#0B63E5] hover:bg-[#0952C4] active:bg-blue-800 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-md text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                aria-label="Tiến hành thanh toán (Phím tắt F9)"
              >
                <span>TIẾN HÀNH THANH TOÁN</span>
                <span className="hidden sm:inline opacity-80 font-mono text-[10px] bg-white/20 px-1 py-0.2 rounded font-bold">F9</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* POS Keyboard Shortcuts Bar */}
            <div className="hidden lg:flex items-center justify-between px-2 py-1 bg-slate-100 rounded text-[10px] text-slate-500 font-medium select-none border border-slate-200/60 mt-1">
              <span><kbd className="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono font-bold text-slate-700">F2</kbd> Tìm hàng</span>
              <span><kbd className="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono font-bold text-slate-700">F3</kbd> Mã vạch</span>
              <span><kbd className="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono font-bold text-slate-700">F4</kbd> Đơn mới</span>
              <span><kbd className="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono font-bold text-slate-700">F9</kbd> Thanh toán</span>
              <span><kbd className="px-1 py-0.2 bg-white rounded border border-slate-300 font-mono font-bold text-slate-700">Esc</kbd> Đóng</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL (TIỀN MẶT, VIETQR CHUYỂN KHOẢN, QUẸT THẺ) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
            {/* Header */}
            <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Thanh toán đơn hàng - {activeTab.title}</h3>
                <p className="text-xs text-blue-100">Chi nhánh: {currentBranch.name}</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Total Summary */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs font-semibold text-blue-900">Tổng tiền cần thanh toán:</span>
                <span className="text-xl font-black text-blue-700">{formatCurrency(totalAmountToPay)}</span>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Phương thức thanh toán:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('CASH')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedPaymentMethod === 'CASH'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span>Tiền mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('TRANSFER')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedPaymentMethod === 'TRANSFER'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>Chuyển khoản VietQR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('CARD')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      selectedPaymentMethod === 'CARD'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Quẹt thẻ POS</span>
                  </button>
                </div>
              </div>

              {/* METHOD 1: CASH DETAILS */}
              {selectedPaymentMethod === 'CASH' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Tiền khách đưa:</label>
                    <input
                      type="number"
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(parseInt(e.target.value) || 0)}
                      placeholder={totalAmountToPay.toString()}
                      className="w-full text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  {/* Quick Denomination Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Đúng số tiền', val: totalAmountToPay },
                      { label: '50.000 đ', val: 50000 },
                      { label: '100.000 đ', val: 100000 },
                      { label: '200.000 đ', val: 200000 },
                      { label: '500.000 đ', val: 500000 },
                      { label: '1.000.000 đ', val: 1000000 },
                    ].map((den, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashGiven(den.val)}
                        className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded text-xs font-medium text-slate-700 transition-colors"
                      >
                        {den.label}
                      </button>
                    ))}
                  </div>

                  {/* Change returned to customer */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-600 font-medium">Tiền thừa trả khách:</span>
                    <span className="text-base font-bold text-emerald-600">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* METHOD 2: VIETQR DYNAMIC CODE */}
              {selectedPaymentMethod === 'TRANSFER' && (
                <div className="flex flex-col items-center bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="text-xs font-semibold text-slate-700">
                    Quét mã VietQR tự động điền số tiền & nội dung:
                  </div>
                  <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-sm">
                    <img
                      src={
                        storeSettings.useCustomQr && storeSettings.customQrImage
                          ? storeSettings.customQrImage
                          : posQrError && posOfflineQrUrl
                          ? posOfflineQrUrl
                          : (posOfflineQrUrl || qrPaymentUrl)
                      }
                      alt="VietQR Dynamic Payment"
                      onError={() => setPosQrError(true)}
                      className="w-48 h-48 object-contain mx-auto rounded"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-slate-800 font-mono font-bold">
                      {storeSettings.bankName || storeSettings.bankId} • {storeSettings.accountNumber}
                    </div>
                    <div className="text-[11px] text-blue-700 font-bold uppercase">
                      {storeSettings.accountHolder}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setCurrentView('settings');
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                  >
                    ⚙️ Tùy chỉnh tài khoản & mã QR cửa hàng
                  </button>
                </div>
              )}

              {/* METHOD 3: CARD POS */}
              {selectedPaymentMethod === 'CARD' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
                  <CreditCard className="w-10 h-10 text-blue-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-800">
                    Vui lòng chạm hoặc cắm thẻ vào thiết bị POS quẹt thẻ
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hỗ trợ thẻ ATM Napas, Visa, Mastercard, JCB, Apple Pay
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                aria-label="Hủy bỏ thanh toán (Phím tắt Esc)"
              >
                <span>Hủy bỏ</span>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-200/70 px-1 py-0.2 rounded font-bold">Esc</span>
              </button>
              <button
                type="button"
                onClick={handleFinishCheckout}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
                aria-label="Hoàn tất và in hóa đơn (Phím tắt Enter)"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>HOÀN TẤT & IN HÓA ĐƠN</span>
                <span className="font-mono text-[10px] bg-white/25 px-1.5 py-0.2 rounded font-bold text-white">Enter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant Modal */}
      <VoiceActionModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialMode="POS_ORDER"
      />
    </div>
  );
};
