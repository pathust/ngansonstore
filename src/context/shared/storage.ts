// Tiện ích localStorage dùng chung cho mọi slice — port nguyên trạng từ AppContext.tsx gốc.
// Giữ nguyên prefix để không mất dữ liệu người dùng cũ khi nâng cấp lên kiến trúc slice.

export const LOCAL_STORAGE_PREFIX = 'omnierp_pro_';
const MOCK_CLEANED_FLAG = 'omnierp_cleaned_all_garbage_mock_v6';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Placeholder an toàn khi bản ghi user thiếu password — không phải mật khẩu thật,
// người dùng cần được admin đặt lại mật khẩu qua tính năng resetUserPassword.
export const generatePlaceholderPassword = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

// Dọn 1 lần các cache localStorage quá khổ từ phiên bản cũ — chỉ chạy 1 lần nhờ MOCK_CLEANED_FLAG.
export function runLegacyStorageCleanupOnce() {
  if (typeof window === 'undefined' || localStorage.getItem(MOCK_CLEANED_FLAG)) return;
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
