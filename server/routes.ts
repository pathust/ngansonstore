import { Router, Request, Response } from 'express';
import { dbManager } from './db.js';
import { GoogleGenAI, Type } from '@google/genai';

export const apiRouter = Router();

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Middleware: log API requests & add cache headers & ensure DB cache is loaded
apiRouter.use(async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    await dbManager.ensureLoaded();
  } catch (err) {
    // Non-blocking fallback
  }
  next();
});

// Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now(), service: 'NganSon POS API' });
});

// ==================== AI INTENT & VOICE ORDER PARSER ====================
apiRouter.post('/ai/parse-voice-order', async (req: Request, res: Response) => {
  try {
    const { text, products = [], customers = [], suppliers = [], mode = 'POS_ORDER', currentOrder } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text prompt is required' });
    }

    const ai = getGeminiClient();

    // If Gemini client is available, use Gemini 3.7 Flash for deep intent and entity extraction
    if (ai) {
      try {
        const candidateProductsSummary = (Array.isArray(products) ? products : [])
          .slice(0, 100)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode || '',
            selling_price: p.selling_price || 0,
            cost_price: p.cost_price || 0,
            stock: p.stock || 0,
            unit: p.unit || 'cái',
          }));

        const candidateCustomersSummary = (Array.isArray(customers) ? customers : [])
          .slice(0, 50)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
          }));

        const candidateSuppliersSummary = (Array.isArray(suppliers) ? suppliers : [])
          .slice(0, 30)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
          }));

        const systemInstruction = `Bạn là Trợ lý AI Bán hàng & Quản lý Kho thông minh của Cửa hàng Điện Nước & Kim Khí Ngân Sơn (318 Vũ Quang).
Nhiệm vụ: Phân tích câu lệnh giọng nói hoặc văn bản tiếng Việt của người dùng để trích xuất ý định (Intent) và dữ liệu có cấu trúc phù hợp.

Danh sách sản phẩm trong kho của cửa hàng:
${JSON.stringify(candidateProductsSummary)}

Danh sách khách hàng quen:
${JSON.stringify(candidateCustomersSummary)}

Danh sách nhà cung cấp:
${JSON.stringify(candidateSuppliersSummary)}

Quy tắc phân loại Ý định (intent):
1. 'SEARCH_PRODUCT': Người dùng muốn tra cứu, tìm kiếm sản phẩm, kiểm tra tồn kho hoặc hỏi giá (VD: "Tìm bóng rạng đông 9w", "Aptomat 32A giá bao nhiêu còn mấy cái?", "Dây cadivi 2.5 còn hàng không?", "Kiểm tra tồn kho ống nước Tiền Phong").
2. 'CHECK_DEBT': Người dùng muốn tra cứu công nợ khách hàng (VD: "Kiểm tra nợ anh Hùng thợ điện", "Chị Lan còn nợ bao nhiêu?", "Khách Tuấn nợ mấy tiền?").
3. 'NAVIGATE': Người dùng muốn chuyển nhanh tới màn hình chức năng (VD: "Mở sổ quỹ", "Xem báo cáo doanh thu", "Quản lý sản phẩm", "Vào bán hàng POS", "Mở danh sách hóa đơn", "Cài đặt cửa hàng"). Điền target_screen tương ứng: 'pos', 'products', 'invoices', 'reports', 'inventory', 'cashbook', 'customers', 'suppliers', 'settings'.
4. 'CREATE_ORDER': Người dùng muốn lập hóa đơn bán lẻ trực tiếp (VD: "Bán cho anh Minh 3 bóng LED 9w...", "Tính tiền cho chị Lan...", "Tạo đơn khách Tuấn...").
5. 'ADD_TO_CART': Người dùng muốn thêm hàng vào giỏ hàng POS đang mở (VD: "Thêm vào giỏ 2 cái quạt...", "Lấy thêm 5 ổ cắm Sino...", "Cho vào đơn 3 cuộn băng dính").
6. 'STOCK_IN': Người dùng muốn lập phiếu nhập hàng về kho (VD: "Nhập kho 20 cuộn dây Cadivi giá 150k từ NCC Hòa Phát...", "Mua về 50 bóng đèn giá vốn 30 nghìn").
7. 'UPDATE_ORDER': Người dùng muốn cập nhật đơn hàng cũ (VD: "Sửa đơn HD123...", "Cập nhật đơn cũ...").
8. 'CANCEL_ORDER': Người dùng muốn hủy đơn hoặc trả hàng.

Quy tắc bóc tách dữ liệu:
- Nhận diện sản phẩm thông minh: so khớp tên, từ khóa kỹ thuật (led, cadivi, lioa, panasonic, rạng đông, sino, tiền phong, aptomat/át, kìm, khóa, cút, co, ren, măng sông, tê, vít, sơn...).
- Số lượng tiếng Việt: 'nửa tá' = 6, '1 tá' = 12, '1 đôi' / '1 cặp' = 2, 'chục' = 10, 'trăm' = 100.
- Giá bán / Giá vốn: bóc tách tiền vnd ("45k" = 45000, "150 nghìn" = 150000).
- Khách hàng & Công nợ: tách tên (loại bỏ từ xưng hô anh/chị/bác/chú/em).
- Spoken feedback: Tạo câu trả lời tự nhiên, chuyên nghiệp, ngắn gọn bằng tiếng Việt để phát âm thanh lại cho người dùng nghe (VD: "Dạ bóng LED Rạng Đông 9W hiện còn 24 cái trong kho, giá bán 45.000 đồng", "Đã thêm 2 bóng LED vào giỏ hàng cho anh Tuấn").`;

        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Hãy phân tích câu lệnh sau: "${text}". Chế độ ngữ cảnh hiện tại: ${mode}.`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: {
                  type: Type.STRING,
                  description: 'SEARCH_PRODUCT, CHECK_DEBT, NAVIGATE, CREATE_ORDER, ADD_TO_CART, STOCK_IN, UPDATE_ORDER, CANCEL_ORDER',
                },
                target_screen: {
                  type: Type.STRING,
                  description: 'pos, products, invoices, reports, inventory, cashbook, customers, suppliers, settings',
                },
                customer: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    address: { type: Type.STRING },
                  },
                },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      product_id: { type: Type.STRING, description: 'ID of matched product in database' },
                      product_name: { type: Type.STRING, description: 'Matched product name' },
                      quantity: { type: Type.NUMBER, description: 'Item quantity' },
                      unit_price: { type: Type.NUMBER, description: 'Selling price per unit' },
                      unit_cost: { type: Type.NUMBER, description: 'Cost price per unit' },
                      unit: { type: Type.STRING },
                      discount_percent: { type: Type.NUMBER },
                      note: { type: Type.STRING },
                    },
                    required: ['product_id', 'product_name', 'quantity', 'unit_price'],
                  },
                },
                discount: {
                  type: Type.OBJECT,
                  properties: {
                    amount: { type: Type.NUMBER },
                    percent: { type: Type.NUMBER },
                    type: { type: Type.STRING, description: 'AMOUNT or PERCENT' },
                  },
                },
                payment_method: {
                  type: Type.STRING,
                  description: 'CASH, TRANSFER, or CARD',
                },
                supplier_name: { type: Type.STRING },
                order_code_to_update: { type: Type.STRING },
                note: { type: Type.STRING },
                spoken_feedback: { type: Type.STRING, description: 'Natural speech response in Vietnamese' },
                explanation: { type: Type.STRING, description: 'Brief reasoning breakdown' },
                confidence: { type: Type.NUMBER },
              },
              required: ['intent', 'spoken_feedback'],
            },
          },
        });

        const parsedJson = JSON.parse(geminiResponse.text?.trim() || '{}');
        return res.json({
          success: true,
          source: 'GEMINI_AI',
          data: parsedJson,
        });
      } catch (geminiErr: unknown) {
  const message = geminiErr instanceof Error ? geminiErr.message : 'Unknown error';
        console.warn('[SERVER] Gemini API processing error, falling back to local NLP:', message);
      }
    }

    // Fallback: Local NLP Extraction
    const localResult = fallbackLocalParser(text, products, customers, suppliers, mode);
    return res.json({
      success: true,
      source: 'LOCAL_NLP',
      data: localResult,
    });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SERVER] Voice parse error:', err);
    res.status(500).json({ success: false, error: message });
  }
});

// Helper for Vietnamese Spoken Number parsing on Server
function parseVietnameseNumberString(str: string): number {
  if (!str) return 1;
  const clean = str.toLowerCase().trim();
  const kMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|triệu|tr)?$/i);
  if (kMatch) {
    let base = parseFloat(kMatch[1].replace(',', '.'));
    const unit = (kMatch[2] || '').toLowerCase();
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') base *= 1000;
    else if (unit === 'triệu' || unit === 'tr') base *= 1000000;
    return Math.round(base);
  }
  const words: Record<string, number> = {
    'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'lăm': 5,
    'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8, 'chín': 9, 'mười': 10, 'chục': 10,
    'tá': 12, 'trăm': 100, 'nghìn': 1000, 'ngàn': 1000, 'triệu': 1000000,
  };
  let total = 0;
  let current = 0;
  for (const w of clean.split(/\s+/)) {
    if (words[w] !== undefined) {
      const v = words[w];
      if (v >= 1000) {
        current = (current || 1) * v;
        total += current;
        current = 0;
      } else if (v === 100) {
        current = (current || 1) * 100;
      } else if (v === 10) {
        current = (current || 1) * 10;
      } else {
        current += v;
      }
    } else if (!isNaN(Number(w))) {
      current += Number(w);
    }
  }
  total += current;
  return total > 0 ? total : 1;
}

// Fallback Rule-Based Vietnamese Parser
function fallbackLocalParser(
  text: string,
  products: any[] = [],
  customers: any[] = [],
  suppliers: any[] = [],
  defaultMode: string = 'POS_ORDER'
) {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  let intent = 'CREATE_ORDER';
  let targetScreen: string | undefined = undefined;

  // 1. Check Navigation intent
  if (lower.includes('mở sổ quỹ') || lower.includes('sổ quỹ') || lower.includes('thu chi')) {
    intent = 'NAVIGATE';
    targetScreen = 'cashbook';
  } else if (lower.includes('báo cáo') || lower.includes('doanh thu') || lower.includes('lợi nhuận')) {
    intent = 'NAVIGATE';
    targetScreen = 'reports';
  } else if (lower.includes('quản lý kho') || lower.includes('kiểm kê')) {
    intent = 'NAVIGATE';
    targetScreen = 'inventory';
  } else if (lower.includes('quản lý sản phẩm') || lower.includes('danh mục hàng') || lower.includes('mở hàng hóa')) {
    intent = 'NAVIGATE';
    targetScreen = 'products';
  } else if (lower.includes('mở bán hàng') || lower.includes('vào pos') || lower.includes('màn hình bán')) {
    intent = 'NAVIGATE';
    targetScreen = 'pos';
  } else if (lower.includes('hóa đơn') || lower.includes('lịch sử đơn')) {
    intent = 'NAVIGATE';
    targetScreen = 'invoices';
  } else if (lower.includes('quản lý khách') || lower.includes('danh sách khách')) {
    intent = 'NAVIGATE';
    targetScreen = 'customers';
  } else if (lower.includes('nhà cung cấp') || lower.includes('ncc')) {
    intent = 'NAVIGATE';
    targetScreen = 'suppliers';
  } else if (lower.includes('cài đặt') || lower.includes('mã qr')) {
    intent = 'NAVIGATE';
    targetScreen = 'settings';
  } else if (lower.includes('nợ') || lower.includes('công nợ')) {
    // 2. Check Debt inquiry
    intent = 'CHECK_DEBT';
  } else if (
    lower.startsWith('tìm') ||
    lower.includes('tìm kiếm') ||
    lower.includes('giá bao nhiêu') ||
    lower.includes('còn mấy') ||
    lower.includes('còn không') ||
    lower.includes('còn hàng') ||
    lower.includes('tồn kho')
  ) {
    // 3. Check Product search inquiry
    intent = 'SEARCH_PRODUCT';
  } else if (lower.includes('nhập kho') || lower.includes('nhập hàng') || lower.includes('mua về') || defaultMode === 'STOCK_IN') {
    intent = 'STOCK_IN';
  } else if (lower.includes('thêm vào giỏ') || lower.includes('cho vào giỏ') || lower.includes('cho vào đơn')) {
    intent = 'ADD_TO_CART';
  } else if (lower.includes('sửa đơn') || lower.includes('cập nhật đơn') || defaultMode === 'UPDATE_ORDER') {
    intent = 'UPDATE_ORDER';
  } else if (lower.includes('hủy đơn') || lower.includes('trả hàng')) {
    intent = 'CANCEL_ORDER';
  }

  // Customer Name & Phone
  let customerName = 'Khách lẻ';
  let customerPhone = '';
  const custMatch = lower.match(/(?:khách|bán cho|anh|chị|cô|chú|bác|em)\s+([a-zA-Zà-ỹÀ-Ỹ\s]+?)(?:\s+(?:sdt|số điện thoại|sđt|mua|lấy|nhập|\d|$))/i);
  if (custMatch && custMatch[1]) {
    const raw = custMatch[1].trim();
    if (raw.length > 1 && !['hàng', 'kho', 'đơn', 'lẻ'].includes(raw)) {
      customerName = raw.charAt(0).toUpperCase() + raw.slice(1);
    }
  }

  const phoneMatch = clean.match(/(?:0[3|5|7|8|9][0-9]{8})/);
  if (phoneMatch) {
    customerPhone = phoneMatch[0];
  }

  // Payment method
  let paymentMethod = 'CASH';
  if (lower.includes('chuyển khoản') || lower.includes('vietqr') || lower.includes('qr') || lower.includes('ck')) {
    paymentMethod = 'TRANSFER';
  } else if (lower.includes('quẹt thẻ') || lower.includes('thẻ') || lower.includes('pos')) {
    paymentMethod = 'CARD';
  }

  // Discount
  let discountAmount = 0;
  let discountPercent = 0;
  let discountType = 'AMOUNT';
  const percentMatch = lower.match(/(?:giảm|chiết khấu)\s*(\d+)\s*%/i);
  if (percentMatch) {
    discountPercent = parseInt(percentMatch[1], 10);
    discountType = 'PERCENT';
  } else {
    const amountMatch = lower.match(/(?:giảm|chiết khấu|bớt|trừ)\s*(\d+(?:[.,]\d+)?\s*(?:k|nghìn|ngàn|đ|đồng)?)/i);
    if (amountMatch) {
      discountAmount = parseVietnameseNumberString(amountMatch[1]);
      discountType = 'AMOUNT';
    }
  }

  // Matching items
  const matchedItems: any[] = [];
  const delimiters = /[,;.]|\bvà\b|\bcộng\b|\bvới\b|\brồi\b|\btiếp\b|\blấy thêm\b|\bthêm\b/gi;
  const clauses = lower.split(delimiters).map((c) => c.trim()).filter((c) => c.length > 2);

  for (const clause of clauses) {
    for (const prod of products) {
      const prodNameLower = prod.name.toLowerCase();
      const prodSkuLower = prod.sku.toLowerCase();

      if (clause.includes(prodSkuLower) || clause.includes(prodNameLower) || prodNameLower.split(' ').some((tok: string) => tok.length > 3 && clause.includes(tok))) {
        // Extract qty
        let qty = 1;
        const qtyMatch = clause.match(/(\d+|một|hai|ba|bốn|năm|lăm|sáu|bảy|tám|chín|mười|chục|tá)\s*(?:gói|chai|lon|hộp|thùng|cái|chiếc|kg|cuộn|bóng|bộ|cây|lốc|vỉ|bịch|bình|bao|hũ|lọ|sp|m|mét)?/i);
        if (qtyMatch) {
          qty = parseVietnameseNumberString(qtyMatch[1]);
        }

        const existing = matchedItems.find((m) => m.product_id === prod.id);
        if (existing) {
          existing.quantity += qty;
        } else {
          matchedItems.push({
            product_id: prod.id,
            product_name: prod.name,
            quantity: Math.max(1, qty),
            unit_price: prod.selling_price,
            unit_cost: prod.cost_price,
            unit: prod.unit || 'cái',
            discount_percent: 0,
            note: '',
          });
        }
        break;
      }
    }
  }

  // Total items fallback if nothing matched clause by clause
  if (matchedItems.length === 0) {
    for (const prod of products) {
      if (lower.includes(prod.name.toLowerCase()) || lower.includes(prod.sku.toLowerCase())) {
        matchedItems.push({
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: prod.selling_price,
          unit_cost: prod.cost_price,
          unit: prod.unit || 'cái',
          discount_percent: 0,
          note: '',
        });
      }
    }
  }

  let feedback = '';
  if (intent === 'NAVIGATE') {
    const screenNames: Record<string, string> = {
      pos: 'Màn hình bán hàng (POS)',
      products: 'Danh mục Hàng hóa & Bảng giá',
      invoices: 'Lịch sử hóa đơn',
      reports: 'Báo cáo doanh thu & tài chính',
      inventory: 'Sổ kho & Kiểm kê',
      cashbook: 'Sổ quỹ Thu / Chi',
      customers: 'Quản lý Khách hàng & Công nợ',
      suppliers: 'Nhà cung cấp',
      settings: 'Cài đặt Cửa hàng & Mã QR',
    };
    feedback = `Đang chuyển tới ${screenNames[targetScreen || 'pos'] || 'màn hình chức năng'}`;
  } else if (intent === 'CHECK_DEBT') {
    const foundCust = customers.find(
      (c) =>
        c.name.toLowerCase().includes(customerName.toLowerCase()) ||
        customerName.toLowerCase().includes(c.name.toLowerCase())
    );
    if (foundCust) {
      feedback = `Khách hàng ${foundCust.name} hiện có công nợ là ${(foundCust.debt || 0).toLocaleString('vi-VN')} đồng`;
    } else {
      feedback = `Đang tra cứu công nợ cho khách hàng ${customerName}`;
    }
  } else if (intent === 'SEARCH_PRODUCT') {
    if (matchedItems.length > 0) {
      const first = matchedItems[0];
      feedback = `Tìm thấy ${first.product_name}, giá bán ${first.unit_price.toLocaleString('vi-VN')} đồng, hiện còn trong kho`;
    } else {
      feedback = `Đang tìm kiếm sản phẩm "${clean}" trong danh mục kho hàng`;
    }
  } else {
    const itemsDesc = matchedItems.map((i) => `${i.quantity} ${i.unit} ${i.product_name}`).join(', ');
    feedback = matchedItems.length > 0
      ? `Đã nhận diện ${matchedItems.length} mặt hàng cho ${customerName}: ${itemsDesc}`
      : `Đã lắng nghe: "${clean}". Chưa tìm thấy sản phẩm khớp hoàn toàn trong kho.`;
  }

  return {
    intent,
    target_screen: targetScreen,
    customer: {
      name: customerName,
      phone: customerPhone,
      address: '',
    },
    items: matchedItems,
    discount: {
      amount: discountAmount,
      percent: discountPercent,
      type: discountType,
    },
    payment_method: paymentMethod,
    supplier_name: '',
    order_code_to_update: '',
    note: 'Lập nhanh bằng giọng nói',
    spoken_feedback: feedback,
    explanation: 'Phân tích tự động bằng bộ máy xử lý ngôn ngữ tiếng Việt (NLP Engine)',
    confidence: matchedItems.length > 0 ? 0.85 : 0.6,
  };
}


// System Stats
apiRouter.get('/system/stats', (req: Request, res: Response) => {
  try {
    const stats = dbManager.getStats();
    res.json({ success: true, data: stats });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// System Clean (Admin only)
apiRouter.post('/system/clean-mock', (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
    if (adminKey !== (process.env.ADMIN_KEY || 'nganson-admin-2024')) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin key required' });
    }
    dbManager.cleanMockData();
    res.json({ success: true, message: 'Đã dọn sạch toàn bộ dữ liệu mock trên máy chủ backend.' });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== MOBILE & WEB SYNC API ====================
// Pull changes for mobile app & web client
apiRouter.get('/sync/pull', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const since = parseInt(req.query.since as string) || 0;
    const data = dbManager.pullSync(since);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Push client-side / mobile offline changes to server
apiRouter.post('/sync/push', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const payload = req.body;
    const result = dbManager.pushSync(payload);
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== PRODUCTS API ====================
apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { search, category, status, limit, offset } = req.query;
    const result = dbManager.getProducts({
      search: search as string,
      category: category as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = dbManager.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/products', (req: Request, res: Response) => {
  try {
    const product = req.body;
    if (!product.name || typeof product.name !== 'string' || product.name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Tên sản phẩm không hợp lệ' });
    }
    if (product.selling_price !== undefined && product.selling_price < 0) {
      return res.status(400).json({ success: false, error: 'Giá bán không được âm' });
    }
    if (product.stock !== undefined && product.stock < 0) {
      return res.status(400).json({ success: false, error: 'Tồn kho không được âm' });
    }
    if (!product.sku) {
      return res.status(400).json({ success: false, error: 'Missing required fields (sku)' });
    }
    const created = dbManager.createProduct(product);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Chunked Batch Products Upsert (for progressive Excel import / background queue)
apiRouter.post('/products/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertProducts(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim() === '')) {
      return res.status(400).json({ success: false, error: 'Tên sản phẩm không hợp lệ' });
    }
    if (updates.selling_price !== undefined && updates.selling_price < 0) {
      return res.status(400).json({ success: false, error: 'Giá bán không được âm' });
    }
    if (updates.stock !== undefined && updates.stock < 0) {
      return res.status(400).json({ success: false, error: 'Tồn kho không được âm' });
    }
    const updated = dbManager.updateProduct(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, message: 'Deleted product' });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== ORDERS API ====================
apiRouter.get('/orders', (req: Request, res: Response) => {
  try {
    const { search, status, limit, offset } = req.query;
    const result = dbManager.getOrders({
      search: search as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/orders', (req: Request, res: Response) => {
  try {
    const order = req.body;
    if (!order.code || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid order structure or empty items' });
    }
    for (const item of order.items) {
      if (!item.product_id || item.quantity <= 0 || (item.unit_price !== undefined && item.unit_price < 0) || (item.price !== undefined && item.price < 0)) {
        return res.status(400).json({ success: false, error: 'Chi tiết sản phẩm trong đơn hàng không hợp lệ' });
      }
    }
    const created = dbManager.createOrder(order);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Chunked Batch Orders Upsert (for progressive Excel import)
apiRouter.post('/orders/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertOrders(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put('/orders/:id', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (updates.items && Array.isArray(updates.items)) {
      if (updates.items.length === 0) {
        return res.status(400).json({ success: false, error: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
      }
      for (const item of updates.items) {
        if (!item.product_id || item.quantity <= 0 || (item.unit_price !== undefined && item.unit_price < 0) || (item.price !== undefined && item.price < 0)) {
          return res.status(400).json({ success: false, error: 'Chi tiết sản phẩm trong đơn hàng không hợp lệ' });
        }
      }
    }
    const updated = dbManager.updateOrder(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.delete('/orders/:id', (req: Request, res: Response) => {
  try {
    const returnStock = req.query.returnStock === 'true';
    const deleted = dbManager.deleteOrder(req.params.id, returnStock);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    res.json({ success: true, message: 'Deleted order' });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== SUPPLIERS API ====================
apiRouter.get('/suppliers', (req: Request, res: Response) => {
  try {
    const { search, group, status, debt, limit, offset } = req.query;
    const result = dbManager.getSuppliers({
      search: search as string,
      group: group as string,
      status: status as string,
      debt: debt as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/suppliers', (req: Request, res: Response) => {
  try {
    const supplier = req.body;
    const created = dbManager.createSupplier(supplier);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/suppliers/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertSuppliers(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateSupplier(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.delete('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteSupplier(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }
    res.json({ success: true, message: 'Deleted supplier' });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== CUSTOMERS API ====================
apiRouter.get('/customers', (req: Request, res: Response) => {
  try {
    const { search, group, type, status, debt, limit, offset } = req.query;
    const result = dbManager.getCustomers({
      search: search as string,
      group: group as string,
      type: type as string,
      status: status as string,
      debt: debt as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/customers/:id', (req: Request, res: Response) => {
  try {
    const customer = dbManager.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  try {
    const customer = req.body;
    if (!customer.name) {
      return res.status(400).json({ success: false, error: 'Missing required fields (name)' });
    }
    const created = dbManager.createCustomer(customer);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/customers/bulk', (req: Request, res: Response) => {
  try {
    const { items, mode } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items must be an array' });
    }
    const result = dbManager.batchUpsertCustomers(items, mode || 'OVERWRITE');
    res.json({ success: true, data: result });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put('/customers/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateCustomer(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.delete('/customers/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteCustomer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Deleted customer' });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== INVENTORY AUDITS API ====================
apiRouter.get('/inventory-audits', (req: Request, res: Response) => {
  try {
    const { search, status, limit, offset } = req.query;
    const result = dbManager.getAudits({
      search: search as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/inventory-audits', (req: Request, res: Response) => {
  try {
    const audit = req.body;
    const created = dbManager.createAudit(audit);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/inventory-audits/:id/balance', (req: Request, res: Response) => {
  try {
    const balanced = dbManager.balanceAudit(req.params.id);
    if (!balanced) {
      return res.status(404).json({ success: false, error: 'Audit not found' });
    }
    res.json({ success: true, data: balanced });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== CASHBOOK API ====================
apiRouter.get('/cashbook', (req: Request, res: Response) => {
  try {
    const { search, type, limit, offset } = req.query;
    const result = dbManager.getCashbook({
      search: search as string,
      type: type as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/cashbook', (req: Request, res: Response) => {
  try {
    const entry = req.body;
    const created = dbManager.createCashbookEntry(entry);
    res.status(201).json({ success: true, data: created });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/cashbook/batch', (req: Request, res: Response) => {
  try {
    const { items, strategy } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }
    const result = dbManager.batchUpsertCashbook(items, strategy || 'OVERWRITE');
    res.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.delete('/cashbook/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteCashbookEntry(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Cashbook entry not found' });
    }
    res.json({ success: true, message: 'Deleted entry' });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== CASHBOOK UPDATE ====================
apiRouter.put('/cashbook/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateCashbookEntry(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu thu/chi' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== CATEGORIES API ====================
apiRouter.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = dbManager.getCategories();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Tên danh mục không được để trống' });
    }
    const created = dbManager.createCategory(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/categories/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateCategory(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/categories/:id', (req: Request, res: Response) => {
  try {
    const deleted = dbManager.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục' });
    }
    res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== AUTH & USERS API ====================
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!' });
    }

    const user = dbManager.getUserByUsernameOrEmail(username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc tài khoản không tồn tại trên hệ thống!' });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({ success: false, error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên!' });
    }

    if (user.password && user.password !== password) {
      return res.status(401).json({ success: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' });
    }

    const { password: _, ...sanitizedUser } = user;
    const token = `ns_token_${user.id}_${Date.now()}`;
    return res.json({
      success: true,
      user: sanitizedUser,
      token,
      message: `Đăng nhập thành công! Chào mừng ${user.name}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/auth/change-password', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ mật khẩu cũ và mật khẩu mới!' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' });
    }

    const user = dbManager.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng!' });
    }

    if (user.password && user.password !== oldPassword) {
      return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không đúng!' });
    }

    const ok = dbManager.updateUserPassword(userId, newPassword);
    if (!ok) {
      return res.status(500).json({ success: false, error: 'Không thể cập nhật mật khẩu!' });
    }

    return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/users', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const users = dbManager.getUsers();
    res.json({ success: true, data: users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/users', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, error: 'Tên người dùng không được để trống!' });
    }
    const saved = dbManager.saveUser(req.body);
    res.json({ success: true, data: saved, message: 'Lưu thông tin tài khoản thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự!' });
    }
    const ok = dbManager.updateUserPassword(req.params.id, newPassword);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản để đặt lại mật khẩu!' });
    }
    res.json({ success: true, message: 'Đặt lại mật khẩu cho nhân viên thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const { status } = req.body;
    if (status !== 'ACTIVE' && status !== 'LOCKED') {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ!' });
    }
    const ok = dbManager.updateUserStatus(req.params.id, status);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản!' });
    }
    res.json({
      success: true,
      message: status === 'ACTIVE' ? 'Đã kích hoạt lại tài khoản thành công!' : 'Đã khóa tài khoản thành công!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put('/users/:id/profile', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const updated = dbManager.updateUserProfile(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản!' });
    }
    res.json({ success: true, data: updated, message: 'Cập nhật hồ sơ cá nhân thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    await dbManager.ensureLoaded();
    const ok = dbManager.deleteUser(req.params.id);
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Không thể xóa tài khoản Quản trị viên (Admin) hoặc tài khoản không tồn tại!' });
    }
    res.json({ success: true, message: 'Đã xóa tài khoản thành công!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== SETTINGS API ====================
apiRouter.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = dbManager.getSettings();
    res.json({ success: true, data: settings });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

