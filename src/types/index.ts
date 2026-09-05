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
  last_received_date?: string;
  description?: string;
  price_audit_confirmed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  ward?: string;
  district_city?: string;
  tax_code?: string;
  id_card?: string;
  group?: string;
  debt: number;
  total_purchased: number;
  note?: string;
  status: 'ACTIVE' | 'INACTIVE';
  company?: string;
  created_by?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  code: string;            // Mã khách hàng (e.g. KH0000001)
  name: string;            // Tên khách hàng
  phone: string;           // Điện thoại
  type?: string;           // Loại khách (Cá nhân / Công ty)
  customer_type?: string;  // Tương thích KiotViet / ERP
  branch?: string;         // Chi nhánh
  email?: string;
  address?: string;        // Địa chỉ
  ward?: string;           // Phường / Xã
  district_city?: string;  // Quận / Huyện / Tỉnh / Thành phố
  gender?: string;         // Giới tính (Nam / Nữ / Khác)
  tax_code?: string;       // Mã số thuế
  id_card?: string;        // CMND / CCCD
  group?: string;          // Nhóm khách hàng (Khách lẻ, Khách VIP, Đại lý...)
  debt: number;            // Nợ hiện tại (Công nợ)
  total_purchased: number; // Tổng mua / Doanh số tích lũy
  note?: string;           // Ghi chú
  status: 'ACTIVE' | 'INACTIVE' | 1 | 0;
  created_by?: string;     // Người tạo
  created_at?: string;     // Ngày tạo
}

export interface Category {
  id: string;
  name: string;
  code: string;
  icon?: string;
}

export interface CartItem {
  product_id: string;
  sku: string;
  barcode: string;
  name: string;
  quantity: number;
  price: number;
  cost_price: number;
  unit: string;
  discount_percent: number;
  max_stock: number;
  image?: string;
}

export interface OrderTab {
  id: string;
  title: string;
  items: CartItem[];
  customer_name: string;
  customer_phone: string;
  discount_amount: number;
  discount_type: 'AMOUNT' | 'PERCENT';
  note: string;
  payment_method: 'CASH' | 'TRANSFER' | 'CARD';
  customer_paid: number;
}

export interface OrderItemRecord {
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
  phone: string;
  items: OrderItemRecord[];
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

export interface InventoryAuditItem {
  product_id: string;
  sku: string;
  name: string;
  unit: string;
  system_stock: number;
  actual_stock: number;
  diff: number;
  diff_value: number;
  reason: 'Hao hụt tự nhiên' | 'Vỡ hỏng' | 'Mất mát / Thất thoát' | 'Sai lệch kiểm đếm' | 'Khác' | '';
}

export interface InventoryAudit {
  id: string;
  code: string;
  date: string;
  auditor: string;
  status: 'DRAFT' | 'BALANCED';
  items: InventoryAuditItem[];
  total_diff_items: number;
  total_diff_value: number;
  notes?: string;
  balanced_at?: string;
}

export interface CashbookEntry {
  id: string;
  code: string;
  type: 'IN' | 'OUT';
  amount: number;
  category: string;
  note: string;
  created_at: string;
  ref_code?: string;
  branch: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_default?: boolean;
}

export interface StockInVoucherItem {
  product_id?: string;
  sku?: string;
  barcode?: string;
  name: string;
  category?: string;
  unit: string;
  quantity: number;
  cost_price: number;
  selling_price?: number;
  min_stock?: number;
  is_new?: boolean;
}

export interface StockInVoucher {
  id: string;
  code: string;
  date: string;
  supplier_id?: string;
  supplier_name?: string;
  items: StockInVoucherItem[];
  total_quantity: number;
  total_amount: number;
  payment_method: 'CASH' | 'TRANSFER' | 'DEBT';
  note?: string;
  created_by?: string;
  branch?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export type DuplicateStrategy = 'OVERWRITE' | 'SKIP' | 'KEEP_BOTH' | 'REPLACE_ALL';

export interface ImportOrderResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  renamed: number;
  duplicateCodes: string[];
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface UserPermissions {
  canViewReports: boolean;       // Báo cáo doanh thu & tài chính
  canManageProducts: boolean;     // Quản lý & chỉnh sửa hàng hóa, giá bán
  canStockIn: boolean;            // Nhập kho hàng hóa
  canManageSuppliers: boolean;    // Quản lý nhà cung cấp & công nợ
  canManageCustomers?: boolean;   // Quản lý khách hàng & nhập danh sách
  canAuditInventory: boolean;     // Lập & thực hiện kiểm kê kho
  canBalanceAudit: boolean;       // Duyệt cân bằng kho sau kiểm kê
  canManageCashbook: boolean;     // Quản lý sổ quỹ Thu / Chi
  canAccessDataCenter: boolean;   // Trung tâm dữ liệu / Sao lưu / Khôi phục
  canSellPOS: boolean;            // Bán hàng & thu ngân tại quầy POS
  canViewInvoices: boolean;       // Xem danh sách hóa đơn & in lại bill
  canDeleteInvoices: boolean;     // Xóa & hủy hóa đơn bán hàng
  canEditInvoices?: boolean;      // Sửa thông tin hóa đơn đã tạo (chưa gán cho vai trò nào — xem InvoiceManagementScreen.tsx)
  canCancelInvoices?: boolean;    // Hủy/khôi phục hóa đơn (chưa gán cho vai trò nào — xem InvoiceManagementScreen.tsx)
  canEditSystemSettings: boolean; // Cài đặt hệ thống & cấu hình
  canManageUsers: boolean;        // Phân quyền & quản lý nhân sự
  canImportData?: boolean;        // Nhập dữ liệu Excel từ KiotViet/ERP (Chỉ Admin)
}

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  password?: string;
  role: UserRole;
  roleTitle: string;
  email: string;
  phone: string;
  avatar: string;
  permissions: UserPermissions;
  bio?: string;
  status?: 'ACTIVE' | 'LOCKED';
  updatedAt?: number;
}

export type SyncState = 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';

export interface BankOption {
  bin: string;
  code: string;
  shortName: string;
  name: string;
  logo?: string;
}

export interface StoreSettings {
  // Store info
  name: string;
  shortName: string;
  logo?: string;
  slogan?: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  ward?: string;
  district?: string;
  cityProvince?: string;
  taxCode?: string;
  email?: string;
  website?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  receiptFooterNote: string;

  // VietQR & Payment Config
  bankId: string;
  bankName?: string;
  accountNumber: string;
  accountHolder: string;
  qrTemplate: 'compact2' | 'compact' | 'qr_only' | 'print';
  transferSyntaxPrefix: string;
  customQrImage?: string;
  useCustomQr: boolean;
  savedQrCode?: string; // Confirmed, saved QR code URL or base64 data for instant rendering
  savedQrUrl?: string; // Direct standard VietQR URL
  qrLastUpdated?: number; // Timestamp when QR was last generated or updated

  // Print & POS display toggles
  showQrOnK80Receipt: boolean;
  showQrOnA4Invoice: boolean;
  showWifiOnReceipt: boolean;
  showTaxCodeOnReceipt: boolean;
  showSloganOnReceipt: boolean;
  autoOpenCashDrawer: boolean;

  // Confirmed price audit anomalies: productId -> { cost_price, selling_price, confirmed_at, confirmed_by }
  confirmedPriceAudits?: Record<
    string,
    {
      cost_price: number;
      selling_price: number;
      confirmed_at: string;
      confirmed_by?: string;
    }
  >;
}

export interface BackgroundTask {
  id: string;
  title: string;
  description?: string;
  type: 'IMPORT_PRODUCTS' | 'SYNC_DATABASE' | 'AUDIT_STOCK' | 'CLEAN_DATA' | 'BULK_UPDATE';
  status: 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | 'ERROR';
  progress: number; // 0 to 100
  processedCount: number;
  totalCount: number;
  currentItemName?: string;
  startTime: number;
  estimatedRemainingMs?: number;
  errorMessage?: string;
}

export interface SyncPayload {
  lastSyncTimestamp: number;
  settings?: StoreSettings;
  branches?: Branch[];
  categories?: Category[];
  products?: Product[];
  orders?: Order[];
  suppliers?: Supplier[];
  customers?: Customer[];
  inventory_audits?: InventoryAudit[];
  cashbook?: CashbookEntry[];
  users?: AppUser[];
  deletedIds?: {
    products?: string[];
    orders?: string[];
    suppliers?: string[];
    customers?: string[];
    inventory_audits?: string[];
    cashbook?: string[];
  };
}

export interface ServerStats {
  serverTime: string;
  uptimeSeconds: number;
  dbSizeBytes: number;
  dbSizeFormatted: string;
  productCount: number;
  orderCount: number;
  supplierCount: number;
  customerCount: number;
  auditCount: number;
  cashbookCount: number;
  userCount: number;
  version: string;
  cacheHitRatio: number;
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

export interface VoiceMatchedProduct {
  product: Product;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  confidence: number;
  matchedText: string;
}

export interface VoiceAssistantAction {
  intent: VoiceIntent;
  targetScreen?: string;
  matchedProducts: VoiceMatchedProduct[];
  matchedCustomer?: Customer;
  matchedSupplier?: Supplier;
  discountAmount?: number;
  discountPercent?: number;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CARD';
  spokenFeedback: string;
  explanation: string;
  confidence: number;
  rawTranscript: string;
  source: 'GEMINI_AI' | 'LOCAL_NLP';
}
