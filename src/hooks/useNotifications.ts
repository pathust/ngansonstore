import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { parseDateToTimestamp } from '../utils/formatters';
import { supabase } from '../services/supabase';

export interface AppNotification {
  id: string;
  contentKey: string;
  type: 'STOCK' | 'ORDER' | 'CASHBOOK' | 'AUDIT';
  title: string;
  description: string;
  timestamp: number; // Thời gian thực tế của sự kiện
  isRead: boolean;
  isDismissed?: boolean;
  meta?: {
    productId?: string;
    stockState?: 'LOW' | 'OUT';
    isResolved?: boolean;
    orderId?: string;
    customerId?: string;
  };
}

const STORAGE_KEY = 'nganson_notifications_v3';

// Chỉ tự sinh thông báo tồn kho/đơn hàng cho sự kiện trong khoảng thời gian gần đây —
// tránh việc dữ liệu lịch sử (hàng nghìn đơn/sản phẩm cũ) làm ngập trung tâm thông báo.
// Phải khớp với NOTIFICATION_RECENT_WINDOW_MS ở server/db.ts.
const NOTIFICATION_RECENT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Định dạng thời gian tương đối tiếng Việt chính xác
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const msAgo = Math.max(0, now - timestamp);
  const sec = Math.floor(msAgo / 1000);
  if (sec < 60) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  const month = Math.floor(day / 30);
  return `${month} tháng trước`;
}

function loadPersistedNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (n) => n && typeof n.id === 'string' && typeof n.timestamp === 'number'
      );
    }
  } catch (err) {
    console.warn('Lỗi đọc notifications từ localStorage:', err);
  }
  return [];
}

function savePersistedNotifications(list: AppNotification[]) {
  if (typeof window === 'undefined') return;
  // Dữ liệu đầy đủ lưu ở backend. Cache local chỉ lưu 20 thông báo gần đây nhất.
  // Tuyệt đối không xóa hay dọn dẹp các key cũ của người dùng.
  const recentList = list.slice(0, 20);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentList));
  } catch {
    // Nếu localStorage bị đầy bởi các dữ liệu khác, không throw lỗi và không xóa rác cũ
  }
}

export function useNotifications() {
  const { products, orders, customers } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadPersistedNotifications()
  );

  // 1. Tải thông báo từ backend API để lấy mốc thời gian chính xác đã lưu
  const fetchBackend = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
          savePersistedNotifications(json.data);
        }
      }
    } catch {
      // Fallback offline / test environment
    }
  }, []);

  useEffect(() => {
    fetchBackend();
  }, [fetchBackend]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOrderCreated = () => {
      fetchBackend();
    };
    window.addEventListener('app:order-created', handleOrderCreated);
    return () => window.removeEventListener('app:order-created', handleOrderCreated);
  }, [fetchBackend]);

  // 1b. Đồng bộ tức thì đa thiết bị qua Supabase Realtime: bất kỳ thay đổi nào
  // (tạo/đọc/xóa thông báo) ở server hoặc thiết bị khác đều đẩy thẳng về đây
  // qua Postgres, không cần polling. Debounce nhẹ vì nhiều thay đổi có thể
  // dồn về cùng lúc (VD: đọc tất cả = update hàng loạt dòng).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchBackend, 400);
    };

    const channelName = `notifications-realtime-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchBackend]);

  // 2. Đồng bộ và sinh thông báo mới với quy tắc:
  // - Sắp xếp theo trình tự thời gian (mới nhất trước).
  // - Cùng 1 nội dung / sản phẩm thì KHÔNG lặp lại.
  // - Hàng hết từ trước thì giữ nguyên mốc thời gian gốc (không reset thành "vừa xong").
  useEffect(() => {
    setNotifications((prevList) => {
      // Map lưu các thông báo đã có theo contentKey để kiểm tra trùng lặp
      const existingByKey = new Map<string, AppNotification>();
      prevList.forEach((n) => {
        existingByKey.set(n.contentKey, n);
      });

      const updatedList = [...prevList];
      let hasChanges = false;
      const now = Date.now();
      const cutoff = now - NOTIFICATION_RECENT_WINDOW_MS;

      // 1. Thông báo đơn hàng mới (mỗi đơn hàng tạo 1 thông báo theo thời gian của đơn)
      orders.forEach((o) => {
        const contentKey = `order:${o.id}`;
        if (!existingByKey.has(contentKey)) {
          const ts = parseDateToTimestamp(o.created_at) || now;
          if (ts < cutoff) return; // Đơn hàng quá cũ, không tạo thông báo mới cho lịch sử
          const newNotif: AppNotification = {
            id: `notif-order-${o.id}`,
            contentKey,
            type: 'ORDER',
            title: 'Tạo đơn thành công',
            description: `Mã đơn #${o.code} - ${o.customer_name || 'Khách lẻ'} - ${(o.final_amount || 0).toLocaleString('vi-VN')} đ`,
            timestamp: ts,
            isRead: false,
            meta: { orderId: o.id },
          };
          existingByKey.set(contentKey, newNotif);
          updatedList.push(newNotif);
          hasChanges = true;
        }
      });

      // 2. Thông báo tồn kho (Dưới định mức tồn & Hết hàng)
      // QUY TẮC CÁCH 3:
      // - Dưới định mức tồn (0 < stock <= min_stock): Báo "Hàng hóa sắp hết" (không lặp lại cùng nội dung).
      // - Hết hàng (stock <= 0): Tạo thông báo mới "Hàng hóa đã hết hàng" THAY THẾ cho thông báo dưới tồn cũ.
      // - Đã nạp đầy hàng (stock > min_stock): KHÔNG tự động xóa thông báo! Đánh dấu isResolved = true.
      // - GIỮ NGUYÊN mốc thời gian gốc (updated_at/created_at của sản phẩm) để không bị báo "vừa xong" khi đã hết từ trước!
      products.forEach((p) => {
        const minStock = p.min_stock ?? 5;
        const currentStock = p.stock ?? 0;

        // Xác định mốc thời gian gốc của sản phẩm
        const pTime = p.updated_at ? new Date(p.updated_at).getTime() : (p.created_at ? new Date(p.created_at).getTime() : now);
        const originalTimestamp = isNaN(pTime) ? now : pTime;

        // Tìm thông báo tồn kho CHƯA GIẢI QUYẾT của sản phẩm này trong chu kỳ hiện tại
        const oldNotifIndex = updatedList.findIndex(
          (n) =>
            n.type === 'STOCK' &&
            !n.meta?.isResolved &&
            (n.meta?.productId === p.id ||
              n.contentKey.startsWith(`stock:${p.id}:`) ||
              n.contentKey === `stock:${p.id}`)
        );
        const oldNotif = oldNotifIndex !== -1 ? updatedList[oldNotifIndex] : undefined;

        if (currentStock <= 0) {
          // Sản phẩm chưa từng được thông báo và đã hết hàng quá lâu -> bỏ qua
          if (oldNotifIndex === -1 && originalTimestamp < cutoff) return;
          // Trạng thái: HẾT HÀNG
          const isAlreadyOutNotified =
            oldNotif?.meta?.stockState === 'OUT' ||
            oldNotif?.contentKey.startsWith(`stock:${p.id}:OUT`);

          if (!isAlreadyOutNotified) {
            // Nếu trước đó đang có thông báo "dưới tồn" trong cùng chu kỳ -> xóa bỏ để thay thế bằng "hết hàng"
            if (oldNotifIndex !== -1) {
              updatedList.splice(oldNotifIndex, 1);
            }
            const newNotif: AppNotification = {
              id: `notif-stock-out-${p.id}`,
              contentKey: `stock:${p.id}:OUT`,
              type: 'STOCK',
              title: 'Hàng hóa đã hết hàng',
              description: `${p.name} hiện đã hết hàng trong kho (tồn: ${currentStock} ${p.unit || 'Cái'})`,
              timestamp: originalTimestamp,
              isRead: false,
              meta: { productId: p.id, stockState: 'OUT', isResolved: false },
            };
            updatedList.push(newNotif);
            hasChanges = true;
          }
        } else if (currentStock <= minStock) {
          // Sản phẩm chưa từng được thông báo và đã sắp hết quá lâu -> bỏ qua
          if (oldNotifIndex === -1 && originalTimestamp < cutoff) return;
          // Trạng thái: DƯỚI ĐỊNH MỨC TỒN (Sắp hết)
          const isAlreadyLowNotified =
            oldNotif?.meta?.stockState === 'LOW' ||
            oldNotif?.contentKey.startsWith(`stock:${p.id}:LOW`) ||
            oldNotif?.contentKey === `stock:${p.id}`;

          if (!isAlreadyLowNotified) {
            if (oldNotifIndex !== -1) {
              updatedList.splice(oldNotifIndex, 1);
            }
            const newNotif: AppNotification = {
              id: `notif-stock-low-${p.id}`,
              contentKey: `stock:${p.id}:LOW`,
              type: 'STOCK',
              title: 'Hàng hóa sắp hết',
              description: `${p.name} chỉ còn ${currentStock} ${p.unit || 'Cái'}`,
              timestamp: originalTimestamp,
              isRead: false,
              meta: { productId: p.id, stockState: 'LOW', isResolved: false },
            };
            updatedList.push(newNotif);
            hasChanges = true;
          }
        } else {
          // Trạng thái: ĐÃ NẠP ĐỦ HÀNG (stock > min_stock)
          if (oldNotif && !oldNotif.meta?.isResolved) {
            oldNotif.meta = { ...oldNotif.meta, isResolved: true };
            hasChanges = true;
          }
        }
      });

      // 3. Thông báo công nợ khách hàng (mỗi khách hàng còn nợ chỉ thông báo 1 lần)
      customers.forEach((c) => {
        const debt = c.debt || 0;
        if (debt > 0) {
          const contentKey = `debt:${c.id}`;
          if (!existingByKey.has(contentKey)) {
            const newNotif: AppNotification = {
              id: `debt-${c.id}`,
              contentKey,
              type: 'CASHBOOK',
              title: `${c.name} còn công nợ chưa thanh toán`,
              description: `Số tiền nợ hiện tại: ${debt.toLocaleString('vi-VN')} đ`,
              timestamp: now,
              isRead: false,
            };
            existingByKey.set(contentKey, newNotif);
            updatedList.push(newNotif);
            hasChanges = true;
          }
        }
      });

      // 4. Sắp xếp theo trình tự thời gian chính xác (Mới nhất ở trên cùng)
      updatedList.sort((a, b) => b.timestamp - a.timestamp);

      // Giới hạn tối đa 200 thông báo để tiết kiệm bộ nhớ
      const trimmedList = updatedList.slice(0, 200);

      if (hasChanges || trimmedList.length !== prevList.length) {
        savePersistedNotifications(trimmedList);
        return trimmedList;
      }
      return prevList;
    });
  }, [products, orders, customers]);

  // Đánh dấu 1 thông báo đã đọc
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      savePersistedNotifications(updated);
      return updated;
    });
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' }).catch(() => {});
    }
  }, []);

  // Đọc tất cả thông báo
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      savePersistedNotifications(updated);
      return updated;
    });
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/notifications/read-all', { method: 'PUT' }).catch(() => {});
    }
  }, []);

  // Xóa / Bỏ qua thông báo
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isDismissed: true } : n));
      savePersistedNotifications(updated);
      return updated;
    });
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  // Xóa tất cả thông báo
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    savePersistedNotifications([]);
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/notifications', { method: 'DELETE' }).catch(() => {});
    }
  }, []);

  // Danh sách hiển thị (loại bỏ những mục đã dismiss, sắp xếp theo thời gian)
  const activeNotifications = useMemo(() => {
    return notifications
      .filter((n) => !n.isDismissed)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications]);

  // Số lượng thông báo chưa đọc
  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !n.isRead).length;
  }, [activeNotifications]);

  return {
    notifications: activeNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    refetch: fetchBackend,
  };
}
