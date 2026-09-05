import { useMemo } from 'react';
import { Customer } from '../../types';

interface UseCustomerFiltersParams {
  customers: Customer[];
  searchTerm: string;
  selectedGroup: string;
  selectedType: 'ALL' | 'Cá nhân' | 'Công ty';
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  debtFilter: 'ALL' | 'HAS_DEBT' | 'CREDIT' | 'ZERO';
  currentPage: number;
  pageSize: number;
}

// Rút thuần từ CustomerManagementScreen.tsx: danh sách nhóm, KPI công nợ, lọc + phân trang.
// Không có side-effect, chỉ tính toán suy sinh từ input.
export function useCustomerFilters({
  customers,
  searchTerm,
  selectedGroup,
  selectedType,
  statusFilter,
  debtFilter,
  currentPage,
  pageSize,
}: UseCustomerFiltersParams) {
  const distinctGroups = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.group && c.group.trim()) set.add(c.group.trim());
    });
    return Array.from(set);
  }, [customers]);

  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    let totalDebtReceivable = 0;
    let totalCreditAdvance = 0;
    let totalPurchased = 0;
    let countInDebt = 0;

    customers.forEach((c) => {
      totalPurchased += c.total_purchased || 0;
      if (c.debt > 0) {
        totalDebtReceivable += c.debt;
        countInDebt++;
      } else if (c.debt < 0) {
        totalCreditAdvance += Math.abs(c.debt);
      }
    });

    return { totalCustomers, totalDebtReceivable, totalCreditAdvance, totalPurchased, countInDebt };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.tax_code && c.tax_code.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchGroup = selectedGroup === 'ALL' || c.group === selectedGroup;

      const custType = c.customer_type || c.type || 'Cá nhân';
      const matchType = selectedType === 'ALL' || custType === selectedType;

      const isActive = c.status === 'ACTIVE' || c.status === 1;
      const matchStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' && isActive) || (statusFilter === 'INACTIVE' && !isActive);

      let matchDebt = true;
      if (debtFilter === 'HAS_DEBT') {
        matchDebt = c.debt > 0;
      } else if (debtFilter === 'CREDIT') {
        matchDebt = c.debt < 0;
      } else if (debtFilter === 'ZERO') {
        matchDebt = c.debt === 0;
      }

      return matchSearch && matchGroup && matchType && matchStatus && matchDebt;
    });
  }, [customers, searchTerm, selectedGroup, selectedType, statusFilter, debtFilter]);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  return { distinctGroups, metrics, filteredCustomers, paginatedCustomers };
}
