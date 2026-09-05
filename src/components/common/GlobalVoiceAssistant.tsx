import React, { useState, useEffect, useRef } from 'react';
import { useCatalog } from '../../context/slices/CatalogContext';
import { useCustomers } from '../../context/slices/CustomersContext';
import { useSuppliers } from '../../context/slices/SuppliersContext';
import { useOrdersData } from '../../context/slices/OrdersDataContext';
import { useOrdersCart } from '../../context/slices/OrdersCartContext';
import { useUiShell } from '../../context/slices/UiShellContext';
import { useAuth } from '../../context/slices/AuthContext';
import { useToast } from '../../context/slices/ToastContext';
import { useOrderOrchestrator } from '../../context/orchestrators/useOrderOrchestrator';
import { useCatalogOrchestrator } from '../../context/orchestrators/useCatalogOrchestrator';
import { Product, Order } from '../../types';
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
  Sparkles,
  Search,
  ShoppingCart,
  PackagePlus,
  User,
  Phone,
  Tag,
  CreditCard,
  Edit3,
  Plus,
  Minus,
  Trash2,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GlobalVoiceAssistantProps {
  externalOpen?: boolean;
  onCloseExternal?: () => void;
  initialQuery?: string;
  initialMode?: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER';
}

// Các ý định KHÔNG làm thay đổi dữ liệu thật (tra cứu/điều hướng) — hiển thị kết quả ngay, không cần xác nhận.
const READ_ONLY_INTENTS = new Set(['SEARCH_PRODUCT', 'CHECK_DEBT', 'NAVIGATE']);

export const GlobalVoiceAssistant: React.FC<GlobalVoiceAssistantProps> = ({
  externalOpen,
  onCloseExternal,
  initialQuery = '',
  initialMode = 'POS_ORDER',
}) => {
  const { products } = useCatalog();
  const { customers } = useCustomers();
  const { suppliers } = useSuppliers();
  const { orders, setIsReceiptModalOpen } = useOrdersData();
  const { addToCart, updateActiveTabInfo } = useOrdersCart();
  const { setCurrentView, currentBranch, voiceAssistantRequest, clearVoiceAssistantRequest } = useUiShell();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { createOrderDirect, updateOrder, cancelOrder } = useOrderOrchestrator();
  const { receiveStockWithWeightedCost } = useCatalogOrchestrator();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'POS_ORDER' | 'STOCK_IN'>(initialMode === 'STOCK_IN' ? 'STOCK_IN' : 'POS_ORDER');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enableTts, setEnableTts] = useState(true);
  const [parseResult, setParseResult] = useState<VoiceOrderParseResult | null>(null);

  // Editable draft populated from AI parse — nothing here mutates real data until the user
  // explicitly clicks a confirm button below.
  const [parsedItems, setParsedItems] = useState<ParsedVoiceItem[]>([]);
  const [customerName, setCustomerName] = useState('Khách lẻ');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT'>('AMOUNT');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [orderCodeToUpdate, setOrderCodeToUpdate] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel-order confirmation state — order lookup only, cancelOrder() fires solely on explicit confirm click.
  const [pendingCancelOrder, setPendingCancelOrder] = useState<Order | null>(null);
  const [returnStockOnCancel, setReturnStockOnCancel] = useState(true);
  const [cancelReason, setCancelReason] = useState('');

  const recognitionRef = useRef<any>(null);
  const analyzeTimeoutRef = useRef<any>(null);
  const lastAnalyzedTextRef = useRef<string>('');
  const isSpeakingRef = useRef<boolean>(false);
  // Synchronous guard against overlapping analyses — `isAnalyzing` state is async/can be stale
  // inside closures, so continuous recognition could otherwise fire a new analysis on every
  // growing transcript chunk while a previous one is still in flight.
  const isAnalyzingRef = useRef<boolean>(false);
  // `.stop()` on a SpeechRecognition instance still delivers one trailing result for audio it
  // already captured, even after we've moved on (paused for analysis, started a new session,
  // closed the modal). That stale callback has no idea it's stale — it happily calls
  // setTranscript(...) and re-arms the debounce, which is what produced the repeating-prefix
  // transcript ("Xin Xin chào Xin chào Xin chào..."). Every callback checks this token against
  // the session it was created for and no-ops if a newer session has since started.
  const recognitionSessionRef = useRef<number>(0);

  const resetDraftState = () => {
    setParseResult(null);
    setParsedItems([]);
    setCustomerName('Khách lẻ');
    setCustomerPhone('');
    setDiscountAmount(0);
    setDiscountPercent(0);
    setDiscountType('AMOUNT');
    setPaymentMethod('CASH');
    setOrderCodeToUpdate('');
    setOrderNote('');
    setShowItemSearch(false);
    setSearchQuery('');
    setPendingCancelOrder(null);
    setReturnStockOnCancel(true);
    setCancelReason('');
  };

  // Sync external open trigger (Alt+V, FAB, or a screen requesting a specific mode)
  useEffect(() => {
    if (externalOpen !== undefined) {
      setIsOpen(externalOpen);
      if (externalOpen) {
        setMode(initialMode === 'STOCK_IN' ? 'STOCK_IN' : 'POS_ORDER');
        if (initialQuery) {
          lastAnalyzedTextRef.current = '';
          setTranscript(initialQuery);
          executeAnalysis(initialQuery);
        } else {
          startListening();
        }
      } else {
        stopSpeechFeedback();
        stopListening();
        lastAnalyzedTextRef.current = '';
        isSpeakingRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalOpen, initialQuery, initialMode]);

  // Bridge: other screens (POS/Products/Invoices) call requestVoiceAssistant(mode) instead of
  // mounting their own modal — this is the single global assistant instance reacting to that request.
  useEffect(() => {
    if (voiceAssistantRequest) {
      resetDraftState();
      setTranscript('');
      lastAnalyzedTextRef.current = '';
      setMode(voiceAssistantRequest.mode === 'STOCK_IN' ? 'STOCK_IN' : 'POS_ORDER');
      setIsOpen(true);
      setTimeout(() => startListening(), 100);
      clearVoiceAssistantRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceAssistantRequest]);

  // Global Keyboard Shortcut: Alt + V to toggle voice assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => startListening(), 100);
          } else {
            stopSpeechFeedback();
            stopListening();
            lastAnalyzedTextRef.current = '';
            isSpeakingRef.current = false;
          }
          return next;
        });
      }
      if (e.key === 'Escape') {
        setIsOpen((prev) => (prev ? false : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    stopSpeechFeedback();
    isSpeakingRef.current = false;
    lastAnalyzedTextRef.current = '';
    stopListening();
    setIsOpen(false);
    setTranscript('');
    resetDraftState();
    if (onCloseExternal) onCloseExternal();
  };

  const handleReset = () => {
    stopListening();
    stopSpeechFeedback();
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    lastAnalyzedTextRef.current = '';
    isSpeakingRef.current = false;
    setTranscript('');
    setManualInput('');
    resetDraftState();
  };

  const abortRecognitionInstance = (instance: any) => {
    try {
      // abort() (unlike stop()) does not deliver any further/trailing result for audio it has
      // already captured — exactly what we want whenever WE decide to stop, so a superseded
      // instance can never sneak in one more onresult after the fact.
      if (typeof instance.abort === 'function') instance.abort();
      else instance.stop();
    } catch {}
  };

  const startListening = () => {
    if (recognitionRef.current) {
      abortRecognitionInstance(recognitionRef.current);
    }

    // Bump the session token so any trailing callback from the instance we just aborted
    // (or any earlier one) is recognized as stale and ignored below.
    recognitionSessionRef.current += 1;
    const mySession = recognitionSessionRef.current;

    const rec = createSpeechRecognition(
      (newTranscript, _isFinal) => {
        if (mySession !== recognitionSessionRef.current) return; // stale/superseded session

        // Barge-in: if the assistant is currently speaking TTS feedback and the user starts
        // talking again, cut the AI off immediately instead of ignoring the new speech.
        if (isSpeakingRef.current) {
          stopSpeechFeedback();
          isSpeakingRef.current = false;
        }

        setTranscript(newTranscript);
        if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);

        // Defense-in-depth: a real voice command is rarely this long. If the transcript keeps
        // growing well past that (device-quirk duplication we haven't anticipated, or someone
        // genuinely rambling), analyze immediately instead of letting it keep growing while
        // waiting for a silence gap that may never come.
        const MAX_TRANSCRIPT_CHARS = 220;
        const delayMs = newTranscript.length > MAX_TRANSCRIPT_CHARS ? 0 : 1200;

        // Wait for a short pause before auto-analyzing so natural speech isn't cut mid-sentence,
        // but shorter than before so the assistant feels snappier.
        analyzeTimeoutRef.current = setTimeout(() => {
          if (mySession !== recognitionSessionRef.current) return; // stale/superseded session
          executeAnalysis(newTranscript);
        }, delayMs);
      },
      (error) => {
        if (mySession !== recognitionSessionRef.current) return;
        showToast(error, 'error');
        setIsListening(false);
      },
      () => {
        if (mySession !== recognitionSessionRef.current) return;
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
    // Invalidate the current session too — once we've decided to stop, no callback from it
    // (even a "legitimate" final result) should still be allowed to touch state.
    recognitionSessionRef.current += 1;
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }
    if (recognitionRef.current) {
      abortRecognitionInstance(recognitionRef.current);
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim() && transcript.trim().toLowerCase() !== lastAnalyzedTextRef.current.toLowerCase()) {
        executeAnalysis(transcript);
      }
    } else {
      startListening();
    }
  };

  const applyParseResult = (result: VoiceOrderParseResult) => {
    if (result.items && result.items.length > 0) {
      setParsedItems(result.items);
    }
    if (result.intent === 'STOCK_IN') setMode('STOCK_IN');
    else if (result.intent && !READ_ONLY_INTENTS.has(result.intent)) setMode('POS_ORDER');
    if (result.customerName) setCustomerName(result.customerName);
    if (result.customerPhone) setCustomerPhone(result.customerPhone);
    if (result.discountAmount !== undefined) setDiscountAmount(result.discountAmount);
    if (result.discountPercent !== undefined) setDiscountPercent(result.discountPercent);
    if (result.discountType) setDiscountType(result.discountType);
    if (result.paymentMethod) setPaymentMethod(result.paymentMethod);
    if (result.orderCodeToUpdate) setOrderCodeToUpdate(result.orderCodeToUpdate);
    if (result.note) setOrderNote(result.note);

    if (result.intent === 'CANCEL_ORDER') {
      const target = orders.find(
        (o) =>
          (result.orderCodeToUpdate && o.code.toLowerCase().includes(result.orderCodeToUpdate.toLowerCase())) ||
          (result.customerName && result.customerName !== 'Khách lẻ' && o.customer_name.toLowerCase().includes(result.customerName.toLowerCase()))
      );
      // No dangerous fallback: never silently pick orders[0] — an unmatched order must surface as "not found".
      if (target) {
        setPendingCancelOrder(target);
      } else {
        showToast('Không tìm thấy hóa đơn phù hợp để hủy!', 'warning');
      }
    }
  };

  const executeAnalysis = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    // Never start a second analysis while one is still in flight — continuous recognition can
    // keep growing/repeating the transcript (e.g. background noise), and without this guard each
    // debounce firing would kick off another overlapping request.
    if (isAnalyzingRef.current) return;

    // Deduplication check: Do not re-analyze the exact same transcript!
    if (clean.toLowerCase() === lastAnalyzedTextRef.current.toLowerCase()) {
      return;
    }
    lastAnalyzedTextRef.current = clean;

    // Pause the mic while analyzing: prevents it from capturing more audio into an
    // ever-growing/garbled transcript, and removes the trigger for a second overlapping call.
    const wasListeningBeforeAnalysis = isListening;
    if (wasListeningBeforeAnalysis) stopListening();

    // Resume the mic only once BOTH the analysis promise has settled AND TTS (if any) has
    // finished speaking — these two async things can finish in either order, so this is called
    // from both places and only actually resumes once neither is still pending.
    const maybeResumeListening = () => {
      if (wasListeningBeforeAnalysis && isOpen && !isAnalyzingRef.current && !isSpeakingRef.current) {
        startListening();
      }
    };

    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const result = await analyzeVoiceOrderIntentWithAI(
        clean,
        products,
        customers,
        suppliers,
        mode,
        undefined,
        (earlySpeech: string) => {
          // Fires as soon as the streamed response has spoken_feedback decodable — long before
          // the full JSON (items, discount, etc.) has finished arriving.
          if (!enableTts) return;
          isSpeakingRef.current = true;
          speakVietnameseFeedback(earlySpeech, () => {
            isSpeakingRef.current = false;
            maybeResumeListening();
          });
        }
      );
      setParseResult(result);
      applyParseResult(result);

      // If intent is direct navigation, handle auto redirect immediately — this is safe/reversible.
      if (result.intent === 'NAVIGATE' && result.targetScreen) {
        setCurrentView(result.targetScreen as any);
        showToast(result.spokenFeedback || 'Đang chuyển trang...', 'info');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Analysis error:', err);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
      setTranscript('');
      maybeResumeListening();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    setTranscript(manualInput);
    executeAnalysis(manualInput);
    setManualInput('');
  };

  // Quick Preset Prompts
  const quickPrompts = [
    { label: '🔍 Tìm bóng LED 9W', query: 'Tìm bóng rạng đông 9w giá bao nhiêu còn mấy cái' },
    { label: '🛒 Bán hàng nhanh', query: 'Bán 2 bóng LED và 1 ổ cắm Sino cho anh Tuấn' },
    { label: '📦 Nhập kho vật tư', query: 'Nhập kho 10 cuộn dây điện Cadivi 2.5 giá 150k' },
    { label: '💳 Kiểm tra nợ', query: 'Kiểm tra công nợ anh Hùng thợ điện' },
    { label: '📊 Mở sổ quỹ', query: 'Mở sổ quỹ thu chi' },
  ];

  // Item editing handlers for the draft table (never touches real data)
  const handleQuantityChange = (index: number, delta: number) => {
    setParsedItems((prev) =>
      prev
        .map((item, idx) => (idx === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  };
  const handlePriceChange = (index: number, newPrice: number) => {
    setParsedItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, unitPrice: Math.max(0, newPrice) } : item)));
  };
  const handleCostChange = (index: number, newCost: number) => {
    setParsedItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, unitCost: Math.max(0, newCost) } : item)));
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

  // Financial calculations for the draft
  const rawSubtotal = parsedItems.reduce(
    (sum, item) => sum + (mode === 'POS_ORDER' ? item.unitPrice : item.unitCost) * item.quantity,
    0
  );
  const effectiveDiscount = discountType === 'PERCENT' ? Math.round((rawSubtotal * discountPercent) / 100) : discountAmount;
  const totalAmount = Math.max(0, rawSubtotal - effectiveDiscount);

  // ===== Mutating actions — every one fires ONLY from an explicit button click below =====

  const handleApplyToCart = () => {
    if (parsedItems.length === 0) return;

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

    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch {}

    showToast(`Đã thêm ${parsedItems.length} mặt hàng vào giỏ POS!`, 'success');
    setCurrentView('pos');
    handleClose();
  };

  const handleAddSingleProductToCart = (prod: Product, qty: number = 1) => {
    addToCart(prod, qty);
    showToast(`Đã thêm "${prod.name}" vào giỏ hàng POS!`, 'success');
    setCurrentView('pos');
  };

  const handleDirectCreateInvoice = () => {
    if (parsedItems.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm để lập hóa đơn!', 'warning');
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

    createOrderDirect(orderData, 'KEEP_BOTH', { syncStock: true, syncCashbook: true });

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.75 } });
    } catch {}

    if (enableTts) {
      speakVietnameseFeedback(
        `Đã tạo thành công hóa đơn ${orderCode} cho ${customerName || 'khách hàng'}, tổng tiền ${totalAmount.toLocaleString('vi-VN')} đồng`
      );
    }

    showToast(`Đã tạo hóa đơn ${orderCode} & trừ kho ${parsedItems.length} mặt hàng!`, 'success');
    handleClose();
    setIsReceiptModalOpen(true);
  };

  const handleExecuteStockIn = () => {
    if (parsedItems.length === 0) {
      showToast('Chưa có mặt hàng nào để nhập kho!', 'warning');
      return;
    }

    parsedItems.forEach((item) => {
      receiveStockWithWeightedCost(item.product.id, item.quantity, item.unitCost);
    });

    if (enableTts) {
      speakVietnameseFeedback(`Đã nhập kho thành công ${parsedItems.length} sản phẩm, tổng giá trị ${totalAmount.toLocaleString('vi-VN')} đồng`);
    }

    showToast(`Đã nhập kho thành công ${parsedItems.length} mặt hàng!`, 'success');
    handleClose();
    setCurrentView('products');
  };

  const handleUpdateExistingOrder = () => {
    if (parsedItems.length === 0) {
      showToast('Vui lòng chọn hoặc nói sản phẩm cần cập nhật!', 'warning');
      return;
    }

    const targetOrder = orders.find(
      (o) =>
        o.code.toLowerCase().includes(orderCodeToUpdate.toLowerCase()) ||
        (customerName && o.customer_name.toLowerCase().includes(customerName.toLowerCase()))
    );
    // No dangerous fallback: do NOT silently pick orders[0] (could be a different customer's order).
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

    if (enableTts) {
      speakVietnameseFeedback(`Đã cập nhật thành công hóa đơn ${targetOrder.code}`);
    }

    showToast(`Đã cập nhật hóa đơn ${targetOrder.code} và đồng bộ kho & quỹ!`, 'success');
    handleClose();
    setCurrentView('orders');
  };

  const handleConfirmCancelOrder = () => {
    if (!pendingCancelOrder) return;
    cancelOrder(pendingCancelOrder.id, returnStockOnCancel, cancelReason);
    if (enableTts) {
      speakVietnameseFeedback(`Đã hủy hóa đơn ${pendingCancelOrder.code}`);
    }
    handleClose();
    setCurrentView('invoices');
  };

  const detectedIntent = parseResult?.intent;
  const isMutatingIntent =
    detectedIntent === 'STOCK_IN' ||
    detectedIntent === 'UPDATE_ORDER' ||
    detectedIntent === 'CANCEL_ORDER' ||
    detectedIntent === 'CREATE_ORDER';

  return (
    <>
      {/* 1. Floating AI Assistant Mic Trigger Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => {
            resetDraftState();
            setMode('POS_ORDER');
            setIsOpen(true);
            setTimeout(() => startListening(), 100);
          }}
          className="fixed bottom-20 left-4 md:bottom-5 md:right-5 md:left-auto z-40 group flex items-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-3 py-2 md:px-3.5 md:py-2.5 rounded-full shadow-xl shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="Trợ lý AI Giọng nói Ngân Sơn (Phím tắt: Alt + V)"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Mic className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-blue-700 animate-pulse" />
          </div>
          <div className="text-left hidden sm:block pr-1">
            <div className="text-xs font-bold leading-none flex items-center gap-1">
              <span>Trợ lý AI</span>
              <Sparkles className="w-3 h-3 text-amber-300" />
            </div>
            <div className="text-[10px] text-blue-100 font-medium mt-0.5">Alt + V</div>
          </div>
        </button>
      )}

      {/* 2. Global AI Voice Assistant Modal / Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-4 overflow-y-auto">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base leading-tight">Trợ Lý AI Giọng Nói Ngân Sơn</h3>
                    <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/30 font-bold">
                      Gemini 3.7 Flash
                    </span>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Tìm hàng, báo giá, bán hàng, nhập kho, sửa/hủy hóa đơn & tra cứu nợ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  title="Làm mới / Nhập lại từ đầu"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEnableTts(!enableTts)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    enableTts ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                  }`}
                  title={enableTts ? 'Đang bật giọng đọc phản hồi' : 'Đã tắt giọng đọc'}
                >
                  {enableTts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Đóng trợ lý"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="px-5 pt-3 shrink-0">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setMode('POS_ORDER')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'POS_ORDER' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Bán hàng / Vào đơn
                </button>
                <button
                  onClick={() => setMode('STOCK_IN')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'STOCK_IN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:bg-white/70'
                  }`}
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  Nhập kho hàng
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Mic & Waveform Center Bar */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center relative overflow-hidden flex flex-col items-center">
                {isListening && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-blue-400/20 animate-ping" />
                    <div className="w-36 h-36 rounded-full bg-blue-300/10 animate-pulse" />
                  </div>
                )}

                <button
                  onClick={toggleListening}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 hover:bg-rose-600 ring-4 ring-rose-300 scale-105 animate-bounce'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </button>

                <div className="mt-3 text-xs font-bold text-slate-800">
                  {isListening
                    ? 'Đang nghe liên tục... nói tự nhiên, có thể ngắt lời AI bất cứ lúc nào'
                    : isAnalyzing
                    ? 'Đang phân tích thông minh qua Gemini AI...'
                    : 'Bấm micro để nói lệnh hoặc câu hỏi'}
                </div>

                {isListening && transcript && !isAnalyzing && (
                  <button
                    onClick={() => {
                      if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
                      stopListening();
                      executeAnalysis(transcript);
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer animate-in fade-in"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Phân tích ngay
                  </button>
                )}

                {transcript && (
                  <div className="mt-3 w-full max-w-lg bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-left">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Nội dung đã ghi nhận:</span>
                      {isAnalyzing && (
                        <span className="text-blue-600 flex items-center gap-1 font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" /> Đang xử lý...
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 leading-snug italic">"{transcript}"</div>
                  </div>
                )}

                <form onSubmit={handleManualSubmit} className="mt-3 w-full max-w-lg flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Hoặc gõ câu lệnh (VD: Tìm bóng led 9w, Bán 2 cuộn dây cadivi...)"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isAnalyzing || !manualInput.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Gửi
                  </button>
                </form>
              </div>

              {/* Preset Prompts Chips */}
              {!parseResult && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gợi ý câu lệnh mẫu:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
                          lastAnalyzedTextRef.current = '';
                          setTranscript(p.query);
                          executeAnalysis(p.query);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results & Action Display */}
              {parseResult && (
                <div
                  className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 animate-in fade-in ${
                    isMutatingIntent ? 'border-amber-300 ring-1 ring-amber-100' : 'border-blue-200'
                  }`}
                >
                  {/* Spoken AI Feedback Bubble */}
                  {parseResult.spokenFeedback && (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-blue-900 leading-snug">{parseResult.spokenFeedback}</div>
                        {parseResult.explanation && (
                          <div className="text-[10px] text-blue-700/80 mt-0.5">{parseResult.explanation}</div>
                        )}
                      </div>
                      {enableTts && (
                        <button
                          onClick={() => speakVietnameseFeedback(parseResult.spokenFeedback!)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-100 cursor-pointer"
                          title="Phát lại âm thanh"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {isMutatingIntent && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Vui lòng kiểm tra kỹ nội dung bên dưới trước khi bấm xác nhận — hành động này sẽ thay đổi dữ liệu thật.
                    </div>
                  )}

                  {/* 1. SEARCH_PRODUCT — read-only */}
                  {parseResult.intent === 'SEARCH_PRODUCT' && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-blue-600" />
                        <span>Kết quả tìm kiếm sản phẩm:</span>
                      </div>
                      {parseResult.items.length > 0 ? (
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                          {parseResult.items.map((item, idx) => (
                            <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{item.product.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  SKU: {item.product.sku} • ĐVT: {item.product.unit}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-bold text-blue-600">{formatCurrency(item.product.selling_price)}</span>
                                  <span className="text-[10px] text-slate-400">|</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      item.product.stock > item.product.min_stock
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : item.product.stock > 0
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    Tồn: {item.product.stock} {item.product.unit}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAddSingleProductToCart(item.product, 1)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Thêm vào POS</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                          Chưa tìm thấy sản phẩm khớp hoàn toàn trong kho. Bạn hãy thử nói tên thông dụng (VD: bóng led, cadivi, aptomat...).
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. CHECK_DEBT — read-only */}
                  {parseResult.intent === 'CHECK_DEBT' && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-bold text-slate-900">Khách hàng: {parseResult.customerName || 'Khách lẻ'}</span>
                        </div>
                        {parseResult.customerPhone && (
                          <span className="text-xs text-slate-600 font-mono">{parseResult.customerPhone}</span>
                        )}
                      </div>
                      <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                        <span className="text-xs text-slate-600">Công nợ hiện tại:</span>
                        <span className="text-base font-black text-rose-600 font-mono">{formatCurrency(parseResult.debtBalance || 0)}</span>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => {
                            setCurrentView('customers');
                            handleClose();
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline cursor-pointer"
                        >
                          <span>Mở trang Quản lý Khách hàng & Công nợ</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. NAVIGATE — read-only, already redirected above */}
                  {parseResult.intent === 'NAVIGATE' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {parseResult.spokenFeedback}
                      </span>
                      <button onClick={handleClose} className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                        OK
                      </button>
                    </div>
                  )}

                  {/* 4. CANCEL_ORDER — explicit red confirm gate */}
                  {parseResult.intent === 'CANCEL_ORDER' && pendingCancelOrder && (
                    <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
                      <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Xác nhận hủy hóa đơn {pendingCancelOrder.code}?
                      </div>
                      <div className="text-xs text-slate-700 space-y-1">
                        <div>
                          Khách hàng: <strong>{pendingCancelOrder.customer_name}</strong>
                        </div>
                        <div>
                          Tổng tiền: <strong className="text-rose-700">{formatCurrency(pendingCancelOrder.final_amount)}</strong>
                        </div>
                        <div>
                          Số mặt hàng: <strong>{pendingCancelOrder.items.reduce((s, i) => s + i.quantity, 0)}</strong>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={returnStockOnCancel}
                          onChange={(e) => setReturnStockOnCancel(e.target.checked)}
                          className="cursor-pointer"
                        />
                        Tự động hoàn trả sản phẩm về kho hàng
                      </label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Lý do hủy đơn (không bắt buộc)..."
                        className="w-full px-3 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setPendingCancelOrder(null)}
                          className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          onClick={handleConfirmCancelOrder}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          XÁC NHẬN HỦY HÓA ĐƠN
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. CREATE_ORDER / ADD_TO_CART / STOCK_IN / UPDATE_ORDER — editable review table */}
                  {(parseResult.intent === 'CREATE_ORDER' ||
                    parseResult.intent === 'ADD_TO_CART' ||
                    parseResult.intent === 'STOCK_IN' ||
                    parseResult.intent === 'UPDATE_ORDER') && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {/* Customer & Payment Meta Strip */}
                      <div className="bg-slate-50/90 px-3 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Khách lẻ"
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 w-28"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <input
                            type="text"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="0912..."
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 w-24"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="CASH">💵 Tiền mặt</option>
                            <option value="TRANSFER">📱 Chuyển khoản</option>
                            <option value="CARD">💳 Quẹt thẻ</option>
                          </select>
                        </div>
                        {parseResult.intent === 'UPDATE_ORDER' && (
                          <div className="flex items-center gap-1.5 text-xs bg-amber-50 px-2 py-1 rounded-md border border-amber-200 text-amber-900">
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <input
                              type="text"
                              value={orderCodeToUpdate}
                              onChange={(e) => setOrderCodeToUpdate(e.target.value)}
                              placeholder="Mã HĐ..."
                              className="px-1.5 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold w-24"
                            />
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="p-3">
                        {parsedItems.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs">
                            <ShoppingCart className="w-7 h-7 mx-auto mb-2 opacity-40" />
                            Chưa có sản phẩm nào được bóc tách.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {parsedItems.map((item, index) => {
                              const price = mode === 'POS_ORDER' ? item.unitPrice : item.unitCost;
                              const lineTotal = price * item.quantity;
                              return (
                                <div
                                  key={index}
                                  className="p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-colors text-xs space-y-1.5"
                                >
                                  {/* Row 1: name + SKU/unit (own line, truncates) + remove — never competes with the controls below for width. */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-slate-900 truncate">{item.product.name}</div>
                                      <div className="text-[11px] text-slate-500 truncate">
                                        Mã: <strong className="text-slate-700">{item.product.sku}</strong> • ĐVT: <strong>{item.product.unit}</strong>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveItem(index)}
                                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Row 2: qty stepper + price + line total — short enough to always fit on narrow screens. */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleQuantityChange(index, -1)}
                                        className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="font-bold text-slate-900 w-6 text-center">{item.quantity}</span>
                                      <button
                                        onClick={() => handleQuantityChange(index, 1)}
                                        className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <input
                                      type="number"
                                      onFocus={(e) => e.target.select()}
                                      value={price}
                                      onChange={(e) =>
                                        mode === 'POS_ORDER'
                                          ? handlePriceChange(index, Number(e.target.value))
                                          : handleCostChange(index, Number(e.target.value))
                                      }
                                      className="w-20 min-w-0 shrink text-right font-semibold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-500"
                                    />
                                    <div className="shrink-0 text-right font-bold text-blue-600">{formatCurrency(lineTotal)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                          <button
                            onClick={() => setShowItemSearch(!showItemSearch)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm mặt hàng</span>
                          </button>
                          <div className="flex items-center gap-2 text-xs">
                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                            <input
                              type="number"
                              onFocus={(e) => e.target.select()}
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                              placeholder="0"
                              className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-bold text-right text-rose-600 focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-500">đ giảm giá</span>
                          </div>
                        </div>

                        {showItemSearch && (
                          <div className="mt-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2 animate-in fade-in duration-150">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Gõ tên hoặc mã sản phẩm..."
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
                                        isOutOfStock ? 'bg-slate-50/70 border-rose-200 opacity-60' : 'bg-white hover:bg-blue-100 border-slate-200'
                                      }`}
                                    >
                                      <span className="font-semibold text-slate-800 truncate">
                                        {p.name} ({p.sku})
                                      </span>
                                      <span className="font-bold text-blue-600 shrink-0">{formatCurrency(p.selling_price)}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Total & confirm actions */}
                      <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs space-y-0.5">
                          <div className="text-slate-500">
                            Tạm tính: <strong className="text-slate-800">{formatCurrency(rawSubtotal)}</strong>
                            {effectiveDiscount > 0 && (
                              <span className="ml-2 text-rose-600">
                                - Giảm: <strong>{formatCurrency(effectiveDiscount)}</strong>
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-blue-700">Tổng: {formatCurrency(totalAmount)}</div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {parseResult.intent === 'STOCK_IN' ? (
                            <button
                              onClick={handleExecuteStockIn}
                              disabled={parsedItems.length === 0}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <PackagePlus className="w-4 h-4" />
                              XÁC NHẬN NHẬP KHO
                            </button>
                          ) : parseResult.intent === 'UPDATE_ORDER' ? (
                            <button
                              onClick={handleUpdateExistingOrder}
                              disabled={parsedItems.length === 0}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Edit3 className="w-4 h-4" />
                              LƯU CẬP NHẬT HÓA ĐƠN
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleApplyToCart}
                                disabled={parsedItems.length === 0}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Vào Giỏ Hàng POS
                              </button>
                              <button
                                onClick={handleDirectCreateInvoice}
                                disabled={parsedItems.length === 0}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                                TẠO HÓA ĐƠN & TRỪ KHO NGAY
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
