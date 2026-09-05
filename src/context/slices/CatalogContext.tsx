import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Product, Category } from '../../types';
import { apiClient } from '../../services/apiClient';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';
import { savePendingChange } from '../shared/syncQueue';
import { useToast } from './ToastContext';

// Slice này chỉ giữ state thuần + CRUD đơn giản (không đụng domain khác).
// addProduct/receiveStockWithWeightedCost/receiveStockVoucher/price-audit fns cần ghi Cashbook/StoreSettings
// nên nằm ở orchestrator (src/context/orchestrators/useCatalogOrchestrator.ts), không nằm ở slice này.
interface CatalogContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = safeStorageGet<Product[]>(LOCAL_STORAGE_PREFIX + 'products', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const parsed = safeStorageGet<Category[]>(LOCAL_STORAGE_PREFIX + 'categories', []);
    return Array.isArray(parsed) ? parsed : [];
  });

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
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

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'products', products, 300);
    cacheManager.set('products', products);
  }, [products]);

  const value = useMemo<CatalogContextType>(
    () => ({ products, setProducts, categories, setCategories, updateProduct, deleteProduct }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, categories, showToast]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogContextType => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
