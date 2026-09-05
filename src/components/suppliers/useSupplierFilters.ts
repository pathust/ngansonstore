import { useMemo } from 'react';
import { Supplier } from '../../types';

interface UseSupplierFiltersParams {
  suppliers: Supplier[];
  searchTerm: string;
  selectedGroup: string;
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
  debtFilter: 'ALL' | 'HAS_DEBT' | 'CREDIT' | 'ZERO';
  currentPage: number;
  pageSize: number;
}

// Rút thuần từ SupplierManagementScreen.tsx: danh sách nhóm, KPI công nợ, lọc + phân trang.
// Không có side-effect, chỉ tính toán suy sinh từ input.
export function useSupplierFilters({
  suppliers,
  searchTerm,
  selectedGroup,
  statusFilter,
  debtFilter,
  currentPage,
  pageSize,
}: UseSupplierFiltersParams) {
  const distinctGroups = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.group && s.group.trim()) set.add(s.group.trim());
    });
    return Array.from(set);
  }, [suppliers]);

  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    let totalDebtPayable = 0;
    let totalCreditAdvance = 0;
    let totalPurchased = 0;
    let countInDebt = 0;

    suppliers.forEach((s) => {
      totalPurchased += s.total_purchased || 0;
      if (s.debt > 0) {
        totalDebtPayable += s.debt;
        countInDebt++;
      } else if (s.debt < 0) {
        totalCreditAdvance += Math.abs(s.debt);
      }
    });

    return { totalSuppliers, totalDebtPayable, totalCreditAdvance, totalPurchased, countInDebt };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.tax_code && s.tax_code.toLowerCase().includes(q));

      const matchGroup = selectedGroup === 'ALL' || s.group === selectedGroup;
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;

      let matchDebt = true;
      if (debtFilter === 'HAS_DEBT') {
        matchDebt = s.debt > 0;
      } else if (debtFilter === 'CREDIT') {
        matchDebt = s.debt < 0;
      } else if (debtFilter === 'ZERO') {
        matchDebt = s.debt === 0;
      }

      return matchSearch && matchGroup && matchStatus && matchDebt;
    });
  }, [suppliers, searchTerm, selectedGroup, statusFilter, debtFilter]);

  const paginatedSuppliers = useMemo(() => {
    return filteredSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  return { distinctGroups, metrics, filteredSuppliers, paginatedSuppliers };
}
