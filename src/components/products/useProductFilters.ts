import { useMemo } from 'react';
import { Product } from '../../types';
import { detectPriceAnomaly, PriceAnomalyType } from './PriceAuditModal';

export type ProductSortField = 'name' | 'sku' | 'cost_price' | 'selling_price' | 'stock';
export type SortDirection = 'asc' | 'desc';

interface UseProductFiltersParams {
  products: Product[];
  debouncedSearch: string;
  selectedCategory: string;
  stockFilter: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  priceAnomalyFilter: PriceAnomalyType | 'CONFIRMED';
  sortField: ProductSortField | null;
  sortDirection: SortDirection;
  currentPage: number;
  pageSize: number;
  isPriceAuditConfirmed: (product: { id: string; cost_price: number; selling_price: number }) => boolean;
}

// Rút thuần từ ProductManagementScreen.tsx: thống kê chênh lệch giá + lọc + phân trang.
// Không có side-effect, chỉ tính toán suy sinh từ input — tách ra để file chính gọn hơn và dễ test độc lập.
export function useProductFilters({
  products,
  debouncedSearch,
  selectedCategory,
  stockFilter,
  priceAnomalyFilter,
  sortField,
  sortDirection,
  currentPage,
  pageSize,
  isPriceAuditConfirmed,
}: UseProductFiltersParams) {
  // Thống kê toàn bộ các sản phẩm có chênh lệch giá bất thường (chỉ tính chưa duyệt OK)
  const priceAnomalies = useMemo(() => {
    let lossCount = 0;
    let highMarginCount = 0;
    let invertedCount = 0;
    let zeroCostCount = 0;
    let confirmedCount = 0;

    products.forEach((p) => {
      const a = detectPriceAnomaly(p);
      if (a) {
        if (isPriceAuditConfirmed(p)) {
          confirmedCount++;
        } else {
          if (a.type === 'LOSS') lossCount++;
          else if (a.type === 'HIGH_MARGIN') highMarginCount++;
          else if (a.type === 'INVERTED_HIGH') invertedCount++;
          else if (a.type === 'ZERO_COST') zeroCostCount++;
        }
      }
    });

    return {
      total: lossCount + highMarginCount + invertedCount,
      lossCount,
      highMarginCount,
      invertedCount,
      zeroCostCount,
      confirmedCount,
    };
  }, [products, isPriceAuditConfirmed]);

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);

      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

      let matchStock = true;
      if (stockFilter === 'OUT_OF_STOCK') matchStock = p.stock <= 0;
      else if (stockFilter === 'LOW_STOCK') matchStock = p.stock > 0 && p.stock <= p.min_stock;
      else if (stockFilter === 'IN_STOCK') matchStock = p.stock > p.min_stock;

      let matchPrice = true;
      if (priceAnomalyFilter === 'CONFIRMED') {
        const anomaly = detectPriceAnomaly(p);
        matchPrice = !!anomaly && isPriceAuditConfirmed(p);
      } else if (priceAnomalyFilter !== 'ALL') {
        const anomaly = detectPriceAnomaly(p);
        const isConfirmed = isPriceAuditConfirmed(p);
        if (!anomaly || isConfirmed) {
          matchPrice = false;
        } else if (priceAnomalyFilter === 'LOSS') {
          matchPrice = anomaly.type === 'LOSS';
        } else if (priceAnomalyFilter === 'HIGH_MARGIN') {
          matchPrice = anomaly.type === 'HIGH_MARGIN';
        } else if (priceAnomalyFilter === 'INVERTED_HIGH') {
          matchPrice = anomaly.type === 'INVERTED_HIGH';
        } else if (priceAnomalyFilter === 'ZERO_COST') {
          matchPrice = anomaly.type === 'ZERO_COST';
        }
      }

      return matchSearch && matchCategory && matchStock && matchPrice;
    });
  }, [products, debouncedSearch, selectedCategory, stockFilter, priceAnomalyFilter, isPriceAuditConfirmed]);

  const sortedProducts = useMemo(() => {
    if (!sortField) return filteredProducts;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredProducts].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, 'vi') * dir;
      }
      return ((va as number) - (vb as number)) * dir;
    });
  }, [filteredProducts, sortField, sortDirection]);

  const paginatedProducts = useMemo(() => {
    return sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  return { priceAnomalies, filteredProducts, sortedProducts, paginatedProducts };
}
