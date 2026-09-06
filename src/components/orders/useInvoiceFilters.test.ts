import { describe, it, expect } from 'vitest';
import { useInvoiceFilters } from './useInvoiceFilters';
import { renderHook } from '@testing-library/react';
import { Order } from '../../types';

describe('useInvoiceFilters', () => {
  const mockOrders: Order[] = [
    {
      id: 'ord-1',
      code: 'HD004970',
      branch: 'Chi nhánh chính',
      customer_name: 'Khách lẻ',
      phone: '0901234567',
      cashier: 'Nguyễn Văn A',
      status: 'COMPLETED',
      payment_method: 'CASH',
      items: [{ product_id: 'p1', sku: 'SP1', name: 'Đèn LED 12W', unit: 'Cái', quantity: 2, price: 70000, cost_price: 50000 }],
      total: 140000,
      discount: 0,
      final_amount: 140000,
      total_cost: 100000,
      profit: 40000,
      created_at: '2026-09-05 08:09:00',
    },
    {
      id: 'ord-2',
      code: 'HD004969',
      branch: 'Chi nhánh chính',
      customer_name: 'Khách lẻ',
      phone: '',
      cashier: 'Nguyễn Văn A',
      status: 'COMPLETED',
      payment_method: 'TRANSFER',
      items: [{ product_id: 'p2', sku: 'SP2', name: 'Ổ cắm Điện Quang', unit: 'Cái', quantity: 1, price: 52000, cost_price: 35000 }],
      total: 52000,
      discount: 0,
      final_amount: 52000,
      total_cost: 35000,
      profit: 17000,
      created_at: '2026-09-04 09:26:00',
    },
    {
      id: 'ord-3',
      code: 'HD004968',
      branch: 'Chi nhánh chính',
      customer_name: 'Khách lẻ',
      phone: '',
      cashier: 'Trần Thị B',
      status: 'COMPLETED',
      payment_method: 'CASH',
      items: [{ product_id: 'p3', sku: 'SP3', name: 'Dây điện Cadivi', unit: 'Cuộn', quantity: 1, price: 110000, cost_price: 80000 }],
      total: 110000,
      discount: 10000,
      final_amount: 100000,
      total_cost: 80000,
      profit: 20000,
      created_at: '2026-09-04 09:25:00',
    },
    {
      id: 'ord-4',
      code: 'HD004967',
      branch: 'Chi nhánh chính',
      customer_name: 'Anh Minh',
      phone: '0988776655',
      cashier: 'Nguyễn Văn A',
      status: 'CANCELLED',
      payment_method: 'CASH',
      items: [{ product_id: 'p1', sku: 'SP1', name: 'Đèn LED 12W', unit: 'Cái', quantity: 1, price: 70000, cost_price: 50000 }],
      total: 70000,
      discount: 0,
      final_amount: 70000,
      total_cost: 50000,
      profit: 20000,
      created_at: '2026-09-03 10:00:00',
    },
  ];

  it('tính đúng số liệu dòng tổng kết KiotViet (Tổng tiền hàng, Giảm giá, Khách đã trả)', () => {
    const { result } = renderHook(() =>
      useInvoiceFilters({
        orders: mockOrders,
        statusFilter: 'ALL',
        paymentFilter: 'ALL',
        searchTerm: '',
        dateFilter: 'ALL',
        customStartDate: '',
        customEndDate: '',
        sortBy: 'NEWEST',
        currentPage: 1,
        pageSize: 15,
      })
    );

    // 3 đơn hoàn thành: 140,000 + 52,000 + 110,000 = 302,000 (Tổng tiền hàng)
    expect(result.current.stats.totalGrossAmount).toBe(302000);
    // Giảm giá: 0 + 0 + 10,000 = 10,000
    expect(result.current.stats.totalDiscount).toBe(10000);
    // Khách đã trả (thực thu): 140,000 + 52,000 + 100,000 = 292,000 (Khớp 100% Ảnh 4 của KiotViet!)
    expect(result.current.stats.totalPaid).toBe(292000);
    expect(result.current.stats.completedCount).toBe(3);
    expect(result.current.stats.cancelledCount).toBe(1);
  });

  it('lọc theo tìm kiếm đa tiêu chí KiotViet (Mã hóa đơn)', () => {
    const { result } = renderHook(() =>
      useInvoiceFilters({
        orders: mockOrders,
        statusFilter: 'ALL',
        paymentFilter: 'ALL',
        searchTerm: '',
        advancedSearch: {
          code: 'HD004970',
          productKeyword: '',
          customerKeyword: '',
        },
        dateFilter: 'ALL',
        customStartDate: '',
        customEndDate: '',
        sortBy: 'NEWEST',
        currentPage: 1,
        pageSize: 15,
      })
    );

    expect(result.current.filteredOrders.length).toBe(1);
    expect(result.current.filteredOrders[0].code).toBe('HD004970');
  });

  it('lọc theo tìm kiếm đa tiêu chí KiotViet (Tên mặt hàng)', () => {
    const { result } = renderHook(() =>
      useInvoiceFilters({
        orders: mockOrders,
        statusFilter: 'ALL',
        paymentFilter: 'ALL',
        searchTerm: '',
        advancedSearch: {
          code: '',
          productKeyword: 'Cadivi',
          customerKeyword: '',
        },
        dateFilter: 'ALL',
        customStartDate: '',
        customEndDate: '',
        sortBy: 'NEWEST',
        currentPage: 1,
        pageSize: 15,
      })
    );

    expect(result.current.filteredOrders.length).toBe(1);
    expect(result.current.filteredOrders[0].code).toBe('HD004968');
  });

  it('lọc theo thu ngân', () => {
    const { result } = renderHook(() =>
      useInvoiceFilters({
        orders: mockOrders,
        statusFilter: 'ALL',
        paymentFilter: 'ALL',
        cashierFilter: 'Trần Thị B',
        searchTerm: '',
        dateFilter: 'ALL',
        customStartDate: '',
        customEndDate: '',
        sortBy: 'NEWEST',
        currentPage: 1,
        pageSize: 15,
      })
    );

    expect(result.current.filteredOrders.length).toBe(1);
    expect(result.current.filteredOrders[0].cashier).toBe('Trần Thị B');
  });
});
