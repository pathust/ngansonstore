import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications, formatRelativeTime } from './useNotifications';
import { Order, Product, Customer } from '../types';

let mockProducts: Product[] = [];
let mockOrders: Order[] = [];
let mockCustomers: Customer[] = [];

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    products: mockProducts,
    orders: mockOrders,
    customers: mockCustomers,
  }),
}));

describe('formatRelativeTime', () => {
  it('định dạng đúng các khoảng thời gian tương đối', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10 * 1000)).toBe('Vừa xong');
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5 phút trước');
    expect(formatRelativeTime(now - 3 * 3600 * 1000)).toBe('3 giờ trước');
    expect(formatRelativeTime(now - 2 * 24 * 3600 * 1000)).toBe('2 ngày trước');
  });
});

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
    mockProducts = [];
    mockOrders = [];
    mockCustomers = [];
  });

  it('sắp xếp thông báo theo trình tự thời gian chính xác (mới nhất trước)', () => {
    mockOrders = [
      {
        id: 'ord-old',
        code: 'HD001',
        branch: 'CN1',
        customer_name: 'Khách 1',
        phone: '',
        cashier: 'A',
        status: 'COMPLETED',
        payment_method: 'CASH',
        items: [],
        total: 100000,
        discount: 0,
        final_amount: 100000,
        total_cost: 80000,
        profit: 20000,
        created_at: '2026-09-01 10:00:00',
      },
      {
        id: 'ord-new',
        code: 'HD003',
        branch: 'CN1',
        customer_name: 'Khách 3',
        phone: '',
        cashier: 'A',
        status: 'COMPLETED',
        payment_method: 'CASH',
        items: [],
        total: 300000,
        discount: 0,
        final_amount: 300000,
        total_cost: 200000,
        profit: 100000,
        created_at: '2026-09-05 15:30:00',
      },
      {
        id: 'ord-mid',
        code: 'HD002',
        branch: 'CN1',
        customer_name: 'Khách 2',
        phone: '',
        cashier: 'A',
        status: 'COMPLETED',
        payment_method: 'CASH',
        items: [],
        total: 200000,
        discount: 0,
        final_amount: 200000,
        total_cost: 150000,
        profit: 50000,
        created_at: '2026-09-03 09:15:00',
      },
    ];

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications.length).toBe(3);
    // Phải sắp xếp thứ tự: mới nhất (HD003 - ngày 05/09) -> giữa (HD002 - 03/09) -> cũ nhất (HD001 - 01/09)
    expect(result.current.notifications[0].id).toBe('order-ord-new');
    expect(result.current.notifications[1].id).toBe('order-ord-mid');
    expect(result.current.notifications[2].id).toBe('order-ord-old');
  });

  it('cùng 1 nội dung thì KHÔNG lặp lại (ví dụ bút sắp hết, lần sau không báo lặp lại tiếp)', () => {
    mockProducts = [
      {
        id: 'prod-pen',
        sku: 'SP001',
        barcode: '123',
        name: 'Bút bi Thiên Long',
        category: 'Văn phòng phẩm',
        unit: 'Cây',
        cost_price: 3000,
        selling_price: 5000,
        stock: 2, // Sắp hết (min_stock mặc định là 5)
        min_stock: 5,
        status: 'ACTIVE',
      },
    ];

    const { result, rerender } = renderHook(() => useNotifications());

    // Lần 1: Có 1 thông báo bút sắp hết
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].contentKey).toMatch(/^stock:prod-pen:LOW/);
    expect(result.current.notifications[0].title).toBe('Hàng hóa sắp hết');
    expect(result.current.notifications[0].isRead).toBe(false);

    // Người dùng đánh dấu đã đọc
    act(() => {
      result.current.markAsRead(result.current.notifications[0].id);
    });
    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);

    // Lần sau: re-render hoặc dữ liệu products được cập nhật lại (bút vẫn còn stock: 1, vẫn dưới tồn)
    mockProducts = [
      {
        ...mockProducts[0],
        stock: 1, // Kho vẫn thấp
      },
    ];
    rerender();

    // Thông báo KHÔNG bị nhân đôi, không bị reset trạng thái isRead!
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].contentKey).toMatch(/^stock:prod-pen:LOW/);
    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('khi sản phẩm từ dưới tồn sang hết hàng thì có thông báo mới là hết để thay thế cho dưới tồn', () => {
    mockProducts = [
      {
        id: 'prod-pencil',
        sku: 'SP002',
        barcode: '456',
        name: 'Bút chì 2B',
        category: 'Văn phòng phẩm',
        unit: 'Cây',
        cost_price: 2000,
        selling_price: 4000,
        stock: 2, // Dưới tồn (min_stock: 5)
        min_stock: 5,
        status: 'ACTIVE',
      },
    ];

    const { result, rerender } = renderHook(() => useNotifications());

    // Giai đoạn 1: Đang dưới định mức tồn
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].title).toBe('Hàng hóa sắp hết');
    expect(result.current.notifications[0].contentKey).toMatch(/^stock:prod-pencil:LOW/);
    expect(result.current.notifications[0].isRead).toBe(false);

    // Người dùng đã đọc thông báo dưới tồn
    act(() => {
      result.current.markAsRead(result.current.notifications[0].id);
    });
    expect(result.current.unreadCount).toBe(0);

    // Giai đoạn 2: Bán hết hàng -> Tồn kho chuyển sang 0 (hết hàng)
    mockProducts = [
      {
        ...mockProducts[0],
        stock: 0, // Hết hàng!
      },
    ];
    rerender();

    // Thông báo "Hết hàng" MỚI được sinh ra để THAY THẾ cho thông báo dưới tồn cũ
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].title).toBe('Hàng hóa đã hết hàng');
    expect(result.current.notifications[0].contentKey).toMatch(/^stock:prod-pencil:OUT/);
    expect(result.current.notifications[0].meta?.stockState).toBe('OUT');
    expect(result.current.notifications[0].isRead).toBe(false); // Thông báo mới chưa đọc
    expect(result.current.unreadCount).toBe(1);

    // Giai đoạn 3: Re-render tiếp với tồn kho 0 -> Không bị lặp lại thông báo hết hàng
    rerender();
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].contentKey).toMatch(/^stock:prod-pencil:OUT/);

    // Giai đoạn 4: Nhập hàng mới (tồn kho lên 50 vượt định mức tồn) -> Theo Cách 3: KHÔNG tự xóa thông báo!
    mockProducts = [
      {
        ...mockProducts[0],
        stock: 50,
      },
    ];
    rerender();
    // Thông báo vẫn còn lưu trong danh sách cho người dùng theo dõi
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].meta?.isResolved).toBe(true);

    // Giai đoạn 5: Chỉ xóa khi người dùng bấm nút xóa (thùng rác)
    const notifId = result.current.notifications[0].id;
    act(() => {
      result.current.dismissNotification(notifId);
    });
    expect(result.current.notifications.length).toBe(0);
  });

  it('đánh dấu đọc tất cả và ẩn thông báo', () => {
    mockProducts = [
      {
        id: 'p1',
        sku: 'SP1',
        barcode: '',
        name: 'Sản phẩm 1',
        category: 'Nhóm 1',
        unit: 'Cái',
        cost_price: 1000,
        selling_price: 2000,
        stock: 1,
        min_stock: 5,
        status: 'ACTIVE',
      },
    ];
    mockCustomers = [
      {
        id: 'c1',
        code: 'KH001',
        name: 'Nguyễn Văn Nợ',
        phone: '0901234567',
        debt: 500000,
        total_purchased: 1000000,
        status: 'ACTIVE',
      },
    ];

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications.length).toBe(2);
    expect(result.current.unreadCount).toBe(2);

    // Đọc tất cả
    act(() => {
      result.current.markAllAsRead();
    });
    expect(result.current.unreadCount).toBe(0);

    // Ẩn 1 thông báo
    const firstId = result.current.notifications[0].id;
    act(() => {
      result.current.dismissNotification(firstId);
    });
    expect(result.current.notifications.length).toBe(1);
  });

  it('giữ nguyên mốc thời gian gốc của sản phẩm đã hết hàng từ trước (không bị reset thành Vừa xong)', () => {
    const historicalTime = new Date('2026-08-01T10:00:00.000Z').getTime();
    mockProducts = [
      {
        id: 'prod-hist',
        sku: 'SP-OLD',
        barcode: '',
        name: 'Hàng đã hết từ tháng trước',
        category: 'Test',
        unit: 'Cái',
        cost_price: 10000,
        selling_price: 20000,
        stock: 0, // Hết hàng
        min_stock: 5,
        status: 'ACTIVE',
        updated_at: new Date(historicalTime).toISOString(),
      },
    ];

    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].timestamp).toBe(historicalTime);
    expect(formatRelativeTime(result.current.notifications[0].timestamp)).not.toBe('Vừa xong');
  });
});
