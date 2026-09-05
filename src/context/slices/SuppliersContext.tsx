import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Supplier } from '../../types';
import { apiClient } from '../../services/apiClient';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';
import { savePendingChange } from '../shared/syncQueue';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

interface SuppliersContextType {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  importSuppliers: (newSuppliers: Partial<Supplier>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined);

export const SuppliersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = safeStorageGet<Supplier[]>(LOCAL_STORAGE_PREFIX + 'suppliers', []);
    return Array.isArray(saved) ? saved : [];
  });

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
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    apiClient.updateSupplier(id, updates).catch((err) => {
      console.warn('[Supplier] Sync update failed:', err);
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

  const importSuppliers = (newSuppliers: Partial<Supplier>[], overwrite: boolean = false) => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Nhà cung cấp!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    const skipped = 0;

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

      return Array.from(supMap.values());
    });

    showToast(`Nhập dữ liệu nhà cung cấp thành công: Thêm mới ${inserted}, Cập nhật ${updated}`, 'success');
    return { inserted, updated, skipped };
  };

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'suppliers', suppliers);
    cacheManager.set('suppliers', suppliers);
  }, [suppliers]);

  const value = useMemo<SuppliersContextType>(
    () => ({ suppliers, setSuppliers, addSupplier, updateSupplier, deleteSupplier, importSuppliers }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppliers, currentUser, showToast]
  );

  return <SuppliersContext.Provider value={value}>{children}</SuppliersContext.Provider>;
};

export const useSuppliers = (): SuppliersContextType => {
  const context = useContext(SuppliersContext);
  if (!context) {
    throw new Error('useSuppliers must be used within a SuppliersProvider');
  }
  return context;
};
