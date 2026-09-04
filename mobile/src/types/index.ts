export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  status: 'ACTIVE' | 'INACTIVE';
  image?: string;
  location?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  note?: string;
}

export interface OrderItem {
  product_id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  cost_price: number;
}

export interface Order {
  id: string;
  code: string;
  customer_name: string;
  phone?: string;
  items: OrderItem[];
  total: number;
  discount: number;
  final_amount: number;
  total_cost: number;
  profit: number;
  payment_method: 'CASH' | 'TRANSFER' | 'CARD';
  created_at: string;
  status: 'COMPLETED' | 'CANCELLED';
  cashier: string;
  branch: string;
  note?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  debt: number;
  total_purchased: number;
  type: 'RETAIL' | 'CONTRACTOR' | 'WHOLESALE';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  address?: string;
  debt: number;
  group: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface StoreSettings {
  name: string;
  shortName: string;
  slogan?: string;
  phone: string;
  address: string;
  taxCode?: string;
  bankId: string;
  bankName?: string;
  accountNumber: string;
  accountHolder: string;
  qrTemplate: 'compact2' | 'compact' | 'qr_only' | 'print';
  transferSyntaxPrefix: string;
}

export type VoiceIntent =
  | 'CREATE_ORDER'
  | 'ADD_TO_CART'
  | 'UPDATE_ORDER'
  | 'STOCK_IN'
  | 'CANCEL_ORDER'
  | 'SEARCH_PRODUCT'
  | 'CHECK_DEBT'
  | 'NAVIGATE';

export interface VoiceAssistantAction {
  intent: VoiceIntent;
  targetScreen?: string;
  matchedProducts: Array<{
    product: Product;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    confidence: number;
    matchedText: string;
  }>;
  matchedCustomer?: Customer;
  spokenFeedback: string;
  explanation: string;
  confidence: number;
  rawTranscript: string;
  source: 'GEMINI_AI' | 'LOCAL_NLP';
}
