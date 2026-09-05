import { useMemo } from 'react';
import { Order } from '../../types';
import { parseDateToTimestamp } from '../../utils/formatters';

interface UseInvoiceFiltersParams {
  orders: Order[];
  statusFilter: 'ALL' | 'COMPLETED' | 'CANCELLED';
  paymentFilter: 'ALL' | 'CASH' | 'TRANSFER' | 'CARD';
  searchTerm: string;
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
        if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
        if (paymentFilter !== 'ALL' && order.payment_method !== paymentFilter) return false;

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
  }, [orders, statusFilter, paymentFilter, searchTerm, dateFilter, customStartDate, customEndDate, sortBy]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const stats = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'COMPLETED');
    const cancelledOrders = filteredOrders.filter((o) => o.status === 'CANCELLED');

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
    const totalProfit = completedOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

    return {
      totalOrdersCount,
      completedCount: completedOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      allOrdersCount: orders.length,
    };
  }, [filteredOrders, orders.length]);

  const isFiltered = useMemo(() => {
    return (
      statusFilter !== 'ALL' ||
      paymentFilter !== 'ALL' ||
      dateFilter !== 'ALL' ||
      searchTerm.trim() !== '' ||
      customStartDate !== '' ||
      customEndDate !== ''
    );
  }, [statusFilter, paymentFilter, dateFilter, searchTerm, customStartDate, customEndDate]);

  return { filteredOrders, paginatedOrders, stats, isFiltered };
}
