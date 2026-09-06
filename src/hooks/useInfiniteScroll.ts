import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll — tải thêm items khi scroll đến cuối danh sách.
 *
 * Tự động tìm scroll container qua id="mobile-scroll-root" (MobileAppContainer).
 * Nếu không tìm thấy, fallback về viewport (root: null).
 *
 * @param total       Tổng số items trong list
 * @param initialSize Số items hiện ngay khi mount (default: 40)
 * @param chunkSize   Số items load thêm mỗi lần chạm đáy (default: 20)
 * @param deps        Reset về page 1 khi bất kỳ dep nào thay đổi
 *
 * Returns: { visibleCount, sentinelRef, hasMore }
 * Gắn sentinelRef vào <div> ở cuối danh sách.
 */
export function useInfiniteScroll(
  total: number,
  initialSize = 40,
  chunkSize = 20,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[] = [],
  scrollContainerId?: string
) {
  const [visibleCount, setVisibleCount] = useState(initialSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset khi filter/search/sort thay đổi
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setVisibleCount(initialSize); }, deps);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + chunkSize, total));
  }, [chunkSize, total, initialSize]);

  useEffect(() => {
    observerRef.current?.disconnect();

    // Tìm scroll container: ưu tiên scrollContainerId, nếu không có thì tìm mobile-scroll-root
    const scrollRoot = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : (document.getElementById('mobile-scroll-root') ?? null);

    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { root: scrollRoot, rootMargin: '300px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore, scrollContainerId]);

  return { visibleCount, sentinelRef, hasMore: visibleCount < total };
}

