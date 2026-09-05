import React, { ReactNode } from 'react';
import { ToastProvider } from './slices/ToastContext';
import { AuthProvider } from './slices/AuthContext';
import { UiShellProvider } from './slices/UiShellContext';
import { StoreSettingsProvider } from './slices/StoreSettingsContext';
import { CatalogProvider } from './slices/CatalogContext';
import { SuppliersProvider } from './slices/SuppliersContext';
import { CustomersProvider } from './slices/CustomersContext';
import { OrdersCartProvider } from './slices/OrdersCartContext';
import { OrdersDataProvider } from './slices/OrdersDataContext';
import { InventoryAuditProvider } from './slices/InventoryAuditContext';
import { CashbookProvider } from './slices/CashbookContext';

// Thứ tự lồng nhau BẮT BUỘC theo phụ thuộc nội bộ giữa các slice (không phải sở thích):
// Toast   — mọi slice phía trong đều gọi useToast()
// Auth    — Suppliers/Customers/Cashbook gọi useAuth() lấy currentUser
// UiShell — Customers/Cashbook gọi useUiShell() lấy currentBranch
// Các slice còn lại không phụ thuộc lẫn nhau nên thứ tự giữa chúng không quan trọng.
// Orchestrator hook (useCatalogOrchestrator/useOrderOrchestrator/useDataSync) không đặt thêm ràng buộc
// lồng nhau nào — chúng chỉ cần được GỌI từ 1 component nằm trong toàn bộ cây provider này.
export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ToastProvider>
    <AuthProvider>
      <UiShellProvider>
        <StoreSettingsProvider>
          <CatalogProvider>
            <SuppliersProvider>
              <CustomersProvider>
                <OrdersCartProvider>
                  <OrdersDataProvider>
                    <InventoryAuditProvider>
                      <CashbookProvider>{children}</CashbookProvider>
                    </InventoryAuditProvider>
                  </OrdersDataProvider>
                </OrdersCartProvider>
              </CustomersProvider>
            </SuppliersProvider>
          </CatalogProvider>
        </StoreSettingsProvider>
      </UiShellProvider>
    </AuthProvider>
  </ToastProvider>
);
