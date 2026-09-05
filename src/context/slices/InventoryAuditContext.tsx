import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { InventoryAudit } from '../../types';
import { parseDateToTimestamp } from '../../utils/formatters';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';

// Slice này chỉ giữ state thuần. createInventoryAudit/balanceInventoryAudit ghi thẳng vào
// Catalog (stock sản phẩm) nên nằm ở orchestrator (useCatalogOrchestrator.ts), không nằm ở đây.
interface InventoryAuditContextType {
  inventoryAudits: InventoryAudit[];
  setInventoryAudits: React.Dispatch<React.SetStateAction<InventoryAudit[]>>;
}

const InventoryAuditContext = createContext<InventoryAuditContextType | undefined>(undefined);

export const InventoryAuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>(() => {
    const saved = safeStorageGet<InventoryAudit[]>(LOCAL_STORAGE_PREFIX + 'audits', []);
    const raw: InventoryAudit[] = Array.isArray(saved) ? saved : [];
    return raw.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  });

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'audits', inventoryAudits, 50);
    cacheManager.set('audits', inventoryAudits);
  }, [inventoryAudits]);

  const value = useMemo<InventoryAuditContextType>(
    () => ({ inventoryAudits, setInventoryAudits }),
    [inventoryAudits]
  );

  return <InventoryAuditContext.Provider value={value}>{children}</InventoryAuditContext.Provider>;
};

export const useInventoryAudit = (): InventoryAuditContextType => {
  const context = useContext(InventoryAuditContext);
  if (!context) {
    throw new Error('useInventoryAudit must be used within an InventoryAuditProvider');
  }
  return context;
};
