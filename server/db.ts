import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Product,
  Supplier,
  Customer,
  Category,
  Order,
  InventoryAudit,
  CashbookEntry,
  Branch,
  AppUser,
  SyncPayload,
  ServerStats,
  StoreSettings,
  AppNotification,
} from '../src/types/index.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';

interface DatabaseSchema {
  version: number;
  lastUpdated: number;
  settings: StoreSettings;
  branches: Branch[];
  categories: Category[];
  users: AppUser[];
  products: Product[];
  orders: Order[];
  suppliers: Supplier[];
  customers: Customer[];
  inventory_audits: InventoryAudit[];
  cashbook: CashbookEntry[];
  notifications: AppNotification[];
  deletedIds: {
    products: string[];
    orders: string[];
    suppliers: string[];
    customers: string[];
    inventory_audits: string[];
    cashbook: string[];
    notifications: string[];
  };
  metadata: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    taxCode?: string;
  };
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure directories exist (wrapped in try/catch for read-only serverless environments like Vercel)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch {
  // Read-only filesystem (e.g. Vercel serverless lambda)
}

function toIsoDate(dateStr?: string | number | null): string | null {
  if (!dateStr && dateStr !== 0) return null;
  if (typeof dateStr === 'number') {
    return new Date(dateStr).toISOString();
  }
  const str = String(dateStr).trim();
  if (!str) return null;
  const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10) - 1;
    const year = parseInt(vnMatch[3], 10);
    const hour = vnMatch[4] ? parseInt(vnMatch[4], 10) : 0;
    const min = vnMatch[5] ? parseInt(vnMatch[5], 10) : 0;
    const sec = vnMatch[6] ? parseInt(vnMatch[6], 10) : 0;
    const d = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
}

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Cửa hàng Điện Nước & Kim Khí Ngân Sơn',
  shortName: 'Ngân Sơn',
  slogan: 'Uy tín - Chất lượng - Tận tâm phục vụ',
  phone: '0912.345.678',
  secondaryPhone: '0987.654.321',
  address: '318 Vũ Quang, TP Hà Tĩnh',
  ward: 'Thạch Linh',
  district: 'TP Hà Tĩnh',
  cityProvince: 'Hà Tĩnh',
  taxCode: '3002154879',
  email: 'dodiendandung318vuquang@gmail.com',
  website: 'nganson318vuquang.vn',
  wifiSsid: 'NganSon_Guest',
  wifiPassword: 'nganson318vuquang',
  receiptFooterNote: 'Cảm ơn quý khách và hẹn gặp lại!',
  bankId: 'ICB',
  bankName: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
  accountNumber: '106877069794',
  accountHolder: 'PHAN ANH TAI',
  qrTemplate: 'compact2',
  transferSyntaxPrefix: 'NS',
  useCustomQr: false,
  savedQrCode: 'https://img.vietqr.io/image/ICB-106877069794-compact2.png?accountName=PHAN%20ANH%20TAI',
  savedQrUrl: 'https://img.vietqr.io/image/ICB-106877069794-compact2.png?accountName=PHAN%20ANH%20TAI',
  qrLastUpdated: Date.now(),
  showQrOnK80Receipt: true,
  showQrOnA4Invoice: true,
  showWifiOnReceipt: false,
  showTaxCodeOnReceipt: true,
  showSloganOnReceipt: true,
  autoOpenCashDrawer: false,
};

// Không seed tài khoản mặc định kèm mật khẩu/email thật trong source.
// Dùng `npm run db:seed:admin` (đọc ADMIN_USERNAME/ADMIN_PASSWORD từ .env) để tạo tài khoản admin đầu tiên.
export const DEFAULT_USERS: AppUser[] = [];

// Placeholder an toàn khi bản ghi user bị thiếu password (dữ liệu cũ/lỗi) — không phải mật khẩu thật,
// người dùng cần được admin đặt lại mật khẩu qua tính năng resetUserPassword.
function generatePlaceholderPassword(): string {
  return crypto.randomBytes(9).toString('base64url');
}

const DEFAULT_DB: DatabaseSchema = {
  version: 1,
  lastUpdated: Date.now(),
  settings: DEFAULT_SETTINGS,
  branches: [],
  categories: [],
  users: DEFAULT_USERS,
  products: [],
  orders: [],
  suppliers: [],
  customers: [],
  inventory_audits: [],
  cashbook: [],
  notifications: [],
  deletedIds: {
    products: [],
    orders: [],
    suppliers: [],
    customers: [],
    inventory_audits: [],
    cashbook: [],
    notifications: [],
  },
  metadata: {
    storeName: 'Cửa hàng Ngân Sơn',
    storeAddress: '318 Vũ Quang, TP Hà Tĩnh',
    storePhone: '0912.345.678',
  },
};

class DatabaseManager {
  private cache: DatabaseSchema | null = null;
  private isSaving = false;
  private savePending = false;
  private startTime = Date.now();
  private cacheHits = 0;
  private totalQueries = 0;
  private supabaseLoaded = false;
  private lastSupabaseSync = 0;
  private isSyncingFromSupabase = false;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Normalize users to guarantee username/password/status exist (no hardcoded real accounts —
        // gaps are filled with safe placeholders; use `npm run db:seed:admin` to provision real accounts).
        const rawUsers: AppUser[] = Array.isArray(parsed.users) ? parsed.users : DEFAULT_USERS;
        const normalizedUsers = rawUsers.map((u: AppUser) => {
          const username = u.username || (u.email ? u.email.split('@')[0] : `user_${u.id}`);
          const password = u.password || generatePlaceholderPassword();
          const status = u.status || 'ACTIVE';

          return {
            ...u,
            username,
            password,
            status,
          };
        });

        // Ensure all arrays and fields exist
        this.cache = {
          version: parsed.version || 1,
          lastUpdated: parsed.lastUpdated || Date.now(),
          settings: parsed.settings || DEFAULT_SETTINGS,
          branches: parsed.branches || [],
          categories: parsed.categories || [],
          users: normalizedUsers,
          products: parsed.products || [],
          orders: parsed.orders || [],
          suppliers: parsed.suppliers || [],
          customers: parsed.customers || [],
          inventory_audits: parsed.inventory_audits || [],
          cashbook: parsed.cashbook || [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          deletedIds: parsed.deletedIds || {
            products: [],
            orders: [],
            suppliers: [],
            customers: [],
            inventory_audits: [],
            cashbook: [],
            notifications: [],
          },
          metadata: parsed.metadata || DEFAULT_DB.metadata,
        };
      } else {
        this.cache = { ...DEFAULT_DB, lastUpdated: Date.now() };
        this.persistToDisk();
      }
    } catch (err) {
      console.error('[DB] Error loading db.json, falling back to default:', err);
      this.cache = { ...DEFAULT_DB, lastUpdated: Date.now() };
    }
    return this.cache;
  }

  private async persistToDisk() {
    if (!this.cache) return;
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    try {
      const dataStr = JSON.stringify(this.cache, null, 2);
      await fs.promises.writeFile(tmpFile, dataStr, 'utf-8');
      await fs.promises.rename(tmpFile, DB_FILE);
    } catch (err: any) {
      if (err?.code !== 'EROFS' && err?.code !== 'EACCES') {
        console.warn('[DB] Disk write skipped (normal in Vercel serverless):', err?.message || err);
      }
      if (fs.existsSync(tmpFile)) {
        try { await fs.promises.unlink(tmpFile); } catch {}
      }
    }
  }

  public schedulePersist() {
    if (this.cache) {
      this.cache.lastUpdated = Date.now();
    }
    if (this.isSaving) {
      this.savePending = true;
      return;
    }
    this.isSaving = true;
    setTimeout(async () => {
      await this.persistToDisk();
      this.isSaving = false;
      if (this.savePending) {
        this.savePending = false;
        this.schedulePersist();
      }
    }, 50);
  }

  // ==================== SUPABASE CLOUD SYNC ====================
  private async fetchAllRows(table: string, orderField?: string, maxTotal?: number): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const pageSize = 1000;
    let all: any[] = [];
    let from = 0;
    while (true) {
      let q = supabase.from(table).select('*').range(from, from + pageSize - 1);
      if (orderField) {
        q = q.order(orderField, { ascending: false });
      }
      const { data, error } = await q;
      if (error || !data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < pageSize || (maxTotal && all.length >= maxTotal)) break;
      from += pageSize;
    }
    return all;
  }

  public async syncFromSupabase(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    if (this.isSyncingFromSupabase) return false;
    this.isSyncingFromSupabase = true;

    try {
      console.log('[SUPABASE] Fetching latest store data from cloud PostgreSQL...');
      const [
        settingsRes,
        branchesRes,
        categoriesRes,
        usersRes,
        productsData,
        customersData,
        suppliersRes,
        ordersData,
        cashbookData,
        auditsRes,
      ] = await Promise.all([
        supabase.from('store_settings').select('data').limit(1).maybeSingle(),
        supabase.from('branches').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('app_users').select('*'),
        this.fetchAllRows('products'),
        this.fetchAllRows('customers'),
        supabase.from('suppliers').select('*'),
        this.fetchAllRows('orders', 'created_at'),
        this.fetchAllRows('cashbook', 'created_at'),
        supabase.from('inventory_audits').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      if (!this.cache) {
        this.cache = { ...DEFAULT_DB };
      }

      if (settingsRes.data?.data) {
        this.cache.settings = settingsRes.data.data;
      }
      if (branchesRes.data && branchesRes.data.length > 0) {
        this.cache.branches = branchesRes.data;
      }
      if (categoriesRes.data && categoriesRes.data.length > 0) {
        this.cache.categories = categoriesRes.data;
      }
      if (usersRes.data && usersRes.data.length > 0) {
        const existingUsersMap = new Map((this.cache?.users || []).map((eu) => [eu.id, eu]));
        this.cache.users = usersRes.data.map((u: any) => {
          const existing = existingUsersMap.get(u.id);
          const perms = u.permissions || {};
          const username = perms._username || u.username || existing?.username || (u.email ? u.email.split('@')[0] : 'user');
          const password = perms._password || u.password || existing?.password || generatePlaceholderPassword();
          const email = u.email || existing?.email || '';
          const status = u.is_active === false ? 'LOCKED' : (u.status || existing?.status || 'ACTIVE');

          return {
            id: u.id,
            name: u.name,
            username,
            password,
            status,
            role: u.role || existing?.role || 'STAFF',
            roleTitle: u.role_title || existing?.roleTitle || (u.role === 'ADMIN' ? 'Full Access Admin (Toàn quyền hệ thống)' : u.role === 'MANAGER' ? 'Quản lý cửa hàng (Store Manager)' : 'Nhân viên bán hàng'),
            email,
            phone: u.phone || existing?.phone || '',
            avatar: u.avatar || existing?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
            bio: u.bio || existing?.bio || '',
            permissions: {
              ...perms,
              canImportData: u.can_import_data ?? perms.canImportData ?? false,
            },
          };
        });
      }
      if (productsData && productsData.length > 0) {
        this.cache.products = productsData;
      }
      if (customersData && customersData.length > 0) {
        this.cache.customers = customersData;
      }
      if (suppliersRes.data && suppliersRes.data.length > 0) {
        this.cache.suppliers = suppliersRes.data;
      }
      if (ordersData && ordersData.length > 0) {
        this.cache.orders = ordersData;
      }
      if (cashbookData && cashbookData.length > 0) {
        this.cache.cashbook = cashbookData;
      }
      if (auditsRes.data && auditsRes.data.length > 0) {
        this.cache.inventory_audits = auditsRes.data;
      }

      this.cache.lastUpdated = Date.now();
      this.supabaseLoaded = true;
      this.lastSupabaseSync = Date.now();
      console.log(`[SUPABASE] Cloud sync completed (${this.cache.products.length} products, ${this.cache.customers.length} customers, ${this.cache.orders.length} orders)`);
      return true;
    } catch (err) {
      console.warn('[SUPABASE] Cloud sync warning:', err);
      return false;
    } finally {
      this.isSyncingFromSupabase = false;
    }
  }

  public async ensureLoaded(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    // Cold start or stale cache older than 30s
    if (!this.supabaseLoaded || Date.now() - this.lastSupabaseSync > 30000) {
      await this.syncFromSupabase();
    }
  }

  private formatForSupabase(table: string, item: any): any {
    if (!item || typeof item !== 'object') return item;
    const clean = { ...item };
    if (table === 'app_users') {
      return {
        id: item.id,
        name: item.name,
        username: item.username,
        password: item.password,
        role: item.role,
        role_title: item.roleTitle || item.role_title,
        email: item.email || '',
        phone: item.phone || '',
        avatar: item.avatar || '',
        bio: item.bio || '',
        status: item.status || 'ACTIVE',
        is_active: item.status !== 'LOCKED',
        can_import_data: Boolean(item.permissions?.canImportData),
        permissions: {
          ...(item.permissions || {}),
          _username: item.username,
          _password: item.password,
        },
        updated_at: new Date().toISOString(),
      };
    }
    if (table === 'customers') {
      if (clean.customer_type && !clean.type) clean.type = clean.customer_type;
      delete clean.customer_type;
    }
    if (clean.created_at) clean.created_at = toIsoDate(clean.created_at);
    if (clean.updated_at) clean.updated_at = toIsoDate(clean.updated_at);
    if (clean.balanced_at) clean.balanced_at = toIsoDate(clean.balanced_at);
    return clean;
  }

  private formatForSupabaseLegacy(table: string, item: any): any {
    if (!item || typeof item !== 'object') return item;
    if (table === 'app_users') {
      return {
        id: item.id,
        name: item.name,
        role: item.role,
        role_title: item.roleTitle || item.role_title,
        email: item.email || '',
        phone: item.phone || '',
        avatar: item.avatar || '',
        bio: item.bio || '',
        is_active: item.status !== 'LOCKED',
        can_import_data: Boolean(item.permissions?.canImportData),
        permissions: {
          ...(item.permissions || {}),
          _username: item.username,
          _password: item.password,
        },
      };
    }
    return item;
  }

  public async syncToSupabase(table: string, action: 'upsert' | 'delete', data: any) {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      if (action === 'delete') {
        const id = typeof data === 'string' ? data : data?.id;
        if (id) {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) console.error(`[SUPABASE] Delete error on ${table}:`, error);
        }
      } else {
        const formatted = this.formatForSupabase(table, data);
        const { error } = await supabase.from(table).upsert(formatted, { onConflict: 'id' });
        if (error) {
          if (table === 'app_users' && error.code === 'PGRST204') {
            // Fallback for un-migrated schema
            const legacy = this.formatForSupabaseLegacy(table, data);
            await supabase.from(table).upsert(legacy, { onConflict: 'id' });
          } else {
            console.error(`[SUPABASE] Upsert error on ${table}:`, error);
          }
        }
      }
    } catch (err) {
      console.warn(`[SUPABASE] Mutation sync warning (${action} ${table}):`, err);
    }
  }

  public async syncBatchToSupabase(table: string, items: any[], batchSize = 100) {
    if (!isSupabaseConfigured() || !items || items.length === 0) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const formattedItems = items.map((i) => this.formatForSupabase(table, i));
      for (let i = 0; i < formattedItems.length; i += batchSize) {
        const batch = formattedItems.slice(i, i + batchSize);
        await supabase.from(table).upsert(batch, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn(`[SUPABASE] Batch sync warning (${table}):`, err);
    }
  }

  private getDB(): DatabaseSchema {
    this.totalQueries++;
    if (this.cache) {
      this.cacheHits++;
      return this.cache;
    }
    return this.loadFromDisk();
  }

  // ==================== PRODUCTS ====================
  public getProducts(options?: {
    search?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = this.getDB();
    let result = [...db.products];

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      );
    }

    if (options?.category && options.category !== 'all') {
      result = result.filter((p) => p.category === options.category);
    }

    if (options?.status && options.status !== 'all') {
      result = result.filter((p) => p.status === options.status);
    }

    const total = result.length;
    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, items: result };
  }

  public getProductById(id: string): Product | undefined {
    return this.getDB().products.find((p) => p.id === id);
  }

  public getProductBySkuOrBarcode(code: string): Product | undefined {
    const clean = code.trim().toLowerCase();
    return this.getDB().products.find(
      (p) => p.sku.toLowerCase() === clean || p.barcode.toLowerCase() === clean
    );
  }

  public createProduct(product: Product): Product {
    const db = this.getDB();
    const existingIndex = db.products.findIndex((p) => p.id === product.id || p.sku.toLowerCase() === product.sku.toLowerCase());
    if (existingIndex >= 0) {
      db.products[existingIndex] = product;
    } else {
      db.products.unshift(product);
    }
    this.schedulePersist();
    this.syncToSupabase('products', 'upsert', product);
    return product;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product | null {
    const db = this.getDB();
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    db.products[index] = { ...db.products[index], ...updates };
    this.schedulePersist();
    this.syncToSupabase('products', 'upsert', db.products[index]);
    return db.products[index];
  }

  public deleteProduct(id: string): boolean {
    const db = this.getDB();
    const initialLen = db.products.length;
    db.products = db.products.filter((p) => p.id !== id);
    if (db.products.length !== initialLen) {
      if (!db.deletedIds.products.includes(id)) {
        db.deletedIds.products.push(id);
      }
      this.schedulePersist();
      this.syncToSupabase('products', 'delete', id);
      return true;
    }
    return false;
  }

  public batchUpsertProducts(
    items: Product[],
    strategy: 'OVERWRITE' | 'SKIP' | 'KEEP_BOTH' | 'REPLACE_ALL' = 'OVERWRITE'
  ) {
    const db = this.getDB();

    if (strategy === 'REPLACE_ALL') {
      db.products = [...items];
      this.schedulePersist();
      this.syncBatchToSupabase('products', items);
      return { total: items.length, inserted: items.length, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let idCounter = 0;

    const skuMap = new Map<string, number>();
    db.products.forEach((p, idx) => {
      skuMap.set(p.sku.toLowerCase(), idx);
    });

    items.forEach((item) => {
      const lowerSku = item.sku.toLowerCase();
      if (skuMap.has(lowerSku)) {
        const existingIdx = skuMap.get(lowerSku)!;
        if (strategy === 'OVERWRITE') {
          db.products[existingIdx] = { ...db.products[existingIdx], ...item };
          updated++;
        } else if (strategy === 'SKIP') {
          skipped++;
        } else if (strategy === 'KEEP_BOTH') {
          const newSku = `${item.sku}_${Date.now().toString().slice(-4)}`;
          const newItem = { ...item, id: `SP${Date.now()}-${++idCounter}`, sku: newSku };
          db.products.push(newItem);
          inserted++;
        }
      } else {
        db.products.push(item);
        skuMap.set(lowerSku, db.products.length - 1);
        inserted++;
      }
    });

    this.schedulePersist();
    this.syncBatchToSupabase('products', items);
    return { total: items.length, inserted, updated, skipped };
  }

  // ==================== ORDERS ====================
  public getOrders(options?: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = this.getDB();
    let result = [...db.orders];

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.phone.includes(q)
      );
    }

    if (options?.status && options.status !== 'all') {
      result = result.filter((o) => o.status === options.status);
    }

    const total = result.length;
    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, items: result };
  }

  public createOrder(order: Order): Order {
    const db = this.getDB();
    db.orders.unshift(order);

    // Auto deduct inventory stock
    if (order.status === 'COMPLETED') {
      order.items.forEach((item) => {
        const pIndex = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIndex >= 0) {
          const product = db.products[pIndex];
          if (product.stock - item.quantity < 0) {
            order.note = (order.note ? order.note + '\n' : '') + `[Cảnh báo: Tồn kho âm cho ${item.name}]`;
          }
          product.stock = Math.max(0, product.stock - item.quantity);
          this.syncToSupabase('products', 'upsert', product);
        }
      });
      
      if (order.customer_name) {
        const cIndex = db.customers.findIndex(c => c.name === order.customer_name);
        if (cIndex >= 0) {
          db.customers[cIndex].total_purchased = (db.customers[cIndex].total_purchased || 0) + (order.final_amount || 0);
          if ((order as any).payment_method === 'DEBT') {
            db.customers[cIndex].debt = (db.customers[cIndex].debt || 0) + (order.final_amount || 0);
          }
          this.syncToSupabase('customers', 'upsert', db.customers[cIndex]);
        }
      }

      // Tự động tạo thông báo đơn hàng và đồng bộ cảnh báo tồn kho với mốc thời gian thực tế
      const orderTs = (order.created_at ? new Date(order.created_at).getTime() : Date.now()) || Date.now();
      const orderNotif: AppNotification = {
        id: `notif-order-${order.id}`,
        contentKey: `order:${order.id}`,
        type: 'ORDER',
        title: `Đã bán đơn hàng trị giá ${(order.final_amount || 0).toLocaleString('vi-VN')} đ`,
        description: `Mã đơn: #${order.code} - ${order.customer_name || 'Khách lẻ'}`,
        timestamp: isNaN(orderTs) ? Date.now() : orderTs,
        isRead: false,
        meta: { orderId: order.id },
      };
      this.createNotification(orderNotif);
      this.syncStockNotifications();
    }

    this.schedulePersist();
    this.syncToSupabase('orders', 'upsert', order);
    return order;
  }

  public updateOrder(id: string, updates: Partial<Order>): Order | null {
    const db = this.getDB();
    const index = db.orders.findIndex((o) => o.id === id);
    if (index === -1) return null;
    
    const oldOrder = db.orders[index];
    
    if (oldOrder.status === 'COMPLETED' && updates.status === 'CANCELLED') {
      oldOrder.items.forEach((item) => {
        const pIndex = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIndex >= 0) {
          db.products[pIndex].stock += item.quantity;
          this.syncToSupabase('products', 'upsert', db.products[pIndex]);
        }
      });
    } else if (oldOrder.status === 'CANCELLED' && updates.status === 'COMPLETED') {
      const itemsToDeduct = updates.items || oldOrder.items;
      itemsToDeduct.forEach((item) => {
        const pIndex = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIndex >= 0) {
          db.products[pIndex].stock -= item.quantity;
          this.syncToSupabase('products', 'upsert', db.products[pIndex]);
        }
      });
    } else if (oldOrder.status === 'COMPLETED' && (updates.status === 'COMPLETED' || !updates.status) && updates.items) {
      oldOrder.items.forEach((item) => {
        const pIndex = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIndex >= 0) {
          db.products[pIndex].stock += item.quantity;
          this.syncToSupabase('products', 'upsert', db.products[pIndex]);
        }
      });
      updates.items.forEach((item) => {
        const pIndex = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIndex >= 0) {
          db.products[pIndex].stock -= item.quantity;
          this.syncToSupabase('products', 'upsert', db.products[pIndex]);
        }
      });
    }
    
    db.orders[index] = { ...db.orders[index], ...updates };
    this.schedulePersist();
    this.syncToSupabase('orders', 'upsert', db.orders[index]);
    return db.orders[index];
  }

  public deleteOrder(id: string, returnStock: boolean = false): boolean {
    const db = this.getDB();
    const order = db.orders.find((o) => o.id === id);
    if (!order) return false;

    if (returnStock && order.status === 'COMPLETED') {
      order.items.forEach((item) => {
        const pIndex = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIndex >= 0) {
          db.products[pIndex].stock += item.quantity;
          this.syncToSupabase('products', 'upsert', db.products[pIndex]);
        }
      });
    }

    db.orders = db.orders.filter((o) => o.id !== id);
    if (!db.deletedIds.orders.includes(id)) {
      db.deletedIds.orders.push(id);
    }
    this.schedulePersist();
    this.syncToSupabase('orders', 'delete', id);
    return true;
  }

  public batchUpsertOrders(
    items: Order[],
    strategy: 'OVERWRITE' | 'SKIP' | 'APPEND' = 'OVERWRITE'
  ) {
    const db = this.getDB();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const orderMap = new Map<string, number>();
    db.orders.forEach((o, idx) => {
      orderMap.set((o.code || o.id).toLowerCase(), idx);
    });

    items.forEach((item) => {
      const key = (item.code || item.id).toLowerCase();
      if (orderMap.has(key)) {
        if (strategy === 'OVERWRITE') {
          const idx = orderMap.get(key)!;
          db.orders[idx] = { ...db.orders[idx], ...item };
          updated++;
        } else {
          skipped++;
        }
      } else {
        db.orders.unshift(item);
        orderMap.set(key, 0);
        inserted++;
      }
    });

    this.schedulePersist();
    this.syncBatchToSupabase('orders', items);
    return { total: items.length, inserted, updated, skipped };
  }

  // ==================== SUPPLIERS ====================
  public getSuppliers(options?: {
    search?: string;
    group?: string;
    status?: string;
    debt?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = this.getDB();
    let result = [...db.suppliers];

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.company && s.company.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }

    if (options?.group && options.group !== 'ALL') {
      result = result.filter((s) => s.group === options.group);
    }

    if (options?.status && options.status !== 'ALL') {
      result = result.filter((s) => s.status === options.status);
    }

    if (options?.debt) {
      if (options.debt === 'HAS_DEBT') {
        result = result.filter((s) => s.debt > 0);
      } else if (options.debt === 'CREDIT') {
        result = result.filter((s) => s.debt < 0);
      } else if (options.debt === 'ZERO') {
        result = result.filter((s) => s.debt === 0);
      }
    }

    const total = result.length;
    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, items: result };
  }

  public createSupplier(supplier: Supplier): Supplier {
    const db = this.getDB();
    db.suppliers.unshift(supplier);
    this.schedulePersist();
    this.syncToSupabase('suppliers', 'upsert', supplier);
    return supplier;
  }

  public updateSupplier(id: string, updates: Partial<Supplier>): Supplier | null {
    const db = this.getDB();
    const index = db.suppliers.findIndex((s) => s.id === id);
    if (index === -1) return null;
    db.suppliers[index] = { ...db.suppliers[index], ...updates };
    this.schedulePersist();
    this.syncToSupabase('suppliers', 'upsert', db.suppliers[index]);
    return db.suppliers[index];
  }

  public deleteSupplier(id: string): boolean {
    const db = this.getDB();
    const initialLen = db.suppliers.length;
    db.suppliers = db.suppliers.filter((s) => s.id !== id);
    if (db.suppliers.length !== initialLen) {
      if (!db.deletedIds.suppliers.includes(id)) {
        db.deletedIds.suppliers.push(id);
      }
      this.schedulePersist();
      this.syncToSupabase('suppliers', 'delete', id);
      return true;
    }
    return false;
  }

  public batchUpsertSuppliers(
    items: Supplier[],
    strategy: 'OVERWRITE' | 'SKIP' | 'APPEND' = 'OVERWRITE'
  ) {
    const db = this.getDB();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const supMap = new Map<string, number>();
    db.suppliers.forEach((s, idx) => {
      if (s.code) supMap.set(s.code.toLowerCase(), idx);
      if (s.phone) supMap.set(s.phone, idx);
    });

    items.forEach((item) => {
      const codeKey = item.code ? item.code.toLowerCase() : '';
      const phoneKey = item.phone || '';
      const existingIdx =
        codeKey && supMap.has(codeKey)
          ? supMap.get(codeKey)!
          : phoneKey && supMap.has(phoneKey)
          ? supMap.get(phoneKey)!
          : -1;

      if (existingIdx >= 0) {
        if (strategy === 'OVERWRITE') {
          db.suppliers[existingIdx] = { ...db.suppliers[existingIdx], ...item };
          updated++;
        } else {
          skipped++;
        }
      } else {
        db.suppliers.unshift(item);
        if (codeKey) supMap.set(codeKey, 0);
        if (phoneKey) supMap.set(phoneKey, 0);
        inserted++;
      }
    });

    this.schedulePersist();
    this.syncBatchToSupabase('suppliers', items);
    return { total: items.length, inserted, updated, skipped };
  }

  // ==================== CUSTOMERS ====================
  public getCustomers(options?: {
    search?: string;
    group?: string;
    type?: string;
    status?: string;
    debt?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = this.getDB();
    let result = [...(db.customers || [])];

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.tax_code && c.tax_code.toLowerCase().includes(q))
      );
    }

    if (options?.group && options.group !== 'ALL') {
      result = result.filter((c) => c.group === options.group);
    }

    if (options?.type && options.type !== 'ALL') {
      result = result.filter((c) => (c.customer_type || c.type) === options.type);
    }

    if (options?.status && options.status !== 'ALL') {
      result = result.filter((c) => {
        const isActive = c.status === 1 || c.status === 'ACTIVE';
        return options.status === 'ACTIVE' ? isActive : !isActive;
      });
    }

    if (options?.debt) {
      if (options.debt === 'HAS_DEBT') {
        result = result.filter((c) => c.debt > 0);
      } else if (options.debt === 'CREDIT') {
        result = result.filter((c) => c.debt < 0);
      } else if (options.debt === 'ZERO') {
        result = result.filter((c) => c.debt === 0);
      }
    }

    const total = result.length;
    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, items: result };
  }

  public getCustomerById(id: string): Customer | null {
    const db = this.getDB();
    return db.customers.find((c) => c.id === id || c.code === id) || null;
  }

  public createCustomer(customer: Customer): Customer {
    const db = this.getDB();
    db.customers.unshift(customer);
    this.schedulePersist();
    this.syncToSupabase('customers', 'upsert', customer);
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const db = this.getDB();
    const index = db.customers.findIndex((c) => c.id === id);
    if (index === -1) return null;
    db.customers[index] = { ...db.customers[index], ...updates };
    this.schedulePersist();
    this.syncToSupabase('customers', 'upsert', db.customers[index]);
    return db.customers[index];
  }

  public deleteCustomer(id: string): boolean {
    const db = this.getDB();
    const initialLen = db.customers.length;
    db.customers = db.customers.filter((c) => c.id !== id);
    if (db.customers.length !== initialLen) {
      if (!db.deletedIds.customers.includes(id)) {
        db.deletedIds.customers.push(id);
      }
      this.schedulePersist();
      this.syncToSupabase('customers', 'delete', id);
      return true;
    }
    return false;
  }

  public batchUpsertCustomers(items: Customer[], mode: 'OVERWRITE' | 'APPEND' = 'OVERWRITE') {
    const db = this.getDB();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    items.forEach((item) => {
      const index = db.customers.findIndex(
        (c) => (c.code && item.code && c.code.toLowerCase() === item.code.toLowerCase()) || (c.phone && item.phone && c.phone === item.phone)
      );

      if (index >= 0) {
        if (mode === 'OVERWRITE') {
          db.customers[index] = { ...db.customers[index], ...item };
          updated++;
        } else {
          skipped++;
        }
      } else {
        db.customers.push(item);
        inserted++;
      }
    });

    this.schedulePersist();
    this.syncBatchToSupabase('customers', items);
    return { total: items.length, inserted, updated, skipped };
  }

  // ==================== INVENTORY AUDITS ====================
  public getAudits(options?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = this.getDB();
    let result = [...db.inventory_audits];

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.auditor.toLowerCase().includes(q) ||
          (a.notes && a.notes.toLowerCase().includes(q))
      );
    }

    if (options?.status && options.status !== 'ALL') {
      result = result.filter((a) => a.status === options.status);
    }

    const total = result.length;
    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, items: result };
  }

  public createAudit(audit: InventoryAudit): InventoryAudit {
    const db = this.getDB();
    if (audit.status === 'BALANCED') {
      audit.items.forEach((item) => {
        const pIdx = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
        if (pIdx >= 0) {
          db.products[pIdx].stock = item.actual_stock;
          this.syncToSupabase('products', 'upsert', db.products[pIdx]);
        }
      });
      audit.balanced_at = audit.balanced_at || new Date().toISOString();
    }
    db.inventory_audits.unshift(audit);
    this.schedulePersist();
    this.syncToSupabase('inventory_audits', 'upsert', audit);
    return audit;
  }

  public updateAudit(id: string, updates: Partial<InventoryAudit>): InventoryAudit | null {
    const db = this.getDB();
    const index = db.inventory_audits.findIndex((a) => a.id === id);
    if (index === -1) return null;
    db.inventory_audits[index] = { ...db.inventory_audits[index], ...updates };
    this.schedulePersist();
    this.syncToSupabase('inventory_audits', 'upsert', db.inventory_audits[index]);
    return db.inventory_audits[index];
  }

  public balanceAudit(id: string): InventoryAudit | null {
    const db = this.getDB();
    const index = db.inventory_audits.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const audit = db.inventory_audits[index];

    // Apply actual stock to products
    audit.items.forEach((item) => {
      const pIdx = db.products.findIndex((p) => p.id === item.product_id || p.sku === item.sku);
      if (pIdx >= 0) {
        db.products[pIdx].stock = item.actual_stock;
        this.syncToSupabase('products', 'upsert', db.products[pIdx]);
      }
    });

    audit.status = 'BALANCED';
    audit.balanced_at = new Date().toISOString();
    db.inventory_audits[index] = audit;
    this.schedulePersist();
    this.syncToSupabase('inventory_audits', 'upsert', audit);
    return audit;
  }

  // ==================== CASHBOOK ====================
  public getCashbook(options?: {
    search?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }) {
    const db = this.getDB();
    let result = [...db.cashbook];

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.note.toLowerCase().includes(q) ||
          (c.ref_code && c.ref_code.toLowerCase().includes(q))
      );
    }

    if (options?.type && options.type !== 'ALL') {
      result = result.filter((c) => c.type === options.type);
    }

    const total = result.length;
    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, items: result };
  }

  public createCashbookEntry(entry: Partial<CashbookEntry>): CashbookEntry {
    const db = this.getDB();
    const id = entry.id || `cb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const prefix = entry.type === 'IN' ? 'PT' : 'PC';
    const code =
      entry.code ||
      `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(
        db.cashbook.length + 1
      ).padStart(3, '0')}`;
    const fullEntry: CashbookEntry = {
      id,
      code,
      type: entry.type || 'IN',
      amount: entry.amount || 0,
      category: entry.category || 'Thu tiền khác',
      note: entry.note || '',
      ref_code: entry.ref_code,
      branch: entry.branch || 'Chi nhánh 318 Vũ Quang',
      created_at: entry.created_at || new Date().toLocaleString('vi-VN'),
    };
    db.cashbook.unshift(fullEntry);
    this.schedulePersist();
    this.syncToSupabase('cashbook', 'upsert', fullEntry);
    return fullEntry;
  }

  public deleteCashbookEntry(id: string): boolean {
    const db = this.getDB();
    const initialLen = db.cashbook.length;
    db.cashbook = db.cashbook.filter((c) => c.id !== id);
    if (db.cashbook.length !== initialLen) {
      if (!db.deletedIds.cashbook.includes(id)) {
        db.deletedIds.cashbook.push(id);
      }
      this.schedulePersist();
      this.syncToSupabase('cashbook', 'delete', id);
      return true;
    }
    return false;
  }

  public batchUpsertCashbook(
    items: CashbookEntry[],
    strategy: 'OVERWRITE' | 'SKIP' | 'APPEND' = 'OVERWRITE'
  ) {
    const db = this.getDB();
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const cbMap = new Map<string, number>();
    db.cashbook.forEach((c, idx) => {
      cbMap.set((c.code || c.id).toLowerCase(), idx);
    });

    items.forEach((item) => {
      const key = (item.code || item.id).toLowerCase();
      if (cbMap.has(key)) {
        if (strategy === 'OVERWRITE') {
          const idx = cbMap.get(key)!;
          db.cashbook[idx] = { ...db.cashbook[idx], ...item };
          updated++;
        } else {
          skipped++;
        }
      } else {
        db.cashbook.unshift(item);
        cbMap.set(key, 0);
        inserted++;
      }
    });

    this.schedulePersist();
    this.syncBatchToSupabase('cashbook', items);
    return { total: items.length, inserted, updated, skipped };
  }

  // ==================== CATEGORIES ====================
  public getCategories(): Category[] {
    return this.getDB().categories;
  }

  public createCategory(data: Partial<Category>): Category {
    const db = this.getDB();
    const newCategory: Category = {
      id: `CAT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name || '',
      code: data.code || '',
      icon: data.icon || '📦',
    };
    db.categories.push(newCategory);
    this.schedulePersist();
    this.syncToSupabase('categories', 'upsert', newCategory);
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<Category>): Category | null {
    const db = this.getDB();
    const idx = db.categories.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    db.categories[idx] = { ...db.categories[idx], ...updates, id };
    this.schedulePersist();
    this.syncToSupabase('categories', 'upsert', db.categories[idx]);
    return db.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const db = this.getDB();
    const initialLen = db.categories.length;
    db.categories = db.categories.filter((c) => c.id !== id);
    if (db.categories.length !== initialLen) {
      this.schedulePersist();
      this.syncToSupabase('categories', 'delete', id);
      return true;
    }
    return false;
  }

  // ==================== CASHBOOK UPDATE ====================
  public updateCashbookEntry(id: string, updates: Partial<CashbookEntry>): CashbookEntry | null {
    const db = this.getDB();
    const idx = db.cashbook.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    db.cashbook[idx] = { ...db.cashbook[idx], ...updates, id };
    this.schedulePersist();
    this.syncToSupabase('cashbook', 'upsert', db.cashbook[idx]);
    return db.cashbook[idx];
  }

  // ==================== SETTINGS ====================
  public getSettings(): StoreSettings {
    const db = this.getDB();
    if (!db.settings) {
      db.settings = { ...DEFAULT_SETTINGS };
      this.schedulePersist();
    } else if (!db.settings.savedQrCode && db.settings.accountNumber) {
      const bank = db.settings.bankId || 'ICB';
      const acc = db.settings.accountNumber;
      const tmpl = db.settings.qrTemplate || 'compact2';
      const holder = db.settings.accountHolder || 'PHAN ANH TAI';
      db.settings.savedQrCode = `https://img.vietqr.io/image/${bank}-${acc}-${tmpl}.png?accountName=${encodeURIComponent(holder)}`;
      db.settings.savedQrUrl = db.settings.savedQrCode;
      this.schedulePersist();
    }
    return db.settings;
  }

  public updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    const db = this.getDB();
    db.settings = {
      ...(db.settings || DEFAULT_SETTINGS),
      ...updates,
    };
    db.lastUpdated = Date.now();
    this.schedulePersist();
    this.syncToSupabase('store_settings', 'upsert', { id: 'default', data: db.settings });
    return db.settings;
  }

  // ==================== USERS & AUTH ====================
  public getUsers(): AppUser[] {
    return this.getDB().users;
  }

  public getUserById(id: string): AppUser | undefined {
    return this.getDB().users.find((u) => u.id === id);
  }

  public getUserByUsernameOrEmail(identifier: string): AppUser | undefined {
    const term = identifier.trim().toLowerCase();
    return this.getDB().users.find(
      (u) =>
        u.username?.toLowerCase() === term ||
        u.email?.toLowerCase() === term ||
        u.phone?.trim() === term ||
        u.name?.toLowerCase() === term
    );
  }

  public saveUser(userData: Partial<AppUser> & { name: string }): AppUser {
    const db = this.getDB();
    const existingIndex = userData.id ? db.users.findIndex((u) => u.id === userData.id) : -1;

    let userToSave: AppUser;
    if (existingIndex >= 0) {
      const existing = db.users[existingIndex];
      userToSave = {
        ...existing,
        ...userData,
        username: userData.username?.trim() || existing.username || userData.email?.split('@')[0] || existing.email?.split('@')[0] || (existing.id === 'user-admin-01' ? 'tai' : existing.id === 'user-manager-01' ? 'son' : existing.id === 'user-manager-02' ? 'ngan' : existing.id === 'user-staff-01' ? 'nhatphan' : 'user'),
        password: userData.password?.trim() ? userData.password : existing.password,
        updatedAt: Date.now(),
      };
      db.users[existingIndex] = userToSave;
    } else {
      const newId = userData.id || `user-${Date.now()}`;
      userToSave = {
        id: newId,
        name: userData.name,
        username: userData.username?.trim() || userData.email?.split('@')[0] || `user_${Date.now().toString().slice(-4)}`,
        password: userData.password?.trim() || '123456',
        role: userData.role || 'STAFF',
        roleTitle: userData.roleTitle || (userData.role === 'ADMIN' ? 'Full Access Admin (Toàn quyền hệ thống)' : userData.role === 'MANAGER' ? 'Quản lý cửa hàng (Store Manager)' : 'Nhân viên bán hàng (Cashier / POS)'),
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        permissions: userData.permissions || {
          canViewReports: false,
          canManageProducts: false,
          canStockIn: false,
          canManageSuppliers: false,
          canManageCustomers: false,
          canAuditInventory: false,
          canBalanceAudit: false,
          canManageCashbook: false,
          canAccessDataCenter: false,
          canSellPOS: true,
          canViewInvoices: true,
          canDeleteInvoices: false,
          canEditSystemSettings: false,
          canManageUsers: false,
          canImportData: false,
        },
        bio: userData.bio || '',
        status: userData.status || 'ACTIVE',
        updatedAt: Date.now(),
      };
      db.users.push(userToSave);
    }

    db.lastUpdated = Date.now();
    this.schedulePersist();
    this.syncToSupabase('app_users', 'upsert', {
      id: userToSave.id,
      name: userToSave.name,
      username: userToSave.username,
      password: userToSave.password,
      role: userToSave.role,
      role_title: userToSave.roleTitle,
      email: userToSave.email,
      phone: userToSave.phone,
      avatar: userToSave.avatar,
      bio: userToSave.bio,
      permissions: userToSave.permissions,
      status: userToSave.status,
    });
    return userToSave;
  }

  public updateUserPassword(userId: string, newPass: string): boolean {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return false;
    user.password = newPass;
    user.updatedAt = Date.now();
    db.lastUpdated = Date.now();
    this.schedulePersist();
    this.syncToSupabase('app_users', 'upsert', {
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      role_title: user.roleTitle,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      bio: user.bio,
      permissions: user.permissions,
      status: user.status,
    });
    return true;
  }

  public updateUserStatus(userId: string, status: 'ACTIVE' | 'LOCKED'): boolean {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return false;
    user.status = status;
    user.updatedAt = Date.now();
    db.lastUpdated = Date.now();
    this.schedulePersist();
    this.syncToSupabase('app_users', 'upsert', {
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      role_title: user.roleTitle,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      bio: user.bio,
      permissions: user.permissions,
      status: user.status,
    });
    return true;
  }

  public updateUserProfile(userId: string, profile: Partial<AppUser>): AppUser | null {
    const db = this.getDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;
    if (profile.name !== undefined) user.name = profile.name;
    if (profile.username !== undefined) user.username = profile.username;
    if (profile.email !== undefined) user.email = profile.email;
    if (profile.phone !== undefined) user.phone = profile.phone;
    if (profile.bio !== undefined) user.bio = profile.bio;
    if (profile.avatar !== undefined) user.avatar = profile.avatar;
    user.updatedAt = Date.now();
    db.lastUpdated = Date.now();
    this.schedulePersist();
    this.syncToSupabase('app_users', 'upsert', {
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      role_title: user.roleTitle,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      bio: user.bio,
      permissions: user.permissions,
      status: user.status,
    });
    return user;
  }

  public deleteUser(userId: string): boolean {
    const db = this.getDB();
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;
    if (db.users[idx].role === 'ADMIN' || db.users[idx].id === 'user-admin-01') {
      return false;
    }
    db.users.splice(idx, 1);
    db.lastUpdated = Date.now();
    this.schedulePersist();
    this.syncToSupabase('app_users', 'delete', { id: userId });
    return true;
  }

  // ==================== MOBILE & WEB DIFFERENTIAL SYNC ====================
  public pullSync(sinceTimestamp: number = 0): SyncPayload {
    const db = this.getDB();
    this.syncStockNotifications();
    if (sinceTimestamp > 0) {
      const filterByTime = (item: any) => (item.updated_at && item.updated_at > sinceTimestamp) || (item.created_at && item.created_at > sinceTimestamp);
      return {
        lastSyncTimestamp: db.lastUpdated,
        settings: db.settings,
        categories: db.categories,
        products: db.products.filter(filterByTime),
        orders: db.orders.filter(filterByTime),
        suppliers: db.suppliers.filter(filterByTime),
        customers: db.customers.filter(filterByTime),
        inventory_audits: db.inventory_audits.filter(filterByTime),
        cashbook: db.cashbook.filter(filterByTime),
        users: db.users,
        notifications: (db.notifications || []).filter((n) => !n.isDismissed),
        deletedIds: db.deletedIds,
      };
    }
    // Return complete snapshot if sinceTimestamp is 0 or very old, otherwise differential
    return {
      lastSyncTimestamp: db.lastUpdated,
      settings: db.settings,
      categories: db.categories,
      products: db.products,
      orders: db.orders,
      suppliers: db.suppliers,
      customers: db.customers,
      inventory_audits: db.inventory_audits,
      cashbook: db.cashbook,
      users: db.users,
      notifications: (db.notifications || []).filter((n) => !n.isDismissed),
      deletedIds: db.deletedIds,
    };
  }

  public pushSync(payload: SyncPayload): { success: boolean; serverTimestamp: number } {
    const db = this.getDB();

    if (payload.settings) {
      this.updateSettings(payload.settings);
    }
    if (payload.products) {
      this.batchUpsertProducts(payload.products, 'OVERWRITE');
    }
    if (payload.orders) {
      payload.orders.forEach((o) => {
        const idx = db.orders.findIndex((x) => x.id === o.id);
        if (idx >= 0) db.orders[idx] = o;
        else db.orders.unshift(o);
      });
    }
    if (payload.suppliers) {
      payload.suppliers.forEach((s) => {
        const idx = db.suppliers.findIndex((x) => x.id === s.id);
        if (idx >= 0) db.suppliers[idx] = s;
        else db.suppliers.unshift(s);
      });
    }
    if (payload.customers) {
      payload.customers.forEach((c) => {
        const idx = db.customers.findIndex((x) => x.id === c.id);
        if (idx >= 0) db.customers[idx] = c;
        else db.customers.unshift(c);
      });
    }
    if (payload.inventory_audits) {
      payload.inventory_audits.forEach((a) => {
        const idx = db.inventory_audits.findIndex((x) => x.id === a.id);
        if (idx >= 0) db.inventory_audits[idx] = a;
        else db.inventory_audits.unshift(a);
      });
    }
    if (payload.cashbook) {
      payload.cashbook.forEach((c) => {
        const idx = db.cashbook.findIndex((x) => x.id === c.id);
        if (idx >= 0) db.cashbook[idx] = c;
        else db.cashbook.unshift(c);
      });
    }
    if (payload.users) {
      payload.users.forEach((u) => {
        const idx = db.users.findIndex((x) => x.id === u.id);
        if (idx >= 0) db.users[idx] = { ...db.users[idx], ...u };
        else db.users.push(u);
      });
    }
    if (payload.notifications) {
      if (!db.notifications) db.notifications = [];
      payload.notifications.forEach((n) => {
        const idx = db.notifications.findIndex((x) => x.id === n.id);
        if (idx >= 0) db.notifications[idx] = { ...db.notifications[idx], ...n };
        else db.notifications.push(n);
      });
    }

    this.schedulePersist();

    if (payload.products?.length) this.syncBatchToSupabase('products', payload.products);
    if (payload.orders?.length) this.syncBatchToSupabase('orders', payload.orders);
    if (payload.suppliers?.length) this.syncBatchToSupabase('suppliers', payload.suppliers);
    if (payload.customers?.length) this.syncBatchToSupabase('customers', payload.customers);
    if (payload.inventory_audits?.length) this.syncBatchToSupabase('inventory_audits', payload.inventory_audits);
    if (payload.cashbook?.length) this.syncBatchToSupabase('cashbook', payload.cashbook);
    if (payload.users?.length) {
      for (const u of payload.users) {
        this.syncToSupabase('app_users', 'upsert', u);
      }
    }

    return { success: true, serverTimestamp: db.lastUpdated };
  }

  // ==================== NOTIFICATIONS ====================
  public syncStockNotifications() {
    const db = this.getDB();
    if (!db.notifications) db.notifications = [];
    let hasChanges = false;
    const now = Date.now();

    // Map các thông báo tồn kho chưa giải quyết theo productId
    const activeStockNotifs = new Map<string, AppNotification>();
    db.notifications.forEach((n) => {
      if (n.type === 'STOCK' && !n.isDismissed && !n.meta?.isResolved && n.meta?.productId) {
        activeStockNotifs.set(n.meta.productId, n);
      }
    });

    db.products.forEach((p) => {
      const minStock = p.min_stock ?? 5;
      const currentStock = p.stock ?? 0;
      const existingNotif = activeStockNotifs.get(p.id);

      if (currentStock <= 0) {
        // Trạng thái: HẾT HÀNG
        if (!existingNotif) {
          // Chưa từng có thông báo hết hàng: LƯU MỐC THỜI GIAN GỐC
          // Ưu tiên lấy p.updated_at nếu có, fallback về now
          const pTime = p.updated_at ? new Date(p.updated_at).getTime() : now;
          const originalTimestamp = isNaN(pTime) ? now : pTime;
          const newNotif: AppNotification = {
            id: `notif-stock-out-${p.id}`,
            contentKey: `stock:${p.id}:OUT`,
            type: 'STOCK',
            title: 'Hàng hóa đã hết hàng',
            description: `${p.name} hiện đã hết hàng trong kho (tồn: ${currentStock} ${p.unit || 'Cái'})`,
            timestamp: originalTimestamp,
            isRead: false,
            meta: { productId: p.id, stockState: 'OUT', isResolved: false },
          };
          db.notifications.unshift(newNotif);
          activeStockNotifs.set(p.id, newNotif);
          hasChanges = true;
        } else if (existingNotif.meta?.stockState === 'LOW') {
          // Chuyển từ DƯỚI TỒN -> HẾT HÀNG: Cập nhật thay thế
          existingNotif.title = 'Hàng hóa đã hết hàng';
          existingNotif.description = `${p.name} hiện đã hết hàng trong kho (tồn: ${currentStock} ${p.unit || 'Cái'})`;
          existingNotif.meta = { ...existingNotif.meta, stockState: 'OUT' };
          existingNotif.isRead = false;
          existingNotif.timestamp = now;
          hasChanges = true;
        }
        // Nếu đã là OUT -> TUYỆT ĐỐI KHÔNG SỬA TIMESTAMP! Giữ nguyên thời điểm đã hết từ trước!
      } else if (currentStock <= minStock) {
        // Trạng thái: DƯỚI ĐỊNH MỨC TỒN
        if (!existingNotif) {
          const pTime = p.updated_at ? new Date(p.updated_at).getTime() : now;
          const originalTimestamp = isNaN(pTime) ? now : pTime;
          const newNotif: AppNotification = {
            id: `notif-stock-low-${p.id}`,
            contentKey: `stock:${p.id}:LOW`,
            type: 'STOCK',
            title: 'Hàng hóa sắp hết',
            description: `${p.name} chỉ còn ${currentStock} ${p.unit || 'Cái'}`,
            timestamp: originalTimestamp,
            isRead: false,
            meta: { productId: p.id, stockState: 'LOW', isResolved: false },
          };
          db.notifications.unshift(newNotif);
          activeStockNotifs.set(p.id, newNotif);
          hasChanges = true;
        }
        // Nếu đã có thông báo LOW -> GIỮ NGUYÊN TIMESTAMP!
      } else {
        // Trạng thái: ĐÃ NẠP ĐẦY HÀNG (stock > min_stock)
        // THEO CÁCH 3: KHÔNG xóa thông báo cũ! Đánh dấu isResolved = true
        if (existingNotif && !existingNotif.meta?.isResolved) {
          existingNotif.meta = { ...existingNotif.meta, isResolved: true };
          activeStockNotifs.delete(p.id);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.schedulePersist();
    }
  }

  public getNotifications(options?: {
    type?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }) {
    this.syncStockNotifications();

    const db = this.getDB();
    let result = (db.notifications || []).filter((n) => !n.isDismissed);

    if (options?.type && options.type !== 'ALL') {
      result = result.filter((n) => n.type === options.type);
    }
    if (options?.isRead !== undefined) {
      result = result.filter((n) => n.isRead === options.isRead);
    }

    result.sort((a, b) => b.timestamp - a.timestamp);

    const total = result.length;
    const unreadCount = result.filter((n) => !n.isRead).length;

    if (options?.offset !== undefined && options?.limit !== undefined) {
      result = result.slice(options.offset, options.offset + options.limit);
    }

    return { total, unreadCount, items: result };
  }

  public createNotification(notif: AppNotification): AppNotification {
    const db = this.getDB();
    if (!db.notifications) db.notifications = [];
    const idx = db.notifications.findIndex((n) => n.id === notif.id);
    if (idx >= 0) {
      db.notifications[idx] = notif;
    } else {
      db.notifications.unshift(notif);
    }
    this.schedulePersist();
    return notif;
  }

  public markNotificationAsRead(id: string): boolean {
    const db = this.getDB();
    if (!db.notifications) return false;
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.schedulePersist();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(): boolean {
    const db = this.getDB();
    if (!db.notifications) return false;
    let changed = false;
    db.notifications.forEach((n) => {
      if (!n.isRead) {
        n.isRead = true;
        changed = true;
      }
    });
    if (changed) {
      this.schedulePersist();
    }
    return true;
  }

  public dismissNotification(id: string): boolean {
    const db = this.getDB();
    if (!db.notifications) return false;
    const notif = db.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isDismissed = true;
      this.schedulePersist();
      return true;
    }
    return false;
  }

  public clearAllNotifications(): boolean {
    const db = this.getDB();
    if (!db.notifications) return false;
    db.notifications = [];
    this.schedulePersist();
    return true;
  }

  // ==================== SYSTEM CLEAN & STATS ====================
  public cleanMockData(): boolean {
    const db = this.getDB();
    db.products = [];
    db.orders = [];
    db.suppliers = [];
    db.customers = [];
    db.inventory_audits = [];
    db.cashbook = [];
    db.notifications = [];
    db.deletedIds = {
      products: [],
      orders: [],
      suppliers: [],
      customers: [],
      inventory_audits: [],
      cashbook: [],
      notifications: [],
    };
    this.schedulePersist();
    return true;
  }

  public getStats(): ServerStats {
    const db = this.getDB();
    let dbSize = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbSize = fs.statSync(DB_FILE).size;
      }
    } catch {}

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const hitRatio = this.totalQueries > 0 ? Math.round((this.cacheHits / this.totalQueries) * 100) : 100;

    return {
      serverTime: new Date().toISOString(),
      uptimeSeconds: uptime,
      dbSizeBytes: dbSize,
      dbSizeFormatted: `${(dbSize / 1024).toFixed(1)} KB`,
      productCount: db.products.length,
      orderCount: db.orders.length,
      supplierCount: db.suppliers.length,
      customerCount: (db.customers || []).length,
      auditCount: db.inventory_audits.length,
      cashbookCount: db.cashbook.length,
      userCount: db.users.length,
      version: '4.3.0-MOBILE-SYNC',
      cacheHitRatio: hitRatio,
    };
  }
}

export const dbManager = new DatabaseManager();
