import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function emptyDb() {
  return {
    version: 1,
    lastUpdated: Date.now(),
    settings: {},
    branches: [],
    categories: [],
    users: [],
    products: [],
    orders: [],
    suppliers: [],
    customers: [],
    inventory_audits: [],
    cashbook: [],
    deletedIds: {
      products: [],
      orders: [],
      suppliers: [],
      customers: [],
      inventory_audits: [],
      cashbook: [],
    },
    metadata: {},
  };
}

function seedAdmin() {
  console.log('====================================================');
  console.log('👤 SEED TÀI KHOẢN ADMIN - NGÂN SƠN STORE');
  console.log('====================================================\n');

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    fail(
      'Thiếu ADMIN_USERNAME hoặc ADMIN_PASSWORD trong .env.\n\n' +
      '   Thêm vào file .env tại thư mục gốc dự án:\n' +
      '   ADMIN_USERNAME=ten-dang-nhap\n' +
      '   ADMIN_PASSWORD=mat-khau-cua-ban\n' +
      '   ADMIN_NAME=Tên hiển thị (tùy chọn)\n' +
      '   ADMIN_EMAIL=email@vidu.com (tùy chọn)\n' +
      '   ADMIN_PHONE=0900000000 (tùy chọn)\n\n' +
      '   Sau đó chạy lại: npm run db:seed:admin'
    );
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = fs.existsSync(DB_FILE)
    ? JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
    : emptyDb();

  db.users = Array.isArray(db.users) ? db.users : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = db.users.find((u: any) => u.username === username);

  const adminUser = {
    id: existing?.id || `user-${crypto.randomUUID()}`,
    name: process.env.ADMIN_NAME || existing?.name || 'Quản trị viên',
    username,
    password,
    role: 'ADMIN',
    roleTitle: 'Full Access Admin (Toàn quyền hệ thống)',
    email: process.env.ADMIN_EMAIL || existing?.email || '',
    phone: process.env.ADMIN_PHONE || existing?.phone || '',
    avatar: existing?.avatar || '',
    bio: existing?.bio || '',
    status: 'ACTIVE',
    permissions: {
      canViewReports: true,
      canManageProducts: true,
      canStockIn: true,
      canManageSuppliers: true,
      canManageCustomers: true,
      canAuditInventory: true,
      canBalanceAudit: true,
      canManageCashbook: true,
      canAccessDataCenter: true,
      canSellPOS: true,
      canViewInvoices: true,
      canDeleteInvoices: true,
      canEditSystemSettings: true,
      canManageUsers: true,
      canImportData: true,
    },
  };

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.users = db.users.map((u: any) => (u.username === username ? adminUser : u));
    console.log(`🔄 Đã cập nhật tài khoản admin hiện có: ${username}`);
  } else {
    db.users.push(adminUser);
    console.log(`✅ Đã tạo tài khoản admin mới: ${username}`);
  }

  db.lastUpdated = Date.now();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

  console.log(`\n📄 Đã ghi vào ${DB_FILE}`);
  console.log('💡 Nếu dùng Supabase, chạy tiếp: npm run db:seed:supabase để đồng bộ tài khoản này lên cloud.\n');
}

seedAdmin();
