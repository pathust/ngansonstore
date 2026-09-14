import { describe, it, expect, beforeEach } from 'vitest';
import { dbManager } from './db.js';
import { Order, Supplier, CashbookEntry, Product, AppUser } from '../src/types/index.js';

describe('DatabaseManager', () => {
  beforeEach(() => {
    // Reset internal cache to a clean, isolated state
    dbManager.resetForTesting();
  });

  describe('batchUpsertOrders', () => {
    it('thêm mới đơn hàng và cập nhật đơn hàng có sẵn mà không bị lệch index (Index Drift)', () => {
      // 1. Tạo đơn hàng ban đầu
      const initialOrder: Order = {
        id: 'ord-01',
        code: 'HD0001',
        customer_name: 'Khách Test 1',
        phone: '0901234567',
        items: [],
        total: 100000,
        discount: 0,
        final_amount: 100000,
        total_cost: 80000,
        profit: 20000,
        payment_method: 'CASH',
        created_at: '2026-09-01T10:00:00.000Z',
        status: 'COMPLETED',
        cashier: 'admin',
        branch: 'Chi nhánh chính',
      };
      dbManager.batchUpsertOrders([initialOrder]);

      expect(dbManager.getOrder('ord-01')).toBeDefined();
      expect(dbManager.getOrder('ord-01')?.customer_name).toBe('Khách Test 1');

      // 2. Batch gồm cả đơn hàng mới và cập nhật đơn hàng cũ
      const newOrder: Order = {
        id: 'ord-02',
        code: 'HD0002',
        customer_name: 'Khách Test 2',
        phone: '0909999999',
        items: [],
        total: 200000,
        discount: 0,
        final_amount: 200000,
        total_cost: 150000,
        profit: 50000,
        payment_method: 'TRANSFER',
        created_at: '2026-09-02T10:00:00.000Z',
        status: 'COMPLETED',
        cashier: 'admin',
        branch: 'Chi nhánh chính',
      };

      const updatedOrder1: Order = {
        ...initialOrder,
        customer_name: 'Khách Test 1 (Đã đổi tên)',
        final_amount: 120000,
      };

      // Đưa newOrder trước, updatedOrder1 sau trong cùng batch
      const result = dbManager.batchUpsertOrders([newOrder, updatedOrder1]);

      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.total).toBe(2);

      // Kiểm tra đơn hàng cũ đã được cập nhật đúng, không bị ghi đè nhầm sang record khác
      const fetched1 = dbManager.getOrder('ord-01');
      expect(fetched1?.customer_name).toBe('Khách Test 1 (Đã đổi tên)');
      expect(fetched1?.final_amount).toBe(120000);

      // Kiểm tra đơn hàng mới được tạo chính xác
      const fetched2 = dbManager.getOrder('ord-02');
      expect(fetched2?.customer_name).toBe('Khách Test 2');
      expect(fetched2?.final_amount).toBe(200000);
    });
  });

  describe('batchUpsertSuppliers', () => {
    it('thêm mới và cập nhật nhà cung cấp an toàn, không bị index drift', () => {
      const sup1: Supplier = {
        id: 'sup-01',
        code: 'NCC001',
        name: 'Nhà cung cấp A',
        phone: '0911111111',
        debt: 5000000,
        total_purchased: 10000000,
        status: 'ACTIVE',
      };
      dbManager.batchUpsertSuppliers([sup1]);

      const sup2: Supplier = {
        id: 'sup-02',
        code: 'NCC002',
        name: 'Nhà cung cấp B',
        phone: '0922222222',
        debt: 0,
        total_purchased: 2000000,
        status: 'ACTIVE',
      };

      const updatedSup1: Supplier = {
        ...sup1,
        debt: 3000000,
      };

      const result = dbManager.batchUpsertSuppliers([sup2, updatedSup1]);
      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(1);

      const allSups = dbManager.getSuppliers().items;
      const found1 = allSups.find((s) => s.id === 'sup-01');
      const found2 = allSups.find((s) => s.id === 'sup-02');

      expect(found1?.debt).toBe(3000000);
      expect(found2?.name).toBe('Nhà cung cấp B');
    });
  });

  describe('batchUpsertCashbook', () => {
    it('thêm mới và cập nhật sổ quỹ chính xác', () => {
      const cb1: CashbookEntry = {
        id: 'cb-01',
        code: 'PT001',
        type: 'IN',
        amount: 500000,
        category: 'Thu nợ khách hàng',
        note: 'Ghi chú 1',
        created_at: '2026-09-01T10:00:00.000Z',
        branch: 'Chi nhánh chính',
      };
      dbManager.batchUpsertCashbook([cb1]);

      const cb2: CashbookEntry = {
        id: 'cb-02',
        code: 'PC001',
        type: 'OUT',
        amount: 200000,
        category: 'Chi tiền nhập hàng',
        note: 'Ghi chú 2',
        created_at: '2026-09-02T10:00:00.000Z',
        branch: 'Chi nhánh chính',
      };

      const updatedCb1: CashbookEntry = {
        ...cb1,
        amount: 600000,
        note: 'Đã cập nhật số tiền',
      };

      const result = dbManager.batchUpsertCashbook([cb2, updatedCb1]);
      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(1);

      const allEntries = dbManager.getCashbook().items;
      const found1 = allEntries.find((c) => c.id === 'cb-01');
      const found2 = allEntries.find((c) => c.id === 'cb-02');

      expect(found1?.amount).toBe(600000);
      expect(found1?.note).toBe('Đã cập nhật số tiền');
      expect(found2?.amount).toBe(200000);
    });
  });

  describe('deleteOrder', () => {
    it('xóa đơn hàng và tùy chọn hoàn tồn kho sản phẩm', async () => {
      const prod: Product = {
        id: 'prod-01',
        sku: 'SP001',
        barcode: '8930001',
        name: 'Ống nhựa PVC',
        category: 'cat-ong',
        unit: 'Cây',
        cost_price: 50000,
        selling_price: 70000,
        stock: 10,
        min_stock: 5,
        status: 'ACTIVE',
      };
      dbManager.batchUpsertProducts([prod]);

      const order: Order = {
        id: 'ord-del',
        code: 'HD9999',
        customer_name: 'Khách Hủy',
        phone: '',
        items: [
          {
            product_id: 'prod-01',
            sku: 'SP001',
            name: 'Ống nhựa PVC',
            unit: 'Cây',
            quantity: 3,
            price: 70000,
            cost_price: 50000,
          },
        ],
        total: 210000,
        discount: 0,
        final_amount: 210000,
        total_cost: 150000,
        profit: 60000,
        payment_method: 'CASH',
        created_at: '2026-09-01T10:00:00.000Z',
        status: 'COMPLETED',
        cashier: 'admin',
        branch: 'Chi nhánh chính',
      };
      dbManager.batchUpsertOrders([order]);

      expect(dbManager.getOrder('ord-del')).toBeDefined();

      // Xóa với returnStock = true: tồn kho prod-01 tăng từ 10 lên 13
      const success = await dbManager.deleteOrder('ord-del', true);
      expect(success).toBe(true);
      expect(dbManager.getOrder('ord-del')).toBeUndefined();

      const updatedProd = dbManager.getProductById('prod-01');
      expect(updatedProd?.stock).toBe(13);
    });
  });

  describe('sanitizeUser', () => {
    it('không bao giờ để lộ mật khẩu trong getUsers hoặc saveUser', () => {
      const user: AppUser = {
        id: 'user-01',
        username: 'staff_test',
        password: 'SuperSecretPassword123!',
        name: 'Nhân viên A',
        role: 'STAFF',
        roleTitle: 'Nhân viên',
        email: 'staff@test.com',
        phone: '0933333333',
        avatar: '',
        permissions: {
          canViewReports: false,
          canManageProducts: false,
          canStockIn: false,
          canManageSuppliers: false,
          canManageCustomers: true,
          canAuditInventory: false,
          canBalanceAudit: false,
          canManageCashbook: false,
          canAccessDataCenter: false,
          canSellPOS: true,
          canViewInvoices: true,
          canDeleteInvoices: false,
          canEditSystemSettings: false,
          canManageUsers: false,
        },
        status: 'ACTIVE',
      };

      const saved = dbManager.saveUser(user);
      expect(saved.password).toBe('');

      const allUsers = dbManager.getUsers();
      const found = allUsers.find((u) => u.id === 'user-01');
      expect(found).toBeDefined();
      expect(found?.password).toBe('');
    });

    it('bảo vệ tài khoản ADMIN không cho phép xóa', () => {
      const adminUser: AppUser = {
        id: 'admin-01',
        username: 'admin_sys',
        password: 'AdminPassword123!',
        name: 'Quản trị viên',
        role: 'ADMIN',
        roleTitle: 'Quản trị viên',
        email: 'admin@test.com',
        phone: '0911223344',
        avatar: '',
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
        },
        status: 'ACTIVE',
      };
      dbManager.saveUser(adminUser);

      const deleted = dbManager.deleteUser('admin-01');
      expect(deleted).toBe(false);

      const allUsers = dbManager.getUsers();
      expect(allUsers.some((u) => u.id === 'admin-01')).toBe(true);
    });
  });
});
