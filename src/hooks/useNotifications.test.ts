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
    expect(result.current.notifications[0].contentKey).toBe('stock:prod-pen');
    expect(result.current.notifications[0].isRead).toBe(false);

    // Người dùng đánh dấu đã đọc
    act(() => {
      result.current.markAsRead(result.current.notifications[0].id);
    });
    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);

    // Lần sau: re-render hoặc dữ liệu products được cập nhật lại (bút vẫn còn stock: 2)
    mockProducts = [
      {
        ...mockProducts[0],
        stock: 1, // Kho vẫn thấp
      },
    ];
    rerender();

    // Thông báo KHÔNG bị nhân đôi, không bị reset trạng thái isRead!
    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
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
});
