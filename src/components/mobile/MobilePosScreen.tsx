import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getVietQRUrl } from '../../utils/formatters';
import { generateOfflineQrDataUrl } from '../../utils/vietqr';
import { Product } from '../../types';
import {
  Search,
  Plus,
  ScanBarcode,
  User,
  Tag,
  SlidersHorizontal,
  Clock,
  ImageIcon,
  ShoppingBag,
  FileText,
  Settings,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Trash2,
  Check,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';
import { MobileCustomerPickerModal } from './MobileCustomerPickerModal';
import { MobileCashbookModal } from './MobileCashbookModal';
import { MobileStoreSettingsModal } from './MobileStoreSettingsModal';
import { MobileCustomItemModal } from './MobileCustomItemModal';
import { MobileBarcodeScannerModal } from './MobileBarcodeScannerModal';
import { MobileOrdersManagementModal } from './MobileOrdersManagementModal';

interface MobilePosScreenProps {
  onOpenVoiceAssistant?: () => void;
}

export const MobilePosScreen: React.FC<MobilePosScreenProps> = () => {
  const {
    products,
    customers,
    categories,
    orderTabs,
    activeTabId,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearActiveCart,
    completeCheckout,
    updateActiveTabInfo,
    storeSettings,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCashbookModalOpen, setIsCashbookModalOpen] = useState(false);
  const [isStoreSettingsModalOpen, setIsStoreSettingsModalOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [posQrTs, setPosQrTs] = useState<number>(Date.now());
  const [posOfflineQrUrl, setPosOfflineQrUrl] = useState<string>('');
  const [isPosQrLoading, setIsPosQrLoading] = useState<boolean>(false);
  const [posQrError, setPosQrError] = useState<boolean>(false);

  // New states for full button functionality
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isOrdersManagementOpen, setIsOrdersManagementOpen] = useState(false);
  const [isPriceTierSheetOpen, setIsPriceTierSheetOpen] = useState(false);
  const [isPosCategorySheetOpen, setIsPosCategorySheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [priceTier, setPriceTier] = useState<'STANDARD' | 'CONTRACTOR' | 'WHOLESALE'>('STANDARD');
  const [posMode, setPosMode] = useState<'SALE' | 'PRE_ORDER'>('SALE');

  const activeTab = useMemo(() => {
    return orderTabs.find((t) => t.id === activeTabId) || orderTabs[0];
  }, [orderTabs, activeTabId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const currentCustomerName = selectedCustomer ? selectedCustomer.name : (activeTab.customer_name || 'Khách lẻ');

  const [stockFilterMode, setStockFilterMode] = useState<'OUT_OF_STOCK_LAST' | 'HIDE_OUT_OF_STOCK'>('OUT_OF_STOCK_LAST');

  // Filter products for selling, always default pushes out-of-stock items (stock <= 0) to bottom
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category === selectedCategory || (p as any).category_id === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)
      );
    }

    if (stockFilterMode === 'HIDE_OUT_OF_STOCK') {
      list = list.filter((p) => (p.stock ?? 0) > 0);
    } else {
      // Mặc định: Luôn đẩy các mặt hàng hết hàng (stock <= 0) xuống cuối danh sách
      list = [...list].sort((a, b) => {
        const aOut = (a.stock ?? 0) <= 0 ? 1 : 0;
        const bOut = (b.stock ?? 0) <= 0 ? 1 : 0;
        if (aOut !== bOut) {
          return aOut - bOut;
        }
        return 0;
      });
    }

    return list;
  }, [products, searchQuery, selectedCategory, stockFilterMode]);

  // Sync price tier from active tab discount
  useEffect(() => {
    if (activeTab.discount_type === 'PERCENT') {
      if (activeTab.discount_amount === 5) setPriceTier('CONTRACTOR');
      else if (activeTab.discount_amount === 10) setPriceTier('WHOLESALE');
      else if (activeTab.discount_amount === 0) setPriceTier('STANDARD');
    }
  }, [activeTab.discount_amount, activeTab.discount_type]);

  const handleSelectPriceTier = (tier: 'STANDARD' | 'CONTRACTOR' | 'WHOLESALE') => {
    setPriceTier(tier);
    const discountPercent = tier === 'CONTRACTOR' ? 5 : tier === 'WHOLESALE' ? 10 : 0;
    updateActiveTabInfo({
      discount_amount: discountPercent,
      discount_type: 'PERCENT',
    });
    setIsPriceTierSheetOpen(false);
    const title = tier === 'CONTRACTOR' ? 'Giá thợ & công trình (-5%)' : tier === 'WHOLESALE' ? 'Giá bán sỉ / Đại lý (-10%)' : 'Bảng giá chung (Mặc định)';
    showToast(`Đã áp dụng: ${title}`, 'success');
  };

  const discountMultiplier = useMemo(() => {
    if (activeTab.discount_type === 'PERCENT' && activeTab.discount_amount > 0) {
      return (100 - activeTab.discount_amount) / 100;
    }
    if (priceTier === 'CONTRACTOR') return 0.95;
    if (priceTier === 'WHOLESALE') return 0.90;
    return 1.0;
  }, [priceTier, activeTab.discount_amount, activeTab.discount_type]);

  // Cart calculations aligned with activeTab and AppContext completeCheckout
  const rawSubtotal = useMemo(() => {
    return activeTab.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [activeTab.items]);

  const discountAmount = useMemo(() => {
    if (activeTab.discount_type === 'PERCENT') {
      return Math.round((rawSubtotal * (activeTab.discount_amount || 0)) / 100);
    }
    return activeTab.discount_amount || 0;
  }, [rawSubtotal, activeTab.discount_amount, activeTab.discount_type]);

  const cartSubtotal = useMemo(() => {
    return Math.max(0, rawSubtotal - discountAmount);
  }, [rawSubtotal, discountAmount]);

  // Pre-generate offline QR for instant POS payment display
  useEffect(() => {
    if (isPaymentModalOpen && paymentMethod === 'TRANSFER') {
      const memo = storeSettings?.transferSyntaxPrefix
        ? storeSettings.transferSyntaxPrefix.replace('{order_code}', activeTab?.title || 'DH')
        : `NGANSON ${activeTab?.title || 'DH'}`;
      generateOfflineQrDataUrl(
        storeSettings?.bankId || 'MB',
        storeSettings?.accountNumber || '0912345678',
        cartSubtotal,
        memo
      ).then(url => {
        setPosOfflineQrUrl(url);
      }).catch(console.error);
    }
  }, [isPaymentModalOpen, paymentMethod, cartSubtotal, activeTab?.title, storeSettings]);

  // Fast 1.5s fallback for POS QR
  useEffect(() => {
    let timer: NodeJS.Timeout | number;
    if (isPosQrLoading) {
      timer = setTimeout(() => {
        setIsPosQrLoading(false);
        setPosQrError(true);
      }, 1500);
    }
    return () => clearTimeout(timer);
  }, [isPosQrLoading]);

  const cartTotalItems = useMemo(() => {
    return activeTab.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [activeTab.items]);

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = () => {
    if (isCheckingOut) return;
    if (activeTab.items.length === 0) {
      showToast('Giỏ hàng đang trống!', 'warning');
      return;
    }

    setIsCheckingOut(true);
    try {
      if (posMode === 'PRE_ORDER') {
        const preOrderCode = `DH${Date.now().toString().slice(-6)}`;
        const itemsSummary = activeTab.items
          .map((i) => `${i.name} (x${i.quantity})`)
          .join(', ');
        const newPreOrder = {
          id: `pre-${Date.now()}`,
          code: preOrderCode,
          customerName: currentCustomerName || 'Khách lẻ',
          phone: activeTab.customer_phone || '',
          itemsSummary: itemsSummary || 'Hàng đặt',
          totalAmount: cartSubtotal,
          depositAmount: cartSubtotal,
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
          status: 'PENDING' as const,
          createdAt: Date.now(),
        };
        const saved = localStorage.getItem('nganson_preorders');
        const list = saved ? JSON.parse(saved) : [];
        localStorage.setItem('nganson_preorders', JSON.stringify([newPreOrder, ...list]));

        clearActiveCart();
        setIsPaymentModalOpen(false);
        setIsCartDrawerOpen(false);
        showToast(`Đã lưu đơn đặt hàng ${preOrderCode} thành công!`, 'success');
        return;
      }

      const order = completeCheckout(paymentMethod, cartSubtotal);
      if (order) {
        setIsPaymentModalOpen(false);
        setIsCartDrawerOpen(false);
        showToast(`Đã thanh toán thành công đơn ${order.code}!`, 'success');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F6F8] pb-28 text-slate-800">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Bán hàng</h1>
          {posMode === 'PRE_ORDER' && (
            <button
              onClick={() => {
                setPosMode('SALE');
                showToast('Đã chuyển về chế độ Bán hàng lẻ', 'info');
              }}
              className="px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Chạm để chuyển về Bán hàng lẻ"
            >
              <span>ĐẶT HÀNG</span>
              <span className="text-amber-600 font-bold ml-0.5">✕</span>
            </button>
          )}
        </div>
        <button
          aria-label="Xem giỏ hàng"
          onClick={() => setIsCartDrawerOpen(true)}
          className="relative p-1.5 text-slate-600 hover:text-[#0066FF] transition-colors"
          title="Xem giỏ hàng"
        >
          <Clock className="w-5 h-5" />
          {cartTotalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#0066FF] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {cartTotalItems}
            </span>
          )}
        </button>
      </div>

      {/* Top Banner when in PRE_ORDER mode */}
      {posMode === 'PRE_ORDER' && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Chế độ: Đặt hàng / Nhận cọc</span>
          </div>
          <button
            onClick={() => {
              setPosMode('SALE');
              showToast('Đã chuyển về chế độ Bán hàng lẻ', 'info');
            }}
            className="px-2.5 py-0.5 bg-white border border-amber-300 rounded-lg font-bold text-amber-700 active:scale-95 shadow-2xs hover:bg-amber-100/50 cursor-pointer"
          >
            Quay lại Bán hàng
          </button>
        </div>
      )}

      {/* Search Bar Row (Image 5) */}
      <div className="p-3 bg-white border-b border-slate-100 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tên, mã hàng, mã vạch, lô ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400"
          />
          {searchQuery && (
            <button aria-label="Xóa tìm kiếm" onClick={() => setSearchQuery('')} className="p-0.5 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Add Custom (+) */}
        <button aria-label="Thêm hàng nhanh" onClick={() => setIsCustomItemModalOpen(true)} className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-slate-700 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-colors" title="Thêm hàng nhanh"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Barcode Scanner Icon */}
        <button aria-label="Quét mã vạch" onClick={() => setIsBarcodeModalOpen(true)} className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-slate-700 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition-colors" title="Quét mã vạch"
        >
          <ScanBarcode className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Settings Row */}
      <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-100 text-xs font-medium text-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-1 hover:text-[#0066FF] transition-colors truncate"
          >
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate max-w-[110px]">{currentCustomerName}</span>
          </button>

          <button
            onClick={() => setIsPriceTierSheetOpen(true)}
            className="flex items-center gap-1 text-slate-700 hover:text-[#0066FF] transition-colors shrink-0"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              {priceTier === 'STANDARD'
                ? 'Bảng giá chung'
                : priceTier === 'CONTRACTOR'
                ? 'Giá thợ (-5%)'
                : 'Giá sỉ (-10%)'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const nextMode = stockFilterMode === 'OUT_OF_STOCK_LAST' ? 'HIDE_OUT_OF_STOCK' : 'OUT_OF_STOCK_LAST';
              setStockFilterMode(nextMode);
              showToast(
                nextMode === 'HIDE_OUT_OF_STOCK'
                  ? 'Đang ẩn các mặt hàng đã hết kho'
                  : 'Mặc định: Đã đẩy các mặt hàng hết kho xuống cuối',
                'info'
              );
            }}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-all ${
              stockFilterMode === 'HIDE_OUT_OF_STOCK'
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-blue-50 text-[#0066FF] border-blue-200'
            }`}
            title="Bộ lọc tồn kho"
          >
            <ArrowUpDown className="w-3 h-3 shrink-0" />
            <span>{stockFilterMode === 'HIDE_OUT_OF_STOCK' ? 'Ẩn hết' : 'Hết ở cuối'}</span>
          </button>

          <button
            aria-label="Lọc theo nhóm hàng"
            onClick={() => setIsPosCategorySheetOpen(true)}
            className={`p-1 transition-colors ${
              selectedCategory !== 'ALL' ? 'text-[#0066FF]' : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Lọc theo nhóm hàng"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products List (Image 5 & 14) */}
      <div className="p-3 flex flex-col gap-2">
        {filteredProducts.map((p) => {
          const inCartItem = activeTab.items.find((i) => i.product_id === p.id);
          const isOutOfStock = (p.stock ?? 0) <= 0;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (isOutOfStock) {
                  showToast(`Sản phẩm "${p.name}" hiện đã hết hàng trong kho!`, 'warning');
                  return;
                }
                addToCart(p);
                showToast(`Đã thêm ${p.name} vào đơn`, 'info');
              }}
              className={`rounded-2xl p-3.5 flex items-center justify-between border shadow-2xs transition-all ${
                isOutOfStock
                  ? 'bg-slate-50/70 border-rose-100 opacity-60 cursor-not-allowed'
                  : 'bg-white border-slate-100 hover:shadow-xs active:bg-blue-50/50 cursor-pointer'
              }`}
            >
              {/* Left Column: Image & Details */}
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-center shrink-0 text-[#0066FF]">
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-blue-400" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-sm text-slate-900 truncate">{p.name}</span>
                    <span className="text-xs text-slate-400">({p.unit})</span>
                  </div>

                  {/* Badges: SKU, Stock, KH đặt */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-slate-400 font-mono">{p.sku}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                        isOutOfStock ? 'bg-red-50 text-red-600 font-bold' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isOutOfStock ? 'Hết hàng' : `${p.stock} ${p.unit}`}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 font-medium">
                      KH đặt: 0
                    </span>
                  </div>

                  {/* Price */}
                  <div className="font-bold text-sm text-[#0066FF] mt-1">
                    {Math.round(p.selling_price * discountMultiplier).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Right Column: Quantity badge if added */}
              {inCartItem && (
                <div className="w-7 h-7 rounded-full bg-[#0066FF] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm animate-in zoom-in-75">
                  {inCartItem.quantity}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Pill: Đặt hàng | Bán hàng | ... (Image 5) */}
      <div className="fixed bottom-20 inset-x-0 flex items-center justify-center z-30 px-4">
        <div className="bg-white rounded-full p-1 shadow-xl border border-slate-200/90 flex items-center gap-1">
          {/* Nút Đặt hàng */}
          <button
            onClick={() => {
              if (posMode === 'PRE_ORDER') {
                setIsCartDrawerOpen(true);
              } else {
                setPosMode('PRE_ORDER');
                showToast('Đã chuyển sang chế độ Đặt hàng / Nhận cọc', 'info');
              }
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              posMode === 'PRE_ORDER'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Đặt hàng</span>
            {posMode === 'PRE_ORDER' && cartTotalItems > 0 && (
              <span className="bg-white text-amber-600 rounded-full px-1.5 py-0.2 text-[10px] font-black">
                {cartTotalItems}
              </span>
            )}
          </button>

          {/* Nút Bán hàng */}
          <button
            onClick={() => {
              if (posMode === 'SALE') {
                setIsCartDrawerOpen(true);
              } else {
                setPosMode('SALE');
                showToast('Đã chuyển về chế độ Bán hàng lẻ', 'info');
              }
            }}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              posMode === 'SALE'
                ? 'bg-[#0066FF] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <span>Bán hàng</span>
            {posMode === 'SALE' && cartTotalItems > 0 && (
              <span className="bg-white text-[#0066FF] rounded-full px-1.5 py-0.2 text-[10px] font-black">
                {cartTotalItems}
              </span>
            )}
          </button>

          <button
            aria-label="Thao tác khác"
            onClick={() => setIsActionSheetOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Thao tác khác"
          >
            <span className="text-base font-black leading-none mb-1">•••</span>
          </button>
        </div>
      </div>

      {/* Action Sheet (Image 15) */}
      {isActionSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsActionSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-2" />
            <div className="grid grid-cols-3 gap-3 text-center">
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsOrdersManagementOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 rounded-2xl transition-colors active:scale-95"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-700 leading-tight">Xử lý đặt hàng</span>
              </button>

              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsCashbookModalOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 rounded-2xl transition-colors active:scale-95"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-700 leading-tight">Lập phiếu thu</span>
              </button>

              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsStoreSettingsModalOpen(true);
                }}
                className="flex flex-col items-center gap-2 p-2 hover:bg-slate-50 rounded-2xl transition-colors active:scale-95"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <Settings className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-700 leading-tight">Thiết lập bán hàng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Slide-up Checkout */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={() => setIsCartDrawerOpen(false)}>
          <div
            className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {posMode === 'PRE_ORDER' ? 'Đơn đặt hàng' : 'Giỏ hàng'} ({cartTotalItems} món)
                </h3>
                <span className="text-xs text-slate-500 font-medium">Khách: {currentCustomerName}</span>
              </div>
              <button aria-label="Đóng giỏ hàng" onClick={() => setIsCartDrawerOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[160px]">
              {activeTab.items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                  <ShoppingBag className="w-12 h-12 text-slate-300 stroke-[1.5] mb-2" />
                  <span className="text-sm font-bold text-slate-600">Giỏ hàng đang trống</span>
                  <span className="text-xs text-slate-400 mt-1">Chạm vào sản phẩm trong danh sách để thêm vào đơn</span>
                </div>
              ) : (
                activeTab.items.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-bold text-sm text-slate-900 block truncate">{item.name}</span>
                    <span className="text-xs text-[#0066FF] font-semibold">{formatCurrency(item.price)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartItemQuantity(item.product_id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-sm text-slate-800">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(item.product_id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1 text-red-500 ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )))}
            </div>

            {/* Total and Checkout Button */}
            <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Tổng thanh toán:</span>
                <span className="text-xl font-black text-[#0066FF]">{formatCurrency(cartSubtotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPaymentMethod('CASH');
                    setIsPaymentModalOpen(true);
                  }}
                  className="py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Tiền mặt</span>
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('TRANSFER');
                    setIsPaymentModalOpen(true);
                  }}
                  className="py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                >
                  <QrCode className="w-4 h-4" />
                  <span>VietQR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal (VietQR / Cash) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center gap-4 text-center shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900">
              {paymentMethod === 'CASH' ? 'Thanh toán Tiền mặt' : 'Quét mã VietQR'}
            </h3>

            <div className="text-2xl font-black text-[#0066FF]">
              {formatCurrency(cartSubtotal)}
            </div>

            {paymentMethod === 'TRANSFER' && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center gap-2 w-full">
                <div className="relative p-2 bg-white rounded-xl shadow-xs border border-slate-200 min-h-[190px] min-w-[190px] flex items-center justify-center">
                  {isPosQrLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-xl flex items-center justify-center z-10">
                      <RefreshCw className="w-7 h-7 text-[#0066FF] animate-spin" />
                    </div>
                  )}
                  <img
                    key={posQrTs}
                    src={
                      storeSettings?.useCustomQr && storeSettings?.customQrImage
                        ? storeSettings.customQrImage
                        : posQrError && posOfflineQrUrl
                        ? posOfflineQrUrl
                        : (posOfflineQrUrl || getVietQRUrl(
                            storeSettings?.bankId || 'MB',
                            storeSettings?.accountNumber || '0912345678',
                            storeSettings?.qrTemplate || 'compact2',
                            cartSubtotal,
                            storeSettings?.transferSyntaxPrefix
                              ? storeSettings.transferSyntaxPrefix.replace('{order_code}', activeTab.title)
                              : `NGANSON ${activeTab.title}`,
                            storeSettings?.accountHolder || 'PHAN ANH TAI',
                            posQrTs
                          ))
                    }
                    alt="VietQR"
                    onLoad={() => {
                      setIsPosQrLoading(false);
                      setPosQrError(false);
                    }}
                    onError={async () => {
                      setIsPosQrLoading(false);
                      setPosQrError(true);
                      if (!posOfflineQrUrl) {
                        try {
                          const offline = await generateOfflineQrDataUrl(
                            storeSettings?.bankId || 'MB',
                            storeSettings?.accountNumber || '0912345678',
                            cartSubtotal,
                            `NGANSON ${activeTab.title}`
                          );
                          setPosOfflineQrUrl(offline);
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className="w-48 h-48 rounded-lg object-contain"
                  />
                </div>

                <div className="text-xs font-mono font-bold text-slate-800">
                  {storeSettings?.bankName || storeSettings?.bankId || 'MB'} • {storeSettings?.accountNumber || '0912345678'}
                </div>
                <div className="text-[11px] font-bold text-[#0066FF] uppercase">
                  {storeSettings?.accountHolder || 'PHAN ANH TAI'}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setIsPosQrLoading(true);
                    setPosQrError(false);
                    setPosQrTs(Date.now());
                    try {
                      const offline = await generateOfflineQrDataUrl(
                        storeSettings?.bankId || 'MB',
                        storeSettings?.accountNumber || '0912345678',
                        cartSubtotal,
                        `NGANSON ${activeTab.title}`
                      );
                      setPosOfflineQrUrl(offline);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 active:scale-95 transition-all shadow-2xs mt-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPosQrLoading ? 'animate-spin text-[#0066FF]' : 'text-slate-500'}`} />
                  <span>Làm mới mã QR</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm"
              >
                Đóng
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm shadow-md active:scale-98"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Picker Modal */}
      <MobileCustomerPickerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        selectedCustomerName={selectedCustomer?.name || 'Khách lẻ'}
        onSelectCustomer={(custName, custPhone, cust) => {
          setSelectedCustomerId(cust?.id || '');
          updateActiveTabInfo({
            customer_name: custName,
            customer_phone: custPhone,
          });
        }}
      />

      {/* Cashbook / Phiếu thu Modal */}
      <MobileCashbookModal
        isOpen={isCashbookModalOpen}
        onClose={() => setIsCashbookModalOpen(false)}
        defaultAction="IN"
      />

      {/* Store & VietQR Settings Modal */}
      <MobileStoreSettingsModal
        isOpen={isStoreSettingsModalOpen}
        onClose={() => setIsStoreSettingsModalOpen(false)}
      />

      {/* Custom Item Modal */}
      <MobileCustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        onItemAdded={(customItem) => {
          const tempProduct: Product = {
            id: `custom-${Date.now()}`,
            name: customItem.name,
            sku: `CUS${Date.now().toString().slice(-4)}`,
            barcode: '',
            selling_price: customItem.price,
            cost_price: Math.round(customItem.price * 0.7),
            stock: 999,
            min_stock: 0,
            unit: customItem.unit,
            category: 'Khác',
            status: 'ACTIVE',
          };
          addToCart(tempProduct);
        }}
      />

      {/* Barcode Scanner Modal */}
      <MobileBarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onProductScanned={(productId) => {
          const p = products.find((prod) => prod.id === productId);
          if (p) addToCart(p);
        }}
      />

      {/* Orders Management Modal */}
      <MobileOrdersManagementModal
        isOpen={isOrdersManagementOpen}
        onClose={() => setIsOrdersManagementOpen(false)}
      />

      {/* Price Tier Selection Sheet */}
      {isPriceTierSheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsPriceTierSheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-5 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <h3 className="font-extrabold text-base text-slate-900">Chọn bảng giá bán</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {[
                { id: 'STANDARD', title: 'Bảng giá chung (Mặc định)', desc: 'Giá niêm yết bán lẻ thông thường' },
                { id: 'CONTRACTOR', title: 'Giá thợ & công trình (-5%)', desc: 'Chiết khấu 5% cho thợ điện nước' },
                { id: 'WHOLESALE', title: 'Giá bán sỉ / Đại lý (-10%)', desc: 'Chiết khấu 10% cho khách mua sỉ' },
              ].map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => handleSelectPriceTier(tier.id as any)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{tier.title}</span>
                    <span className="text-xs text-slate-400">{tier.desc}</span>
                  </div>
                  {priceTier === tier.id && <Check className="w-4 h-4 text-[#0066FF]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POS Category Quick Filter Sheet */}
      {isPosCategorySheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in"
          onClick={() => setIsPosCategorySheetOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-h-[70vh] flex flex-col p-5 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full self-center mb-1" />
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Lọc theo nhóm hàng</h3>
              {selectedCategory !== 'ALL' && (
                <button
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setIsPosCategorySheetOpen(false);
                  }}
                  className="text-xs font-bold text-[#0066FF]"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2 flex flex-col divide-y divide-slate-100">
              <div
                onClick={() => {
                  setSelectedCategory('ALL');
                  setIsPosCategorySheetOpen(false);
                }}
                className="py-3 flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm font-bold text-slate-900">Tất cả nhóm hàng</span>
                {selectedCategory === 'ALL' && <Check className="w-4 h-4 text-[#0066FF]" />}
              </div>

              {categories
                .filter((c) => c.id !== 'cat-all')
                .map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsPosCategorySheetOpen(false);
                    }}
                    className="py-3 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-sm text-slate-800 font-medium">{cat.name}</span>
                    {selectedCategory === cat.id && <Check className="w-4 h-4 text-[#0066FF]" />}
                  </div>
                ))}
            </div>

            {/* Stock Filter Section */}
            <div className="pt-3 pb-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Sắp xếp & lọc tồn kho
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStockFilterMode('OUT_OF_STOCK_LAST');
                    showToast('Mặc định: Đã đẩy các mặt hàng hết kho xuống cuối', 'info');
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-0.5 transition-all ${
                    stockFilterMode === 'OUT_OF_STOCK_LAST'
                      ? 'border-[#0066FF] bg-blue-50/70 text-[#0066FF]'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <span>Hết hàng ở cuối</span>
                  <span className="text-[10px] text-slate-400 font-normal">Mặc định</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockFilterMode('HIDE_OUT_OF_STOCK');
                    showToast('Đang ẩn các mặt hàng đã hết kho', 'info');
                  }}
                  className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-0.5 transition-all ${
                    stockFilterMode === 'HIDE_OUT_OF_STOCK'
                      ? 'border-amber-500 bg-amber-50/70 text-amber-800'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <span>Ẩn hết hàng</span>
                  <span className="text-[10px] text-slate-400 font-normal">Chỉ hiện còn hàng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
