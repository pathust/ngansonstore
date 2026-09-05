import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Supplier, Order, Customer } from '../../types';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  analyzeVoiceOrderIntentWithAI,
  VoiceOrderParseResult,
  ParsedVoiceItem,
  speakVietnameseFeedback,
  stopSpeechFeedback,
} from '../../utils/voiceRecognition';
import { formatCurrency } from '../../utils/formatters';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  X,
  ShoppingCart,
  PackagePlus,
  User,
  Phone,
  Tag,
  CreditCard,
  Send,
  HelpCircle,
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'POS_ORDER' | 'STOCK_IN';
}

export const VoiceActionModal: React.FC<VoiceActionModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'POS_ORDER',
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
    suppliers,
    customers,
    orders,
    addToCart,
    updateActiveTabInfo,
    receiveStockWithWeightedCost,
    createOrderDirect,
    updateOrder,
    setIsReceiptModalOpen,
    currentBranch,
    showToast,
    setCurrentView,
    currentUser,
  } = useApp();

  const [mode, setMode] = useState<'POS_ORDER' | 'STOCK_IN'>(initialMode);
  const [detectedIntent, setDetectedIntent] = useState<'CREATE_ORDER' | 'ADD_TO_CART' | 'UPDATE_ORDER' | 'STOCK_IN' | 'CANCEL_ORDER'>('CREATE_ORDER');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [enableVoiceFeedback, setEnableVoiceFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSource, setAiSource] = useState<'GEMINI_AI' | 'LOCAL_NLP'>('LOCAL_NLP');
  const [aiExplanation, setAiExplanation] = useState('');
  const [spokenFeedbackText, setSpokenFeedbackText] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0.9);

  // Parsed Order State
  const [parsedItems, setParsedItems] = useState<ParsedVoiceItem[]>([]);
  const [customerName, setCustomerName] = useState('Khách lẻ');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [supplierName, setSupplierName] = useState('');
  const [orderCodeToUpdate, setOrderCodeToUpdate] = useState('');
  const [orderNote, setOrderNote] = useState('');

  // Quick item search to add to voice draft
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const recognitionRef = useRef<any>(null);
  const analyzeTimeoutRef = useRef<any>(null);
  const lastAnalyzedTextRef = useRef<string>('');
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setDetectedIntent(initialMode === 'STOCK_IN' ? 'STOCK_IN' : 'CREATE_ORDER');
      setIsSupported(isSpeechRecognitionSupported());
      setParsedItems([]);
      setTranscript('');
      setInterimText('');
      setManualInput('');
      setCustomerName('Khách lẻ');
      setCustomerPhone('');
      setDiscountAmount(0);
      setDiscountPercent(0);
      setDiscountType('AMOUNT');
      setPaymentMethod('CASH');
      setSupplierName('');
      setOrderCodeToUpdate('');
      setOrderNote('');
      setAiExplanation('');
      setSpokenFeedbackText('');
      setShowItemSearch(false);
      lastAnalyzedTextRef.current = '';
      isSpeakingRef.current = false;
    } else {
      stopSpeechFeedback();
      stopListening();
      if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
      lastAnalyzedTextRef.current = '';
      isSpeakingRef.current = false;
    }
  }, [isOpen, initialMode]);

  // Execute intent analysis with deduplication
  const executeIntentAnalysis = async (text: string, currentMode = mode) => {
    const clean = text.trim();
    if (!clean) return;

    // Deduplication check: Do not re-analyze the exact same transcript!
    if (clean.toLowerCase() === lastAnalyzedTextRef.current.toLowerCase()) {
      return;
    }
    lastAnalyzedTextRef.current = clean;

    setIsAnalyzing(true);
    try {
      const result = await analyzeVoiceOrderIntentWithAI(
        clean,
        products,
        customers,
        suppliers,
        currentMode
      );
      applyParseResult(result);

      if (enableVoiceFeedback && result.spokenFeedback) {
        // Pause microphone while speaking to prevent acoustic feedback loop
        const wasListening = isListening;
        if (wasListening) {
          stopListening();
        }
        isSpeakingRef.current = true;
        speakVietnameseFeedback(result.spokenFeedback, () => {
          isSpeakingRef.current = false;
          if (wasListening && isOpen) {
            startListening();
          }
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Voice intent analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const rec = createSpeechRecognition(
      (newTranscript, _isFinal) => {
        // If system is currently speaking TTS feedback, ignore incoming speech
        if (isSpeakingRef.current) return;

        setTranscript(newTranscript);
        setInterimText(newTranscript);

        if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);

        // DO NOT interrupt user on isFinal! Continuous speech has natural pauses.
        // Wait 2500ms of sustained silence before auto-analyzing so the user is never cut off mid-sentence.
        analyzeTimeoutRef.current = setTimeout(() => {
          executeIntentAnalysis(newTranscript, mode);
        }, 2500);
      },
      (error) => {
        showToast(error, 'error');
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (rec) {
      recognitionRef.current = rec;
      try {
        rec.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopListening = () => {
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim() && transcript.trim().toLowerCase() !== lastAnalyzedTextRef.current.toLowerCase()) {
        executeIntentAnalysis(transcript, mode);
      }
    } else {
      startListening();
    }
  };

  const handleReset = () => {
    stopListening();
    stopSpeechFeedback();
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    lastAnalyzedTextRef.current = '';
    isSpeakingRef.current = false;
    setTranscript('');
    setInterimText('');
    setManualInput('');
    setParsedItems([]);
    setCustomerName('Khách lẻ');
    setCustomerPhone('');
    setDiscountAmount(0);
    setDiscountPercent(0);
    setDiscountType('AMOUNT');
    setPaymentMethod('CASH');
    setSupplierName('');
    setOrderCodeToUpdate('');
    setOrderNote('');
    setAiExplanation('');
    setSpokenFeedbackText('');
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim()) return;
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    setTranscript(manualInput);
    executeIntentAnalysis(manualInput, mode);
    setManualInput('');
  };

  const applyParseResult = (result: VoiceOrderParseResult) => {
    if (result.items && result.items.length > 0) {
      setParsedItems(result.items);
    }
    if (result.intent) {
      setDetectedIntent(result.intent);
      if (result.intent === 'STOCK_IN') setMode('STOCK_IN');
      else setMode('POS_ORDER');
    }
    if (result.customerName) setCustomerName(result.customerName);
    if (result.customerPhone) setCustomerPhone(result.customerPhone);
    if (result.discountAmount !== undefined) setDiscountAmount(result.discountAmount);
    if (result.discountPercent !== undefined) setDiscountPercent(result.discountPercent);
    if (result.discountType) setDiscountType(result.discountType);
    if (result.paymentMethod) setPaymentMethod(result.paymentMethod);
    if (result.supplierName) setSupplierName(result.supplierName);
    if (result.orderCodeToUpdate) setOrderCodeToUpdate(result.orderCodeToUpdate);
    if (result.note) setOrderNote(result.note);
    if (result.source) setAiSource(result.source);
    if (result.explanation) setAiExplanation(result.explanation);
    if (result.spokenFeedback) setSpokenFeedbackText(result.spokenFeedback);
    if (result.confidence !== undefined) setConfidenceScore(result.confidence);
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setParsedItems((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    setParsedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unitPrice: Math.max(0, newPrice) } : item))
    );
  };

  const handleCostChange = (index: number, newCost: number) => {
    setParsedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unitCost: Math.max(0, newCost) } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddProductFromCatalog = (product: Product) => {
    const existing = parsedItems.find((p) => p.product.id === product.id);
    if (existing) {
      handleQuantityChange(parsedItems.indexOf(existing), 1);
    } else {
      setParsedItems((prev) => [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.selling_price,
          unitCost: product.cost_price,
          confidence: 1.0,
          matchedText: product.name,
        },
      ]);
    }
    setShowItemSearch(false);
    setSearchQuery('');
  };

  // Financial calculations
  const rawSubtotal = parsedItems.reduce(
    (sum, item) => sum + (mode === 'POS_ORDER' ? item.unitPrice : item.unitCost) * item.quantity,
    0
  );

  const effectiveDiscount = discountType === 'PERCENT'
    ? Math.round((rawSubtotal * discountPercent) / 100)
    : discountAmount;

  const totalAmount = Math.max(0, rawSubtotal - effectiveDiscount);

  // 1. ACTION: Create Direct Invoice & Update Actual Stock + Cashbook
  const handleDirectCreateInvoice = () => {
    if (parsedItems.length === 0) {
      showToast('Vui lòng nói hoặc chọn ít nhất 1 sản phẩm để lập hóa đơn!', 'warning');
      return;
    }

    const orderCode = `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalCost = parsedItems.reduce((sum, i) => sum + (i.product.cost_price || 0) * i.quantity, 0);

    const orderData: Partial<Order> = {
      code: orderCode,
      customer_name: customerName || 'Khách lẻ',
      phone: customerPhone || '',
      items: parsedItems.map((i) => ({
        product_id: i.product.id,
        sku: i.product.sku,
        name: i.product.name,
        unit: i.product.unit,
        quantity: i.quantity,
        price: i.unitPrice,
        cost_price: i.product.cost_price || 0,
      })),
      total: rawSubtotal,
      discount: effectiveDiscount,
      final_amount: totalAmount,
      total_cost: totalCost,
      profit: totalAmount - totalCost,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
      cashier: currentUser?.name || 'Thu ngân Ngân Sơn',
      branch: currentBranch?.name || '318 Vũ Quang',
      note: orderNote || 'Lập tự động qua Trợ lý Giọng nói AI',
    };

    // createOrderDirect automatically deducts stock, records cashbook, and updates customer
    createOrderDirect(orderData, 'KEEP_BOTH', { syncStock: true, syncCashbook: true });

    // Trigger celebration effects
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.75 },
      });
    } catch {}

    if (enableVoiceFeedback) {
      speakVietnameseFeedback(
        `Đã tạo thành công hóa đơn ${orderCode} cho ${customerName || 'khách hàng'}, tổng tiền ${totalAmount.toLocaleString('vi-VN')} đồng`
      );
    }

    showToast(`Đã tạo hóa đơn ${orderCode} & trừ kho ${parsedItems.length} mặt hàng!`, 'success');
    onClose();
    setIsReceiptModalOpen(true);
  };

  // 2. ACTION: Apply to Active POS Cart Tab
  const handleApplyToCart = () => {
    if (parsedItems.length === 0) {
      showToast('Chưa có sản phẩm nào được chọn từ giọng nói!', 'warning');
      return;
    }

    parsedItems.forEach((item) => {
      addToCart(item.product, item.quantity);
    });

    updateActiveTabInfo({
      customer_name: customerName,
      customer_phone: customerPhone,
      discount_amount: effectiveDiscount,
      payment_method: paymentMethod,
      note: orderNote,
    });

    if (enableVoiceFeedback) {
      speakVietnameseFeedback(`Đã chuyển ${parsedItems.length} mặt hàng vào giỏ hàng POS`);
    }

    showToast(`Đã đưa ${parsedItems.length} mặt hàng vào giỏ POS!`, 'success');
    onClose();
    setCurrentView('pos');
  };

  // 3. ACTION: Update Existing Past Order
  const handleUpdateExistingOrder = () => {
    if (parsedItems.length === 0) {
      showToast('Vui lòng chọn hoặc nói sản phẩm cần cập nhật!', 'warning');
      return;
    }

    // Find order by code or latest order
    let targetOrder = orders.find(
      (o) =>
        o.code.toLowerCase().includes(orderCodeToUpdate.toLowerCase()) ||
        (customerName && o.customer_name.toLowerCase().includes(customerName.toLowerCase()))
    );

    // Removed dangerous fallback: do NOT silently pick orders[0] (could be a different customer's order)

    if (!targetOrder) {
      showToast('Không tìm thấy hóa đơn cũ phù hợp để cập nhật!', 'warning');
      return;
    }

    const updatedItems = parsedItems.map((i) => ({
      product_id: i.product.id,
      sku: i.product.sku,
      name: i.product.name,
      unit: i.product.unit,
      quantity: i.quantity,
      price: i.unitPrice,
      cost_price: i.product.cost_price || 0,
    }));

    const totalCost = updatedItems.reduce((sum, i) => sum + i.cost_price * i.quantity, 0);

    updateOrder(
      targetOrder.id,
      {
        customer_name: customerName,
        phone: customerPhone,
        items: updatedItems,
        total: rawSubtotal,
        discount: effectiveDiscount,
        final_amount: totalAmount,
        total_cost: totalCost,
        payment_method: paymentMethod,
        note: `${targetOrder.note ? targetOrder.note + ' | ' : ''}[Cập nhật qua Voice AI: ${new Date().toLocaleTimeString('vi-VN')}]`,
      },
      { adjustStock: true, adjustCashbook: true }
    );

    if (enableVoiceFeedback) {
      speakVietnameseFeedback(`Đã cập nhật thành công hóa đơn ${targetOrder.code}`);
    }

    showToast(`Đã cập nhật hóa đơn ${targetOrder.code} và đồng bộ kho & quỹ!`, 'success');
    onClose();
    setCurrentView('orders');
  };

  // 4. ACTION: Execute Voice Stock-In
  const handleExecuteStockIn = () => {
    if (parsedItems.length === 0) {
      showToast('Chưa có mặt hàng nào để nhập kho!', 'warning');
      return;
    }

    parsedItems.forEach((item) => {
      receiveStockWithWeightedCost(item.product.id, item.quantity, item.unitCost);
    });

    if (enableVoiceFeedback) {
      speakVietnameseFeedback(
        `Đã nhập kho thành công ${parsedItems.length} sản phẩm, tổng giá trị ${totalAmount.toLocaleString('vi-VN')} đồng`
      );
    }

    showToast(`Đã nhập kho thành công ${parsedItems.length} mặt hàng!`, 'success');
    onClose();
    setCurrentView('products');
  };

  // Quick Hardware & Electrical Voice Command Examples
  const quickExamples =
    mode === 'POS_ORDER'
      ? [
          'Bán 3 bóng LED Rạng Đông 20W và 2 quạt Panasonic giảm 50k cho anh Minh 0912345678, chuyển khoản',
          'Bán cho chị Lan 5 ổ cắm Lioa 6 lỗ, 2 cuộn dây Cadivi 2.5 thanh toán tiền mặt',
          'Lấy 4 cái aptomat Panasonic 32A và 1 máy khoan Bosch, bớt 20 nghìn',
          'Sửa đơn hàng thêm 2 bóng đèn Rạng Đông và đổi khách sang anh Nam',
        ]
      : [
          'Nhập kho 50 cuộn dây điện Cadivi 2.5 giá vốn 180 nghìn từ Cty Thiết Bị Điện',
          'Nhập 20 quạt trần Panasonic từ Tổng Kho Kim Khí giá vốn 850k',
          'Nhập kho 100 bóng LED Rạng Đông 20W giá 38k từ Nhà máy Rạng Đông',
          'Nhập 30 ổ cắm Lioa 6 lỗ giá vốn 75000',
        ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-5 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight">Trợ lý Vào Đơn Giọng Nói AI</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Gemini Flash AI
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Cửa hàng Điện Nước & Kim Khí Ngân Sơn (318 Vũ Quang)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              title="Làm mới / Nhập lại từ đầu"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEnableVoiceFeedback(!enableVoiceFeedback)}
              title={enableVoiceFeedback ? 'Tắt giọng đọc phản hồi' : 'Bật đọc phản hồi tiếng Việt'}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              {enableVoiceFeedback ? (
                <Volume2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-300" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode & Intent Status Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => {
                setMode('POS_ORDER');
                setDetectedIntent('CREATE_ORDER');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'POS_ORDER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Bán hàng / Vào đơn
            </button>
            <button
              onClick={() => {
                setMode('STOCK_IN');
                setDetectedIntent('STOCK_IN');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'STOCK_IN'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Nhập kho hàng
            </button>
          </div>

          {/* AI Intent Badge */}
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-slate-400">Ý định:</span>
              <span className="font-bold text-blue-700">
                {detectedIntent === 'CREATE_ORDER' && '⚡ Tạo hóa đơn mới'}
                {detectedIntent === 'ADD_TO_CART' && '🛒 Thêm vào giỏ hàng'}
                {detectedIntent === 'UPDATE_ORDER' && '📝 Sửa hóa đơn cũ'}
                {detectedIntent === 'STOCK_IN' && '📦 Nhập kho hàng hóa'}
                {detectedIntent === 'CANCEL_ORDER' && '❌ Hủy đơn hàng'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              ({products.length} SP sẵn sàng)
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Visual Microphone & AI Analysis Zone */}
          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-blue-50/60 to-slate-50 rounded-2xl border border-blue-100 text-center relative overflow-hidden">
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-28 rounded-full bg-blue-400/20 animate-ping"></div>
                <div className="w-44 h-44 rounded-full bg-blue-300/10 animate-pulse"></div>
              </div>
            )}

            <button
              onClick={toggleListening}
              className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white ring-8 ring-red-100 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 text-white ring-8 ring-blue-50 hover:ring-blue-100'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 sm:w-9 sm:h-9 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8 sm:w-9 sm:h-9" />
              )}
            </button>

            <div className="mt-2.5 text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>AI đang phân tích ý định & bóc tách mặt hàng...</span>
                </>
              ) : isListening ? (
                <span>Đang nghe liên tục... Nói tự nhiên không bị ngắt lời (tự bóc tách sau 2.5s ngừng nói)</span>
              ) : (
                'Chạm Micro để nói hoặc gõ câu lệnh vào đơn hàng'
              )}
            </div>

            {isListening && (transcript || interimText) && !isAnalyzing && (
              <button
                onClick={() => {
                  if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
                  stopListening();
                  executeIntentAnalysis(transcript || interimText, mode);
                }}
                className="mt-2.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer animate-in fade-in"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Xong rồi, bóc tách ngay
              </button>
            )}

            {/* Live Transcript / Prompt Box */}
            {(transcript || interimText) && (
              <div className="w-full mt-3 p-3 bg-white border border-blue-200 rounded-xl shadow-2xs text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Lời nói đã nhận diện:
                  </span>
                  {aiExplanation && (
                    <span className="text-[10px] text-slate-500 italic">
                      {aiExplanation}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed italic">
                  "{transcript || interimText}"
                </p>

                {spokenFeedbackText && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-800 bg-blue-50/60 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{spokenFeedbackText}</span>
                    </div>
                    <button
                      onClick={() => speakVietnameseFeedback(spokenFeedbackText)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer shrink-0 ml-2"
                    >
                      Nghe lại
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Real-Store Examples */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              Câu lệnh mẫu điện nước & kim khí (Bấm để thử ngay):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {quickExamples.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTranscript(ex);
                    executeIntentAnalysis(ex, mode);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-xs text-slate-700 font-medium transition-colors text-left truncate cursor-pointer shadow-2xs"
                  title={ex}
                >
                  💬 "{ex}"
                </button>
              ))}
            </div>
          </div>

          {/* Manual Text Prompt Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Hoặc gõ câu lệnh tiếng Việt (VD: Bán 3 bóng LED Rạng Đông 20W cho anh Minh)..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !manualInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Phân tích
            </button>
          </form>

          {/* Parsed Results Section */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            {/* Customer & Payment Meta Strip */}
            <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Customer Input */}
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-500 font-medium">Khách:</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Khách lẻ"
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 w-28 sm:w-36"
                  />
                </div>

                {/* Phone Input */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-500 font-medium">SĐT:</span>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0912..."
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 w-24 sm:w-28"
                  />
                </div>

                {/* Payment Method Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CASH">💵 Tiền mặt</option>
                    <option value="TRANSFER">📱 Chuyển khoản VietQR</option>
                    <option value="CARD">💳 Quẹt thẻ POS</option>
                  </select>
                </div>
              </div>

              {/* Order Code if updating */}
              {detectedIntent === 'UPDATE_ORDER' && (
                <div className="flex items-center gap-1.5 text-xs bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 text-amber-900">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold">Mã HĐ:</span>
                  <input
                    type="text"
                    value={orderCodeToUpdate}
                    onChange={(e) => setOrderCodeToUpdate(e.target.value)}
                    placeholder="VD: HD1234..."
                    className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold w-24 text-amber-900"
                  />
                </div>
              )}
            </div>

            {/* Parsed Items List */}
            <div className="p-3">
              {parsedItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Chưa có sản phẩm nào được bóc tách. Hãy bấm Micro và nói đơn hàng!
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                    <span>Sản phẩm ({parsedItems.length})</span>
                    <div className="flex items-center gap-6">
                      <span className="w-20 text-center">Số lượng</span>
                      <span className="w-24 text-right">Đơn giá</span>
                      <span className="w-24 text-right">Thành tiền</span>
                      <span className="w-6"></span>
                    </div>
                  </div>

                  {parsedItems.map((item, index) => {
                    const price = mode === 'POS_ORDER' ? item.unitPrice : item.unitCost;
                    const lineTotal = price * item.quantity;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-colors text-xs"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-slate-900 truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Mã: <strong className="text-slate-700">{item.product.sku}</strong></span>
                            <span>• ĐVT: <strong>{item.product.unit}</strong></span>
                            {item.product.stock !== undefined && (
                              <span>• Tồn: <strong className={item.product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}>{item.product.stock}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 w-20 justify-center">
                          <button
                            onClick={() => handleQuantityChange(index, -1)}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-slate-900 w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(index, 1)}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Unit Price Input */}
                        <div className="w-24 text-right">
                          <input
                            type="number"
                            value={price}
                            onChange={(e) =>
                              mode === 'POS_ORDER'
                                ? handlePriceChange(index, Number(e.target.value))
                                : handleCostChange(index, Number(e.target.value))
                            }
                            className="w-full text-right font-semibold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="w-24 text-right font-bold text-blue-600">
                          {formatCurrency(lineTotal)}
                        </div>

                        {/* Remove item */}
                        <div className="w-6 text-right">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add More Product Quick Button */}
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowItemSearch(!showItemSearch)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mặt hàng khác vào đơn</span>
                </button>

                {/* Discount input */}
                <div className="flex items-center gap-2 text-xs">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-600 font-medium">Giảm giá:</span>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-bold text-right text-rose-600 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-500">đ</span>
                </div>
              </div>

              {/* Quick Item Search Dropdown */}
              {showItemSearch && (
                <div className="mt-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Gõ tên hoặc mã sản phẩm điện nước..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {products
                      .filter(
                        (p) =>
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .sort((a, b) => {
                        const aOut = (a.stock ?? 0) <= 0 ? 1 : 0;
                        const bOut = (b.stock ?? 0) <= 0 ? 1 : 0;
                        if (aOut !== bOut) return aOut - bOut;
                        return 0;
                      })
                      .slice(0, 6)
                      .map((p) => {
                        const isOutOfStock = (p.stock ?? 0) <= 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isOutOfStock) {
                                showToast(`Sản phẩm "${p.name}" hiện đã hết hàng trong kho!`, 'warning');
                                return;
                              }
                              handleAddProductFromCatalog(p);
                            }}
                            className={`p-1.5 rounded-md border flex items-center justify-between text-xs cursor-pointer ${
                              isOutOfStock
                                ? 'bg-slate-50/70 border-rose-200 opacity-60'
                                : 'bg-white hover:bg-blue-100 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-slate-800 truncate">{p.name} ({p.sku})</span>
                              {isOutOfStock ? (
                                <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.2 rounded font-bold shrink-0">Hết hàng</span>
                              ) : (
                                <span className="text-[10px] text-slate-400 shrink-0">Tồn: {p.stock}</span>
                              )}
                            </div>
                            <span className="font-bold text-blue-600 shrink-0">{formatCurrency(p.selling_price)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Total Summary Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <div className="text-slate-500">
                  Tạm tính: <strong className="text-slate-800">{formatCurrency(rawSubtotal)}</strong>
                  {effectiveDiscount > 0 && (
                    <span className="ml-2 text-rose-600">
                      - Giảm: <strong>{formatCurrency(effectiveDiscount)}</strong>
                    </span>
                  )}
                </div>
                <div className="text-base font-bold text-blue-700">
                  Tổng thanh toán: {formatCurrency(totalAmount)}
                </div>
              </div>

              {/* Action Buttons based on Mode / Intent */}
              <div className="flex items-center gap-2">
                {mode === 'STOCK_IN' ? (
                  <button
                    onClick={handleExecuteStockIn}
                    disabled={parsedItems.length === 0}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <PackagePlus className="w-4 h-4" />
                    XÁC NHẬN NHẬP KHO
                  </button>
                ) : detectedIntent === 'UPDATE_ORDER' ? (
                  <button
                    onClick={handleUpdateExistingOrder}
                    disabled={parsedItems.length === 0}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Edit3 className="w-4 h-4" />
                    LƯU CẬP NHẬT HÓA ĐƠN
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleApplyToCart}
                      disabled={parsedItems.length === 0}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Vào Giỏ Hàng POS
                    </button>
                    <button
                      onClick={handleDirectCreateInvoice}
                      disabled={parsedItems.length === 0}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      TẠO HÓA ĐƠN & TRỪ KHO NGAY
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
