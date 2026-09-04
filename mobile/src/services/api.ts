import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Order, Customer, Supplier, VoiceAssistantAction, StoreSettings } from '../types';

const STORAGE_SERVER_KEY = '@nganson_server_url';
export const DEFAULT_SERVER_URL = 'http://10.0.2.2:3001/api';

export class MobileApiService {
  private baseUrl: string = DEFAULT_SERVER_URL;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_SERVER_KEY);
      if (saved) {
        this.baseUrl = saved;
      }
    } catch (e) {
      console.warn('Failed to load server URL from storage:', e);
    }
  }

  private async ensureInitialized() {
    await this.initPromise;
  }

  async setServerUrl(url: string) {
    let clean = url.trim();
    if (clean.endsWith('/')) clean = clean.slice(0, -1);
    if (!clean.endsWith('/api')) clean = `${clean}/api`;
    this.baseUrl = clean;
    await AsyncStorage.setItem(STORAGE_SERVER_KEY, clean);
  }

  async getServerUrl(): Promise<string> {
    await this.ensureInitialized();
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.ensureInitialized();
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Version': '4.3-MOBILE-RN',
      ...(options.headers as any || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, { ...options, headers, signal: controller.signal as any });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        let parsed: any;
        try { parsed = JSON.parse(text); } catch {}
        throw new Error(parsed?.error || parsed?.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[Mobile API] Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Check backend server connection
  async testConnection(): Promise<{ success: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.request<{ status: string }>('/health');
      return { success: true, latencyMs: Date.now() - start };
    } catch {
      return { success: false, latencyMs: -1 };
    }
  }

  // Products
  async getProducts(search?: string): Promise<Product[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await this.request<{ success: boolean; data: Product[] }>(`/products${query}`);
    return res.data || [];
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const products = await this.getProducts(barcode);
    return products.find((p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()) || null;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await this.request<{ success: boolean; data: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return res.data;
  }

  async updateProduct(id: string | number, product: Partial<Product>): Promise<Product> {
    const res = await this.request<{ success: boolean; data: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
    return res.data;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.request(`/products/${id}`, { method: 'DELETE' });
    return true;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const res = await this.request<{ success: boolean; data: Order[] }>('/orders');
    return res.data || [];
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const res = await this.request<{ success: boolean; data: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
    return res.data;
  }

  async deleteOrder(id: string): Promise<boolean> {
    await this.request(`/orders/${id}`, { method: 'DELETE' });
    return true;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await this.request<{ success: boolean; data: Customer[] }>('/customers');
    return res.data || [];
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const res = await this.request<{ success: boolean; data: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
    return res.data;
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    const res = await this.request<{ success: boolean; data: Customer }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    });
    return res.data;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    await this.request(`/customers/${id}`, { method: 'DELETE' });
    return true;
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const res = await this.request<{ success: boolean; data: Supplier[] }>('/suppliers');
    return res.data || [];
  }

  async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const res = await this.request<{ success: boolean; data: Supplier }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
    return res.data;
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<Supplier> {
    const res = await this.request<{ success: boolean; data: Supplier }>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    });
    return res.data;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    await this.request(`/suppliers/${id}`, { method: 'DELETE' });
    return true;
  }

  // Cashbook
  async getCashbook(): Promise<any[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/cashbook');
    return res.data || [];
  }

  async createCashbookEntry(entry: any): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>('/cashbook', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    return res.data;
  }

  async deleteCashbookEntry(id: string): Promise<boolean> {
    await this.request(`/cashbook/${id}`, { method: 'DELETE' });
    return true;
  }

  // Inventory Audits
  async getAudits(): Promise<any[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/inventory-audits');
    return res.data || [];
  }

  async createAudit(audit: any): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>('/inventory-audits', {
      method: 'POST',
      body: JSON.stringify(audit),
    });
    return res.data;
  }

  async balanceAudit(id: string): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>(`/inventory-audits/${id}/balance`, {
      method: 'POST',
    });
    return res.data;
  }

  // Store Settings
  async getSettings(): Promise<StoreSettings> {
    const res = await this.request<{ success: boolean; data: StoreSettings }>('/settings');
    return res.data;
  }

  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await this.request<{ success: boolean; data: StoreSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return res.data;
  }

  // Voice AI Assistant Intent & Parsing
  async parseVoiceAssistant(
    text: string,
    products: Product[] = [],
    customers: Customer[] = [],
    suppliers: Supplier[] = []
  ): Promise<any> {
    const res = await this.request<{ success: boolean; source: string; data: any }>('/ai/parse-voice-order', {
      method: 'POST',
      body: JSON.stringify({
        text,
        products,
        customers,
        suppliers,
        mode: 'POS_ORDER',
      }),
    });
    return res.data;
  }
}

export const mobileApi = new MobileApiService();

/**
 * Generate VietQR payment URL
 */
export const getVietQRUrl = (
  bankId: string,
  accountNumber: string,
  template: string = 'compact2',
  amount: number = 0,
  memo: string = '',
  accountHolder: string = ''
): string => {
  const cleanBank = (bankId || 'MB').trim();
  const cleanAcc = (accountNumber || '0912345678').trim();
  const cleanAmount = Math.max(0, Math.round(amount));
  const encodedMemo = encodeURIComponent(memo.trim());
  const encodedHolder = encodeURIComponent(accountHolder.trim());

  return `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-${template}.png?amount=${cleanAmount}&addInfo=${encodedMemo}&accountName=${encodedHolder}`;
};
