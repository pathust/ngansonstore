import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Order } from '../../types';
import { formatDateTime, parseDateToTimestamp } from '../../utils/formatters';
import { cacheManager } from '../../services/cacheManager';
import { LOCAL_STORAGE_PREFIX, safeStorageGet, safeStorageSet } from '../shared/storage';

// Slice này chỉ giữ dữ liệu đơn hàng thuần + state modal biên lai.
// completeCheckout/updateOrder/cancelOrder/restoreOrder/deleteOrder/createOrderDirect/importOrders
// đều ghi xuyên Catalog+Customers+Cashbook nên nằm ở orchestrator (useOrderOrchestrator.ts).
interface OrdersDataContextType {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  lastCompletedOrder: Order | null;
  setLastCompletedOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: (open: boolean) => void;
  openOrderReceipt: (order: Order) => void;
}

const OrdersDataContext = createContext<OrdersDataContextType | undefined>(undefined);

export const OrdersDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = safeStorageGet<Order[]>(LOCAL_STORAGE_PREFIX + 'orders', []);
    const raw: Order[] = Array.isArray(saved) ? saved : [];
    return raw
      .map((o) => ({ ...o, created_at: formatDateTime(o.created_at) }))
      .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
  });

  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const openOrderReceipt = (order: Order) => {
    setLastCompletedOrder(order);
    setIsReceiptModalOpen(true);
  };

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'orders', orders, 100);
    cacheManager.set('orders', orders);
  }, [orders]);

  const value = useMemo<OrdersDataContextType>(
    () => ({
      orders,
      setOrders,
      lastCompletedOrder,
      setLastCompletedOrder,
      isReceiptModalOpen,
      setIsReceiptModalOpen,
      openOrderReceipt,
    }),
    [orders, lastCompletedOrder, isReceiptModalOpen]
  );

  return <OrdersDataContext.Provider value={value}>{children}</OrdersDataContext.Provider>;
};

export const useOrdersData = (): OrdersDataContextType => {
  const context = useContext(OrdersDataContext);
  if (!context) {
    throw new Error('useOrdersData must be used within an OrdersDataProvider');
  }
  return context;
};
