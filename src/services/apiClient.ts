import {
  Product,
  Order,
  Supplier,
  Customer,
  InventoryAudit,
  CashbookEntry,
  AppUser,
  SyncPayload,
  ServerStats,
  VoiceIntent,
  StoreSettings,
} from '../types/index';
import { cacheManager } from './cacheManager';
import { supabaseService } from './supabaseService';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Version': '4.3-WEB',
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson: any;
        try {
          errorJson = JSON.parse(errorText);
        } catch {}
        throw new Error(errorJson?.error || errorJson?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn(`[API] Error request to ${endpoint}:`, message);
      throw err;
    }
  }

  // ==================== STATS & SYSTEM ====================
  public async getServerStats(): Promise<ServerStats> {
    const res = await this.request<{ success: boolean; data: ServerStats }>('/system/stats');
    return res.data;
  }

  public async cleanServerMockData(): Promise<void> {
    await this.request('/system/clean-mock', { method: 'POST' });
    cacheManager.clearAll();
  }

  // ==================== SETTINGS ====================
  public async getStoreSettings(): Promise<StoreSettings> {
    const res = await this.request<{ success: boolean; data: StoreSettings }>('/settings');
    return res.data;
  }

  public async updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await this.request<{ success: boolean; data: StoreSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return res.data;
  }

  // ==================== SYNC ====================
  public async pullSync(since: number = 0): Promise<SyncPayload> {
    try {
      const [
        settings,
        branches,
        categories,
        users,
        products,
        orders,
        suppliers,
        customers,
        inventory_audits,
        cashbook,
      ] = await Promise.all([
        supabaseService.getStoreSettings(),
        supabaseService.getBranches(),
        supabaseService.getCategories(),
        supabaseService.getUsers(),
        supabaseService.getProducts(),
        supabaseService.getOrders(),
        supabaseService.getSuppliers(),
        supabaseService.getCustomers(),
        supabaseService.getInventoryAudits(200),
        supabaseService.getCashbook(),
      ]);

      if (products.length > 0 || orders.length > 0 || customers.length > 0 || categories.length > 0 || users.length > 0) {
        return {
          lastSyncTimestamp: Date.now(),
          settings: settings || undefined,
          branches,
          categories,
          users,
          products,
          orders,
          suppliers,
          customers,
          inventory_audits,
          cashbook,
        };
      }
    } catch (supabaseErr) {
      console.warn('[Supabase Direct Sync] Falling back to API proxy:', supabaseErr);
    }

    const res = await this.request<{ success: boolean; data: SyncPayload }>(`/sync/pull?since=${since}`);
    return res.data;
  }

  public async pushSync(payload: SyncPayload): Promise<{ success: boolean; serverTimestamp: number }> {
    try {
      const tasks: Promise<any>[] = [];
      if (payload.products?.length) {
        tasks.push(supabaseService.batchUpsertProducts(payload.products));
      }
      if (payload.orders?.length) {
        tasks.push(...payload.orders.map((o) => supabaseService.upsertOrder(o)));
      }
      if (payload.customers?.length) {
        tasks.push(...payload.customers.map((c) => supabaseService.upsertCustomer(c)));
      }
      if (payload.suppliers?.length) {
        tasks.push(...payload.suppliers.map((s) => supabaseService.upsertSupplier(s)));
      }
      if (payload.cashbook?.length) {
        tasks.push(...payload.cashbook.map((cb) => supabaseService.upsertCashbook(cb)));
      }
      if (payload.inventory_audits?.length) {
        tasks.push(...payload.inventory_audits.map((ia) => supabaseService.upsertInventoryAudit(ia)));
      }
      if (payload.branches?.length) {
        tasks.push(...payload.branches.map((b) => supabaseService.upsertBranch(b)));
      }
      if (payload.users?.length) {
        tasks.push(...payload.users.map((u) => supabaseService.upsertUser(u)));
      }
      if (payload.settings) {
        tasks.push(supabaseService.updateStoreSettings(payload.settings));
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
      return { success: true, serverTimestamp: Date.now() };
    } catch (err) {
      console.warn('[Supabase Direct Push] Falling back to API proxy:', err);
    }

    const res = await this.request<{ success: boolean; result: { success: boolean; serverTimestamp: number } }>(
      '/sync/push',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.result;
  }

  // ==================== PRODUCTS ====================
  public async getProducts(): Promise<Product[]> {
    const cached = cacheManager.get<Product[]>('products', 30 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: Product[]; total: number }>('/products');
    if (res.data) {
      cacheManager.set('products', res.data);
      return res.data;
    }
    return [];
  }

  public async createProduct(product: Product): Promise<Product> {
    cacheManager.invalidate('products');
    const res = await this.request<{ success: boolean; data: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return res.data;
  }

  public async batchUpsertProducts(
    items: Product[],
    strategy: 'OVERWRITE' | 'SKIP' | 'KEEP_BOTH' | 'REPLACE_ALL' = 'OVERWRITE'
  ): Promise<{ total: number; inserted: number; updated: number; skipped: number }> {
    cacheManager.invalidate('products');
    const res = await this.request<{
      success: boolean;
      result: { total: number; inserted: number; updated: number; skipped: number };
    }>('/products/batch', {
      method: 'POST',
      body: JSON.stringify({ items, strategy }),
    });
    return res.result;
  }

  public async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    cacheManager.invalidate('products');
    const res = await this.request<{ success: boolean; data: Product }>(`/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.data;
  }

  public async deleteProduct(id: string): Promise<void> {
    cacheManager.invalidate('products');
    await this.request(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // ==================== ORDERS ====================
  public async getOrders(): Promise<Order[]> {
    const cached = cacheManager.get<Order[]>('orders', 30 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: Order[]; total: number }>('/orders');
    if (res.data) {
      cacheManager.set('orders', res.data);
      return res.data;
    }
    return [];
  }

  public async createOrder(order: Order): Promise<Order> {
    cacheManager.invalidate('orders');
    cacheManager.invalidate('products'); // stock changes
    const res = await this.request<{ success: boolean; data: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    return res.data;
  }

  public async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    cacheManager.invalidate('orders');
    const res = await this.request<{ success: boolean; data: Order }>(`/orders/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.data;
  }

  public async deleteOrder(id: string, returnStock: boolean = false): Promise<void> {
    cacheManager.invalidate('orders');
    if (returnStock) cacheManager.invalidate('products');
    await this.request(`/orders/${encodeURIComponent(id)}?returnStock=${returnStock}`, {
      method: 'DELETE',
    });
  }

  public async batchUpsertOrders(items: Order[], strategy: string = 'OVERWRITE'): Promise<{ total: number; inserted: number; updated: number; skipped: number }> {
    cacheManager.invalidate('orders');
    cacheManager.invalidate('products');
    const res = await this.request<{ success: boolean; result: { total: number; inserted: number; updated: number; skipped: number } }>('/orders/batch', {
      method: 'POST',
      body: JSON.stringify({ items, strategy }),
    });
    return res.result;
  }

  // ==================== SUPPLIERS ====================
  public async getSuppliers(): Promise<Supplier[]> {
    const cached = cacheManager.get<Supplier[]>('suppliers', 60 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: Supplier[]; total: number }>('/suppliers');
    if (res.data) {
      cacheManager.set('suppliers', res.data);
      return res.data;
    }
    return [];
  }

  public async createSupplier(supplier: Supplier): Promise<Supplier> {
    cacheManager.invalidate('suppliers');
    const res = await this.request<{ success: boolean; data: Supplier }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
    return res.data;
  }

  public async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    cacheManager.invalidate('suppliers');
    const res = await this.request<{ success: boolean; data: Supplier }>(`/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.data;
  }

  public async deleteSupplier(id: string): Promise<void> {
    cacheManager.invalidate('suppliers');
    await this.request(`/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  public async batchUpsertSuppliers(items: Supplier[], strategy: string = 'OVERWRITE'): Promise<{ total: number; inserted: number; updated: number; skipped: number }> {
    cacheManager.invalidate('suppliers');
    const res = await this.request<{ success: boolean; result: { total: number; inserted: number; updated: number; skipped: number } }>('/suppliers/batch', {
      method: 'POST',
      body: JSON.stringify({ items, strategy }),
    });
    return res.result;
  }

  // ==================== CUSTOMERS ====================
  public async getCustomers(): Promise<Customer[]> {
    const cached = cacheManager.get<Customer[]>('customers', 60 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: Customer[]; total: number }>('/customers');
    if (res.data) {
      cacheManager.set('customers', res.data);
      return res.data;
    }
    return [];
  }

  public async createCustomer(customer: Customer): Promise<Customer> {
    cacheManager.invalidate('customers');
    const res = await this.request<{ success: boolean; data: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
    return res.data;
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    cacheManager.invalidate('customers');
    const res = await this.request<{ success: boolean; data: Customer }>(`/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.data;
  }

  public async deleteCustomer(id: string): Promise<void> {
    cacheManager.invalidate('customers');
    await this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  public async batchUpsertCustomers(
    items: Customer[],
    mode: 'OVERWRITE' | 'APPEND' = 'OVERWRITE'
  ): Promise<{ total: number; inserted: number; updated: number; skipped: number }> {
    cacheManager.invalidate('customers');
    const res = await this.request<{
      success: boolean;
      data: { total: number; inserted: number; updated: number; skipped: number };
    }>('/customers/bulk', {
      method: 'POST',
      body: JSON.stringify({ items, mode }),
    });
    return res.data;
  }

  // ==================== INVENTORY AUDITS ====================
  public async getAudits(): Promise<InventoryAudit[]> {
    const cached = cacheManager.get<InventoryAudit[]>('audits', 30 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: InventoryAudit[]; total: number }>('/inventory-audits');
    if (res.data) {
      cacheManager.set('audits', res.data);
      return res.data;
    }
    return [];
  }

  public async createAudit(audit: InventoryAudit): Promise<InventoryAudit> {
    cacheManager.invalidate('audits');
    const res = await this.request<{ success: boolean; data: InventoryAudit }>('/inventory-audits', {
      method: 'POST',
      body: JSON.stringify(audit),
    });
    return res.data;
  }

  public async createInventoryAudit(audit: InventoryAudit): Promise<InventoryAudit> {
    return this.createAudit(audit);
  }

  public async balanceAudit(id: string): Promise<InventoryAudit> {
    cacheManager.invalidate('audits');
    cacheManager.invalidate('products');
    const res = await this.request<{ success: boolean; data: InventoryAudit }>(
      `/inventory-audits/${encodeURIComponent(id)}/balance`,
      { method: 'POST' }
    );
    return res.data;
  }

  public async balanceInventoryAudit(id: string): Promise<InventoryAudit> {
    return this.balanceAudit(id);
  }

  // ==================== CASHBOOK ====================
  public async getCashbook(): Promise<CashbookEntry[]> {
    const cached = cacheManager.get<CashbookEntry[]>('cashbook', 30 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: CashbookEntry[]; total: number }>('/cashbook');
    if (res.data) {
      cacheManager.set('cashbook', res.data);
      return res.data;
    }
    return [];
  }

  public async createCashbookEntry(entry: CashbookEntry): Promise<CashbookEntry> {
    cacheManager.invalidate('cashbook');
    const res = await this.request<{ success: boolean; data: CashbookEntry }>('/cashbook', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    return res.data;
  }

  public async deleteCashbookEntry(id: string): Promise<void> {
    cacheManager.invalidate('cashbook');
    await this.request(`/cashbook/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  public async batchUpsertCashbook(items: CashbookEntry[], strategy: string = 'OVERWRITE'): Promise<{ total: number; inserted: number; updated: number; skipped: number }> {
    cacheManager.invalidate('cashbook');
    const res = await this.request<{ success: boolean; result: { total: number; inserted: number; updated: number; skipped: number } }>('/cashbook/batch', {
      method: 'POST',
      body: JSON.stringify({ items, strategy }),
    });
    return res.result;
  }

  // ==================== USERS ====================
  public async getUsers(): Promise<AppUser[]> {
    const cached = cacheManager.get<AppUser[]>('users', 300 * 1000);
    if (cached) return cached;

    const res = await this.request<{ success: boolean; data: AppUser[] }>('/users');
    if (res.data) {
      cacheManager.set('users', res.data);
      return res.data;
    }
    return [];
  }

  // ==================== AI INTENT & VOICE PARSING ====================
  public async parseVoiceOrder(payload: {
    text: string;
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    mode?: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER';
    currentOrder?: Order;
  }): Promise<{
    intent: VoiceIntent;
    target_screen?: string;
    customer: { name: string; phone: string; address?: string };
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      unit_cost?: number;
      unit?: string;
      discount_percent?: number;
      note?: string;
    }>;
    discount?: { amount?: number; percent?: number; type?: 'AMOUNT' | 'PERCENT' };
    payment_method?: 'CASH' | 'TRANSFER' | 'CARD';
    supplier_name?: string;
    order_code_to_update?: string;
    note?: string;
    spoken_feedback: string;
    explanation?: string;
    confidence?: number;
  }> {
    const res = await this.request<{ success: boolean; source: string; data: any }>('/ai/parse-voice-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  // Raw SSE stream — caller reads response.body itself to consume chunks as they arrive.
  // Throws on any non-OK HTTP response so callers can fall back the same way as parseVoiceOrder.
  public async parseVoiceOrderStreamRaw(payload: {
    text: string;
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    mode?: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER';
    currentOrder?: Order;
  }): Promise<Response> {
    const response = await fetch(`${API_BASE}/ai/parse-voice-order-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '4.3-WEB',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  }
}

export const apiClient = new ApiClient();
