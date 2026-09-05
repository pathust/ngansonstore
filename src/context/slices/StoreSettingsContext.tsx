import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { StoreSettings } from '../../types';
import { apiClient } from '../../services/apiClient';
import { supabaseService } from '../../services/supabaseService';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';
import { savePendingChange } from '../shared/syncQueue';
import { useToast } from './ToastContext';

export const INITIAL_STORE_SETTINGS: StoreSettings = {
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

interface StoreSettingsContextType {
  storeSettings: StoreSettings;
  setStoreSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  updateStoreSettings: (updates: Partial<StoreSettings>) => void;
  resetStoreSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export const StoreSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

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

  const value = useMemo<StoreSettingsContextType>(
    () => ({ storeSettings, setStoreSettings, updateStoreSettings, resetStoreSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeSettings]
  );

  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
};

export const useStoreSettings = (): StoreSettingsContextType => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};
