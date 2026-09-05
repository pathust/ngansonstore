import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Customer } from '../../types';
import { apiClient } from '../../services/apiClient';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';
import { savePendingChange } from '../shared/syncQueue';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { useUiShell } from './UiShellContext';

interface CustomersContextType {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  importCustomers: (newCustomers: Partial<Customer>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

export const CustomersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { currentBranch } = useUiShell();

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = safeStorageGet<Customer[]>(LOCAL_STORAGE_PREFIX + 'customers', []);
    return Array.isArray(saved) ? saved : [];
  });

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
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
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

  const importCustomers = (newCustomers: Partial<Customer>[], overwrite: boolean = false) => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Khách hàng!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    const skipped = 0;

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

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'customers', customers, 300);
    cacheManager.set('customers', customers);
  }, [customers]);

  const value = useMemo<CustomersContextType>(
    () => ({ customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, importCustomers }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers, currentUser, currentBranch, showToast]
  );

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
};

export const useCustomers = (): CustomersContextType => {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error('useCustomers must be used within a CustomersProvider');
  }
  return context;
};
