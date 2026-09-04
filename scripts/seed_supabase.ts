import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getSupabaseClient, isSupabaseConfigured } from '../server/supabaseClient.js';

async function seedSupabase() {
  console.log('====================================================');
  console.log('🚀 SUPABASE CLOUD DATABASE SEEDER - NGÂN SƠN STORE');
  console.log('====================================================\n');

  if (!isSupabaseConfigured()) {
    console.error('❌ LỖI: Chưa cấu hình thông tin kết nối Supabase!');
    console.error('Vui lòng mở hoặc tạo file .env tại thư mục gốc của dự án và thêm:\n');
    console.error('SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co');
    console.error('SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
    console.error('Sau đó chạy lại lệnh: npm run db:seed:supabase\n');
    process.exit(1);
  }

  const supabase = getSupabaseClient()!;
  const dbFile = path.join(process.cwd(), '.data', 'db.json');

  if (!fs.existsSync(dbFile)) {
    console.error(`❌ Không tìm thấy tệp dữ liệu nguồn tại: ${dbFile}`);
    process.exit(1);
  }

  console.log('📖 Đang đọc dữ liệu từ .data/db.json...');
  const raw = fs.readFileSync(dbFile, 'utf-8');
  const db = JSON.parse(raw);

  console.log(`📊 Tìm thấy:
  - ${db.products?.length || 0} Sản phẩm
  - ${db.customers?.length || 0} Khách hàng
  - ${db.suppliers?.length || 0} Nhà cung cấp
  - ${db.orders?.length || 0} Hóa đơn bán hàng
  - ${db.cashbook?.length || 0} Bút toán sổ quỹ
  - ${db.categories?.length || 0} Danh mục
  - ${db.users?.length || 0} Người dùng\n`);

  // Helper to convert DD/MM/YYYY HH:mm:ss or timestamps into ISO 8601 strings for PostgreSQL TIMESTAMPTZ
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

  // Helper for batch upserts
  async function upsertInBatches(table: string, items: any[], batchSize = 200) {
    if (!items || items.length === 0) return;
    console.log(`⏳ Đang tải ${items.length} bản ghi vào bảng "${table}"...`);
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
      if (error) {
        console.warn(`\n⚠️ Cảnh báo khi ghi vào ${table} (batch ${i} - ${i + batch.length}):`, error.message);
      } else {
        const percent = Math.min(100, Math.round(((i + batch.length) / items.length) * 100));
        process.stdout.write(`\r   -> Tiến độ ${table}: ${percent}% (${Math.min(i + batch.length, items.length)}/${items.length})`);
      }
    }
    console.log(`\n✅ Hoàn tất bảng "${table}"!`);
  }

  // 1. Settings
  if (db.settings) {
    console.log('⏳ Đang lưu Cài đặt cửa hàng...');
    await supabase.from('store_settings').upsert({ id: 'default', data: db.settings });
    console.log('✅ Đã lưu Cài đặt cửa hàng.');
  }

  // 2. Branches
  if (db.branches && db.branches.length > 0) {
    await upsertInBatches('branches', db.branches);
  }

  // 3. Categories
  if (db.categories && db.categories.length > 0) {
    await upsertInBatches('categories', db.categories);
  }

  // 4. App Users
  if (db.users && db.users.length > 0) {
    const formattedUsers = db.users.map((u: any) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      role_title: u.roleTitle || (u.role === 'ADMIN' ? 'Quản trị viên (Admin)' : 'Nhân viên'),
      email: u.email || '',
      phone: u.phone,
      avatar: u.avatar,
      bio: u.bio || '',
      can_import_data: Boolean(u.permissions?.canImportData),
      is_active: u.status === 'ACTIVE' || u.is_active !== false,
      permissions: u.permissions || {},
    }));
    await upsertInBatches('app_users', formattedUsers);
  }

  // 5. Products
  if (db.products && db.products.length > 0) {
    await upsertInBatches('products', db.products);
  }

  // 6. Customers
  if (db.customers && db.customers.length > 0) {
    const formattedCustomers = db.customers.map((c: any) => ({
      id: c.id,
      code: c.code || c.id,
      name: c.name,
      phone: c.phone || '',
      type: c.type || c.customer_type || 'Cá nhân',
      branch: c.branch || '',
      email: c.email || '',
      address: c.address || '',
      ward: c.ward || '',
      district_city: c.district_city || '',
      gender: c.gender || '',
      tax_code: c.tax_code || '',
      id_card: c.id_card || '',
      group: c.group || '',
      debt: c.debt || 0,
      total_purchased: c.total_purchased || 0,
      note: c.note || '',
      status: c.status || 'ACTIVE',
      created_by: c.created_by || '',
      created_at: toIsoDate(c.created_at) || new Date().toISOString(),
      updated_at: toIsoDate(c.updated_at) || toIsoDate(c.created_at) || new Date().toISOString(),
    }));
    await upsertInBatches('customers', formattedCustomers);
  }

  // 7. Suppliers
  if (db.suppliers && db.suppliers.length > 0) {
    const formattedSuppliers = db.suppliers.map((s: any) => ({
      id: s.id,
      code: s.code || s.id,
      name: s.name,
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      ward: s.ward || '',
      district_city: s.district_city || '',
      tax_code: s.tax_code || '',
      id_card: s.id_card || '',
      group: s.group || '',
      debt: s.debt || 0,
      total_purchased: s.total_purchased || 0,
      note: s.note || '',
      status: s.status || 'ACTIVE',
      company: s.company || '',
      created_by: s.created_by || '',
      created_at: toIsoDate(s.created_at) || new Date().toISOString(),
      updated_at: toIsoDate(s.updated_at) || toIsoDate(s.created_at) || new Date().toISOString(),
    }));
    await upsertInBatches('suppliers', formattedSuppliers);
  }

  // 8. Orders
  if (db.orders && db.orders.length > 0) {
    const formattedOrders = db.orders.map((o: any) => ({
      id: o.id,
      code: o.code || o.id,
      customer_name: o.customer_name || 'Khách lẻ',
      phone: o.phone || '',
      items: o.items || [],
      total: o.total || 0,
      discount: o.discount || 0,
      final_amount: o.final_amount || 0,
      total_cost: o.total_cost || 0,
      profit: o.profit || 0,
      payment_method: o.payment_method || 'CASH',
      status: o.status || 'COMPLETED',
      cashier: o.cashier || '',
      branch: o.branch || '',
      note: o.note || '',
      created_at: toIsoDate(o.created_at) || new Date().toISOString(),
    }));
    await upsertInBatches('orders', formattedOrders);
  }

  // 9. Cashbook
  if (db.cashbook && db.cashbook.length > 0) {
    const formattedCashbook = db.cashbook.map((cb: any) => ({
      id: cb.id,
      code: cb.code || cb.id,
      type: cb.type || 'IN',
      amount: cb.amount || 0,
      category: cb.category || '',
      note: cb.note || '',
      ref_code: cb.ref_code || null,
      branch: cb.branch || '',
      created_at: toIsoDate(cb.created_at) || new Date().toISOString(),
    }));
    await upsertInBatches('cashbook', formattedCashbook);
  }

  // 10. Inventory Audits
  if (db.inventory_audits && db.inventory_audits.length > 0) {
    const formattedAudits = db.inventory_audits.map((a: any) => ({
      id: a.id,
      code: a.code || a.id,
      date: a.date || '',
      auditor: a.auditor || '',
      status: a.status || 'DRAFT',
      items: a.items || [],
      total_diff_items: a.total_diff_items || 0,
      total_diff_value: a.total_diff_value || 0,
      notes: a.notes || '',
      balanced_at: toIsoDate(a.balanced_at),
      created_at: toIsoDate(a.created_at) || new Date().toISOString(),
    }));
    await upsertInBatches('inventory_audits', formattedAudits);
  }

  console.log('\n====================================================');
  console.log('🎉 XUẤT SẮC! TOÀN BỘ DỮ LIỆU ĐÃ NẠP THÀNH CÔNG VÀO SUPABASE!');
  console.log('====================================================');
}

seedSupabase().catch((err) => {
  console.error('Lỗi trong quá trình di chuyển dữ liệu:', err);
  process.exit(1);
});
