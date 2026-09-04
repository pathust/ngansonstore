import { supabase } from './supabase';
import {
  Product,
  Order,
  Supplier,
  Customer,
  InventoryAudit,
  CashbookEntry,
  Branch,
  Category,
  AppUser,
  StoreSettings,
} from '../types/index';

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

export class SupabaseService {
  private isConfigured(): boolean {
    return Boolean(supabase);
  }

  // Helper for pagination across tables with more than 1000 items
  private async fetchAllRows<T = any>(
    table: string,
    orderField?: string,
    maxTotal?: number
  ): Promise<T[]> {
    const pageSize = 1000;
    let all: T[] = [];
    let from = 0;

    while (true) {
      let q = supabase.from(table).select('*').range(from, from + pageSize - 1);
      if (orderField) {
        q = q.order(orderField, { ascending: false });
      }
      const { data, error } = await q;
      if (error || !data || data.length === 0) break;
      all = all.concat(data as unknown as T[]);
      if (data.length < pageSize || (maxTotal && all.length >= maxTotal)) break;
      from += pageSize;
    }
    return all;
  }

  // ==================== STORE SETTINGS ====================
  public async getStoreSettings(): Promise<StoreSettings | null> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('data')
        .eq('id', 'default')
        .maybeSingle();
      if (error || !data) return null;
      return data.data as StoreSettings;
    } catch {
      return null;
    }
  }

  public async updateStoreSettings(settings: StoreSettings): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert({ id: 'default', data: settings });
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== BRANCHES & CATEGORIES ====================
  public async getBranches(): Promise<Branch[]> {
    try {
      const { data, error } = await supabase.from('branches').select('*');
      if (error || !data) return [];
      return data as Branch[];
    } catch {
      return [];
    }
  }

  public async upsertBranch(branch: Branch): Promise<boolean> {
    try {
      const { error } = await supabase.from('branches').upsert(branch);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteBranch(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error || !data) return [];
      return data as Category[];
    } catch {
      return [];
    }
  }

  public async upsertCategory(category: Category): Promise<boolean> {
    try {
      const { error } = await supabase.from('categories').upsert(category);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteCategory(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== USERS ====================
  public async getUsers(): Promise<AppUser[]> {
    try {
      const { data, error } = await supabase.from('app_users').select('*');
      if (error || !data) return [];
      return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role || 'STAFF',
        roleTitle: u.role_title || (u.role === 'ADMIN' ? 'Quản trị viên (Admin)' : 'Nhân viên bán hàng'),
        email: u.email || '',
        phone: u.phone || '',
        avatar: u.avatar || '',
        bio: u.bio || '',
        permissions: u.permissions || {},
      }));
    } catch {
      return [];
    }
  }

  public async upsertUser(user: AppUser): Promise<boolean> {
    try {
      const payload = {
        id: user.id,
        name: user.name,
        role: user.role,
        role_title: user.roleTitle,
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        permissions: user.permissions || {},
      };
      const { error } = await supabase.from('app_users').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteUser(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== PRODUCTS ====================
  public async getProducts(): Promise<Product[]> {
    return this.fetchAllRows<Product>('products');
  }

  public async upsertProduct(product: Product): Promise<boolean> {
    try {
      const payload: any = { ...product };
      if (payload.created_at) payload.created_at = toIsoDate(payload.created_at);
      if (payload.updated_at) payload.updated_at = toIsoDate(payload.updated_at);
      const { error } = await supabase.from('products').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteProduct(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async batchUpsertProducts(products: Product[]): Promise<boolean> {
    try {
      const batchSize = 100;
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize).map((p) => ({
          ...p,
          created_at: toIsoDate(p.created_at),
          updated_at: toIsoDate(p.updated_at),
        }));
        const { error } = await supabase.from('products').upsert(batch);
        if (error) throw error;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] batchUpsertProducts error:', err);
      return false;
    }
  }

  // ==================== CUSTOMERS ====================
  public async getCustomers(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase.from('customers').select('*').range(0, 1000);
      if (error || !data) return [];
      return data.map((c: any) => ({
        ...c,
        customer_type: c.customer_type || c.type,
      }));
    } catch {
      return [];
    }
  }

  public async upsertCustomer(customer: Customer): Promise<boolean> {
    try {
      const payload: any = { ...customer };
      if (payload.customer_type && !payload.type) payload.type = payload.customer_type;
      delete payload.customer_type;
      if (payload.created_at) payload.created_at = toIsoDate(payload.created_at);
      if (payload.updated_at) payload.updated_at = toIsoDate(payload.updated_at);
      const { error } = await supabase.from('customers').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== SUPPLIERS ====================
  public async getSuppliers(): Promise<Supplier[]> {
    try {
      const { data, error } = await supabase.from('suppliers').select('*');
      if (error || !data) return [];
      return data as Supplier[];
    } catch {
      return [];
    }
  }

  public async upsertSupplier(supplier: Supplier): Promise<boolean> {
    try {
      const payload: any = { ...supplier };
      if (payload.created_at) payload.created_at = toIsoDate(payload.created_at);
      if (payload.updated_at) payload.updated_at = toIsoDate(payload.updated_at);
      const { error } = await supabase.from('suppliers').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteSupplier(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== ORDERS ====================
  public async getOrders(limit?: number): Promise<Order[]> {
    return this.fetchAllRows<Order>('orders', 'created_at', limit);
  }

  public async upsertOrder(order: Order): Promise<boolean> {
    try {
      const payload: any = { ...order };
      if (payload.created_at) payload.created_at = toIsoDate(payload.created_at);
      const { error } = await supabase.from('orders').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteOrder(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== CASHBOOK ====================
  public async getCashbook(limit?: number): Promise<CashbookEntry[]> {
    return this.fetchAllRows<CashbookEntry>('cashbook', 'created_at', limit);
  }

  public async upsertCashbook(entry: CashbookEntry): Promise<boolean> {
    try {
      const payload: any = { ...entry };
      if (payload.created_at) payload.created_at = toIsoDate(payload.created_at);
      const { error } = await supabase.from('cashbook').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  public async deleteCashbook(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('cashbook').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== INVENTORY AUDITS ====================
  public async getInventoryAudits(limit = 200): Promise<InventoryAudit[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error || !data) return [];
      return data as InventoryAudit[];
    } catch {
      return [];
    }
  }

  public async upsertInventoryAudit(audit: InventoryAudit): Promise<boolean> {
    try {
      const payload: any = { ...audit };
      if (payload.created_at) payload.created_at = toIsoDate(payload.created_at);
      if (payload.balanced_at) payload.balanced_at = toIsoDate(payload.balanced_at);
      const { error } = await supabase.from('inventory_audits').upsert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  // ==================== REALTIME SUBSCRIPTIONS ====================
  public subscribeRealtime(
    onTableChange: (table: string, eventType: string, newRecord: any, oldRecord: any) => void
  ) {
    try {
      const channel = supabase
        .channel('store-realtime-channel')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          onTableChange(payload.table, payload.eventType, payload.new, payload.old);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('[Supabase] Realtime subscription error:', err);
      return () => {};
    }
  }
}

export const supabaseService = new SupabaseService();
