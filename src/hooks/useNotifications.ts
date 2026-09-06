import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { parseDateToTimestamp } from '../utils/formatters';

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Lỗi lưu notifications vào localStorage:', err);
  }
}

export function useNotifications() {
  const { products, orders, customers } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadPersistedNotifications()
  );

  // Đồng bộ và sinh thông báo mới với quy tắc:
  // 1. Sắp xếp theo trình tự thời gian (mới nhất trước).
  // 2. Cùng 1 nội dung / sản phẩm thì KHÔNG lặp lại (đã thông báo rồi thì không sinh thêm lần nữa).
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

      // 1. Thông báo đơn hàng mới (mỗi đơn hàng tạo 1 thông báo theo thời gian của đơn)
      orders.forEach((o) => {
        const contentKey = `order:${o.id}`;
        if (!existingByKey.has(contentKey)) {
          const ts = parseDateToTimestamp(o.created_at) || now;
          const newNotif: AppNotification = {
            id: `order-${o.id}`,
            contentKey,
            type: 'ORDER',
            title: `Đã bán đơn hàng trị giá ${(o.final_amount || 0).toLocaleString('vi-VN')} đ`,
            description: `Mã đơn: #${o.code} - ${o.customer_name || 'Khách lẻ'}`,
            timestamp: ts,
            isRead: false,
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
      // - Đã nạp đầy hàng (stock > min_stock): KHÔNG tự động xóa thông báo! Thông báo vẫn lưu trong danh sách
      //   đến khi người dùng tự bấm xóa. Hệ thống đánh dấu isResolved = true để chu kỳ tiếp theo nếu thiếu/hết hàng
      //   thì sẽ phát thông báo mới.
      products.forEach((p) => {
        const minStock = p.min_stock ?? 5;
        const currentStock = p.stock ?? 0;

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
          // Trạng thái: HẾT HÀNG
          const isAlreadyOutNotified =
            oldNotif?.meta?.stockState === 'OUT' ||
            oldNotif?.contentKey.startsWith(`stock:${p.id}:OUT`);

          if (!isAlreadyOutNotified) {
            // Nếu trước đó đang có thông báo "dưới tồn" trong cùng chu kỳ -> xóa bỏ để thay thế bằng thông báo "hết hàng" mới
            if (oldNotifIndex !== -1) {
              updatedList.splice(oldNotifIndex, 1);
            }
            const newNotif: AppNotification = {
              id: `stock-out-${p.id}-${now}`,
              contentKey: `stock:${p.id}:OUT:${now}`,
              type: 'STOCK',
              title: 'Hàng hóa đã hết hàng',
              description: `${p.name} hiện đã hết hàng trong kho (tồn: ${currentStock} ${p.unit || 'Cái'})`,
              timestamp: now,
              isRead: false,
              meta: { productId: p.id, stockState: 'OUT', isResolved: false },
            };
            updatedList.push(newNotif);
            hasChanges = true;
          }
        } else if (currentStock <= minStock) {
          // Trạng thái: DƯỚI ĐỊNH MỨC TỒN (Sắp hết)
          const isAlreadyLowNotified =
            oldNotif?.meta?.stockState === 'LOW' ||
            oldNotif?.contentKey.startsWith(`stock:${p.id}:LOW`) ||
            oldNotif?.contentKey === `stock:${p.id}`;

          if (!isAlreadyLowNotified) {
            // Nếu có thông báo cũ chưa giải quyết khác trạng thái -> thay thế
            if (oldNotifIndex !== -1) {
              updatedList.splice(oldNotifIndex, 1);
            }
            const newNotif: AppNotification = {
              id: `stock-low-${p.id}-${now}`,
              contentKey: `stock:${p.id}:LOW:${now}`,
              type: 'STOCK',
              title: 'Hàng hóa sắp hết',
              description: `${p.name} chỉ còn ${currentStock} ${p.unit || 'Cái'}`,
              timestamp: now,
              isRead: false,
              meta: { productId: p.id, stockState: 'LOW', isResolved: false },
            };
            updatedList.push(newNotif);
            hasChanges = true;
          }
        } else {
          // Trạng thái: ĐÃ NẠP ĐỦ HÀNG (stock > min_stock)
          // THEO CÁCH 3: KHÔNG tự động xóa thông báo khi nạp đầy hàng!
          // Thông báo vẫn giữ nguyên trong danh sách để người dùng xem và chỉ xóa khi người dùng bấm xóa (thùng rác).
          // Đánh dấu isResolved = true để chu kỳ tiếp theo nếu lại thiếu hàng thì sẽ phát thông báo mới.
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
  }, []);

  // Đọc tất cả thông báo
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      savePersistedNotifications(updated);
      return updated;
    });
  }, []);

  // Xóa / Bỏ qua thông báo
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isDismissed: true } : n));
      savePersistedNotifications(updated);
      return updated;
    });
  }, []);

  // Xóa tất cả thông báo
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    savePersistedNotifications([]);
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
  };
}
