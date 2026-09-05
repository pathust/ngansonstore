import {
  Product,
  Category,
  Order,
  OrderTab,
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
import { useToast } from './slices/ToastContext';
import { useAuth } from './slices/AuthContext';
import { useUiShell } from './slices/UiShellContext';
import { useStoreSettings } from './slices/StoreSettingsContext';
import { useCatalog } from './slices/CatalogContext';
import { useSuppliers } from './slices/SuppliersContext';
import { useCustomers } from './slices/CustomersContext';
import { useOrdersCart } from './slices/OrdersCartContext';
import { useOrdersData } from './slices/OrdersDataContext';
import { useInventoryAudit } from './slices/InventoryAuditContext';
import { useCashbook } from './slices/CashbookContext';
import { useCatalogOrchestrator } from './orchestrators/useCatalogOrchestrator';
import { useOrderOrchestrator } from './orchestrators/useOrderOrchestrator';
import { useDataSync } from './orchestrators/useDataSync';

// Giữ đúng shape của AppContextType gốc — 49 consumer cũ dùng useApp() không cần sửa gì.
// Tách dần các consumer sang hook riêng theo slice (useAuth/useCatalog/...) là việc của các đợt sau.
export interface AppContextType {
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

  currentView: string;
  setCurrentView: (view: string) => void;
  currentBranch: Branch;
  setCurrentBranch: (branch: Branch) => void;
  branches: Branch[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  storeSettings: StoreSettings;
  updateStoreSettings: (updates: Partial<StoreSettings>) => void;
  resetStoreSettings: () => void;

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

  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  importSuppliers: (newSuppliers: Partial<Supplier>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importCustomers: (newCustomers: Partial<Customer>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };

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

  inventoryAudits: InventoryAudit[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInventoryAudit: (auditor: string, items: any[], notes?: string, status?: 'DRAFT' | 'BALANCED') => InventoryAudit;
  balanceInventoryAudit: (auditId: string) => void;

  cashbookEntries: CashbookEntry[];
  addCashbookEntry: (entry: Omit<CashbookEntry, 'id' | 'code' | 'created_at' | 'branch'>) => CashbookEntry;
  deleteCashbookEntry: (id: string) => void;
  importCashbook: (newEntries: Partial<CashbookEntry>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };

  toasts: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

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

  syncState: 'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE';
  isLoading: boolean;
  loadingMessage?: string;
  syncWithServer: (silent?: boolean) => Promise<void>;
}

// Hook compat duy nhất được gọi 1 lần ở gốc cây (AppContext.tsx) — compose toàn bộ slice +
// orchestrator hook thành 1 object đúng shape useApp() cũ, để 49 consumer hiện tại không cần sửa.
export function useAppCompat(): AppContextType {
  const auth = useAuth();
  const uiShell = useUiShell();
  const storeSettingsCtx = useStoreSettings();
  const catalog = useCatalog();
  const suppliers = useSuppliers();
  const customers = useCustomers();
  const ordersCart = useOrdersCart();
  const ordersData = useOrdersData();
  const inventoryAudit = useInventoryAudit();
  const cashbook = useCashbook();
  const toast = useToast();

  const catalogOrchestrator = useCatalogOrchestrator();
  const orderOrchestrator = useOrderOrchestrator();
  const dataSync = useDataSync();

  return {
    // Auth
    users: auth.users,
    currentUser: auth.currentUser,
    isAuthenticated: auth.isAuthenticated,
    login: auth.login,
    logout: auth.logout,
    changePassword: auth.changePassword,
    resetUserPassword: auth.resetUserPassword,
    saveUser: auth.saveUser,
    deleteUser: auth.deleteUser,
    toggleUserLock: auth.toggleUserLock,
    updateUserProfile: auth.updateUserProfile,
    switchUser: auth.switchUser,
    isUserSwitcherOpen: auth.isUserSwitcherOpen,
    setIsUserSwitcherOpen: auth.setIsUserSwitcherOpen,
    isUserProfileOpen: auth.isUserProfileOpen,
    setIsUserProfileOpen: auth.setIsUserProfileOpen,
    isChangePasswordOpen: auth.isChangePasswordOpen,
    setIsChangePasswordOpen: auth.setIsChangePasswordOpen,

    // UI Shell
    currentView: uiShell.currentView,
    setCurrentView: uiShell.setCurrentView,
    currentBranch: uiShell.currentBranch,
    setCurrentBranch: uiShell.setCurrentBranch,
    branches: uiShell.branches,
    searchQuery: uiShell.searchQuery,
    setSearchQuery: uiShell.setSearchQuery,

    // Store Settings
    storeSettings: storeSettingsCtx.storeSettings,
    updateStoreSettings: storeSettingsCtx.updateStoreSettings,
    resetStoreSettings: storeSettingsCtx.resetStoreSettings,

    // Catalog (raw + orchestrator)
    products: catalog.products,
    categories: catalog.categories,
    addProduct: catalogOrchestrator.addProduct,
    updateProduct: catalog.updateProduct,
    deleteProduct: catalog.deleteProduct,
    receiveStockWithWeightedCost: catalogOrchestrator.receiveStockWithWeightedCost,
    receiveStockVoucher: catalogOrchestrator.receiveStockVoucher,
    confirmProductPriceAudit: catalogOrchestrator.confirmProductPriceAudit,
    unconfirmProductPriceAudit: catalogOrchestrator.unconfirmProductPriceAudit,
    confirmAllProductPriceAudits: catalogOrchestrator.confirmAllProductPriceAudits,
    isPriceAuditConfirmed: catalogOrchestrator.isPriceAuditConfirmed,

    // Suppliers
    suppliers: suppliers.suppliers,
    addSupplier: suppliers.addSupplier,
    updateSupplier: suppliers.updateSupplier,
    deleteSupplier: suppliers.deleteSupplier,
    importSuppliers: suppliers.importSuppliers,

    // Customers
    customers: customers.customers,
    addCustomer: customers.addCustomer,
    updateCustomer: customers.updateCustomer,
    deleteCustomer: customers.deleteCustomer,
    importCustomers: customers.importCustomers,

    // Orders Cart
    orderTabs: ordersCart.orderTabs,
    activeTabId: ordersCart.activeTabId,
    setActiveTabId: ordersCart.setActiveTabId,
    createNewTab: ordersCart.createNewTab,
    closeTab: ordersCart.closeTab,
    addToCart: ordersCart.addToCart,
    updateCartItemQuantity: ordersCart.updateCartItemQuantity,
    setCartItemQuantity: ordersCart.setCartItemQuantity,
    setCartItemPrice: ordersCart.setCartItemPrice,
    setCartItemDiscount: ordersCart.setCartItemDiscount,
    removeFromCart: ordersCart.removeFromCart,
    clearActiveCart: ordersCart.clearActiveCart,
    updateActiveTabInfo: ordersCart.updateActiveTabInfo,

    // Orders Data + orchestrator
    orders: ordersData.orders,
    completeCheckout: orderOrchestrator.completeCheckout,
    createOrderDirect: orderOrchestrator.createOrderDirect,
    importOrders: orderOrchestrator.importOrders,
    updateOrder: orderOrchestrator.updateOrder,
    cancelOrder: orderOrchestrator.cancelOrder,
    restoreOrder: orderOrchestrator.restoreOrder,
    deleteOrder: orderOrchestrator.deleteOrder,
    openOrderReceipt: ordersData.openOrderReceipt,
    lastCompletedOrder: ordersData.lastCompletedOrder,
    setLastCompletedOrder: ordersData.setLastCompletedOrder,
    isReceiptModalOpen: ordersData.isReceiptModalOpen,
    setIsReceiptModalOpen: ordersData.setIsReceiptModalOpen,

    // Inventory Audit
    inventoryAudits: inventoryAudit.inventoryAudits,
    createInventoryAudit: catalogOrchestrator.createInventoryAudit,
    balanceInventoryAudit: catalogOrchestrator.balanceInventoryAudit,

    // Cashbook
    cashbookEntries: cashbook.cashbookEntries,
    addCashbookEntry: cashbook.addCashbookEntry,
    deleteCashbookEntry: cashbook.deleteCashbookEntry,
    importCashbook: cashbook.importCashbook,

    // Toasts
    toasts: toast.toasts,
    showToast: toast.showToast,
    removeToast: toast.removeToast,

    // Data lifecycle & sync
    importProducts: dataSync.importProducts,
    importProductsProgressive: dataSync.importProductsProgressive,
    exportAllDataAsBackup: dataSync.exportAllDataAsBackup,
    restoreDataFromBackup: dataSync.restoreDataFromBackup,
    resetToDefaultData: dataSync.resetToDefaultData,
    resetToSampleData: dataSync.resetToSampleData,
    clearAllData: dataSync.clearAllData,
    syncState: dataSync.syncState,
    isLoading: dataSync.isLoading,
    loadingMessage: dataSync.loadingMessage,
    syncWithServer: dataSync.syncWithServer,
  };
}
