import { useMemo } from 'react';
import { Order } from '../../types';
import { parseDateToTimestamp } from '../../utils/formatters';

export interface UseInvoiceFiltersParams {
  orders: Order[];
  statusFilter: 'ALL' | 'COMPLETED' | 'CANCELLED';
  paymentFilter: 'ALL' | 'CASH' | 'TRANSFER' | 'CARD';
  searchTerm: string;
  advancedSearch?: {
    code: string;
    productKeyword: string;
    customerKeyword: string;
  };
  cashierFilter?: string;
  dateFilter: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM';
  customStartDate: string;
  customEndDate: string;
  sortBy: 'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC';
  currentPage: number;
  pageSize: number;
}

// Rút thuần từ InvoiceManagementScreen.tsx: lọc + sắp xếp + phân trang + thống kê hóa đơn.
// Không có side-effect, chỉ tính toán suy sinh từ input.
export function useInvoiceFilters({
  orders,
  statusFilter,
  paymentFilter,
  searchTerm,
  advancedSearch,
  cashierFilter,
  dateFilter,
  customStartDate,
  customEndDate,
  sortBy,
  currentPage,
  pageSize,
}: UseInvoiceFiltersParams) {
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Lọc theo trạng thái
        if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;

        // Lọc theo hình thức thanh toán
        if (paymentFilter !== 'ALL' && order.payment_method !== paymentFilter) return false;

        // Lọc theo thu ngân
        if (cashierFilter && cashierFilter !== 'ALL') {
          const orderCashier = (order.cashier || '').trim().toLowerCase();
          if (orderCashier !== cashierFilter.trim().toLowerCase()) return false;
        }

        // Tìm kiếm đa tiêu chí KiotViet
        if (advancedSearch) {
          if (advancedSearch.code.trim() !== '') {
            const codeQ = advancedSearch.code.trim().toLowerCase();
            if (!order.code.toLowerCase().includes(codeQ)) return false;
          }
          if (advancedSearch.productKeyword.trim() !== '') {
            const prodQ = advancedSearch.productKeyword.trim().toLowerCase();
            const matchesItem = order.items.some(
              (i) => i.name.toLowerCase().includes(prodQ) || i.sku.toLowerCase().includes(prodQ)
            );
            if (!matchesItem) return false;
          }
          if (advancedSearch.customerKeyword.trim() !== '') {
            const custQ = advancedSearch.customerKeyword.trim().toLowerCase();
            const matchesCustName = order.customer_name.toLowerCase().includes(custQ);
            const matchesPhone = order.phone.toLowerCase().includes(custQ);
            if (!matchesCustName && !matchesPhone) return false;
          }
        }

        // Tìm kiếm đơn giản (General Search)
        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matchesCode = order.code.toLowerCase().includes(q);
          const matchesCustomer = order.customer_name.toLowerCase().includes(q);
          const matchesPhone = order.phone.toLowerCase().includes(q);
          const matchesCashier = order.cashier?.toLowerCase().includes(q);
          const matchesItem = order.items.some((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
          if (!matchesCode && !matchesCustomer && !matchesPhone && !matchesCashier && !matchesItem) {
            return false;
          }
        }

        // Lọc theo thời gian
        if (dateFilter !== 'ALL') {
          const orderTs = parseDateToTimestamp(order.created_at);
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

          if (dateFilter === 'TODAY') {
            if (orderTs < startOfToday || orderTs > endOfToday) return false;
          } else if (dateFilter === 'YESTERDAY') {
            const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();
            const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).getTime();
            if (orderTs < startOfYesterday || orderTs > endOfYesterday) return false;
          } else if (dateFilter === 'LAST7') {
            const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime();
            if (orderTs < sevenDaysAgo || orderTs > endOfToday) return false;
          } else if (dateFilter === 'MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();
            const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
            if (orderTs < startOfMonth || orderTs > endOfThisMonth) return false;
          } else if (dateFilter === 'LAST_MONTH') {
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0).getTime();
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
            if (orderTs < startOfLastMonth || orderTs > endOfLastMonth) return false;
          } else if (dateFilter === 'CUSTOM') {
            if (customStartDate) {
              const [sy, sm, sd] = customStartDate.split('-').map(Number);
              if (sy && sm && sd) {
                const startTs = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();
                if (orderTs < startTs) return false;
              }
            }
            if (customEndDate) {
              const [ey, em, ed] = customEndDate.split('-').map(Number);
              if (ey && em && ed) {
                const endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
                if (orderTs > endTs) return false;
              }
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at);
        }
        if (sortBy === 'OLDEST') {
          return parseDateToTimestamp(a.created_at) - parseDateToTimestamp(b.created_at);
        }
        if (sortBy === 'AMOUNT_DESC') {
          return (b.final_amount || 0) - (a.final_amount || 0);
        }
        if (sortBy === 'AMOUNT_ASC') {
          return (a.final_amount || 0) - (b.final_amount || 0);
        }
        return parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at);
      });
  }, [orders, statusFilter, paymentFilter, cashierFilter, searchTerm, advancedSearch, dateFilter, customStartDate, customEndDate, sortBy]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const stats = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'COMPLETED');
    const cancelledOrders = filteredOrders.filter((o) => o.status === 'CANCELLED');

    // Thống kê chuẩn KiotViet: Tổng tiền hàng (trước giảm), Giảm giá, Khách đã trả (thực thu)
    const totalGrossAmount = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalDiscount = completedOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const totalPaid = completedOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
    const totalRevenue = totalPaid;
    const totalProfit = completedOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? Math.round(totalPaid / completedOrders.length) : 0;

    return {
      totalOrdersCount,
      completedCount: completedOrders.length,
      cancelledCount: cancelledOrders.length,
      totalGrossAmount,
      totalDiscount,
      totalPaid,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      allOrdersCount: orders.length,
    };
  }, [filteredOrders, orders.length]);

  const isFiltered = useMemo(() => {
    const hasAdvanced =
      !!advancedSearch &&
      (advancedSearch.code.trim() !== '' ||
        advancedSearch.productKeyword.trim() !== '' ||
        advancedSearch.customerKeyword.trim() !== '');

    return (
      statusFilter !== 'ALL' ||
      paymentFilter !== 'ALL' ||
      (cashierFilter !== undefined && cashierFilter !== 'ALL') ||
      dateFilter !== 'ALL' ||
      searchTerm.trim() !== '' ||
      hasAdvanced ||
      customStartDate !== '' ||
      customEndDate !== ''
    );
  }, [statusFilter, paymentFilter, cashierFilter, dateFilter, searchTerm, advancedSearch, customStartDate, customEndDate]);

  return { filteredOrders, paginatedOrders, stats, isFiltered };
}
