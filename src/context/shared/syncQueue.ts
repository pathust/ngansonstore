// Hàng đợi đồng bộ offline dùng chung cho mọi slice — port nguyên trạng từ AppContext.tsx gốc
// (pendingChangesRef + savePendingChange), chuyển từ useRef trong 1 component thành singleton
// cấp module vì bản chất là side-channel imperative, không phải state cần re-render theo.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PendingChanges = Record<string, any>;

const PENDING_SYNC_KEY = 'nganson_pending_sync';

function emptyPendingChanges(): PendingChanges {
  return {
    settings: null,
    products: [],
    orders: [],
    suppliers: [],
    customers: [],
    inventory_audits: [],
    cashbook: [],
  };
}

let pendingChanges: PendingChanges = emptyPendingChanges();
let loadedFromStorage = false;

function ensureLoaded() {
  if (loadedFromStorage || typeof window === 'undefined') return;
  loadedFromStorage = true;
  const saved = localStorage.getItem(PENDING_SYNC_KEY);
  if (saved) {
    try {
      pendingChanges = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse pending sync:', e);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function savePendingChange(type: string, item: any) {
  ensureLoaded();
  if (!item) return;
  if (type === 'settings') {
    pendingChanges.settings = item;
  } else {
    if (!pendingChanges[type]) {
      pendingChanges[type] = [];
    }
    const arr = pendingChanges[type];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = arr.findIndex((x: any) => x.id === item.id);
    if (idx >= 0) {
      arr[idx] = item;
    } else {
      arr.push(item);
    }
  }
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingChanges));
}

export function getPendingChanges(): PendingChanges {
  ensureLoaded();
  return pendingChanges;
}

export function hasPendingChanges(): boolean {
  const pending = getPendingChanges();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!pending.settings || Object.values(pending).some((arr: any) => Array.isArray(arr) && arr.length > 0);
}

export function clearPendingChanges() {
  pendingChanges = emptyPendingChanges();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PENDING_SYNC_KEY);
  }
}

// Port nguyên trạng từ AppContext.tsx gốc — so sánh nông cho mảng rỗng, sâu (JSON) cho phần còn lại.
export function isDataEqual<T>(prev: T, next: T): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;
    if (prev.length === 0 && next.length === 0) return true;
  }
  try {
    return JSON.stringify(prev) === JSON.stringify(next);
  } catch {
    return false;
  }
}
