import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

export const aiRouter = Router();

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

function buildVoiceOrderPrompt(products: any[], customers: any[], suppliers: any[]) {
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

  return `Bạn là Trợ lý AI Bán hàng & Quản lý Kho thông minh của Cửa hàng Điện Nước & Kim Khí Ngân Sơn (318 Vũ Quang).
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
3. 'NAVIGATE': Người dùng muốn chuyển nhanh tới màn hình chức năng (VD: "Mở sổ quỹ", "Xem báo cáo doanh thu", "Quản lý sản phẩm", "Vào bán hàng POS", "Mở danh sách hóa đơn", "Cài đặt cửa hàng"). CHỈ khi intent là NAVIGATE mới điền target_screen, giá trị PHẢI là một trong đúng các chuỗi ngắn sau (không thêm tham số, query string hay bất kỳ ký tự nào khác): 'pos', 'products', 'invoices', 'reports', 'inventory', 'cashbook', 'customers', 'suppliers', 'settings'. Với TẤT CẢ intent khác (CREATE_ORDER, STOCK_IN, ADD_TO_CART, UPDATE_ORDER, CANCEL_ORDER, SEARCH_PRODUCT, CHECK_DEBT), BỎ TRỐNG hoàn toàn trường target_screen — tuyệt đối không tự chế ra đường dẫn, deep link hay chuỗi mô tả dài cho trường này.
4. 'CREATE_ORDER': Người dùng muốn lập hóa đơn bán lẻ trực tiếp (VD: "Bán cho anh Minh 3 bóng LED 9w...", "Tính tiền cho chị Lan...", "Tạo đơn khách Tuấn...").
5. 'ADD_TO_CART': Người dùng muốn thêm hàng vào giỏ hàng POS đang mở (VD: "Thêm vào giỏ 2 cái quạt...", "Lấy thêm 5 ổ cắm Sino...", "Cho vào đơn 3 cuộn băng dính").
6. 'STOCK_IN': Người dùng muốn lập phiếu nhập hàng về kho (VD: "Nhập kho 20 cuộn dây Cadivi giá 150k từ NCC Hòa Phát...", "Mua về 50 bóng đèn giá vốn 30 nghìn").
7. 'UPDATE_ORDER': Người dùng muốn cập nhật đơn hàng cũ (VD: "Sửa đơn HD123...", "Cập nhật đơn cũ...").
8. 'CANCEL_ORDER': Người dùng muốn hủy đơn hoặc trả hàng (VD: "Hủy đơn HD123...", "Hủy hóa đơn của anh Minh...", "Trả hàng đơn vừa nãy...").

Quy tắc bóc tách dữ liệu:
- Nhận diện sản phẩm thông minh: so khớp tên, từ khóa kỹ thuật (led, cadivi, lioa, panasonic, rạng đông, sino, tiền phong, aptomat/át, kìm, khóa, cút, co, ren, măng sông, tê, vít, sơn...).
- Số lượng tiếng Việt: 'nửa tá' = 6, '1 tá' = 12, '1 đôi' / '1 cặp' = 2, 'chục' = 10, 'trăm' = 100.
- Giá bán / Giá vốn: bóc tách tiền vnd ("45k" = 45000, "150 nghìn" = 150000).
- Khách hàng & Công nợ: tách tên (loại bỏ từ xưng hô anh/chị/bác/chú/em).
- Spoken feedback: Tạo câu trả lời tự nhiên, chuyên nghiệp, ngắn gọn bằng tiếng Việt để phát âm thanh lại cho người dùng nghe (VD: "Dạ bóng LED Rạng Đông 9W hiện còn 24 cái trong kho, giá bán 45.000 đồng", "Đã thêm 2 bóng LED vào giỏ hàng cho anh Tuấn"). LUÔN trả lời câu này TRƯỚC TIÊN, ngắn gọn súc tích, trước khi liệt kê chi tiết items.`;
}

// Đưa spoken_feedback + explanation lên ĐẦU schema để khi stream, câu thoại được sinh ra
// trước phần items (nặng hơn) — cho phép client phát TTS sớm hơn nhiều so với đợi cả JSON xong.
const VOICE_ORDER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    spoken_feedback: { type: Type.STRING, description: 'Natural speech response in Vietnamese, said first' },
    explanation: { type: Type.STRING, description: 'Brief reasoning breakdown' },
    intent: {
      type: Type.STRING,
      description: 'SEARCH_PRODUCT, CHECK_DEBT, NAVIGATE, CREATE_ORDER, ADD_TO_CART, STOCK_IN, UPDATE_ORDER, CANCEL_ORDER',
    },
    target_screen: {
      type: Type.STRING,
      description:
        'ONLY set when intent is NAVIGATE. Must be exactly one short value: pos, products, invoices, reports, inventory, cashbook, customers, suppliers, settings. Leave empty for every other intent — never a URL, query string, or long value.',
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
    confidence: { type: Type.NUMBER },
  },
  required: ['intent', 'spoken_feedback'],
};

// Streaming variant: sinh phản hồi qua generateContentStream và đẩy từng chunk xuống client qua SSE
// để client có thể phát TTS ngay khi câu spoken_feedback vừa xuất hiện, thay vì đợi cả JSON hoàn tất.
// Endpoint cũ /ai/parse-voice-order được giữ nguyên làm fallback (client tự rơi xuống khi stream lỗi).
aiRouter.post('/ai/parse-voice-order-stream', async (req: Request, res: Response) => {
  const { text, products = [], customers = [], suppliers = [], mode = 'POS_ORDER' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Text prompt is required' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ success: false, error: 'AI service unavailable, use local NLP fallback' });
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.7-flash',
      contents: `Hãy phân tích câu lệnh sau: "${text}". Chế độ ngữ cảnh hiện tại: ${mode}.`,
      config: {
        systemInstruction: buildVoiceOrderPrompt(products, customers, suppliers),
        responseMimeType: 'application/json',
        responseSchema: VOICE_ORDER_RESPONSE_SCHEMA,
        maxOutputTokens: 2048,
      },
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of stream) {
        const delta = chunk.text;
        if (delta) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (streamErr: unknown) {
      const message = streamErr instanceof Error ? streamErr.message : 'Stream interrupted';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[SERVER] Gemini streaming init error, client will fall back:', message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: message });
    } else {
      res.end();
    }
  }
});

aiRouter.post('/ai/parse-voice-order', async (req: Request, res: Response) => {
  try {
    const { text, products = [], customers = [], suppliers = [], mode = 'POS_ORDER', currentOrder } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Text prompt is required' });
    }

    const ai = getGeminiClient();

    // If Gemini client is available, use Gemini 3.7 Flash for deep intent and entity extraction
    if (ai) {
      try {
        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Hãy phân tích câu lệnh sau: "${text}". Chế độ ngữ cảnh hiện tại: ${mode}.`,
          config: {
            systemInstruction: buildVoiceOrderPrompt(products, customers, suppliers),
            responseMimeType: 'application/json',
            responseSchema: VOICE_ORDER_RESPONSE_SCHEMA,
            maxOutputTokens: 2048,
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

  // Check explicit STOCK_IN phrasing first: "nhập kho ... từ nhà cung cấp X" must win over
  // the loose "nhà cung cấp" NAVIGATE keyword match below.
  if (lower.includes('nhập kho') || lower.includes('nhập hàng') || lower.includes('mua về')) {
    intent = 'STOCK_IN';
  }
  // 1. Check Navigation intent
  else if (lower.includes('mở sổ quỹ') || lower.includes('sổ quỹ') || lower.includes('thu chi')) {
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
  } else if (defaultMode === 'STOCK_IN') {
    intent = 'STOCK_IN';
  } else if (lower.includes('thêm vào giỏ') || lower.includes('cho vào giỏ') || lower.includes('cho vào đơn')) {
    intent = 'ADD_TO_CART';
  } else if (lower.includes('sửa đơn') || lower.includes('cập nhật đơn') || defaultMode === 'UPDATE_ORDER') {
    intent = 'UPDATE_ORDER';
  } else if (lower.includes('hủy đơn') || lower.includes('trả hàng')) {
    intent = 'CANCEL_ORDER';
  }

  // Order code (e.g. "sửa đơn HD-20260902-1234" or "hủy đơn HD1234") — needed for UPDATE_ORDER/CANCEL_ORDER lookup
  let orderCodeToUpdate = '';
  const orderCodeMatch = clean.match(/(?:HD[-_0-9a-zA-Z]+|\b\d{4,8}\b)/i);
  if (orderCodeMatch) {
    orderCodeToUpdate = orderCodeMatch[0];
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
    order_code_to_update: orderCodeToUpdate,
    note: 'Lập nhanh bằng giọng nói',
    spoken_feedback: feedback,
    explanation: 'Phân tích tự động bằng bộ máy xử lý ngôn ngữ tiếng Việt (NLP Engine)',
    confidence: matchedItems.length > 0 ? 0.85 : 0.6,
  };
}
