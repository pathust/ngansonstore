-- ==============================================================================
-- MIGRATION: THÊM CỘT XÁC THỰC & ĐỒNG BỘ TÀI KHOẢN BẢNG APP_USERS
-- Dán mã SQL này vào mục "SQL Editor" trên Supabase Dashboard và bấm RUN
-- ==============================================================================

-- 1. Thêm các cột thực tế vào bảng app_users nếu chưa tồn tại
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Đảm bảo cột avatar có kiểu TEXT cho phép lưu trữ Data URL hoặc Web URL
ALTER TABLE app_users ALTER COLUMN avatar TYPE TEXT;

-- 3. Tạo index tìm kiếm nhanh theo username
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);

-- 4. Trích xuất dữ liệu từ trường JSONB permissions sang các cột thực tế (Backfill)
UPDATE app_users 
SET 
  username = COALESCE(
    permissions->>'_username', 
    CASE 
      WHEN id = 'user-admin-01' THEN 'tai'
      WHEN id = 'user-manager-01' THEN 'son'
      WHEN id = 'user-manager-02' THEN 'ngan'
      WHEN id = 'user-staff-01' THEN 'nhatphan'
      ELSE SPLIT_PART(email, '@', 1)
    END
  ),
  password = COALESCE(
    permissions->>'_password',
    CASE 
      WHEN id = 'user-admin-01' THEN 'admin123'
      WHEN id = 'user-manager-01' THEN 'minhson318vuquang'
      WHEN id = 'user-manager-02' THEN 'ngan318vuquang'
      WHEN id = 'user-staff-01' THEN 'minhnhat318vuquang'
      ELSE '123456'
    END
  ),
  status = CASE 
    WHEN is_active = false THEN 'LOCKED' 
    ELSE 'ACTIVE' 
  END,
  updated_at = NOW()
WHERE username IS NULL OR password IS NULL;

-- 5. Cập nhật và chuẩn hóa thông tin cho 4 tài khoản nòng cốt của Cửa hàng Ngân Sơn
-- Tài khoản 1: Phan Anh Tài (ADMIN)
INSERT INTO app_users (id, name, username, password, role, role_title, email, phone, avatar, bio, status, is_active, can_import_data, permissions, updated_at)
VALUES (
  'user-admin-01',
  'Phan Anh Tài',
  'tai',
  'admin123',
  'ADMIN',
  'Full Access Admin (Toàn quyền hệ thống)',
  'taiphananh28@gmail.com',
  '0912.345.678',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  'Chủ sở hữu & Quản trị viên cấp cao nhất - Cửa hàng Ngân Sơn',
  'ACTIVE',
  true,
  true,
  '{"canSellPOS":true,"canStockIn":true,"canImportData":true,"canManageUsers":true,"canViewReports":true,"canBalanceAudit":true,"canViewInvoices":true,"canAuditInventory":true,"canDeleteInvoices":true,"canManageCashbook":true,"canManageProducts":true,"canManageCustomers":true,"canManageSuppliers":true,"canAccessDataCenter":true,"canEditSystemSettings":true}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  can_import_data = EXCLUDED.can_import_data,
  role = EXCLUDED.role,
  role_title = EXCLUDED.role_title,
  updated_at = NOW();

-- Tài khoản 2: Phan Minh Sơn (MANAGER)
INSERT INTO app_users (id, name, username, password, role, role_title, email, phone, avatar, bio, status, is_active, can_import_data, permissions, updated_at)
VALUES (
  'user-manager-01',
  'Phan Minh Sơn',
  'son',
  'minhson318vuquang',
  'MANAGER',
  'Quản lý cửa hàng (Store Manager)',
  'sn.phanminh@gmail.com',
  '0977.334.455',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  'Quản lý cửa hàng - Giám sát vận hành, Báo cáo tài chính, Kiểm kê kho hàng',
  'ACTIVE',
  true,
  false,
  '{"canSellPOS":true,"canStockIn":true,"canImportData":false,"canManageUsers":false,"canViewReports":true,"canBalanceAudit":true,"canViewInvoices":true,"canAuditInventory":true,"canDeleteInvoices":false,"canManageCashbook":true,"canManageProducts":true,"canManageCustomers":true,"canManageSuppliers":true,"canAccessDataCenter":true,"canEditSystemSettings":false}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Tài khoản 3: Nguyễn Thị Ngân (MANAGER)
INSERT INTO app_users (id, name, username, password, role, role_title, email, phone, avatar, bio, status, is_active, can_import_data, permissions, updated_at)
VALUES (
  'user-manager-02',
  'Nguyễn Thị Ngân',
  'ngan',
  'ngan318vuquang',
  'MANAGER',
  'Quản lý cửa hàng (Store Manager)',
  'ngansonlv@gmail.com',
  '0988.112.233',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  'Quản lý cửa hàng - Phụ trách Báo cáo doanh thu, Kiểm kê kho, Sổ quỹ & Nhà cung cấp',
  'ACTIVE',
  true,
  false,
  '{"canSellPOS":true,"canStockIn":true,"canImportData":false,"canManageUsers":false,"canViewReports":true,"canBalanceAudit":true,"canViewInvoices":true,"canAuditInventory":true,"canDeleteInvoices":false,"canManageCashbook":true,"canManageProducts":true,"canManageCustomers":true,"canManageSuppliers":true,"canAccessDataCenter":true,"canEditSystemSettings":false}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Tài khoản 4: Phan Minh Nhật (STAFF)
INSERT INTO app_users (id, name, username, password, role, role_title, email, phone, avatar, bio, status, is_active, can_import_data, permissions, updated_at)
VALUES (
  'user-staff-01',
  'Phan Minh Nhật',
  'nhatphan',
  'minhnhat318vuquang',
  'STAFF',
  'Nhân viên bán hàng (Cashier / POS)',
  'nhatphanminh2711@gmail.com',
  '0966.556.677',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  'Nhân viên bán hàng tại quầy - Thực hiện giao dịch POS, thu tiền và in hóa đơn',
  'ACTIVE',
  true,
  false,
  '{"canSellPOS":true,"canStockIn":false,"canImportData":false,"canManageUsers":false,"canViewReports":false,"canBalanceAudit":false,"canViewInvoices":true,"canAuditInventory":false,"canDeleteInvoices":false,"canManageCashbook":false,"canManageProducts":false,"canManageCustomers":false,"canManageSuppliers":false,"canAccessDataCenter":false,"canEditSystemSettings":false}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
