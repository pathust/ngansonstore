import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { CashbookEntry } from '../../types';
import { formatDateTime, parseDateToTimestamp, getCurrentVietnameseDateTime } from '../../utils/formatters';
import { apiClient } from '../../services/apiClient';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';
import { savePendingChange } from '../shared/syncQueue';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { useUiShell } from './UiShellContext';

interface CashbookContextType {
  cashbookEntries: CashbookEntry[];
  setCashbookEntries: React.Dispatch<React.SetStateAction<CashbookEntry[]>>;
  addCashbookEntry: (entry: Omit<CashbookEntry, 'id' | 'code' | 'created_at' | 'branch'>) => CashbookEntry;
  deleteCashbookEntry: (id: string) => void;
  importCashbook: (newEntries: Partial<CashbookEntry>[], overwrite?: boolean) => { inserted: number; updated: number; skipped: number };
}

const CashbookContext = createContext<CashbookContextType | undefined>(undefined);

export const CashbookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { currentBranch } = useUiShell();

  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>(() => {
    const saved = safeStorageGet<CashbookEntry[]>(LOCAL_STORAGE_PREFIX + 'cashbook', []);
    const raw: CashbookEntry[] = Array.isArray(saved) ? saved : [];
    return raw
      .map((c) => ({ ...c, created_at: formatDateTime(c.created_at) }))
      .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
  });

  const addCashbookEntry = (entry: Omit<CashbookEntry, 'id' | 'code' | 'created_at' | 'branch'>): CashbookEntry => {
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
      [newEntry, ...prev].sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at))
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

  React.useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'cashbook', cashbookEntries, 100);
    cacheManager.set('cashbook', cashbookEntries);
  }, [cashbookEntries]);

  const value = useMemo<CashbookContextType>(
    () => ({ cashbookEntries, setCashbookEntries, addCashbookEntry, deleteCashbookEntry, importCashbook }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cashbookEntries, currentUser, currentBranch, showToast]
  );

  return <CashbookContext.Provider value={value}>{children}</CashbookContext.Provider>;
};

export const useCashbook = (): CashbookContextType => {
  const context = useContext(CashbookContext);
  if (!context) {
    throw new Error('useCashbook must be used within a CashbookProvider');
  }
  return context;
};
