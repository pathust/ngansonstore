import React, { useEffect, useRef, useState } from 'react';
import { Product } from '../../types';
import { apiClient } from '../../services/apiClient';
import { supabaseService } from '../../services/supabaseService';
import { backgroundWorker } from '../../services/backgroundWorker';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageSet, generatePlaceholderPassword } from '../shared/storage';
import { getPendingChanges, hasPendingChanges, clearPendingChanges, isDataEqual } from '../shared/syncQueue';
import { useToast } from '../slices/ToastContext';
import { useAuth } from '../slices/AuthContext';
import { useUiShell } from '../slices/UiShellContext';
import { useStoreSettings } from '../slices/StoreSettingsContext';
import { useCatalog } from '../slices/CatalogContext';
import { useSuppliers } from '../slices/SuppliersContext';
import { useCustomers } from '../slices/CustomersContext';
import { useOrdersData } from '../slices/OrdersDataContext';
import { useOrdersCart } from '../slices/OrdersCartContext';
import { useInventoryAudit } from '../slices/InventoryAuditContext';
import { useCashbook } from '../slices/CashbookContext';

// Đồng bộ 2 chiều với backend/Supabase + sao lưu/khôi phục/xóa toàn bộ dữ liệu.
// Đây là orchestrator rộng nhất — đọc/ghi setter của MỌI slice, port nguyên trạng từ AppContext.tsx gốc.
// syncWithServer/backup-restore chỉ nên được gọi từ 1 nơi duy nhất (useAppCompat ở gốc cây provider).
export function useDataSync() {
  const { showToast } = useToast();
  const { users, setUsers, currentUser, setCurrentUser } = useAuth();
  const { branches, setBranches, setCurrentBranch } = useUiShell();
  const { storeSettings, setStoreSettings } = useStoreSettings();
  const { products, categories, setProducts, setCategories } = useCatalog();
  const { suppliers, setSuppliers } = useSuppliers();
  const { customers, setCustomers } = useCustomers();
  const { orders, setOrders } = useOrdersData();
  const { setOrderTabs, setActiveTabId } = useOrdersCart();
  const { inventoryAudits, setInventoryAudits } = useInventoryAudit();
  const { cashbookEntries, setCashbookEntries } = useCashbook();

  const [syncState, setSyncState] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('IDLE');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const lastSyncTimeRef = useRef<number>(0);

  const syncWithServer = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setSyncState('SYNCING');
      }

      if (hasPendingChanges()) {
        try {
          await apiClient.pushSync({ ...getPendingChanges(), lastSyncTimestamp: Date.now() });
          clearPendingChanges();
          console.log('[Sync] Successfully pushed pending changes');
        } catch (pushErr: unknown) {
          const message = pushErr instanceof Error ? pushErr.message : 'Unknown error';
          console.warn('[Sync] Failed to push pending changes (will retry next cycle):', message);
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
              const username = pu.username || prevUser?.username || (pu.email ? pu.email.split('@')[0] : 'user');
              const password = pu.password || prevUser?.password || generatePlaceholderPassword();
              return { ...prevUser, ...pu, username, password };
            });
            if (isDataEqual(prev, merged)) return prev;
            safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', merged);
            return merged;
          });
          setCurrentUser((prev) => {
            const found = payload.users!.find((u) => u.id === prev?.id);
            const target = found ? { ...prev, ...found, username: found.username || prev?.username } : prev || payload.users![0];
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
      setSyncState(navigator.onLine ? 'ERROR' : 'OFFLINE');
    }
  };

  useEffect(() => {
    syncWithServer(false);

    const periodicInterval = setInterval(() => {
      if (navigator.onLine) {
        syncWithServer(true);
      }
    }, 60000);

    let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeRealtime = supabaseService.subscribeRealtime((table, eventType) => {
      console.log(`[Supabase Realtime] Event: ${eventType} on table: ${table}`);
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
      realtimeDebounceTimer = setTimeout(() => {
        syncWithServer(true);
      }, 600);
    });

    const handleOnline = () => {
      setSyncState('IDLE');
      syncWithServer(true);
    };
    const handleOffline = () => setSyncState('OFFLINE');
    const handleFocus = () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importProducts = (newProducts: Partial<Product>[], overwrite: boolean = false) => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Hàng hóa!', 'error');
      return { inserted: 0, updated: 0, skipped: 0 };
    }

    let inserted = 0;
    let updated = 0;
    const skipped = 0;

    setProducts((prev) => {
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

  // Giữ nguyên alias như bản gốc (resetToDefaultData/resetToSampleData === clearAllData).
  const resetToDefaultData = clearAllData;
  const resetToSampleData = clearAllData;

  return {
    syncState,
    isLoading,
    loadingMessage,
    syncWithServer,
    importProducts,
    importProductsProgressive,
    exportAllDataAsBackup,
    restoreDataFromBackup,
    resetToDefaultData,
    resetToSampleData,
    clearAllData,
  };
}
