import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Product,
  Category,
  Order,
  OrderTab,
  CartItem,
  InventoryAudit,
  CashbookEntry,
  Branch,
  ToastNotification,
  Supplier,
  Customer,
  DuplicateStrategy,
  ImportOrderResult,
  AppUser,
  StockInVoucherItem,
  StockInVoucher,
  StoreSettings,
} from '../types';
import { formatDateTime, parseDateToTimestamp, getCurrentVietnameseDateTime } from '../utils/formatters';
import { apiClient } from '../services/apiClient';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../services/supabase';
import { cacheManager } from '../services/cacheManager';
import { backgroundWorker } from '../services/backgroundWorker';
import confetti from 'canvas-confetti';

const INITIAL_STORE_SETTINGS: StoreSettings = {
  name: 'Cửa hàng Điện Nước & Kim Khí Ngân Sơn',
  shortName: 'Ngân Sơn Store',
  phone: '0912.345.678',
  address: '318 Vũ Quang, TP Hà Tĩnh',
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
  confirmedPriceAudits: {},
};

export const DEFAULT_APP_USERS: AppUser[] = [
  {
    id: 'user-admin-01',
    name: 'Phan Anh Tài',
    username: 'tai',
    password: 'admin123',
    role: 'ADMIN',
    roleTitle: 'Full Access Admin (Toàn quyền hệ thống)',
    email: 'taiphananh28@gmail.com',
    phone: '0912.345.678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    bio: 'Chủ sở hữu & Quản trị viên cấp cao nhất - Cửa hàng Ngân Sơn',
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
  },
  {
    id: 'user-manager-01',
    name: 'Phan Minh Sơn',
    username: 'son',
    password: 'minhson318vuquang',
    role: 'MANAGER',
    roleTitle: 'Quản lý cửa hàng (Store Manager)',
    email: 'sn.phanminh@gmail.com',
    phone: '0977.334.455',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    bio: 'Quản lý cửa hàng - Giám sát vận hành, Báo cáo tài chính, Kiểm kê kho hàng',
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
      canDeleteInvoices: false,
      canEditSystemSettings: false,
      canManageUsers: false,
      canImportData: false,
    },
  },
  {
    id: 'user-manager-02',
    name: 'Nguyễn Thị Ngân',
    username: 'ngan',
    password: 'ngan318vuquang',
    role: 'MANAGER',
    roleTitle: 'Quản lý cửa hàng (Store Manager)',
    email: 'ngansonlv@gmail.com',
    phone: '0988.112.233',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    bio: 'Quản lý cửa hàng - Phụ trách Báo cáo doanh thu, Kiểm kê kho, Sổ quỹ & Nhà cung cấp',
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
      canDeleteInvoices: false,
      canEditSystemSettings: false,
      canManageUsers: false,
      canImportData: false,
    },
  },
  {
    id: 'user-staff-01',
    name: 'Phan Minh Nhật',
    username: 'nhatphan',
    password: 'minhnhat318vuquang',
    role: 'STAFF',
    roleTitle: 'Nhân viên bán hàng (Cashier / POS)',
    email: 'nhatphanminh2711@gmail.com',
    phone: '0966.556.677',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    bio: 'Nhân viên bán hàng tại quầy - Thực hiện giao dịch POS, thu tiền và in hóa đơn',
    status: 'ACTIVE',
    permissions: {
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
  },
];

const FALLBACK_ADMIN_USER = DEFAULT_APP_USERS[0];

interface AppContextType {
  // User Management & Roles
  users: AppUser[];
  currentUser: AppUser;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  saveUser: (userData: Partial<AppUser> & { name: string }) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserLock: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (profileData: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>;
  switchUser: (userId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  isUserSwitcherOpen: boolean;
  setIsUserSwitcherOpen: (open: boolean) => void;
  isUserProfileOpen: boolean;
  setIsUserProfileOpen: (open: boolean) => void;
  isChangePasswordOpen: boolean;
  setIsChangePasswordOpen: (open: boolean) => void;

  // Navigation & Shell
  currentView: string;
  setCurrentView: (view: string) => void;
  currentBranch: Branch;
  setCurrentBranch: (branch: Branch) => void;
  branches: Branch[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Store Settings & QR Code Configuration
  storeSettings: StoreSettings;
  updateStoreSettings: (updates: Partial<StoreSettings>) => void;
  resetStoreSettings: () => void;

  // Products
  products: Product[];
  categories: Category[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  receiveStockWithWeightedCost: (productId: string, receivedQty: number, receivedCostPerUnit: number) => void;
  receiveStockVoucher: (payload: {
    supplier_id?: string;
    supplier_name?: string;
    payment_method?: 'CASH' | 'TRANSFER' | 'DEBT';
    note?: string;
    items: StockInVoucherItem[];
  }) => StockInVoucher;
  confirmProductPriceAudit: (productId: string) => void;
  unconfirmProductPriceAudit: (productId: string) => void;
  confirmAllProductPriceAudits: (productIds: string[]) => void;
  isPriceAuditConfirmed: (product: { id: string; cost_price: number; selling_price: number }) => boolean;

  // Suppliers (Nhà Cung Cấp)
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  importSuppliers: (newSuppliers: Partial<Supplier>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };

  // Customers (Khách Hàng)
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importCustomers: (newCustomers: Partial<Customer>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };

  // POS Multi-Tab Cart
  orderTabs: OrderTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  createNewTab: () => void;
  closeTab: (id: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, delta: number) => void;
  setCartItemQuantity: (productId: string, quantity: number) => void;
  setCartItemPrice: (productId: string, newPrice: number) => void;
  setCartItemDiscount: (productId: string, discountPercent: number) => void;
  removeFromCart: (productId: string) => void;
  clearActiveCart: () => void;
  updateActiveTabInfo: (updates: Partial<OrderTab>) => void;

  // Checkout & Orders
  orders: Order[];
  completeCheckout: (paymentMethod: 'CASH' | 'TRANSFER' | 'CARD', customerPaidAmount?: number) => Order | null;
  createOrderDirect: (
    orderData: Partial<Order>,
    duplicateStrategy?: 'OVERWRITE' | 'KEEP_BOTH' | 'ERROR',
    options?: { syncStock?: boolean; syncCashbook?: boolean }
  ) => Order | null;
  importOrders: (
    newOrders: Partial<Order>[],
    duplicateStrategy?: DuplicateStrategy,
    options?: { syncStock?: boolean; syncCashbook?: boolean }
  ) => ImportOrderResult;
  updateOrder: (
    orderId: string,
    updates: Partial<Order>,
    options?: { adjustStock?: boolean; adjustCashbook?: boolean }
  ) => void;
  cancelOrder: (orderId: string, returnStock?: boolean, reason?: string) => void;
  restoreOrder: (orderId: string) => void;
  deleteOrder: (orderId: string, returnStock?: boolean) => void;
  openOrderReceipt: (order: Order) => void;
  lastCompletedOrder: Order | null;
  setLastCompletedOrder: (order: Order | null) => void;
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: (open: boolean) => void;

  // Inventory Audits
  inventoryAudits: InventoryAudit[];
  createInventoryAudit: (auditor: string, items: any[], notes?: string, status?: 'DRAFT' | 'BALANCED') => InventoryAudit;
  balanceInventoryAudit: (auditId: string) => void;

  // Cashbook
  cashbookEntries: CashbookEntry[];
  addCashbookEntry: (entry: Omit<CashbookEntry, 'id' | 'code' | 'created_at' | 'branch'>) => CashbookEntry;
  deleteCashbookEntry: (id: string) => void;
  importCashbook: (newEntries: Partial<CashbookEntry>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };

  // Toasts
  toasts: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

  // Data Reset & Bulk Import & Backup
  importProducts: (newProducts: Partial<Product>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };
  importProductsProgressive: (
    newProducts: Partial<Product>[],
    overwrite?: boolean,
    onProgress?: (processed: number, total: number) => void
  ) => Promise<{ success: boolean; totalProcessed: number }>;
  exportAllDataAsBackup: () => void;
  restoreDataFromBackup: (jsonContent: string) => void;
  resetToDefaultData: () => void;
  resetToSampleData: () => void;
  clearAllData: () => void;

  // Backend Sync & Loading State (Mobile & Web Sync)
  syncState: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';
  isLoading: boolean;
  loadingMessage?: string;
  syncWithServer: (silent?: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFIX = 'omnierp_pro_';
const MOCK_CLEANED_FLAG = 'omnierp_cleaned_all_garbage_mock_v6';

export const safeStorageSet = (key: string, data: any, maxSlice?: number) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    localStorage.setItem(key, raw);
  } catch (err) {
    console.warn(`[Storage] Quota exceeded for key: ${key}`);
    if (maxSlice && Array.isArray(data) && data.length > maxSlice) {
      try {
        localStorage.setItem(key, JSON.stringify(data.slice(0, maxSlice)));
      } catch (innerErr) {
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      }
    }
  }
};

export const safeStorageGet = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Failed to read/parse key "${key}", falling back to default:`, err);
    return defaultValue;
  }
};

// One-time clear of legacy oversized localStorage caches to avoid QuotaExceededError
if (typeof window !== 'undefined' && !localStorage.getItem(MOCK_CLEANED_FLAG)) {
  try {
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'products');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'suppliers');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'orders');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'audits');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'cashbook');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'customers');
    localStorage.setItem(MOCK_CLEANED_FLAG, 'true');
  } catch (e) {}
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // User Management & Roles
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mergedDefaults = DEFAULT_APP_USERS.map((du) => {
            const f = parsed.find((p: AppUser) => p.id === du.id);
            return f
              ? {
                  ...du,
                  ...f,
                  username: f.username || du.username,
                  email: f.email || du.email,
                  password: f.password || du.password,
                }
              : du;
          });
          const customUsers = parsed.filter((p: AppUser) => !DEFAULT_APP_USERS.some((du) => du.id === p.id));
          return [...mergedDefaults, ...customUsers];
        }
      } catch (e) {}
    }
    return DEFAULT_APP_USERS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'is_authenticated');
      const authUserId = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'current_user_id');
      return isAuth === 'true' && !!authUserId;
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_PREFIX + 'current_user_id') : null;
    const found = users.find((u) => u.id === savedId) || users[0] || DEFAULT_APP_USERS[0];
    return found;
  });

  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return new URLSearchParams(window.location.search).get('modal') === 'users';
      } catch (e) {}
    }
    return false;
  });

  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const term = usernameOrEmail.trim().toLowerCase();
    // 1. Try server login
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: term, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        const found = users.find((u) => u.id === data.user.id) || (data.user as AppUser);
        setCurrentUser(found);
        setIsAuthenticated(true);
        safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'true');
        safeStorageSet(LOCAL_STORAGE_PREFIX + 'current_user_id', found.id);
        showToast(data.message || `Đăng nhập thành công! Chào mừng ${found.name}`, 'success');
        return { success: true };
      } else if (!data.success && res.status !== 500 && res.status !== 502 && res.status !== 503) {
        return { success: false, error: data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
      }
    } catch (e) {
      console.warn('[Auth] Server login failed, checking offline state:', e);
    }

    // 2. Offline fallback
    const localUser = users.find(
      (u) =>
        u.username?.toLowerCase() === term ||
        u.email?.toLowerCase() === term ||
        u.phone?.trim() === term ||
        u.name?.toLowerCase() === term
    );

    if (!localUser) {
      return { success: false, error: 'Tên đăng nhập hoặc tài khoản không tồn tại!' };
    }

    if (localUser.status === 'LOCKED') {
      return { success: false, error: 'Tài khoản này đã bị khóa. Vui lòng liên hệ Quản trị viên!' };
    }

    if (localUser.password && localUser.password !== password) {
      return { success: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' };
    }

    setCurrentUser(localUser);
    setIsAuthenticated(true);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'true');
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'current_user_id', localUser.id);
    showToast(`Đăng nhập thành công! Chào mừng ${localUser.name}`, 'success');
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'false');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'is_authenticated');
    showToast('Đã đăng xuất khỏi hệ thống an toàn!', 'info');
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Chưa có thông tin tài khoản' };
    if (newPassword.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự!' };
    }
    if (currentUser.password && currentUser.password !== oldPassword) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng!' };
    }

    const updatedUser: AppUser = { ...currentUser, password: newPassword, updatedAt: Date.now() };
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      await Promise.allSettled([
        fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, oldPassword, newPassword }),
        }),
        supabaseService.upsertUser(updatedUser),
      ]);
    } catch (e) {}

    showToast('Đổi mật khẩu thành công!', 'success');
    setIsChangePasswordOpen(false);
    return { success: true };
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền thực hiện thao tác này!' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự!' };
    }

    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, password: newPassword, updatedAt: Date.now() } : u));
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      const target = updatedUsers.find((u) => u.id === userId);
      await Promise.allSettled([
        fetch(`/api/users/${userId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword }),
        }),
        target ? supabaseService.upsertUser(target) : Promise.resolve(),
      ]);
    } catch (e) {}

    showToast('Đã đặt lại mật khẩu cho nhân viên thành công!', 'success');
    return { success: true };
  };

  const saveUser = async (userData: Partial<AppUser> & { name: string }): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền quản trị người dùng!' };
    }

    let savedUser: AppUser;
    const existingIndex = userData.id ? users.findIndex((u) => u.id === userData.id) : -1;
    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      savedUser = {
        ...existing,
        ...userData,
        username: userData.username?.trim() || existing.username || userData.email?.split('@')[0] || existing.email?.split('@')[0] || (existing.id === 'user-admin-01' ? 'tai' : existing.id === 'user-manager-01' ? 'son' : existing.id === 'user-manager-02' ? 'ngan' : existing.id === 'user-staff-01' ? 'nhatphan' : 'user'),
        password: userData.password?.trim() ? userData.password : existing.password,
        updatedAt: Date.now(),
      };
      const updatedList = [...users];
      updatedList[existingIndex] = savedUser;
      setUsers(updatedList);
      safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedList);
      if (currentUser.id === savedUser.id) {
        setCurrentUser(savedUser);
      }
    } else {
      const newId = userData.id || `user-${Date.now()}`;
      savedUser = {
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
      const updatedList = [...users, savedUser];
      setUsers(updatedList);
      safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedList);
    }

    try {
      await Promise.allSettled([
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedUser),
        }),
        supabaseService.upsertUser(savedUser),
      ]);
    } catch (e) {}

    showToast('Lưu thông tin người dùng thành công!', 'success');
    return { success: true, user: savedUser };
  };

  const toggleUserLock = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền quản lý người dùng!' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'Không tìm thấy tài khoản!' };
    if (target.role === 'ADMIN' || target.id === 'user-admin-01') {
      return { success: false, error: 'Không thể khóa tài khoản Quản trị viên cấp cao!' };
    }

    const newStatus: 'ACTIVE' | 'LOCKED' = target.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, status: newStatus, updatedAt: Date.now() } : u));
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      const updatedTarget = updatedUsers.find((u) => u.id === userId);
      await Promise.allSettled([
        fetch(`/api/users/${userId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }),
        updatedTarget ? supabaseService.upsertUser(updatedTarget) : Promise.resolve(),
      ]);
    } catch (e) {}

    showToast(newStatus === 'ACTIVE' ? `Đã mở khóa tài khoản ${target.name}` : `Đã khóa tài khoản ${target.name}`, 'info');
    return { success: true };
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền quản lý người dùng!' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'Không tìm thấy tài khoản!' };
    if (target.role === 'ADMIN' || target.id === 'user-admin-01') {
      return { success: false, error: 'Không thể xóa tài khoản Quản trị viên cấp cao!' };
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      await Promise.allSettled([
        fetch(`/api/users/${userId}`, { method: 'DELETE' }),
        supabaseService.deleteUser(userId),
      ]);
    } catch (e) {}

    showToast(`Đã xóa tài khoản ${target.name} thành công!`, 'success');
    return { success: true };
  };

  const updateUserProfile = async (profileData: Partial<AppUser>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Chưa có thông tin đăng nhập' };
    const updated: AppUser = { ...currentUser, ...profileData, updatedAt: Date.now() };
    setCurrentUser(updated);
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updated : u));
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      await Promise.allSettled([
        fetch(`/api/users/${currentUser.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        }),
        supabaseService.upsertUser(updated),
      ]);
    } catch (e) {}

    showToast('Cập nhật hồ sơ cá nhân thành công!', 'success');
    setIsUserProfileOpen(false);
    return { success: true };
  };

  const switchUser = async (userId: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const found = users.find((u) => u.id === userId);
    if (!found) return { success: false, error: 'Không tìm thấy người dùng' };
    if (found.status === 'LOCKED') {
      return { success: false, error: 'Tài khoản này đang bị khóa!' };
    }
    if (password !== undefined) {
      if (found.password && found.password !== password) {
        return { success: false, error: 'Mật khẩu không chính xác!' };
      }
    }
    setCurrentUser(found);
    setIsAuthenticated(true);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'true');
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'current_user_id', found.id);
    showToast(`Đã chuyển phiên làm việc sang: ${found.name} (${found.roleTitle})`, 'success');
    return { success: true };
  };

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', users);
  }, [users]);

  // Navigation
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        if (v) return v;
      } catch (e) {}
    }
    return 'products'; // Default to products / data
  });
  const [branches, setBranches] = useState<Branch[]>(() => {
    const parsed = safeStorageGet<Branch[]>(LOCAL_STORAGE_PREFIX + 'branches', []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [{ id: 'ngan-son-store', name: 'Cửa hàng Ngân Sơn', address: '318 Vũ Quang', phone: '0912.345.678', is_default: true }];
  });
  const [currentBranch, setCurrentBranch] = useState<Branch>(() => {
    const parsed = safeStorageGet<Branch | null>(LOCAL_STORAGE_PREFIX + 'current_branch', null);
    if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
    return { id: 'ngan-son-store', name: 'Cửa hàng Ngân Sơn', address: '318 Vũ Quang', phone: '0912.345.678', is_default: true };
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Store Settings & QR Code Config
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = safeStorageGet<Partial<StoreSettings> | null>(LOCAL_STORAGE_PREFIX + 'store_settings', null);
    if (saved && typeof saved === 'object') {
      return { ...INITIAL_STORE_SETTINGS, ...saved };
    }
    return INITIAL_STORE_SETTINGS;
  });

  const updateStoreSettings = (updates: Partial<StoreSettings>) => {
    setStoreSettings((prev) => {
      const next = { ...prev, ...updates };
      safeStorageSet(LOCAL_STORAGE_PREFIX + 'store_settings', next);
      apiClient.updateStoreSettings(next).catch((err) => {
        console.warn('[Settings] Failed to sync to server:', err);
        savePendingChange('settings', next);
      });
      return next;
    });
    showToast('Đã lưu thông tin cửa hàng & mã QR thành công!', 'success');
  };

  const resetStoreSettings = async () => {
    try {
      const fromDb = await supabaseService.getStoreSettings();
      if (fromDb) {
        setStoreSettings(fromDb);
        safeStorageSet(LOCAL_STORAGE_PREFIX + 'store_settings', fromDb);
        showToast('Đã làm mới cài đặt cửa hàng từ Supabase', 'info');
        return;
      }
    } catch {}
    setStoreSettings(INITIAL_STORE_SETTINGS);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'store_settings', INITIAL_STORE_SETTINGS);
    showToast('Đã khôi phục cài đặt cửa hàng', 'info');
  };

  // Products & Categories
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeStorageGet<Product[]>(LOCAL_STORAGE_PREFIX + 'products', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const parsed = safeStorageGet<Category[]>(LOCAL_STORAGE_PREFIX + 'categories', []);
    return Array.isArray(parsed) ? parsed : [];
  });

  // Suppliers (Nhà Cung Cấp)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = safeStorageGet<Supplier[]>(LOCAL_STORAGE_PREFIX + 'suppliers', []);
    return Array.isArray(saved) ? saved : [];
  });

  // Customers (Khách Hàng)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = safeStorageGet<Customer[]>(LOCAL_STORAGE_PREFIX + 'customers', []);
    return Array.isArray(saved) ? saved : [];
  });

  // Orders (mặc định sắp xếp giảm dần theo thời gian)
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = safeStorageGet<Order[]>(LOCAL_STORAGE_PREFIX + 'orders', []);
    const raw: Order[] = Array.isArray(saved) ? saved : [];
    return raw
      .map((o) => ({
        ...o,
        created_at: formatDateTime(o.created_at),
      }))
      .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
  });

  // Audits (sắp xếp giảm dần)
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>(() => {
    const saved = safeStorageGet<InventoryAudit[]>(LOCAL_STORAGE_PREFIX + 'audits', []);
    const raw: InventoryAudit[] = Array.isArray(saved) ? saved : [];
    return raw.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  });

  // Cashbook (sắp xếp giảm dần)
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>(() => {
    const saved = safeStorageGet<CashbookEntry[]>(LOCAL_STORAGE_PREFIX + 'cashbook', []);
    const raw: CashbookEntry[] = Array.isArray(saved) ? saved : [];
    return raw
      .map((c) => ({
        ...c,
        created_at: formatDateTime(c.created_at),
      }))
      .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
  });

  // POS Order Tabs
  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([
    {
      id: 'tab-1',
      title: 'Đơn 1',
      items: [],
      customer_name: 'Khách lẻ',
      customer_phone: '',
      discount_amount: 0,
      discount_type: 'AMOUNT',
      note: '',
      payment_method: 'CASH',
      customer_paid: 0,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Completed Order Modal
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Backend Sync & Loading State
  const [syncState, setSyncState] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('IDLE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const pendingChangesRef = React.useRef<any>({
    settings: null,
    products: [],
    orders: [],
    suppliers: [],
    customers: [],
    inventory_audits: [],
    cashbook: [],
  });

  React.useEffect(() => {
    const saved = localStorage.getItem('nganson_pending_sync');
    if (saved) {
      try {
        pendingChangesRef.current = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse pending sync:', e);
      }
    }
  }, []);

  const savePendingChange = (type: string, item: any) => {
    if (!item) return;
    if (type === 'settings') {
      pendingChangesRef.current.settings = item;
    } else {
      if (!pendingChangesRef.current[type]) {
        pendingChangesRef.current[type] = [];
      }
      const arr = pendingChangesRef.current[type];
      const idx = arr.findIndex((x: any) => x.id === item.id);
      if (idx >= 0) {
        arr[idx] = item;
      } else {
        arr.push(item);
      }
    }
    localStorage.setItem('nganson_pending_sync', JSON.stringify(pendingChangesRef.current));
  };

  function isDataEqual<T>(prev: T, next: T): boolean {
    if (prev === next) return true;
    if (!prev || !next) return false;
    if (Array.isArray(prev) && Array.isArray(next)) {
      if (prev.length !== next.length) return false;
      if (prev.length === 0 && next.length === 0) return true;
    }
    try {
      return JSON.stringify(prev) === JSON.stringify(next);
    } catch {
      return false;
    }
  }

  const lastSyncTimeRef = React.useRef<number>(0);

  // Initial Sync from Backend on App Mount & Differential Pull
  const syncWithServer = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setSyncState('SYNCING');
      }
      
      // Push pending changes first
      const pending = pendingChangesRef.current;
      const hasPending = pending.settings || Object.values(pending).some((arr: any) => Array.isArray(arr) && arr.length > 0);
      
      if (hasPending) {
        try {
          await apiClient.pushSync(pending);
          // Clear pending queue after successful push
          pendingChangesRef.current = {
            settings: null,
            products: [],
            orders: [],
            suppliers: [],
            customers: [],
            inventory_audits: [],
            cashbook: [],
          };
          localStorage.removeItem('nganson_pending_sync');
          console.log('[Sync] Successfully pushed pending changes');
        } catch (pushErr: unknown) {
          const message = pushErr instanceof Error ? pushErr.message : 'Unknown error';
          console.warn('[Sync] Failed to push pending changes (will retry next cycle):', message);
          // Do not throw pushErr to allow differential pull to proceed and prevent desync
        }
      }

      const payload = await apiClient.pullSync(0);
      if (payload) {
        if (payload.settings) {
          setStoreSettings((prev) => {
            const merged = { ...prev, ...payload.settings };
            if (isDataEqual(prev, merged)) return prev;
            safeStorageSet(LOCAL_STORAGE_PREFIX + 'store_settings', merged);
            return merged;
          });
        }
        if (payload.branches && payload.branches.length > 0) {
          setBranches((prev) => {
            if (isDataEqual(prev, payload.branches)) return prev;
            safeStorageSet(LOCAL_STORAGE_PREFIX + 'branches', payload.branches);
            return payload.branches!;
          });
          setCurrentBranch((prev) => {
            const found = payload.branches!.find((b) => b.id === prev?.id);
            const target = found || payload.branches!.find((b) => b.is_default) || payload.branches![0];
            if (prev && target && prev.id === target.id && isDataEqual(prev, target)) return prev;
            return target;
          });
        }
        if (payload.users && payload.users.length > 0) {
          setUsers((prev) => {
            const merged = payload.users!.map((pu) => {
              const prevUser = prev.find((p) => p.id === pu.id);
              const username = pu.username || prevUser?.username || (pu.id === 'user-admin-01' ? 'tai' : pu.id === 'user-manager-01' ? 'son' : pu.id === 'user-manager-02' ? 'ngan' : pu.id === 'user-staff-01' ? 'nhatphan' : pu.email ? pu.email.split('@')[0] : 'user');
              const password = pu.password || prevUser?.password || (username === 'tai' ? 'admin123' : username === 'son' ? 'minhson318vuquang' : username === 'ngan' ? 'ngan318vuquang' : 'minhnhat318vuquang');
              return {
                ...prevUser,
                ...pu,
                username,
                password,
              };
            });
            if (isDataEqual(prev, merged)) return prev;
            safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', merged);
            return merged;
          });
          setCurrentUser((prev) => {
            const found = payload.users!.find((u) => u.id === prev?.id);
            const target = found ? { ...prev, ...found, username: found.username || prev?.username } : (prev || payload.users![0]);
            if (prev && target && prev.id === target.id && isDataEqual(prev, target)) return prev;
            return target;
          });
        }
        if (payload.categories && payload.categories.length > 0) {
          setCategories((prev) => {
            if (isDataEqual(prev, payload.categories)) return prev;
            safeStorageSet(LOCAL_STORAGE_PREFIX + 'categories', payload.categories);
            return payload.categories!;
          });
        }
        if (payload.products && payload.products.length > 0) {
          setProducts((prev) => {
            if (isDataEqual(prev, payload.products)) return prev;
            cacheManager.set('products', payload.products);
            return payload.products!;
          });
        }
        if (payload.orders) {
          setOrders((prev) => {
            if (isDataEqual(prev, payload.orders)) return prev;
            cacheManager.set('orders', payload.orders);
            return payload.orders!;
          });
        }
        if (payload.suppliers) {
          setSuppliers((prev) => {
            if (isDataEqual(prev, payload.suppliers)) return prev;
            cacheManager.set('suppliers', payload.suppliers);
            return payload.suppliers!;
          });
        }
        if (payload.customers) {
          setCustomers((prev) => {
            if (isDataEqual(prev, payload.customers)) return prev;
            cacheManager.set('customers', payload.customers);
            return payload.customers!;
          });
        }
        if (payload.inventory_audits) {
          setInventoryAudits((prev) => {
            if (isDataEqual(prev, payload.inventory_audits)) return prev;
            cacheManager.set('audits', payload.inventory_audits);
            return payload.inventory_audits!;
          });
        }
        if (payload.cashbook) {
          setCashbookEntries((prev) => {
            if (isDataEqual(prev, payload.cashbook)) return prev;
            cacheManager.set('cashbook', payload.cashbook);
            return payload.cashbook!;
          });
        }
      }
      // Direct pull from Supabase Cloud to ensure real-time multi-device user and avatar sync
      try {
        const supaUsers = await supabaseService.getUsers();
        if (supaUsers && supaUsers.length > 0) {
          setUsers((prev) => {
            const merged = [...prev];
            supaUsers.forEach((su) => {
              const idx = merged.findIndex((u) => u.id === su.id);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...su };
              } else {
                merged.push(su);
              }
            });
            if (isDataEqual(prev, merged)) return prev;
            safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', merged);
            return merged;
          });
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const found = supaUsers.find((u) => u.id === prev.id);
            if (!found) return prev;
            const target = { ...prev, ...found };
            if (isDataEqual(prev, target)) return prev;
            return target;
          });
        }
      } catch (supaErr) {
        console.warn('[Sync] Direct Supabase users pull warning:', supaErr);
      }

      setSyncState('IDLE');
      lastSyncTimeRef.current = Date.now();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[Sync] Server sync warning:', message);
      // If server is not responding, fallback to local offline mode
      setSyncState(navigator.onLine ? 'ERROR' : 'OFFLINE');
    }
  };

  useEffect(() => {
    // Initial fetch from backend (visual loading state)
    syncWithServer(false);

    // Periodic sync every 60 seconds (silent background fallback)
    const periodicInterval = setInterval(() => {
      if (navigator.onLine) {
        syncWithServer(true);
      }
    }, 60000);

    // Realtime Supabase live-listener for instant updates with 600ms debounce (silent)
    let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeRealtime = supabaseService.subscribeRealtime((table, eventType) => {
      console.log(`[Supabase Realtime] Event: ${eventType} on table: ${table}`);
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      realtimeDebounceTimer = setTimeout(() => {
        syncWithServer(true);
      }, 600);
    });

    // Online / Offline listeners & Window Focus
    const handleOnline = () => {
      setSyncState('IDLE');
      syncWithServer(true);
    };
    const handleOffline = () => setSyncState('OFFLINE');
    const handleFocus = () => {
      // Throttle window focus sync to at most once every 45 seconds to avoid wiping forms on alt-tab
      if (navigator.onLine && Date.now() - lastSyncTimeRef.current > 45000) {
        syncWithServer(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(periodicInterval);
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      unsubscribeRealtime();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // LocalStorage Synchronization & Server Push (debounced)
  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'products', products, 300);
    cacheManager.set('products', products);
  }, [products]);

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'orders', orders, 100);
    cacheManager.set('orders', orders);
  }, [orders]);

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'audits', inventoryAudits, 50);
    cacheManager.set('audits', inventoryAudits);
  }, [inventoryAudits]);

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'cashbook', cashbookEntries, 100);
    cacheManager.set('cashbook', cashbookEntries);
  }, [cashbookEntries]);

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'suppliers', suppliers);
    cacheManager.set('suppliers', suppliers);
  }, [suppliers]);

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'customers', customers, 300);
    cacheManager.set('customers', customers);
  }, [customers]);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newToast: ToastNotification = { id, message, type, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Supplier Actions
  const addSupplier = (supplierData: Omit<Supplier, 'id'>): Supplier => {
    const newSup: Supplier = {
      ...supplierData,
      id: 'sup-' + Date.now(),
      code: supplierData.code?.trim() || `NCC${String(suppliers.length + 1).padStart(6, '0')}`,
      status: supplierData.status || 'ACTIVE',
      debt: supplierData.debt || 0,
      total_purchased: supplierData.total_purchased || 0,
      created_at: supplierData.created_at || new Date().toISOString().slice(0, 10),
    };
    setSuppliers((prev) => [newSup, ...prev]);
    apiClient.createSupplier(newSup).catch((err) => {
      console.warn('[Supplier] Sync create failed:', err);
      savePendingChange('suppliers', newSup);
    });
    showToast(`Đã thêm nhà cung cấp: ${newSup.name}`, 'success');
    return newSup;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    apiClient.updateSupplier(id, updates).catch((err) => {
      console.warn('[Supplier] Sync update failed:', err);
      // Can't reconstruct full supplier here easily without looking it up, but updates contains id?
      // Let's use the updated supplier from state. Actually, in updateSupplier, we have `updates` and `id`.
      // Since we just mapped it in setSuppliers, we can save the merged item.
      const sup = suppliers.find((s) => s.id === id);
      if (sup) savePendingChange('suppliers', { ...sup, ...updates, id });
    });
    showToast('Đã cập nhật thông tin nhà cung cấp', 'success');
  };

  const deleteSupplier = (id: string) => {
    const sup = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    apiClient.deleteSupplier(id).catch((err) => console.warn('[Supplier] Sync delete failed:', err));
    showToast(`Đã xóa nhà cung cấp: ${sup?.name || id}`, 'info');
  };

  // Bulk Supplier Import
  const importSuppliers = (
    newSuppliers: Partial<Supplier>[],
    overwrite: boolean = false
  ) => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Nhà cung cấp!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    setSuppliers((prev) => {
      const supMap = overwrite
        ? new Map<string, Supplier>()
        : new Map<string, Supplier>(prev.map((s) => [s.code.trim().toLowerCase(), s]));

      newSuppliers.forEach((item, idx) => {
        if (!item.name && !item.code) return;
        const codeKey = (item.code || `NCC${String(prev.length + idx + 1).padStart(6, '0')}`).trim().toLowerCase();
        const existing = supMap.get(codeKey);

        if (existing) {
          supMap.set(codeKey, {
            ...existing,
            ...item,
            id: existing.id,
            code: item.code ? item.code.trim() : existing.code,
            name: item.name ? item.name.trim() : existing.name,
            phone: item.phone !== undefined ? item.phone : existing.phone,
            email: item.email !== undefined ? item.email : existing.email,
            address: item.address !== undefined ? item.address : existing.address,
            ward: item.ward !== undefined ? item.ward : existing.ward,
            district_city: item.district_city !== undefined ? item.district_city : existing.district_city,
            tax_code: item.tax_code !== undefined ? item.tax_code : existing.tax_code,
            id_card: item.id_card !== undefined ? item.id_card : existing.id_card,
            group: item.group !== undefined ? item.group : existing.group,
            debt: item.debt !== undefined ? item.debt : existing.debt,
            total_purchased: item.total_purchased !== undefined ? item.total_purchased : existing.total_purchased,
            note: item.note !== undefined ? item.note : existing.note,
            status: item.status || existing.status,
            company: item.company !== undefined ? item.company : existing.company,
            created_by: item.created_by || existing.created_by,
            created_at: item.created_at || existing.created_at,
          });
          updated++;
        } else {
          const newId = 'sup-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const newSup: Supplier = {
            id: newId,
            code: item.code ? item.code.trim() : `NCC${String(prev.length + inserted + 1).padStart(6, '0')}`,
            name: item.name ? item.name.trim() : `Nhà cung cấp ${codeKey}`,
            phone: item.phone ? String(item.phone).trim() : '',
            email: item.email ? String(item.email).trim() : '',
            address: item.address ? String(item.address).trim() : '',
            ward: item.ward ? String(item.ward).trim() : '',
            district_city: item.district_city ? String(item.district_city).trim() : '',
            tax_code: item.tax_code ? String(item.tax_code).trim() : '',
            id_card: item.id_card ? String(item.id_card).trim() : '',
            group: item.group ? String(item.group).trim() : 'Nhà phân phối',
            debt: item.debt !== undefined ? item.debt : 0,
            total_purchased: item.total_purchased !== undefined ? item.total_purchased : 0,
            note: item.note ? String(item.note).trim() : '',
            status: item.status || 'ACTIVE',
            company: item.company ? String(item.company).trim() : (item.name || ''),
            created_by: item.created_by || 'Admin',
            created_at: item.created_at || new Date().toISOString().slice(0, 10),
          };
          supMap.set(codeKey, newSup);
          inserted++;
        }
      });

      const updatedList = Array.from(supMap.values());
      return updatedList;
    });

    showToast(`Nhập dữ liệu nhà cung cấp thành công: Thêm mới ${inserted}, Cập nhật ${updated}`, 'success');
    return { inserted, updated, skipped };
  };

  // Customer Actions
  const addCustomer = (customerData: Omit<Customer, 'id'>): Customer => {
    const newCust: Customer = {
      ...customerData,
      id: 'cust-' + Date.now(),
      code: customerData.code?.trim() || `KH${String(customers.length + 1).padStart(7, '0')}`,
      status: customerData.status || 1,
      debt: customerData.debt || 0,
      total_purchased: customerData.total_purchased || 0,
      customer_type: customerData.customer_type || 'Cá nhân',
      created_at: customerData.created_at || new Date().toISOString().slice(0, 10),
    };
    setCustomers((prev) => [newCust, ...prev]);
    apiClient.createCustomer(newCust).catch((err) => {
      console.warn('[Customer] Sync create failed:', err);
      savePendingChange('customers', newCust);
    });
    showToast(`Đã thêm khách hàng mới: ${newCust.name}`, 'success');
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    apiClient.updateCustomer(id, updates).catch((err) => {
      console.warn('[Customer] Sync update failed:', err);
      const cust = customers.find((c) => c.id === id);
      if (cust) savePendingChange('customers', { ...cust, ...updates, id });
    });
    showToast('Đã cập nhật thông tin khách hàng', 'success');
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    apiClient.deleteCustomer(id).catch((err) => console.warn('[Customer] Sync delete failed:', err));
    showToast(`Đã xóa khách hàng: ${cust?.name || id}`, 'info');
  };

  // Bulk Customer Import (Supports Excel columns: Loại khách, Chi nhánh, Mã khách hàng, Tên khách hàng, Điện thoại, Địa chỉ, Khu vực, Phường/Xã, Giới tính, Mã số thuế, CMND/CCCD, Email, Nhóm khách hàng, Người tạo, Ngày tạo, Nợ hiện tại, Tổng mua, Ghi chú, Trạng thái)
  const importCustomers = (
    newCustomers: Partial<Customer>[],
    overwrite: boolean = false
  ) => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Khách hàng!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    setCustomers((prev) => {
      const custMap = overwrite
        ? new Map<string, Customer>()
        : new Map<string, Customer>(prev.map((c) => [c.code.trim().toLowerCase(), c]));

      newCustomers.forEach((item, idx) => {
        if (!item.name && !item.code) return;
        const codeKey = (item.code || `KH${String(prev.length + idx + 1).padStart(7, '0')}`).trim().toLowerCase();
        const existing = custMap.get(codeKey);

        if (existing) {
          custMap.set(codeKey, {
            ...existing,
            ...item,
            id: existing.id,
            code: item.code ? item.code.trim() : existing.code,
            name: item.name ? item.name.trim() : existing.name,
            phone: item.phone !== undefined ? item.phone : existing.phone,
            email: item.email !== undefined ? item.email : existing.email,
            address: item.address !== undefined ? item.address : existing.address,
            ward: item.ward !== undefined ? item.ward : existing.ward,
            district_city: item.district_city !== undefined ? item.district_city : existing.district_city,
            tax_code: item.tax_code !== undefined ? item.tax_code : existing.tax_code,
            id_card: item.id_card !== undefined ? item.id_card : existing.id_card,
            gender: item.gender !== undefined ? item.gender : existing.gender,
            group: item.group !== undefined ? item.group : existing.group,
            customer_type: item.customer_type || existing.customer_type || 'Cá nhân',
            debt: item.debt !== undefined ? item.debt : existing.debt,
            total_purchased: item.total_purchased !== undefined ? item.total_purchased : existing.total_purchased,
            note: item.note !== undefined ? item.note : existing.note,
            status: item.status !== undefined ? item.status : existing.status,
            branch: item.branch || existing.branch,
            created_by: item.created_by || existing.created_by,
            created_at: item.created_at || existing.created_at,
          });
          updated++;
        } else {
          const newId = 'cust-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const newCust: Customer = {
            id: newId,
            code: item.code ? item.code.trim() : `KH${String(prev.length + inserted + 1).padStart(7, '0')}`,
            name: item.name ? item.name.trim() : `Khách hàng ${codeKey}`,
            phone: item.phone ? String(item.phone).trim() : '',
            email: item.email ? String(item.email).trim() : '',
            address: item.address ? String(item.address).trim() : '',
            ward: item.ward ? String(item.ward).trim() : '',
            district_city: item.district_city ? String(item.district_city).trim() : '',
            tax_code: item.tax_code ? String(item.tax_code).trim() : '',
            id_card: item.id_card ? String(item.id_card).trim() : '',
            gender: item.gender ? String(item.gender).trim() : '',
            group: item.group ? String(item.group).trim() : 'Khách lẻ',
            customer_type: item.customer_type || 'Cá nhân',
            debt: item.debt !== undefined ? item.debt : 0,
            total_purchased: item.total_purchased !== undefined ? item.total_purchased : 0,
            note: item.note ? String(item.note).trim() : '',
            status: item.status !== undefined ? item.status : 1,
            branch: item.branch ? String(item.branch).trim() : currentBranch.name,
            created_by: item.created_by || currentUser.name,
            created_at: item.created_at || new Date().toISOString().slice(0, 10),
          };
          custMap.set(codeKey, newCust);
          inserted++;
        }
      });

      return Array.from(custMap.values());
    });

    showToast(`Nhập danh sách khách hàng thành công: Thêm mới ${inserted}, Cập nhật ${updated}`, 'success');
    return { inserted, updated, skipped };
  };

  // Product Actions
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const cleanSku = productData.sku?.trim().toLowerCase();
    const cleanBarcode = productData.barcode?.trim();
    const cleanName = productData.name?.trim().toLowerCase();

    // Intelligent duplicate check: Matches SKU, Barcode, or exact Name
    const existing = products.find((p) => {
      if (cleanSku && p.sku && p.sku.trim().toLowerCase() === cleanSku) return true;
      if (cleanBarcode && p.barcode && cleanBarcode !== '' && p.barcode.trim() === cleanBarcode) return true;
      if (cleanName && p.name && p.name.trim().toLowerCase() === cleanName) return true;
      return false;
    });

    if (existing) {
      const incomingStock = Math.max(0, productData.stock || 0);
      const incomingCost = productData.cost_price !== undefined && productData.cost_price > 0 ? productData.cost_price : existing.cost_price;
      const currentStock = Math.max(0, existing.stock);
      const currentCost = existing.cost_price;
      const newTotalStock = currentStock + incomingStock;
      const newWeightedCost = newTotalStock > 0
        ? Math.round((currentStock * currentCost + incomingStock * incomingCost) / newTotalStock)
        : incomingCost;

      const updatedProd: Product = {
        ...existing,
        stock: newTotalStock,
        cost_price: newWeightedCost,
        selling_price: productData.selling_price > 0 ? productData.selling_price : existing.selling_price,
        unit: productData.unit || existing.unit,
        category: productData.category || existing.category,
        min_stock: productData.min_stock !== undefined ? productData.min_stock : existing.min_stock,
        last_received_date: incomingStock > 0 ? new Date().toISOString().slice(0, 10) : existing.last_received_date,
      };

      setProducts((prev) => prev.map((p) => (p.id === existing.id ? updatedProd : p)));
      apiClient.updateProduct(existing.id, updatedProd).catch((err) => {
      console.warn('[Product] Sync update failed:', err);
      savePendingChange('products', updatedProd);
    });

      // Ghi nhận phiếu chi Sổ quỹ nếu có nhập thêm hàng hóa kèm chi phí
      if (incomingStock > 0 && incomingCost > 0) {
        addCashbookEntry({
          type: 'OUT',
          amount: incomingStock * incomingCost,
          category: 'Chi tiền nhập hàng hóa',
          note: `Nhập gộp kho ${incomingStock} ${existing.unit} ${existing.name} (Giá nhập: ${incomingCost.toLocaleString('vi-VN')} đ)`,
          ref_code: `NK-${Date.now().toString().slice(-6)}`,
        });
      }

      showToast(
        `⚠️ Sản phẩm "${existing.name}" (Mã: ${existing.sku}) đã tồn tại trong danh mục! Đã tự động gộp vào sản phẩm có sẵn (+${incomingStock} ${existing.unit}) và tính lại giá vốn bình quân (${newWeightedCost.toLocaleString('vi-VN')} đ).`,
        'warning'
      );
      return updatedProd;
    }

    const newProd: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      status: productData.status || 'ACTIVE',
      image: productData.image || '',
    };
    setProducts((prev) => [newProd, ...prev]);
    apiClient.createProduct(newProd).catch((err) => {
      console.warn('[Product] Sync create failed:', err);
      savePendingChange('products', newProd);
    });
    showToast(`Đã thêm sản phẩm mới: ${newProd.name}`, 'success');
    return newProd;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    apiClient.updateProduct(id, updates).catch((err) => {
      console.warn('[Product] Sync update failed:', err);
      savePendingChange('products', updates);
    });
    showToast('Đã cập nhật thông tin sản phẩm', 'success');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    apiClient.deleteProduct(id).catch((err) => console.warn('[Product] Sync delete failed:', err));
    showToast(`Đã xóa sản phẩm: ${prod?.name || id}`, 'info');
  };

  /**
   * Tính toán giá vốn bình quân gia quyền tự động khi nhập hàng:
   * Giá vốn mới = (Tồn cũ * Giá vốn cũ + Số lượng nhập * Giá nhập) / (Tồn cũ + Số lượng nhập)
   */
  const receiveStockWithWeightedCost = (
    productId: string,
    receivedQty: number,
    receivedCostPerUnit: number
  ) => {
    if (receivedQty <= 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentStock = Math.max(0, p.stock);
        const currentCost = p.cost_price;
        const totalValue = currentStock * currentCost + receivedQty * receivedCostPerUnit;
        const newTotalStock = currentStock + receivedQty;
        const newWeightedCost = Math.round(totalValue / newTotalStock);

        return {
          ...p,
          stock: newTotalStock,
          cost_price: newWeightedCost,
          last_received_date: new Date().toISOString().slice(0, 10),
        };
      })
    );

    // Sync updated stock & cost to server
    const targetProd = products.find((p) => p.id === productId);
    if (targetProd) {
      const currentStock = Math.max(0, targetProd.stock);
      const currentCost = targetProd.cost_price;
      const totalValue = currentStock * currentCost + receivedQty * receivedCostPerUnit;
      const newTotalStock = currentStock + receivedQty;
      const newWeightedCost = Math.round(totalValue / newTotalStock);
      const todayStr = new Date().toISOString().slice(0, 10);
      apiClient.updateProduct(productId, {
        stock: newTotalStock,
        cost_price: newWeightedCost,
        last_received_date: todayStr,
      }).catch((err) => {
        console.warn('[StockIn] Update product sync failed:', err);
      });
    }

    // Ghi nhận phiếu chi nhập hàng vào Sổ quỹ
    const product = products.find((p) => p.id === productId);
    const totalAmount = receivedQty * receivedCostPerUnit;
    addCashbookEntry({
      type: 'OUT',
      amount: totalAmount,
      category: 'Chi tiền nhập hàng hóa',
      note: `Nhập ${receivedQty} ${product?.unit || 'sp'} ${product?.name} (Giá nhập: ${receivedCostPerUnit.toLocaleString('vi-VN')} đ)`,
      ref_code: `NK-${Date.now().toString().slice(-6)}`,
    });

    showToast(
      `Đã nhập kho ${receivedQty} sản phẩm. Giá vốn bình quân mới đã được cập nhật!`,
      'success'
    );
  };

  /**
   * Nhập kho nhiều sản phẩm theo phiếu (Stock-in Voucher):
   * Tự động tạo sản phẩm mới nếu chưa có, tự động nhận diện và gộp vào kho chung nếu đã tồn tại,
   * tính lại giá vốn bình quân gia quyền cho từng mặt hàng và hạch toán Sổ Quỹ + Công Nợ.
   */
  const receiveStockVoucher = (payload: {
    supplier_id?: string;
    supplier_name?: string;
    payment_method?: 'CASH' | 'TRANSFER' | 'DEBT';
    note?: string;
    items: StockInVoucherItem[];
  }): StockInVoucher => {
    const voucherCode = `NK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const paymentMethod = payload.payment_method || 'CASH';

    let totalQty = 0;
    let totalAmt = 0;
    let newlyCreatedCount = 0;
    let mergedCount = 0;
    const modifiedProducts: Product[] = [];

    setProducts((prev) => {
      const idMap = new Map<string, Product>();
      const skuMap = new Map<string, Product>();
      const barcodeMap = new Map<string, Product>();
      const nameMap = new Map<string, Product>();

      prev.forEach((p) => {
        idMap.set(p.id, p);
        if (p.sku) skuMap.set(p.sku.trim().toLowerCase(), p);
        if (p.barcode) barcodeMap.set(p.barcode.trim(), p);
        if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
      });

      const updatedList = [...prev];

      payload.items.forEach((item) => {
        const qty = Math.max(1, item.quantity || 1);
        const cost = Math.max(0, item.cost_price || 0);
        totalQty += qty;
        totalAmt += qty * cost;

        const cleanSku = item.sku?.trim().toLowerCase();
        const cleanBarcode = item.barcode?.trim();
        const cleanName = item.name?.trim().toLowerCase();

        // Check if item matches existing product
        let existing: Product | undefined = undefined;
        if (item.product_id && idMap.has(item.product_id)) {
          existing = idMap.get(item.product_id);
        } else if (cleanSku && skuMap.has(cleanSku)) {
          existing = skuMap.get(cleanSku);
        } else if (cleanBarcode && cleanBarcode !== '' && barcodeMap.has(cleanBarcode)) {
          existing = barcodeMap.get(cleanBarcode);
        } else if (cleanName && nameMap.has(cleanName)) {
          existing = nameMap.get(cleanName);
        }

        if (existing) {
          // Merged with existing product
          mergedCount++;
          const currentStock = Math.max(0, existing.stock);
          const currentCost = existing.cost_price;
          const newTotalStock = currentStock + qty;
          const newWeightedCost = newTotalStock > 0
            ? Math.round((currentStock * currentCost + qty * cost) / newTotalStock)
            : cost;

          const updatedProd: Product = {
            ...existing,
            stock: newTotalStock,
            cost_price: newWeightedCost,
            selling_price: item.selling_price && item.selling_price > 0 ? item.selling_price : existing.selling_price,
            unit: item.unit || existing.unit,
            last_received_date: todayStr,
          };

          const idx = updatedList.findIndex((p) => p.id === existing!.id);
          if (idx >= 0) {
            updatedList[idx] = updatedProd;
          }
          idMap.set(updatedProd.id, updatedProd);
          if (updatedProd.sku) skuMap.set(updatedProd.sku.trim().toLowerCase(), updatedProd);
          if (updatedProd.barcode) barcodeMap.set(updatedProd.barcode.trim(), updatedProd);
          modifiedProducts.push(updatedProd);
        } else {
          // Brand new product creation on the fly
          newlyCreatedCount++;
          const newId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const newSku = item.sku?.trim() || `SP-${Date.now().toString().slice(-4)}${newlyCreatedCount}`;
          const newBarcode = item.barcode?.trim() || `893600${Math.floor(100000 + Math.random() * 900000)}`;
          const newSelling = item.selling_price && item.selling_price > 0 ? item.selling_price : Math.round(cost * 1.25 || 10000);

          const newProd: Product = {
            id: newId,
            sku: newSku,
            barcode: newBarcode,
            name: item.name.trim(),
            category: item.category || 'cat-electronics',
            unit: item.unit || 'Cái',
            cost_price: cost,
            selling_price: newSelling,
            stock: qty,
            min_stock: item.min_stock || 5,
            status: 'ACTIVE',
            last_received_date: todayStr,
          };

          updatedList.unshift(newProd);
          idMap.set(newProd.id, newProd);
          skuMap.set(newProd.sku.trim().toLowerCase(), newProd);
          barcodeMap.set(newProd.barcode.trim(), newProd);
          nameMap.set(newProd.name.trim().toLowerCase(), newProd);
          modifiedProducts.push(newProd);
        }
      });

      return updatedList;
    });

    // Sync all modified/created products to server & Supabase
    if (modifiedProducts.length > 0) {
      apiClient.batchUpsertProducts(modifiedProducts, 'OVERWRITE').catch((err) => {
        console.warn('[Stock Voucher] Batch upsert products failed:', err);
      });
    }

    // Cashbook entry
    if (paymentMethod !== 'DEBT' && totalAmt > 0) {
      addCashbookEntry({
        type: 'OUT',
        amount: totalAmt,
        category: 'Chi tiền nhập hàng hóa',
        note: `Chi thanh toán phiếu nhập kho ${voucherCode} (${payload.supplier_name || 'Nhà cung cấp'})`,
        ref_code: voucherCode,
      });
    }

    // Supplier debt / total purchased
    if (payload.supplier_id || payload.supplier_name) {
      setSuppliers((prev) =>
        prev.map((s) => {
          const match =
            (payload.supplier_id && s.id === payload.supplier_id) ||
            (payload.supplier_name && s.name.toLowerCase() === payload.supplier_name.toLowerCase());
          if (!match) return s;
          return {
            ...s,
            total_purchased: s.total_purchased + totalAmt,
            debt: paymentMethod === 'DEBT' ? s.debt + totalAmt : s.debt,
          };
        })
      );
    }

    const voucher: StockInVoucher = {
      id: 'voucher-' + Date.now(),
      code: voucherCode,
      date: todayStr,
      supplier_id: payload.supplier_id,
      supplier_name: payload.supplier_name,
      items: payload.items,
      total_quantity: totalQty,
      total_amount: totalAmt,
      payment_method: paymentMethod,
      note: payload.note,
      created_by: currentUser.name,
      branch: currentBranch.name,
    };

    let toastMsg = `Nhập kho ${voucherCode} thành công! (${payload.items.length} mặt hàng, ${totalQty} sp, ${totalAmt.toLocaleString('vi-VN')} đ)`;
    if (newlyCreatedCount > 0) toastMsg += ` | Thêm mới: ${newlyCreatedCount} SP`;
    if (mergedCount > 0) toastMsg += ` | Gộp kho chung: ${mergedCount} SP`;

    showToast(toastMsg, 'success');
    return voucher;
  };

  // Price Audit Confirmation Handlers
  const confirmProductPriceAudit = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const currentMap = storeSettings.confirmedPriceAudits || {};
    const nextMap = {
      ...currentMap,
      [productId]: {
        cost_price: Number(prod.cost_price || 0),
        selling_price: Number(prod.selling_price || 0),
        confirmed_at: new Date().toISOString(),
        confirmed_by: currentUser?.name || 'Quản lý',
      },
    };
    updateStoreSettings({ confirmedPriceAudits: nextMap });
    showToast(`Đã duyệt giá sản phẩm "${prod.name}" là hợp lệ`, 'success');
  };

  const unconfirmProductPriceAudit = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const currentMap = storeSettings.confirmedPriceAudits || {};
    if (!currentMap[productId]) return;
    const nextMap = { ...currentMap };
    delete nextMap[productId];
    updateStoreSettings({ confirmedPriceAudits: nextMap });
    showToast(`Đã hủy duyệt giá sản phẩm "${prod ? prod.name : productId}"`, 'info');
  };

  const confirmAllProductPriceAudits = (productIds: string[]) => {
    if (!productIds.length) return;
    const currentMap = { ...(storeSettings.confirmedPriceAudits || {}) };
    let count = 0;
    for (const id of productIds) {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        currentMap[id] = {
          cost_price: Number(prod.cost_price || 0),
          selling_price: Number(prod.selling_price || 0),
          confirmed_at: new Date().toISOString(),
          confirmed_by: currentUser?.name || 'Quản lý',
        };
        count++;
      }
    }
    updateStoreSettings({ confirmedPriceAudits: currentMap });
    showToast(`Đã duyệt giá hợp lệ cho ${count} sản phẩm!`, 'success');
  };

  const isPriceAuditConfirmed = (product: { id: string; cost_price: number; selling_price: number }): boolean => {
    if (!product || !product.id) return false;
    const record = storeSettings.confirmedPriceAudits?.[product.id];
    if (!record) return false;
    return (
      Number(record.cost_price) === Number(product.cost_price || 0) &&
      Number(record.selling_price) === Number(product.selling_price || 0)
    );
  };

  // Multi-Tab POS Cart Actions
  const activeTab = orderTabs.find((t) => t.id === activeTabId) || orderTabs[0];

  const createNewTab = () => {
    const newTabNum = orderTabs.length + 1;
    const newTabId = 'tab-' + Date.now();
    const newTab: OrderTab = {
      id: newTabId,
      title: `Đơn ${newTabNum}`,
      items: [],
      customer_name: 'Khách lẻ',
      customer_phone: '',
      discount_amount: 0,
      discount_type: 'AMOUNT',
      note: '',
      payment_method: 'CASH',
      customer_paid: 0,
    };
    setOrderTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    showToast(`Đã mở thêm ${newTab.title}`, 'info');
  };

  const closeTab = (tabId: string) => {
    if (orderTabs.length <= 1) {
      clearActiveCart();
      return;
    }
    const remaining = orderTabs.filter((t) => t.id !== tabId);
    setOrderTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      showToast(`Sản phẩm "${product.name}" đã hết hàng trong kho!`, 'error');
      return;
    }

    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const existingItem = tab.items.find((item) => item.product_id === product.id);
        if (existingItem) {
          const newQty = existingItem.quantity + quantity;
          if (newQty > product.stock) {
            showToast(`Vượt quá tồn kho khả dụng (${product.stock} ${product.unit})!`, 'warning');
            return tab;
          }
          return {
            ...tab,
            items: tab.items.map((i) =>
              i.product_id === product.id ? { ...i, quantity: newQty } : i
            ),
          };
        } else {
          const newItem: CartItem = {
            product_id: product.id,
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            quantity: quantity,
            price: product.selling_price,
            cost_price: product.cost_price,
            unit: product.unit,
            discount_percent: 0,
            max_stock: product.stock,
            image: product.image,
          };
          return { ...tab, items: [...tab.items, newItem] };
        }
      })
    );
  };

  const updateCartItemQuantity = (productId: string, delta: number) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const item = tab.items.find((i) => i.product_id === productId);
        if (!item) return tab;
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          return { ...tab, items: tab.items.filter((i) => i.product_id !== productId) };
        }
        if (newQty > item.max_stock) {
          showToast(`Tối đa ${item.max_stock} ${item.unit} trong kho!`, 'warning');
          return tab;
        }
        return {
          ...tab,
          items: tab.items.map((i) => (i.product_id === productId ? { ...i, quantity: newQty } : i)),
        };
      })
    );
  };

  const setCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const item = tab.items.find((i) => i.product_id === productId);
        if (!item) return tab;
        const validQty = Math.min(quantity, item.max_stock);
        return {
          ...tab,
          items: tab.items.map((i) => (i.product_id === productId ? { ...i, quantity: validQty } : i)),
        };
      })
    );
  };

  const setCartItemPrice = (productId: string, newPrice: number) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          items: tab.items.map((i) => (i.product_id === productId ? { ...i, price: Math.max(0, newPrice) } : i)),
        };
      })
    );
  };

  const setCartItemDiscount = (productId: string, discountPercent: number) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          items: tab.items.map((i) =>
            i.product_id === productId ? { ...i, discount_percent: Math.min(100, Math.max(0, discountPercent)) } : i
          ),
        };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return { ...tab, items: tab.items.filter((i) => i.product_id !== productId) };
      })
    );
  };

  const clearActiveCart = () => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          items: [],
          customer_name: 'Khách lẻ',
          customer_phone: '',
          discount_amount: 0,
          note: '',
          customer_paid: 0,
        };
      })
    );
  };

  const updateActiveTabInfo = (updates: Partial<OrderTab>) => {
    setOrderTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  // Checkout Execution
  const completeCheckout = (
    paymentMethod: 'CASH' | 'TRANSFER' | 'CARD',
    customerPaidAmount?: number
  ): Order | null => {
    if (!activeTab || activeTab.items.length === 0) {
      showToast('Giỏ hàng trống! Vui lòng chọn sản phẩm để thanh toán.', 'warning');
      return null;
    }

    // Calculate subtotal
    const subtotal = activeTab.items.reduce((sum, item) => {
      const discountedPrice = item.price * (1 - item.discount_percent / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);

    const discount = activeTab.discount_type === 'PERCENT'
      ? (subtotal * activeTab.discount_amount) / 100
      : activeTab.discount_amount;

    const finalAmount = Math.max(0, Math.round(subtotal - discount));

    const totalCost = activeTab.items.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
    const profit = finalAmount - totalCost;

    const orderCode = `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      code: orderCode,
      customer_name: activeTab.customer_name || 'Khách lẻ',
      phone: activeTab.customer_phone || '',
      items: activeTab.items.map((i) => ({
        product_id: i.product_id,
        sku: i.sku,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        price: i.price,
        cost_price: i.cost_price,
      })),
      total: subtotal,
      discount: discount,
      final_amount: finalAmount,
      total_cost: totalCost,
      profit: profit,
      payment_method: paymentMethod,
      created_at: getCurrentVietnameseDateTime(),
      status: 'COMPLETED',
      cashier: currentUser.name,
      branch: currentBranch.name,
      note: activeTab.note,
    };

    // 1. Deduct Product stock
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = activeTab.items.find((i) => i.product_id === p.id);
        if (!cartItem) return p;
        return {
          ...p,
          stock: Math.max(0, p.stock - cartItem.quantity),
        };
      })
    );

    // 2. Add to Orders
    setOrders((prev) => [newOrder, ...prev]);
    apiClient.createOrder(newOrder).catch((err) => {
      savePendingChange('orders', newOrder);
      console.warn('[Order] Sync create failed:', err);
      savePendingChange('orders', newOrder);
    });

    // 3. Update Customer accumulated purchase & debt if customer specified
    const customerPaid = customerPaidAmount !== undefined ? customerPaidAmount : finalAmount;
    const actualCollected = Math.min(finalAmount, Math.max(0, customerPaid));
    const debtIncrease = Math.max(0, finalAmount - actualCollected);

    if (activeTab.customer_name && activeTab.customer_name !== 'Khách lẻ') {
      setCustomers((prev) =>
        prev.map((c) => {
          const matchPhone = activeTab.customer_phone && c.phone === activeTab.customer_phone;
          const matchName = c.name.toLowerCase().trim() === activeTab.customer_name.toLowerCase().trim();
          if (matchPhone || matchName) {
            const updatedTotalPurchased = (c.total_purchased || 0) + finalAmount;
            const updatedDebt = (c.debt || 0) + debtIncrease;
            const updatedCust = {
              ...c,
              total_purchased: updatedTotalPurchased,
              debt: updatedDebt,
            };
            apiClient.updateCustomer(c.id, updatedCust).catch((err) => {
              console.warn('[Customer] Sync update failed:', err);
              savePendingChange('customers', updatedCust);
            });
            return updatedCust;
          }
          return c;
        })
      );
    }

    // 4. If Cash or Transfer, record into Cashbook Sổ Quỹ (record actual collected amount)
    if (actualCollected > 0) {
      addCashbookEntry({
        type: 'IN',
        amount: actualCollected,
        category: 'Thu tiền bán hàng POS',
        note: `Thu tiền đơn hàng ${orderCode} (${activeTab.customer_name || 'Khách lẻ'})${debtIncrease > 0 ? ` [Ghi nợ: ${debtIncrease.toLocaleString('vi-VN')} đ]` : ''}`,
        ref_code: orderCode,
      });
    }

    // 5. Set last completed order & open K80 thermal receipt modal
    setLastCompletedOrder(newOrder);
    setIsReceiptModalOpen(true);

    // 6. Reset active tab
    clearActiveCart();

    // Trigger celebration effects
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {
      // Ignore if confetti fails
    }

    showToast(`Thanh toán thành công hóa đơn ${orderCode}!`, 'success');
    return newOrder;
  };

  // Update existing / past order
  const updateOrder = (
    orderId: string,
    updates: Partial<Order>,
    options: { adjustStock?: boolean; adjustCashbook?: boolean } = { adjustStock: true, adjustCashbook: true }
  ) => {
    const existingOrder = orders.find((o) => o.id === orderId);
    if (!existingOrder) {
      showToast('Không tìm thấy hóa đơn cần cập nhật!', 'error');
      return;
    }

    // 1. Stock Adjustment Calculation if items changed and adjustStock is true
    if (options.adjustStock && updates.items && existingOrder.status === 'COMPLETED') {
      const oldItemMap = new Map<string, number>();
      existingOrder.items.forEach((i) => oldItemMap.set(i.product_id, (oldItemMap.get(i.product_id) || 0) + i.quantity));

      const newItemMap = new Map<string, number>();
      updates.items.forEach((i) => newItemMap.set(i.product_id, (newItemMap.get(i.product_id) || 0) + i.quantity));

      // Calculate diff for each affected product
      const allProductIds = Array.from(new Set([...oldItemMap.keys(), ...newItemMap.keys()]));
      
      setProducts((prev) =>
        prev.map((prod) => {
          if (!allProductIds.includes(prod.id)) return prod;
          const oldQty = oldItemMap.get(prod.id) || 0;
          const newQty = newItemMap.get(prod.id) || 0;
          const diff = newQty - oldQty; // if diff > 0, we sold more so stock decreases by diff
          return {
            ...prod,
            stock: Math.max(0, prod.stock - diff),
          };
        })
      );
    }

    // 2. Cashbook adjustment if final_amount or payment method changed
    if (options.adjustCashbook && updates.final_amount !== undefined && existingOrder.status === 'COMPLETED') {
      const oldAmount = existingOrder.final_amount;
      const newAmount = updates.final_amount;
      const amountDiff = newAmount - oldAmount;

      if (amountDiff !== 0) {
        if (amountDiff > 0) {
          addCashbookEntry({
            type: 'IN',
            amount: amountDiff,
            category: 'Điều chỉnh tăng tiền hóa đơn cũ',
            note: `Thu bổ sung chênh lệch khi sửa hóa đơn ${existingOrder.code}`,
            ref_code: existingOrder.code,
          });
        } else {
          addCashbookEntry({
            type: 'OUT',
            amount: Math.abs(amountDiff),
            category: 'Điều chỉnh giảm / Hoàn tiền hóa đơn cũ',
            note: `Hoàn trả chênh lệch khi sửa hóa đơn ${existingOrder.code}`,
            ref_code: existingOrder.code,
          });
        }
      }
    }

    // 3. Update orders state
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          ...updates,
          // Recalculate profit if items or discount/total updated
          total: updates.total !== undefined ? updates.total : o.total,
          discount: updates.discount !== undefined ? updates.discount : o.discount,
          final_amount: updates.final_amount !== undefined ? updates.final_amount : o.final_amount,
          total_cost: updates.total_cost !== undefined ? updates.total_cost : o.total_cost,
          profit: updates.profit !== undefined ? updates.profit : (
            (updates.final_amount !== undefined ? updates.final_amount : o.final_amount) -
            (updates.total_cost !== undefined ? updates.total_cost : o.total_cost)
          ),
        };
      })
    );
    apiClient.updateOrder(orderId, updates).catch((err) => {
      console.warn('[Order] Sync update failed:', err);
      const ord = orders.find((o) => o.id === orderId);
      if (ord) savePendingChange('orders', { ...ord, ...updates, id: orderId });
    });

    showToast(`Đã cập nhật hóa đơn ${existingOrder.code} thành công!`, 'success');
  };

  // Cancel order & return stock
  const cancelOrder = (orderId: string, returnStock: boolean = true, reason?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (order.status === 'CANCELLED') {
      showToast(`Hóa đơn ${order.code} đã ở trạng thái Đã hủy!`, 'info');
      return;
    }

    // 1. Return stock to products
    if (returnStock) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = order.items.find((i) => i.product_id === p.id);
          if (!item) return p;
          return {
            ...p,
            stock: p.stock + item.quantity,
          };
        })
      );
    }

    // 2. Record cash refund in cashbook
    addCashbookEntry({
      type: 'OUT',
      amount: order.final_amount,
      category: 'Hoàn tiền hủy hóa đơn bán hàng',
      note: `Hoàn tiền hủy hóa đơn ${order.code}${reason ? ` (Lý do: ${reason})` : ''}`,
      ref_code: order.code,
    });

    // 3. Rollback customer total_purchased if customer is known
    if (order.customer_name && order.customer_name !== 'Khách lẻ') {
      setCustomers((prev) =>
        prev.map((c) => {
          const matchPhone = order.phone && c.phone === order.phone;
          const matchName = c.name.toLowerCase().trim() === order.customer_name.toLowerCase().trim();
          if (matchPhone || matchName) {
            const updatedCust = {
              ...c,
              total_purchased: Math.max(0, (c.total_purchased || 0) - order.final_amount),
            };
            apiClient.updateCustomer(c.id, updatedCust).catch((err) => {
              console.warn('[Customer] Sync update failed:', err);
              savePendingChange('customers', updatedCust);
            });
            return updatedCust;
          }
          return c;
        })
      );
    }

    // 4. Set order status
    const updatedNote = `${order.note ? order.note + ' | ' : ''}[Đã hủy: ${reason || 'Khách hủy/Hoàn trả'}]`;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'CANCELLED', note: updatedNote }
          : o
      )
    );
    apiClient.updateOrder(orderId, { status: 'CANCELLED', note: updatedNote }).catch((err) => {
      savePendingChange('orders', { ...order, status: 'CANCELLED', note: updatedNote });
      console.warn('[Order] Sync cancel failed:', err);
    });

    showToast(`Đã hủy hóa đơn ${order.code} và hoàn trả ${order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm về kho!`, 'success');
  };

  // Restore cancelled order
  const restoreOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === 'COMPLETED') return;

    // Deduct stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = order.items.find((i) => i.product_id === p.id);
        if (!item) return p;
        return {
          ...p,
          stock: Math.max(0, p.stock - item.quantity),
        };
      })
    );

    // Record cash entry
    addCashbookEntry({
      type: 'IN',
      amount: order.final_amount,
      category: 'Thu tiền khôi phục hóa đơn',
      note: `Thu tiền khi khôi phục hóa đơn ${order.code}`,
      ref_code: order.code,
    });

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'COMPLETED' } : o))
    );
    apiClient.updateOrder(orderId, { status: 'COMPLETED' }).catch((err) => {
      savePendingChange('orders', { ...order, status: 'COMPLETED' });
      console.warn('[Order] Sync restore failed:', err);
    });

    showToast(`Đã khôi phục trạng thái hoàn thành cho hóa đơn ${order.code}!`, 'success');
  };

  // Delete order permanently
  const deleteOrder = (orderId: string, returnStock: boolean = false) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (returnStock && order.status === 'COMPLETED') {
      setProducts((prev) =>
        prev.map((p) => {
          const item = order.items.find((i) => i.product_id === p.id);
          if (!item) return p;
          return {
            ...p,
            stock: p.stock + item.quantity,
          };
        })
      );
    }

    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    apiClient.deleteOrder(orderId, returnStock).catch((err) => {
      console.warn('[Order] Sync delete failed:', err);
    });
    showToast(`Đã xóa vĩnh viễn hóa đơn ${order.code}!`, 'info');
  };

  // Create order directly / manually
  const createOrderDirect = (
    orderData: Partial<Order>,
    duplicateStrategy: 'OVERWRITE' | 'KEEP_BOTH' | 'ERROR' = 'KEEP_BOTH',
    options: { syncStock?: boolean; syncCashbook?: boolean } = { syncStock: true, syncCashbook: true }
  ): Order | null => {
    let orderCode =
      orderData.code?.trim() ||
      `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const existingIndex = orders.findIndex((o) => o.code.trim().toLowerCase() === orderCode.toLowerCase());

    if (existingIndex >= 0) {
      if (duplicateStrategy === 'ERROR') {
        showToast(`Mã hóa đơn ${orderCode} đã tồn tại trong hệ thống!`, 'error');
        return null;
      }
      if (duplicateStrategy === 'KEEP_BOTH') {
        orderCode = `${orderCode}-DUP${Math.floor(10 + Math.random() * 90)}`;
      }
    }

    const items = orderData.items || [];
    const total = orderData.total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const discount = orderData.discount ?? 0;
    const final_amount = orderData.final_amount ?? (total - discount);
    const total_cost = orderData.total_cost ?? items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
    const profit = orderData.profit ?? (final_amount - total_cost);

    const newOrder: Order = {
      id: orderData.id || `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      code: orderCode,
      customer_name: orderData.customer_name?.trim() || 'Khách lẻ',
      phone: orderData.phone?.trim() || '',
      items,
      total,
      discount,
      final_amount,
      total_cost,
      profit,
      payment_method: orderData.payment_method || 'CASH',
      created_at: orderData.created_at ? formatDateTime(orderData.created_at) : getCurrentVietnameseDateTime(),
      status: orderData.status || 'COMPLETED',
      cashier: orderData.cashier || currentUser.name || 'Phan Minh',
      branch: orderData.branch || currentBranch.name,
      note: orderData.note || '',
    };

    // 1. Deduct stock if enabled and order is COMPLETED
    if (options.syncStock !== false && newOrder.status === 'COMPLETED' && items.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = items.find((i) => i.product_id === p.id);
          if (!item) return p;
          return {
            ...p,
            stock: Math.max(0, p.stock - item.quantity),
          };
        })
      );
    }

    // 2. Add cashbook entry if enabled and order is COMPLETED
    if (options.syncCashbook !== false && newOrder.status === 'COMPLETED' && final_amount > 0) {
      addCashbookEntry({
        type: 'IN',
        amount: final_amount,
        category: 'Thu tiền bán hàng POS (Voice AI / Trực tiếp)',
        note: `Thu tiền hóa đơn ${orderCode} (${newOrder.customer_name})`,
        ref_code: orderCode,
      });
    }

    // 3. Update customer purchase history if existing customer
    if (newOrder.phone || (newOrder.customer_name && newOrder.customer_name !== 'Khách lẻ')) {
      setCustomers((prev) =>
        prev.map((c) => {
          const isMatch = (newOrder.phone && c.phone === newOrder.phone) ||
            (c.name.toLowerCase() === newOrder.customer_name.toLowerCase());
          if (isMatch) {
            return {
              ...c,
              total_purchased: (c.total_purchased || 0) + final_amount,
            };
          }
          return c;
        })
      );
    }

    // 4. Save order into orders state
    if (existingIndex >= 0 && duplicateStrategy === 'OVERWRITE') {
      setOrders((prev) =>
        prev
          .map((o, idx) => (idx === existingIndex ? newOrder : o))
          .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at))
      );
      showToast(`Đã cập nhật (ghi đè) hóa đơn ${orderCode}!`, 'success');
    } else {
      setOrders((prev) =>
        [newOrder, ...prev].sort(
          (a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at)
        )
      );
      showToast(`Đã lưu hóa đơn ${orderCode} thành công!`, 'success');
    }

    // 5. Store as last completed order
    setLastCompletedOrder(newOrder);

    // 6. Background async sync to server API
    apiClient.createOrder(newOrder).catch((err) => {
      savePendingChange('orders', newOrder);
      console.warn('[SYNC] Async order creation to backend failed:', err.message);
    });

    return newOrder;
  };

  // Bulk import orders with Duplicate Resolution Strategy
  const importOrders = (
    newOrders: Partial<Order>[],
    duplicateStrategy: DuplicateStrategy = 'OVERWRITE',
    options: { syncStock?: boolean; syncCashbook?: boolean } = {}
  ): ImportOrderResult => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Hóa đơn!', 'error');
      return { total: 0, inserted: 0, updated: 0, skipped: 0, renamed: 0, duplicateCodes: [] };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let renamed = 0;
    const duplicateCodes: string[] = [];

    setOrders((prev) => {
      if (duplicateStrategy === 'REPLACE_ALL') {
        const generatedList: Order[] = newOrders.map((ord, idx) => {
          const items = ord.items || [];
          const total = ord.total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
          const discount = ord.discount ?? 0;
          const final_amount = ord.final_amount ?? (total - discount);
          const total_cost = ord.total_cost ?? items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
          const profit = ord.profit ?? (final_amount - total_cost);

          return {
            id: ord.id || `order-${Date.now()}-${idx}`,
            code: ord.code?.trim() || `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${1000 + idx}`,
            customer_name: ord.customer_name?.trim() || 'Khách lẻ',
            phone: ord.phone?.trim() || '',
            items,
            total,
            discount,
            final_amount,
            total_cost,
            profit,
            payment_method: ord.payment_method || 'CASH',
            created_at: ord.created_at ? formatDateTime(ord.created_at) : getCurrentVietnameseDateTime(),
            status: ord.status || 'COMPLETED',
            cashier: ord.cashier || 'Phan Minh',
            branch: ord.branch || currentBranch.name,
            note: ord.note || '',
          };
        }).sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
        inserted = generatedList.length;
        return generatedList;
      }

      const orderMap = new Map<string, Order>();
      prev.forEach((o) => {
        orderMap.set(o.code.trim().toLowerCase(), { ...o });
      });

      newOrders.forEach((item, index) => {
        let code = item.code?.trim() || `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${1000 + index}`;
        const codeKey = code.toLowerCase();
        const existing = orderMap.get(codeKey);

        const items = item.items || [];
        const total = item.total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        const discount = item.discount ?? 0;
        const final_amount = item.final_amount ?? (total - discount);
        const total_cost = item.total_cost ?? items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
        const profit = item.profit ?? (final_amount - total_cost);

        if (existing) {
          duplicateCodes.push(code);

          if (duplicateStrategy === 'SKIP') {
            skipped++;
            return;
          }

          if (duplicateStrategy === 'OVERWRITE') {
            const updatedOrder: Order = {
              ...existing,
              customer_name: item.customer_name?.trim() || existing.customer_name,
              phone: item.phone?.trim() || existing.phone,
              items: items.length > 0 ? items : existing.items,
              total,
              discount,
              final_amount,
              total_cost,
              profit,
              payment_method: item.payment_method || existing.payment_method,
              created_at: item.created_at ? formatDateTime(item.created_at) : existing.created_at,
              status: item.status || existing.status,
              cashier: item.cashier || existing.cashier,
              branch: item.branch || existing.branch,
              note: item.note || existing.note,
            };
            orderMap.set(codeKey, updatedOrder);
            updated++;
            return;
          }

          if (duplicateStrategy === 'KEEP_BOTH') {
            let dupIndex = 1;
            let newCode = `${code}-DUP${dupIndex}`;
            while (orderMap.has(newCode.toLowerCase())) {
              dupIndex++;
              newCode = `${code}-DUP${dupIndex}`;
            }
            code = newCode;
            renamed++;
          }
        }

        const newOrder: Order = {
          id: item.id || `order-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          code,
          customer_name: item.customer_name?.trim() || 'Khách lẻ',
          phone: item.phone?.trim() || '',
          items,
          total,
          discount,
          final_amount,
          total_cost,
          profit,
          payment_method: item.payment_method || 'CASH',
          created_at: item.created_at ? formatDateTime(item.created_at) : getCurrentVietnameseDateTime(),
          status: item.status || 'COMPLETED',
          cashier: item.cashier || 'Phan Minh',
          branch: item.branch || currentBranch.name,
          note: item.note || '',
        };

        orderMap.set(code.toLowerCase(), newOrder);
        inserted++;
      });

      return Array.from(orderMap.values()).sort(
        (a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at)
      );
    });

    const result: ImportOrderResult = {
      total: newOrders.length,
      inserted,
      updated,
      skipped,
      renamed,
      duplicateCodes,
    };

    let msg = `Nhập hóa đơn hoàn tất: ${inserted} thêm mới`;
    if (updated > 0) msg += `, ${updated} ghi đè`;
    if (skipped > 0) msg += `, ${skipped} bỏ qua`;
    if (renamed > 0) msg += `, ${renamed} đổi mã`;

    showToast(msg, 'success');
    return result;
  };

  // Open Receipt Modal for any order
  const openOrderReceipt = (order: Order) => {
    setLastCompletedOrder(order);
    setIsReceiptModalOpen(true);
  };

  // Inventory Audit Actions
  const createInventoryAudit = (
    auditor: string,
    items: any[],
    notes?: string,
    initialStatus: 'DRAFT' | 'BALANCED' = 'DRAFT'
  ): InventoryAudit => {
    const code = `KK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const auditItems = items.map((i) => {
      const diff = i.actual_stock - i.system_stock;
      const product = products.find((p) => p.id === i.product_id);
      const cost = product?.cost_price || 0;
      return {
        ...i,
        diff,
        diff_value: diff * cost,
      };
    });

    const totalDiff = auditItems.reduce((acc, cur) => acc + cur.diff, 0);
    const totalDiffVal = auditItems.reduce((acc, cur) => acc + cur.diff_value, 0);

    const isBalanced = initialStatus === 'BALANCED';
    const newAudit: InventoryAudit = {
      id: 'audit-' + Date.now(),
      code,
      date: new Date().toISOString().slice(0, 10),
      auditor: auditor || currentUser.name,
      status: initialStatus,
      balanced_at: isBalanced ? new Date().toLocaleString('vi-VN') : undefined,
      items: auditItems,
      total_diff_items: totalDiff,
      total_diff_value: totalDiffVal,
      notes: notes || '',
    };

    if (isBalanced) {
      setProducts((prev) =>
        prev.map((p) => {
          const auditItem = auditItems.find((i) => i.product_id === p.id);
          if (!auditItem) return p;
          return {
            ...p,
            stock: auditItem.actual_stock,
          };
        })
      );
    }

    setInventoryAudits((prev) => [newAudit, ...prev]);
    apiClient.createInventoryAudit(newAudit).catch((err) => {
      console.warn('[Audit] Sync create failed:', err);
      savePendingChange('inventory_audits', newAudit);
    });
    showToast(
      isBalanced
        ? `Đã tạo và cân bằng kho ngay theo phiếu ${code}!`
        : `Đã tạo phiếu kiểm kê ${code}`,
      'success'
    );
    return newAudit;
  };

  const balanceInventoryAudit = (auditId: string) => {
    const audit = inventoryAudits.find((a) => a.id === auditId);
    if (!audit) return;
    if (audit.status === 'BALANCED') {
      showToast('Phiếu kiểm kê này đã được cân bằng kho trước đó!', 'info');
      return;
    }

    // Apply actual stock to all products in this audit
    setProducts((prev) =>
      prev.map((p) => {
        const auditItem = audit.items.find((i) => i.product_id === p.id);
        if (!auditItem) return p;
        return {
          ...p,
          stock: auditItem.actual_stock,
        };
      })
    );

    // Update audit status to BALANCED
    setInventoryAudits((prev) =>
      prev.map((a) =>
        a.id === auditId
          ? { ...a, status: 'BALANCED', balanced_at: new Date().toLocaleString('vi-VN') }
          : a
      )
    );
    apiClient.balanceInventoryAudit(auditId).catch((err) => console.warn('[Audit] Sync balance failed:', err));

    showToast(`Cân bằng kho thành công theo phiếu ${audit.code}! Tồn kho đã được đồng bộ chuẩn xác.`, 'success');
  };

  // Cashbook Actions
  const addCashbookEntry = (
    entry: Omit<CashbookEntry, 'id' | 'code' | 'created_at' | 'branch'>
  ): CashbookEntry => {
    const prefix = entry.type === 'IN' ? 'PT' : 'PC';
    const code = `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const newEntry: CashbookEntry = {
      ...entry,
      id: 'cb-' + Date.now(),
      code,
      created_at: getCurrentVietnameseDateTime(),
      branch: currentBranch.name,
    };

    setCashbookEntries((prev) =>
      [newEntry, ...prev].sort(
        (a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at)
      )
    );
    apiClient.createCashbookEntry(newEntry).catch((err) => {
      console.warn('[Cashbook] Sync create failed:', err);
      savePendingChange('cashbook', newEntry);
    });
    return newEntry;
  };

  const deleteCashbookEntry = (id: string) => {
    setCashbookEntries((prev) => prev.filter((c) => c.id !== id));
    apiClient.deleteCashbookEntry(id).catch((err) => console.warn('[Cashbook] Sync delete failed:', err));
    showToast('Đã xóa phiếu thu/chi!', 'info');
  };

  const importCashbook = (
    newEntries: Partial<CashbookEntry>[],
    overwrite: boolean = false
  ): { inserted: number; updated: number; skipped: number } => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Sổ quỹ!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const baseList = overwrite ? [] : [...cashbookEntries];
    const map = new Map<string, number>();
    baseList.forEach((c, idx) => {
      map.set(c.code.toLowerCase(), idx);
    });

    const toSync: CashbookEntry[] = [];

    newEntries.forEach((item, idx) => {
      const code = (item.code || `PT-${Date.now()}-${idx}`).trim();
      const lowerCode = code.toLowerCase();
      const existingIdx = map.get(lowerCode);

      const entry: CashbookEntry = {
        id: item.id || `cb-${Date.now()}-${idx}`,
        code,
        type: item.type || 'IN',
        amount: Math.max(0, item.amount || 0),
        category: item.category || (item.type === 'OUT' ? 'Chi phí vận hành' : 'Thu tiền bán hàng POS'),
        note: item.note || '',
        ref_code: item.ref_code || '',
        branch: item.branch || currentBranch.name,
        created_at: item.created_at ? formatDateTime(item.created_at) : getCurrentVietnameseDateTime(),
      };

      if (existingIdx !== undefined) {
        if (overwrite) {
          baseList[existingIdx] = entry;
          toSync.push(entry);
          updated++;
        } else {
          skipped++;
        }
      } else {
        baseList.push(entry);
        map.set(lowerCode, baseList.length - 1);
        toSync.push(entry);
        inserted++;
      }
    });

    const sorted = baseList.sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
    setCashbookEntries(sorted);
    cacheManager.set('cashbook', sorted);

    if (toSync.length > 0) {
      apiClient.batchUpsertCashbook(toSync).catch((err) => {
        console.warn('[Cashbook] Batch sync failed:', err);
      });
    }

    showToast(`Nhập sổ quỹ thành công: Thêm mới ${inserted}, Cập nhật ${updated}, Bỏ qua ${skipped}`, 'success');
    return { inserted, updated, skipped };
  };

  // Bulk Product Import
  const importProducts = (
    newProducts: Partial<Product>[],
    overwrite: boolean = false
  ) => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Hàng hóa!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    setProducts((prev) => {
      // If overwrite mode is true (replace catalog entirely), start fresh with only imported items
      const prodMap = overwrite
        ? new Map<string, Product>()
        : new Map<string, Product>(prev.map((p) => [p.sku.trim().toLowerCase(), p]));

      newProducts.forEach((item) => {
        if (!item.sku || !item.name) return;
        const skuKey = item.sku.trim().toLowerCase();
        const existing = prodMap.get(skuKey);

        if (existing) {
          prodMap.set(skuKey, {
            ...existing,
            ...item,
            id: existing.id,
            sku: item.sku ? item.sku.trim() : existing.sku,
            name: item.name ? item.name.trim() : existing.name,
            barcode: item.barcode || existing.barcode,
            category: item.category || existing.category,
            unit: item.unit || existing.unit,
            cost_price: item.cost_price !== undefined ? item.cost_price : existing.cost_price,
            selling_price: item.selling_price !== undefined ? item.selling_price : existing.selling_price,
            stock: item.stock !== undefined ? item.stock : existing.stock,
            min_stock: item.min_stock !== undefined ? item.min_stock : existing.min_stock,
            status: item.status || existing.status,
            image: item.image || existing.image,
            description: item.description !== undefined ? item.description : existing.description,
          });
          updated++;
        } else {
          const newId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const newProd: Product = {
            id: newId,
            sku: item.sku.trim(),
            barcode: item.barcode || `893600${Math.floor(100000 + Math.random() * 900000)}`,
            name: item.name.trim(),
            category: item.category || 'cat-electronics',
            unit: item.unit || 'Cái',
            cost_price: item.cost_price !== undefined ? item.cost_price : 0,
            selling_price: item.selling_price !== undefined ? item.selling_price : 10000,
            stock: item.stock !== undefined ? item.stock : 0,
            min_stock: item.min_stock !== undefined ? item.min_stock : 5,
            status: item.status || 'ACTIVE',
            image: item.image || '',
            description: item.description || '',
          };
          prodMap.set(skuKey, newProd);
          inserted++;
        }
      });

      return Array.from(prodMap.values());
    });

    showToast(`Nhập dữ liệu thành công: Thêm mới ${inserted}, Cập nhật ${updated}`, 'success');
    return { inserted, updated, skipped };
  };

  // Progressive Background Import (Non-blocking chunked worker)
  const importProductsProgressive = async (
    newProducts: Partial<Product>[],
    overwrite: boolean = false,
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: boolean; totalProcessed: number }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Hàng hóa!', 'error');
      return { success: false, totalProcessed: 0 };
    }

    setIsLoading(true);
    setLoadingMessage(`Đang chuẩn bị nhập ${newProducts.length} sản phẩm...`);

    const formattedProducts: Product[] = newProducts
      .filter((item) => item.sku && item.name)
      .map((item) => {
        const newId = item.id || 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        return {
          id: newId,
          sku: item.sku!.trim(),
          barcode: item.barcode || `893600${Math.floor(100000 + Math.random() * 900000)}`,
          name: item.name!.trim(),
          category: item.category || 'cat-electronics',
          unit: item.unit || 'Cái',
          cost_price: item.cost_price !== undefined ? item.cost_price : 0,
          selling_price: item.selling_price !== undefined ? item.selling_price : 10000,
          stock: item.stock !== undefined ? item.stock : 0,
          min_stock: item.min_stock !== undefined ? item.min_stock : 5,
          status: item.status || 'ACTIVE',
          image: item.image || '',
          description: item.description || '',
        };
      });

    try {
      const result = await backgroundWorker.runProgressiveProductImport(
        formattedProducts,
        overwrite ? 'REPLACE_ALL' : 'OVERWRITE',
        {
          chunkSize: 50,
          delayBetweenChunksMs: 20,
          onChunkComplete: (chunk, processed, total) => {
            if (onProgress) onProgress(processed, total);
          },
        }
      );

      // Refresh product list from backend/cache
      await syncWithServer();
      setIsLoading(false);
      setLoadingMessage('');

      if (result.success) {
        showToast(`Đã nạp thành công ${result.totalProcessed.toLocaleString('vi-VN')} hàng hóa chạy ngầm mượt mà!`, 'success');
      }
      return result;
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      setIsLoading(false);
      setLoadingMessage('');
      showToast(`Lỗi khi nạp dữ liệu: ${message}`, 'error');
      return { success: false, totalProcessed: 0 };
    }
  };

  const exportAllDataAsBackup = () => {
    const backupObj = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      products,
      suppliers,
      customers,
      orders,
      inventoryAudits,
      cashbookEntries,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Sao_luu_he_thong_KiotViet_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã xuất file sao lưu JSON toàn bộ hệ thống!', 'success');
  };

  const restoreDataFromBackup = (jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed.products)) setProducts(parsed.products);
      if (Array.isArray(parsed.suppliers)) setSuppliers(parsed.suppliers);
      if (Array.isArray(parsed.customers)) setCustomers(parsed.customers);
      if (Array.isArray(parsed.orders)) setOrders(parsed.orders);
      if (Array.isArray(parsed.inventoryAudits)) setInventoryAudits(parsed.inventoryAudits);
      if (Array.isArray(parsed.cashbookEntries)) setCashbookEntries(parsed.cashbookEntries);
      showToast('Khôi phục toàn bộ hệ thống từ file sao lưu thành công!', 'success');
    } catch (err) {
      showToast('File JSON sao lưu bị lỗi định dạng!', 'error');
    }
  };

  const clearAllData = () => {
    setProducts([]);
    setSuppliers([]);
    setCustomers([]);
    setOrders([]);
    setInventoryAudits([]);
    setCashbookEntries([]);
    setOrderTabs([
      {
        id: 'tab-1',
        title: 'Đơn 1',
        items: [],
        customer_name: 'Khách lẻ',
        customer_phone: '',
        discount_amount: 0,
        discount_type: 'AMOUNT',
        note: '',
        payment_method: 'CASH',
        customer_paid: 0,
      },
    ]);
    setActiveTabId('tab-1');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'products');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'suppliers');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'customers');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'orders');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'audits');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'cashbook');
    showToast('Đã xóa sạch toàn bộ dữ liệu mẫu! Hệ thống đã trống hoàn toàn để nhập dữ liệu thực tế.', 'success');
  };

  const resetToDefaultData = clearAllData;

  const resetToSampleData = clearAllData;

  return (
    <AppContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated,
        login,
        logout,
        changePassword,
        resetUserPassword,
        saveUser,
        deleteUser,
        toggleUserLock,
        updateUserProfile,
        switchUser,
        isUserSwitcherOpen,
        setIsUserSwitcherOpen,
        isUserProfileOpen,
        setIsUserProfileOpen,
        isChangePasswordOpen,
        setIsChangePasswordOpen,
        currentView,
        setCurrentView,
        currentBranch,
        setCurrentBranch,
        branches,
        searchQuery,
        setSearchQuery,
        storeSettings,
        updateStoreSettings,
        resetStoreSettings,
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        receiveStockWithWeightedCost,
        receiveStockVoucher,
        confirmProductPriceAudit,
        unconfirmProductPriceAudit,
        confirmAllProductPriceAudits,
        isPriceAuditConfirmed,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        importSuppliers,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        importCustomers,
        orderTabs,
        activeTabId,
        setActiveTabId,
        createNewTab,
        closeTab,
        addToCart,
        updateCartItemQuantity,
        setCartItemQuantity,
        setCartItemPrice,
        setCartItemDiscount,
        removeFromCart,
        clearActiveCart,
        updateActiveTabInfo,
        orders,
        completeCheckout,
        createOrderDirect,
        importOrders,
        updateOrder,
        cancelOrder,
        restoreOrder,
        deleteOrder,
        openOrderReceipt,
        lastCompletedOrder,
        setLastCompletedOrder,
        isReceiptModalOpen,
        setIsReceiptModalOpen,
        inventoryAudits,
        createInventoryAudit,
        balanceInventoryAudit,
        cashbookEntries,
        addCashbookEntry,
        deleteCashbookEntry,
        importCashbook,
        toasts,
        showToast,
        removeToast,
        importProducts,
        importProductsProgressive,
        exportAllDataAsBackup,
        restoreDataFromBackup,
        resetToDefaultData,
        resetToSampleData,
        clearAllData,
        syncState,
        isLoading,
        loadingMessage,
        syncWithServer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
