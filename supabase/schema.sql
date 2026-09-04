-- ==============================================================================
-- CƠ SỞ DỮ LIỆU ĐÁM MÂY SUPABASE (POSTGRESQL) - CỬA HÀNG NGÂN SƠN (318 VŨ QUANG)
-- Hướng dẫn: Dán toàn bộ mã SQL này vào mục "SQL Editor" trên Supabase Dashboard và bấm RUN
-- ==============================================================================

-- 1. BẢNG CÀI ĐẶT CỬA HÀNG (STORE SETTINGS)
CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG CHI NHÁNH (BRANCHES)
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG NGƯỜI DÙNG & NHÂN VIÊN (APP USERS)
CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    role_title TEXT,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    bio TEXT,
    can_import_data BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG DANH MỤC HÀNG HÓA (CATEGORIES)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG SẢN PHẨM & TỒN KHO (PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT,
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'cái',
    cost_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    image TEXT,
    last_received_date TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 6. BẢNG KHÁCH HÀNG & CÔNG NỢ (CUSTOMERS)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    type TEXT,
    branch TEXT,
    email TEXT,
    address TEXT,
    ward TEXT,
    district_city TEXT,
    gender TEXT,
    tax_code TEXT,
    id_card TEXT,
    "group" TEXT,
    debt NUMERIC DEFAULT 0,
    total_purchased NUMERIC DEFAULT 0,
    note TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 7. BẢNG NHÀ CUNG CẤP (SUPPLIERS)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    ward TEXT,
    district_city TEXT,
    tax_code TEXT,
    id_card TEXT,
    "group" TEXT,
    debt NUMERIC DEFAULT 0,
    total_purchased NUMERIC DEFAULT 0,
    note TEXT,
    status TEXT DEFAULT 'ACTIVE',
    company TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 8. BẢNG HÓA ĐƠN BÁN HÀNG (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_name TEXT DEFAULT 'Khách lẻ',
    phone TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    final_amount NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH',
    status TEXT DEFAULT 'COMPLETED',
    cashier TEXT,
    branch TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 9. BẢNG SỔ QUỸ THU CHI (CASHBOOK)
CREATE TABLE IF NOT EXISTS cashbook (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'IN' | 'OUT'
    amount NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    note TEXT,
    ref_code TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashbook_code ON cashbook(code);
CREATE INDEX IF NOT EXISTS idx_cashbook_type ON cashbook(type);
CREATE INDEX IF NOT EXISTS idx_cashbook_ref_code ON cashbook(ref_code);
CREATE INDEX IF NOT EXISTS idx_cashbook_created_at ON cashbook(created_at);

-- 10. BẢNG KIỂM KÊ KHO (INVENTORY AUDITS)
CREATE TABLE IF NOT EXISTS inventory_audits (
    id TEXT PRIMARY KEY,
    code TEXT,
    date TEXT,
    auditor TEXT,
    status TEXT DEFAULT 'DRAFT',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_diff_items NUMERIC DEFAULT 0,
    total_diff_value NUMERIC DEFAULT 0,
    notes TEXT,
    balanced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_code ON inventory_audits(code);

-- ==============================================================================
-- CẤU HÌNH BẢO MẬT ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all access to store_settings" ON store_settings;
    CREATE POLICY "Allow all access to store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to branches" ON branches;
    CREATE POLICY "Allow all access to branches" ON branches FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to app_users" ON app_users;
    CREATE POLICY "Allow all access to app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to categories" ON categories;
    CREATE POLICY "Allow all access to categories" ON categories FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to products" ON products;
    CREATE POLICY "Allow all access to products" ON products FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to customers" ON customers;
    CREATE POLICY "Allow all access to customers" ON customers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to suppliers" ON suppliers;
    CREATE POLICY "Allow all access to suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to orders" ON orders;
    CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to cashbook" ON cashbook;
    CREATE POLICY "Allow all access to cashbook" ON cashbook FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all access to inventory_audits" ON inventory_audits;
    CREATE POLICY "Allow all access to inventory_audits" ON inventory_audits FOR ALL USING (true) WITH CHECK (true);
END $$;
