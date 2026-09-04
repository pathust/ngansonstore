import { Product, CartItem, Supplier, Customer, Order, VoiceIntent } from '../types';
import { cleanTextForMatch, parseCleanNumber } from './formatters';
import { apiClient } from '../services/apiClient';

export interface ParsedVoiceItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  confidence: number;
  matchedText: string;
}

export interface VoiceOrderParseResult {
  mode: 'POS_ORDER' | 'STOCK_IN' | 'SEARCH' | 'NAVIGATE' | 'DEBT';
  intent?: VoiceIntent;
  targetScreen?: string;
  items: ParsedVoiceItem[];
  customerName?: string;
  customerPhone?: string;
  matchedCustomer?: Customer;
  debtBalance?: number;
  discountAmount?: number;
  discountPercent?: number;
  discountType?: 'AMOUNT' | 'PERCENT';
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CARD';
  supplierName?: string;
  orderCodeToUpdate?: string;
  note?: string;
  spokenFeedback?: string;
  explanation?: string;
  confidence?: number;
  rawTranscript: string;
  unmatchedPhrases: string[];
  source?: 'GEMINI_AI' | 'LOCAL_NLP';
}

/**
 * Check if browser supports SpeechRecognition
 */
export const isSpeechRecognitionSupported = (): boolean => {
  return typeof window !== 'undefined' && (
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window ||
    'mozSpeechRecognition' in window ||
    'msSpeechRecognition' in window
  );
};

/**
 * Initialize speech recognition instance for Vietnamese
 */
export const createSpeechRecognition = (
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
): any => {
  if (!isSpeechRecognitionSupported()) {
    onError('Trình duyệt không hỗ trợ nhận diện giọng nói Web Speech API.');
    return null;
  }

  try {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      onError('Trình duyệt không hỗ trợ nhận diện giọng nói Web Speech API.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      try {
        // Prevent acoustic echo feedback loop if system TTS is speaking
        if (isTtsSpeaking()) {
          return;
        }

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i][0];
          if (!item) continue;
          if (event.results[i].isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + item.transcript.trim();
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + item.transcript.trim();
          }
        }

        const currentTranscript = [finalTranscript, interimTranscript].filter(Boolean).join(' ').trim();
        if (currentTranscript) {
          onResult(currentTranscript, Boolean(finalTranscript));
        }
      } catch (err) {
        console.warn('Error parsing speech recognition results:', err);
      }
    };

    recognition.onerror = (event: any) => {
      let errorMsg = 'Lỗi nhận diện giọng nói: ' + (event.error || 'không xác định');
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMsg = 'Quyền truy cập Micro đã bị từ chối hoặc bị hạn chế trên trình duyệt!';
      } else if (event.error === 'no-speech') {
        errorMsg = 'Không nhận được âm thanh. Hãy thử nói lại gần micro hơn.';
      } else if (event.error === 'aborted') {
        return;
      }
      onError(errorMsg);
    };

    recognition.onend = () => {
      try {
        onEnd();
      } catch (err) {
        console.warn('Error on recognition end:', err);
      }
    };

    return recognition;
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn('Speech recognition initialization error:', err);
    onError('Không thể khởi tạo micro nhận diện giọng nói.');
    return null;
  }
};

// Map Vietnamese spoken number words to numeric values
const VIETNAMESE_NUM_WORDS: Record<string, number> = {
  'nửa': 0.5,
  'một': 1,
  'mốt': 1,
  'hai': 2,
  'cặp': 2,
  'đôi': 2,
  'ba': 3,
  'bốn': 4,
  'tư': 4,
  'năm': 5,
  'lăm': 5,
  'sáu': 6,
  'bảy': 7,
  'bẩy': 7,
  'tám': 8,
  'chín': 9,
  'mười': 10,
  'mươi': 10,
  'chục': 10,
  'tá': 12,
  'trăm': 100,
  'nghìn': 1000,
  'ngàn': 1000,
  'k': 1000,
  'triệu': 1000000,
  'tr': 1000000,
};

/**
 * Convert Vietnamese spoken number phrase (e.g. "hai mươi lăm", "50", "100k", "mười lăm nghìn") to number
 */
export const parseSpokenNumber = (text: string): number => {
  const clean = text.toLowerCase().trim();
  if (!clean) return 1;

  if (clean === 'nửa tá') return 6;
  if (clean === '1 tá' || clean === 'một tá') return 12;
  if (clean === '1 đôi' || clean === 'một đôi' || clean === '1 cặp' || clean === 'một cặp') return 2;

  // Direct number or number with k/nghìn/triệu
  const kMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|triệu|tr)?$/i);
  if (kMatch) {
    let base = parseFloat(kMatch[1].replace(',', '.'));
    const unit = (kMatch[2] || '').toLowerCase();
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') base *= 1000;
    else if (unit === 'triệu' || unit === 'tr') base *= 1000000;
    return Math.round(base);
  }

  // Word combinations
  const words = clean.split(/\s+/);
  let total = 0;
  let currentGroup = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const val = VIETNAMESE_NUM_WORDS[w];
    if (val !== undefined) {
      if (val === 1000000) {
        currentGroup = (currentGroup || 1) * 1000000;
        total += currentGroup;
        currentGroup = 0;
      } else if (val === 1000) {
        currentGroup = (currentGroup || 1) * 1000;
        total += currentGroup;
        currentGroup = 0;
      } else if (val === 100) {
        currentGroup = (currentGroup || 1) * 100;
      } else if (val === 10) {
        currentGroup = (currentGroup || 1) * 10;
      } else {
        currentGroup += val;
      }
    } else if (!isNaN(Number(w))) {
      currentGroup += Number(w);
    }
  }

  total += currentGroup;
  return total > 0 ? total : 1;
};

/**
 * Intelligent Vietnamese NLP parser for Voice POS Order & Voice Stock-In
 */
export const parseVoiceCommand = (
  transcript: string,
  allProducts: Product[],
  allSuppliers: Supplier[] = [],
  defaultMode: 'POS_ORDER' | 'STOCK_IN' = 'POS_ORDER',
  allCustomers: Customer[] = []
): VoiceOrderParseResult => {
  const cleanTranscript = transcript.trim();
  const lowerTranscript = cleanTranscript.toLowerCase();

  // 1. Detect Intent & Mode
  let mode: 'POS_ORDER' | 'STOCK_IN' | 'SEARCH' | 'NAVIGATE' | 'DEBT' = defaultMode;
  let intent: VoiceIntent = 'CREATE_ORDER';
  let targetScreen: string | undefined;

  if (lowerTranscript.includes('mở sổ quỹ') || lowerTranscript.includes('sổ quỹ') || lowerTranscript.includes('thu chi')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'cashbook';
  } else if (lowerTranscript.includes('báo cáo') || lowerTranscript.includes('doanh thu') || lowerTranscript.includes('lợi nhuận')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'reports';
  } else if (lowerTranscript.includes('quản lý kho') || lowerTranscript.includes('kiểm kê')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'inventory';
  } else if (lowerTranscript.includes('quản lý sản phẩm') || lowerTranscript.includes('danh mục hàng') || lowerTranscript.includes('mở hàng hóa')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'products';
  } else if (lowerTranscript.includes('mở bán hàng') || lowerTranscript.includes('vào pos') || lowerTranscript.includes('màn hình bán')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'pos';
  } else if (lowerTranscript.includes('hóa đơn') || lowerTranscript.includes('lịch sử đơn')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'invoices';
  } else if (lowerTranscript.includes('quản lý khách') || lowerTranscript.includes('danh sách khách')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'customers';
  } else if (lowerTranscript.includes('nhà cung cấp') || lowerTranscript.includes('ncc')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'suppliers';
  } else if (lowerTranscript.includes('cài đặt') || lowerTranscript.includes('mã qr')) {
    intent = 'NAVIGATE';
    mode = 'NAVIGATE';
    targetScreen = 'settings';
  } else if (lowerTranscript.includes('nợ') || lowerTranscript.includes('công nợ')) {
    intent = 'CHECK_DEBT';
    mode = 'DEBT';
  } else if (
    lowerTranscript.startsWith('tìm') ||
    lowerTranscript.includes('tìm kiếm') ||
    lowerTranscript.includes('giá bao nhiêu') ||
    lowerTranscript.includes('còn mấy') ||
    lowerTranscript.includes('còn không') ||
    lowerTranscript.includes('còn hàng') ||
    lowerTranscript.includes('tồn kho')
  ) {
    intent = 'SEARCH_PRODUCT';
    mode = 'SEARCH';
  } else if (
    lowerTranscript.includes('nhập kho') ||
    lowerTranscript.includes('nhập hàng') ||
    lowerTranscript.includes('mua hàng từ') ||
    lowerTranscript.includes('nhập về') ||
    defaultMode === 'STOCK_IN'
  ) {
    mode = 'STOCK_IN';
    intent = 'STOCK_IN';
  } else if (lowerTranscript.includes('thêm vào giỏ') || lowerTranscript.includes('cho vào giỏ') || lowerTranscript.includes('cho vào đơn')) {
    intent = 'ADD_TO_CART';
  } else if (lowerTranscript.includes('sửa đơn') || lowerTranscript.includes('cập nhật đơn')) {
    intent = 'UPDATE_ORDER';
  } else if (lowerTranscript.includes('hủy đơn') || lowerTranscript.includes('trả hàng')) {
    intent = 'CANCEL_ORDER';
  } else {
    intent = 'CREATE_ORDER';
  }

  // 2. Detect Order Code (e.g. "sửa đơn HD-20260902-1234" or "HD1234")
  let orderCodeToUpdate: string | undefined;
  const orderCodeMatch = cleanTranscript.match(/(?:HD[-_0-9a-zA-Z]+|\b\d{4,8}\b)/i);
  if (orderCodeMatch) {
    orderCodeToUpdate = orderCodeMatch[0];
  }

  // 3. Detect Customer Name and Phone
  let customerName: string | undefined = intent === 'STOCK_IN' ? undefined : 'Khách lẻ';
  let customerPhone: string | undefined;
  const customerMatch = lowerTranscript.match(
    /(?:khách hàng|khách|bán cho|anh|chị|cô|chú|bác|em)\s+([a-zA-Zà-ỹÀ-Ỹ\s]+?)(?:\s+(?:sdt|số điện thoại|sđt|mua|lấy|nhập|\d|$))/i
  );
  if (customerMatch && customerMatch[1]) {
    const rawName = customerMatch[1].trim();
    if (rawName.length > 1 && !['hàng', 'kho', 'đơn', 'lẻ'].includes(rawName)) {
      customerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
  }

  const phoneMatch = cleanTranscript.match(/(?:0[3|5|7|8|9][0-9]{8})/);
  if (phoneMatch) {
    customerPhone = phoneMatch[0];
  }

  // 4. Detect Payment Method
  let paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' = 'CASH';
  if (
    lowerTranscript.includes('chuyển khoản') ||
    lowerTranscript.includes('ck') ||
    lowerTranscript.includes('vietqr') ||
    lowerTranscript.includes('quét mã') ||
    lowerTranscript.includes('qr')
  ) {
    paymentMethod = 'TRANSFER';
  } else if (
    lowerTranscript.includes('quẹt thẻ') ||
    lowerTranscript.includes('thẻ') ||
    lowerTranscript.includes('pos')
  ) {
    paymentMethod = 'CARD';
  }

  // 5. Detect Discount
  let discountAmount: number | undefined;
  let discountPercent: number | undefined;
  let discountType: 'AMOUNT' | 'PERCENT' = 'AMOUNT';
  const discountPercentMatch = lowerTranscript.match(/(?:giảm|chiết khấu|bớt)\s*(\d+)\s*%/i);
  if (discountPercentMatch) {
    discountPercent = parseInt(discountPercentMatch[1], 10);
    discountType = 'PERCENT';
  } else {
    const discountAmountMatch = lowerTranscript.match(
      /(?:giảm|chiết khấu|bớt|trừ)\s*(\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|đ|đồng)?)/i
    );
    if (discountAmountMatch) {
      discountAmount = parseSpokenNumber(discountAmountMatch[1]);
      discountType = 'AMOUNT';
    }
  }

  // 6. Detect Supplier (for Stock-In)
  let supplierName: string | undefined;
  const supplierMatch = lowerTranscript.match(
    /(?:nhà cung cấp|ncc|từ nhà cung cấp|từ)\s+([a-zA-Zà-ỹÀ-Ỹ0-9\s]+?)(?:\s+(?:giá|nhập|sl|với|\.|$))/i
  );
  if (supplierMatch && supplierMatch[1]) {
    supplierName = supplierMatch[1].trim();
  }

  // 7. Split transcript into clauses and extract product matches
  const delimiters = /[,;.]|\bvà\b|\bcộng\b|\bvới\b|\brồi\b|\btiếp\b|\blấy thêm\b|\bthêm\b/gi;
  const rawClauses = lowerTranscript.split(delimiters).map((c) => c.trim()).filter((c) => c.length > 2);

  const matchedItems: ParsedVoiceItem[] = [];
  const unmatchedPhrases: string[] = [];

  // Helper to score how well a product matches a spoken phrase
  const matchProductInPhrase = (phrase: string): { product: Product; score: number } | null => {
    const cleanPhrase = cleanTextForMatch(phrase);
    let bestProduct: Product | null = null;
    let bestScore = 0;

    for (const prod of allProducts) {
      const prodNameClean = cleanTextForMatch(prod.name);
      const prodSkuClean = cleanTextForMatch(prod.sku);
      const prodBarcode = prod.barcode;

      // Exact SKU or Barcode match
      if (phrase.includes(prod.sku.toLowerCase()) || (prodBarcode && phrase.includes(prodBarcode))) {
        return { product: prod, score: 1.0 };
      }

      // Check product name tokens
      const prodTokens = prodNameClean.split(' ').filter((t) => t.length > 1);
      if (prodTokens.length === 0) continue;

      let matchedTokens = 0;
      for (const token of prodTokens) {
        if (cleanPhrase.includes(token)) {
          matchedTokens++;
        }
      }

      const matchRatio = matchedTokens / prodTokens.length;

      // Check for full name substring
      if (cleanPhrase.includes(prodNameClean)) {
        return { product: prod, score: 0.95 };
      }

      if (matchRatio >= 0.4 && matchRatio > bestScore) {
        bestScore = matchRatio;
        bestProduct = prod;
      }
    }

    if (bestProduct && bestScore >= 0.35) {
      return { product: bestProduct, score: bestScore };
    }

    return null;
  };

  // Extract quantities and cost prices from clauses
  for (const clause of rawClauses) {
    if (
      /^(bán|nhập kho|nhập hàng|tạo đơn|tính tiền|cho tôi|lấy|thanh toán tiền mặt|chuyển khoản|giảm giá)/i.test(
        clause
      ) &&
      clause.length < 15
    ) {
      continue;
    }

    const matchResult = matchProductInPhrase(clause);
    if (matchResult) {
      const { product, score } = matchResult;

      // Extract Quantity: look for patterns like "2 gói", "3 chai", "5 cái", "10", "hai thùng", "3 cuộn", "nửa tá"
      let qty = 1;
      const qtyMatch = clause.match(
        /(\d+|nửa tá|1 tá|một tá|1 đôi|một đôi|1 cặp|một cặp|một|hai|ba|bốn|tư|năm|lăm|sáu|bảy|bẩy|tám|chín|mười|chục|tá)\s*(?:gói|chai|lon|hộp|thùng|cái|chiếc|kg|cây|lốc|vỉ|bịch|bình|bao|hũ|lọ|sp|cuộn|bóng|bộ|mét|m|đôi|cặp)?/i
      );
      if (qtyMatch) {
        qty = parseSpokenNumber(qtyMatch[1]);
      }

      // Extract custom cost or price if mentioned (e.g. "giá 105 nghìn", "giá nhập 120k")
      let customCost = product.cost_price;
      let customPrice = product.selling_price;

      const priceMatch = clause.match(/(?:giá|với giá|giá nhập|đơn giá)\s*(\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|triệu|tr|đ)?)/i);
      if (priceMatch) {
        const parsedPrice = parseSpokenNumber(priceMatch[1]);
        if (mode === 'STOCK_IN') {
          customCost = parsedPrice;
        } else {
          customPrice = parsedPrice;
        }
      }

      // Check if item was already added
      const existing = matchedItems.find((m) => m.product.id === product.id);
      if (existing) {
        existing.quantity += qty;
      } else {
        matchedItems.push({
          product,
          quantity: Math.max(1, qty),
          unitPrice: customPrice,
          unitCost: customCost,
          confidence: score,
          matchedText: clause,
        });
      }
    } else {
      if (clause.length > 3) {
        unmatchedPhrases.push(clause);
      }
    }
  }

  // Fallback: If no delimiter matched, search the whole transcript for any product
  if (matchedItems.length === 0) {
    for (const prod of allProducts) {
      const prodNameClean = cleanTextForMatch(prod.name);
      if (cleanTextForMatch(lowerTranscript).includes(prodNameClean)) {
        matchedItems.push({
          product: prod,
          quantity: 1,
          unitPrice: prod.selling_price,
          unitCost: prod.cost_price,
          confidence: 0.8,
          matchedText: prod.name,
        });
      }
    }
  }

  let matchedCustomer: Customer | undefined;
  if (customerName && customerName !== 'Khách lẻ') {
    matchedCustomer = allCustomers.find(
      (c) =>
        c.name.toLowerCase().includes(customerName!.toLowerCase()) ||
        customerName!.toLowerCase().includes(c.name.toLowerCase())
    );
  }

  let spokenFeedback = '';
  if (intent === 'NAVIGATE') {
    const screenLabels: Record<string, string> = {
      pos: 'màn hình Bán hàng POS',
      products: 'danh mục Hàng hóa & Bảng giá',
      invoices: 'Lịch sử hóa đơn',
      reports: 'Báo cáo doanh thu',
      inventory: 'Sổ kho & Kiểm kê',
      cashbook: 'Sổ quỹ Thu Chi',
      customers: 'danh sách Khách hàng',
      suppliers: 'danh sách Nhà cung cấp',
      settings: 'Cài đặt Cửa hàng',
    };
    spokenFeedback = `Đang chuyển tới ${screenLabels[targetScreen || 'pos'] || 'màn hình chức năng'}`;
  } else if (intent === 'CHECK_DEBT') {
    if (matchedCustomer) {
      spokenFeedback = `Khách hàng ${matchedCustomer.name} hiện có công nợ là ${(matchedCustomer.debt || 0).toLocaleString('vi-VN')} đồng`;
    } else {
      spokenFeedback = `Đang kiểm tra công nợ của ${customerName || 'khách hàng'}`;
    }
  } else if (intent === 'SEARCH_PRODUCT') {
    if (matchedItems.length > 0) {
      const top = matchedItems[0];
      spokenFeedback = `Tìm thấy ${top.product.name}, giá bán ${top.unitPrice.toLocaleString('vi-VN')} đồng, tồn kho hiện tại là ${top.product.stock} ${top.product.unit}`;
    } else {
      spokenFeedback = `Đang tìm kiếm "${cleanTranscript}" trong kho hàng`;
    }
  } else {
    const itemsDesc = matchedItems.map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(', ');
    spokenFeedback = matchedItems.length > 0
      ? `Đã nhận diện ${matchedItems.length} mặt hàng cho ${customerName}: ${itemsDesc}`
      : `Đã nghe: "${cleanTranscript}". Chưa tìm thấy sản phẩm khớp trong kho.`;
  }

  return {
    mode,
    intent,
    targetScreen,
    items: matchedItems,
    customerName,
    customerPhone: customerPhone || matchedCustomer?.phone,
    matchedCustomer,
    debtBalance: matchedCustomer?.debt || 0,
    discountAmount,
    discountPercent,
    discountType,
    paymentMethod,
    supplierName,
    orderCodeToUpdate,
    note: 'Lập nhanh qua Giọng nói NLP',
    spokenFeedback,
    explanation: 'Phân tích nhanh qua bộ máy xử lý ngôn ngữ tiếng Việt',
    confidence: matchedItems.length > 0 ? 0.85 : 0.6,
    rawTranscript: cleanTranscript,
    unmatchedPhrases,
    source: 'LOCAL_NLP',
  };
};

/**
 * Deep Voice & Text Intent Analysis using Gemini 3.7 Flash on Server + Local Fallback
 */
export const analyzeVoiceOrderIntentWithAI = async (
  transcript: string,
  allProducts: Product[],
  allCustomers: Customer[] = [],
  allSuppliers: Supplier[] = [],
  mode: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER' = 'POS_ORDER',
  currentOrder?: Order
): Promise<VoiceOrderParseResult> => {
  if (!transcript || !transcript.trim()) {
    return parseVoiceCommand('', allProducts, allSuppliers, mode === 'STOCK_IN' ? 'STOCK_IN' : 'POS_ORDER');
  }

  // 1. Call Backend Gemini AI Intent Extraction
  try {
    const aiData = await apiClient.parseVoiceOrder({
      text: transcript,
      products: allProducts,
      customers: allCustomers,
      suppliers: allSuppliers,
      mode,
      currentOrder,
    });

    if (aiData && aiData.items) {
      // Map matched product items
      const resolvedItems: ParsedVoiceItem[] = [];
      for (const item of aiData.items) {
        let prod = allProducts.find((p) => p.id === item.product_id);
        if (!prod) {
          prod = allProducts.find(
            (p) =>
              p.name.toLowerCase().includes(item.product_name.toLowerCase()) ||
              item.product_name.toLowerCase().includes(p.name.toLowerCase())
          );
        }

        if (prod) {
          resolvedItems.push({
            product: prod,
            quantity: Math.max(1, item.quantity || 1),
            unitPrice: item.unit_price || prod.selling_price,
            unitCost: item.unit_cost || prod.cost_price,
            confidence: 0.95,
            matchedText: item.product_name,
          });
        } else {
          // Synthetic fallback product if user entered a custom new item
          const syntheticProd: Product = {
            id: 'prod-voice-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            sku: 'SP-' + Math.floor(1000 + Math.random() * 9000),
            barcode: '',
            name: item.product_name,
            selling_price: item.unit_price || 0,
            cost_price: item.unit_cost || 0,
            stock: 100,
            min_stock: 5,
            unit: item.unit || 'cái',
            category: 'Thiết bị điện & kim khí',
            status: 'ACTIVE',
          };
          resolvedItems.push({
            product: syntheticProd,
            quantity: Math.max(1, item.quantity || 1),
            unitPrice: item.unit_price || 0,
            unitCost: item.unit_cost || 0,
            confidence: 0.8,
            matchedText: item.product_name,
          });
        }
      }

      const intent = (aiData.intent as VoiceIntent) || (mode === 'STOCK_IN' ? 'STOCK_IN' : 'CREATE_ORDER');
      const discountType = (aiData.discount?.type as 'AMOUNT' | 'PERCENT') || (aiData.discount?.percent ? 'PERCENT' : 'AMOUNT');
      const discountAmount = aiData.discount?.amount || 0;
      const discountPercent = aiData.discount?.percent || 0;

      // Find matched customer if intent is CHECK_DEBT or customer specified
      let matchedCust: Customer | undefined;
      const custQuery = aiData.customer?.name?.toLowerCase() || '';
      if (custQuery) {
        matchedCust = allCustomers.find((c) => c.name.toLowerCase().includes(custQuery) || custQuery.includes(c.name.toLowerCase()));
      }

      let parsedMode: 'POS_ORDER' | 'STOCK_IN' | 'SEARCH' | 'NAVIGATE' | 'DEBT' = 'POS_ORDER';
      if (intent === 'STOCK_IN') parsedMode = 'STOCK_IN';
      else if (intent === 'SEARCH_PRODUCT') parsedMode = 'SEARCH';
      else if (intent === 'NAVIGATE') parsedMode = 'NAVIGATE';
      else if (intent === 'CHECK_DEBT') parsedMode = 'DEBT';

      return {
        mode: parsedMode,
        intent,
        targetScreen: aiData.target_screen,
        items: resolvedItems,
        customerName: aiData.customer?.name || (intent === 'STOCK_IN' ? undefined : 'Khách lẻ'),
        customerPhone: aiData.customer?.phone || matchedCust?.phone || '',
        matchedCustomer: matchedCust,
        debtBalance: matchedCust?.debt || 0,
        discountAmount,
        discountPercent,
        discountType,
        paymentMethod: (aiData.payment_method as 'CASH' | 'TRANSFER' | 'CARD') || 'CASH',
        supplierName: aiData.supplier_name || '',
        orderCodeToUpdate: aiData.order_code_to_update || '',
        note: aiData.note || 'Lập qua Trợ lý Giọng nói AI',
        spokenFeedback: aiData.spoken_feedback || '',
        explanation: aiData.explanation || 'Phân tích ý định tự động bằng Gemini 3.7 Flash',
        confidence: aiData.confidence || 0.95,
        rawTranscript: transcript,
        unmatchedPhrases: [],
        source: 'GEMINI_AI',
      };
    }
  } catch (err) {
    console.warn('[VOICE] AI backend intent analysis error, falling back to local NLP:', err);
  }

  // 2. Fallback to Local Rule-Based NLP Parser
  const localRes = parseVoiceCommand(
    transcript,
    allProducts,
    allSuppliers,
    mode === 'STOCK_IN' ? 'STOCK_IN' : 'POS_ORDER',
    allCustomers
  );
  return {
    ...localRes,
    source: 'LOCAL_NLP',
    explanation: 'Phân tích nhanh qua bộ máy xử lý ngôn ngữ tiếng Việt (NLP Engine)',
  };
};

let lastSpokenText = '';
let lastSpokenTimestamp = 0;
let isCurrentlySpeaking = false;

/**
 * Check if the browser or system is currently outputting speech synthesis
 */
export const isTtsSpeaking = (): boolean => {
  return isCurrentlySpeaking || (typeof window !== 'undefined' && !!window.speechSynthesis?.speaking);
};

/**
 * Text-to-Speech feedback in Vietnamese with deduplication to prevent repetitive speech
 */
export const speakVietnameseFeedback = (text: string, onEnd?: () => void): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  if (!text || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  const cleanText = text.replace(/[*_#`~\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
  const now = Date.now();

  // Deduplication: Never repeat the exact same feedback within 8 seconds
  if (cleanText.toLowerCase() === lastSpokenText.toLowerCase() && now - lastSpokenTimestamp < 8000) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    isCurrentlySpeaking = true;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    lastSpokenText = cleanText;
    lastSpokenTimestamp = now;

    utterance.onend = () => {
      isCurrentlySpeaking = false;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      isCurrentlySpeaking = false;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    isCurrentlySpeaking = false;
    if (onEnd) onEnd();
  }
};

/**
 * Stop any ongoing TTS speech immediately
 */
export const stopSpeechFeedback = (): void => {
  isCurrentlySpeaking = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
};


