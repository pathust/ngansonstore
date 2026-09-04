import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Customer, Supplier, VoiceIntent } from '../../types';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  analyzeVoiceOrderIntentWithAI,
  VoiceOrderParseResult,
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
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GlobalVoiceAssistantProps {
  externalOpen?: boolean;
  onCloseExternal?: () => void;
  initialQuery?: string;
  initialMode?: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER';
}

export const GlobalVoiceAssistant: React.FC<GlobalVoiceAssistantProps> = ({
  externalOpen,
  onCloseExternal,
  initialQuery = '',
  initialMode = 'POS_ORDER',
}) => {
  const {
    products,
    customers,
    suppliers,
    addToCart,
    updateActiveTabInfo,
    setCurrentView,
    showToast,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enableTts, setEnableTts] = useState(true);
  const [parseResult, setParseResult] = useState<VoiceOrderParseResult | null>(null);

  const recognitionRef = useRef<any>(null);
  const analyzeTimeoutRef = useRef<any>(null);
  const lastAnalyzedTextRef = useRef<string>('');
  const isSpeakingRef = useRef<boolean>(false);

  // Sync external open trigger
  useEffect(() => {
    if (externalOpen !== undefined) {
      setIsOpen(externalOpen);
      if (externalOpen) {
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
  }, [externalOpen, initialQuery]);

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
    if (onCloseExternal) onCloseExternal();
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const rec = createSpeechRecognition(
      (newTranscript, _isFinal) => {
        // If system is currently speaking TTS feedback, ignore incoming sound
        if (isSpeakingRef.current) return;

        setTranscript(newTranscript);
        if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);

        // DO NOT interrupt user on isFinal! Continuous speech has natural pauses.
        // Wait 2500ms of sustained silence before auto-analyzing so the user is never cut off mid-sentence.
        analyzeTimeoutRef.current = setTimeout(() => {
          executeAnalysis(newTranscript);
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
        executeAnalysis(transcript);
      }
    } else {
      startListening();
    }
  };

  const executeAnalysis = async (text: string) => {
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
        (initialMode || 'POS_ORDER') as 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER'
      );
      setParseResult(result);

      // Auto TTS response: pause mic while speaking to prevent microphone loop
      if (enableTts && result.spokenFeedback) {
        stopListening();
        isSpeakingRef.current = true;
        speakVietnameseFeedback(result.spokenFeedback, () => {
          isSpeakingRef.current = false;
        });
      }

      // If intent is direct navigation, handle auto redirect if requested
      if (result.intent === 'NAVIGATE' && result.targetScreen) {
        setCurrentView(result.targetScreen as any);
        showToast(result.spokenFeedback || 'Đang chuyển trang...', 'info');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
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

  // Action Handlers
  const handleApplyToCart = () => {
    if (!parseResult || parseResult.items.length === 0) return;

    parseResult.items.forEach((item) => {
      addToCart(item.product, item.quantity);
    });

    if (parseResult.customerName || parseResult.discountAmount) {
      updateActiveTabInfo({
        customer_name: parseResult.customerName,
        customer_phone: parseResult.customerPhone,
        discount_amount: parseResult.discountAmount,
        payment_method: parseResult.paymentMethod,
        note: parseResult.note,
      });
    }

    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    } catch {}

    showToast(`Đã thêm ${parseResult.items.length} mặt hàng vào giỏ POS!`, 'success');
    setCurrentView('pos');
    handleClose();
  };

  const handleAddSingleProductToCart = (prod: Product, qty: number = 1) => {
    addToCart(prod, qty);
    showToast(`Đã thêm "${prod.name}" vào giỏ hàng POS!`, 'success');
    setCurrentView('pos');
  };

  return (
    <>
      {/* 1. Floating AI Assistant Mic Trigger Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => {
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
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]">
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
                    Hỗ trợ tìm kiếm hàng hóa, báo giá, bán hàng, nhập kho & tra cứu nợ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
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

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Mic & Waveform Center Bar */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center relative overflow-hidden flex flex-col items-center">
                {/* Visual pulse rings when listening */}
                {isListening && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-blue-400/20 animate-ping" />
                    <div className="w-36 h-36 rounded-full bg-blue-300/10 animate-pulse" />
                  </div>
                )}

                {/* Big Mic Button */}
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
                    ? 'Đang nghe liên tục... Nói tự nhiên không sợ ngắt lời (tự phân tích sau 2.5s ngừng nói)'
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

                {/* Real-time transcript display */}
                {transcript && (
                  <div className="mt-3 w-full max-w-lg bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-left">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Nội dung đã ghi nhận:</span>
                      {isAnalyzing && (
                        <span className="text-blue-600 flex items-center gap-1 font-semibold">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Đang xử lý...
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 leading-snug italic">
                      "{transcript}"
                    </div>
                  </div>
                )}

                {/* Text input fallback */}
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
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Gửi
                  </button>
                </form>
              </div>

              {/* Preset Prompts Chips */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Gợi ý câu lệnh mẫu:
                </div>
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

              {/* Results & Action Display */}
              {parseResult && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 space-y-3 animate-in fade-in">
                  {/* Spoken AI Feedback Bubble */}
                  {parseResult.spokenFeedback && (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-blue-900 leading-snug">
                          {parseResult.spokenFeedback}
                        </div>
                        {parseResult.explanation && (
                          <div className="text-[10px] text-blue-700/80 mt-0.5">
                            {parseResult.explanation}
                          </div>
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

                  {/* 1. Result for SEARCH_PRODUCT */}
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
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {item.product.name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  SKU: {item.product.sku} • ĐVT: {item.product.unit}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-bold text-blue-600">
                                    {formatCurrency(item.product.selling_price)}
                                  </span>
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

                  {/* 2. Result for CHECK_DEBT */}
                  {parseResult.intent === 'CHECK_DEBT' && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-bold text-slate-900">
                            Khách hàng: {parseResult.customerName || 'Khách lẻ'}
                          </span>
                        </div>
                        {parseResult.customerPhone && (
                          <span className="text-xs text-slate-600 font-mono">
                            {parseResult.customerPhone}
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                        <span className="text-xs text-slate-600">Công nợ hiện tại:</span>
                        <span className="text-base font-black text-rose-600 font-mono">
                          {formatCurrency(parseResult.debtBalance || 0)}
                        </span>
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

                  {/* 3. Result for POS ORDER or ADD_TO_CART */}
                  {(parseResult.intent === 'CREATE_ORDER' || parseResult.intent === 'ADD_TO_CART') && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">
                          Danh sách mặt hàng ({parseResult.items.length}):
                        </span>
                        {parseResult.customerName && (
                          <span className="text-blue-700 font-semibold">
                            Khách: {parseResult.customerName}
                          </span>
                        )}
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        {parseResult.items.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-white flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{item.product.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {item.quantity} {item.product.unit} x {formatCurrency(item.unitPrice)}
                              </div>
                            </div>
                            <div className="font-bold text-slate-900">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={handleApplyToCart}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Đưa vào Giỏ Hàng POS</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. Result for STOCK_IN */}
                  {parseResult.intent === 'STOCK_IN' && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <PackagePlus className="w-4 h-4 text-indigo-600" />
                        <span>Mặt hàng đề xuất nhập kho:</span>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {parseResult.items.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-white flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{item.product.name}</div>
                              <div className="text-[11px] text-slate-500">
                                Số lượng nhập: <strong>{item.quantity}</strong> {item.product.unit} • Giá vốn: {formatCurrency(item.unitCost)}
                              </div>
                            </div>
                            <div className="font-bold text-indigo-700">
                              {formatCurrency(item.quantity * item.unitCost)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => {
                            setCurrentView('products');
                            handleClose();
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <PackagePlus className="w-4 h-4" />
                          <span>Mở Phiếu Nhập Kho</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5. Result for NAVIGATE */}
                  {parseResult.intent === 'NAVIGATE' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {parseResult.spokenFeedback}
                      </span>
                      <button
                        onClick={handleClose}
                        className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        OK
                      </button>
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
