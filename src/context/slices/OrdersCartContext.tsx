import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { OrderTab, Product } from '../../types';
import { useToast } from './ToastContext';
import { store, useAppDispatch, useAppSelector, selectOrderTabs, selectActiveTabId, selectActiveTab } from '../../store';
import * as posCartActions from '../../store/slices/posCartSlice';

// Giỏ hàng đa tab của POS — Được quản trị bởi Redux Toolkit (posCartSlice),
// đồng thời cung cấp Adapter qua OrdersCartContext để giữ nguyên 100% tương thích ngược
// với các consumer hiện tại (PosSalesScreen, MobilePosScreen, useOrderOrchestrator).
interface OrdersCartContextType {
  orderTabs: OrderTab[];
  setOrderTabs: React.Dispatch<React.SetStateAction<OrderTab[]>>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  activeTab: OrderTab;
  createNewTab: () => void;
  closeTab: (id: string) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, delta: number) => void;
  setCartItemQuantity: (productId: string, quantity: number) => void;
  setCartItemPrice: (productId: string, newPrice: number) => void;
  setCartItemDiscount: (productId: string, discountPercent: number) => void;
  removeFromCart: (productId: string) => void;
  clearActiveCart: () => void;
  updateActiveTabInfo: (updates: Partial<OrderTab>) => void;
}

const OrdersCartContext = createContext<OrdersCartContextType | undefined>(undefined);

const OrdersCartInnerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();

  const orderTabs = useAppSelector(selectOrderTabs);
  const activeTabId = useAppSelector(selectActiveTabId);
  const activeTab = useAppSelector(selectActiveTab);

  const setOrderTabs: React.Dispatch<React.SetStateAction<OrderTab[]>> = useCallback(
    (action) => {
      if (typeof action === 'function') {
        dispatch(posCartActions.setOrderTabs(action(orderTabs)));
      } else {
        dispatch(posCartActions.setOrderTabs(action));
      }
    },
    [dispatch, orderTabs]
  );

  const setActiveTabId = useCallback(
    (id: string) => {
      dispatch(posCartActions.setActiveTabId(id));
    },
    [dispatch]
  );

  const createNewTab = useCallback(() => {
    const newTabNum = orderTabs.length + 1;
    const newTabId = 'tab-' + Date.now();
    dispatch(posCartActions.createNewTab(newTabId));
    showToast(`Đã mở thêm Đơn ${newTabNum}`, 'info');
  }, [dispatch, orderTabs.length, showToast]);

  const closeTab = useCallback(
    (tabId: string) => {
      dispatch(posCartActions.closeTab(tabId));
    },
    [dispatch]
  );

  const clearActiveCart = useCallback(() => {
    dispatch(posCartActions.clearActiveCart());
  }, [dispatch]);

  const addToCart = useCallback(
    (product: Product, quantity: number = 1) => {
      if (product.stock <= 0) {
        showToast(`Sản phẩm "${product.name}" đã hết hàng trong kho!`, 'error');
        return;
      }

      const existingItem = activeTab.items.find((item) => item.product_id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty > product.stock) {
          showToast(`Vượt quá tồn kho khả dụng (${product.stock} ${product.unit})!`, 'warning');
          return;
        }
      }

      dispatch(posCartActions.addToCart({ product, quantity }));
    },
    [activeTab.items, dispatch, showToast]
  );

  const updateCartItemQuantity = useCallback(
    (productId: string, delta: number) => {
      const item = activeTab.items.find((i) => i.product_id === productId);
      if (!item) return;

      const newQty = item.quantity + delta;
      if (newQty > item.max_stock) {
        showToast(`Tối đa ${item.max_stock} ${item.unit} trong kho!`, 'warning');
        return;
      }

      dispatch(posCartActions.updateCartItemQuantity({ productId, delta }));
    },
    [activeTab.items, dispatch, showToast]
  );

  const setCartItemQuantity = useCallback(
    (productId: string, quantity: number) => {
      dispatch(posCartActions.setCartItemQuantity({ productId, quantity }));
    },
    [dispatch]
  );

  const setCartItemPrice = useCallback(
    (productId: string, newPrice: number) => {
      dispatch(posCartActions.setCartItemPrice({ productId, newPrice }));
    },
    [dispatch]
  );

  const setCartItemDiscount = useCallback(
    (productId: string, discountPercent: number) => {
      dispatch(posCartActions.setCartItemDiscount({ productId, discountPercent }));
    },
    [dispatch]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      dispatch(posCartActions.removeFromCart(productId));
    },
    [dispatch]
  );

  const updateActiveTabInfo = useCallback(
    (updates: Partial<OrderTab>) => {
      dispatch(posCartActions.updateActiveTabInfo(updates));
    },
    [dispatch]
  );

  const value = useMemo<OrdersCartContextType>(
    () => ({
      orderTabs,
      setOrderTabs,
      activeTabId,
      setActiveTabId,
      activeTab,
      createNewTab,
      closeTab,
      addToCart,
      updateCartItemQuantity,
      setCartItemQuantity,
      setCartItemPrice,
      setCartItemDiscount,
      removeFromCart,
      clearActiveCart,
      updateActiveTabInfo,
    }),
    [
      orderTabs,
      setOrderTabs,
      activeTabId,
      setActiveTabId,
      activeTab,
      createNewTab,
      closeTab,
      addToCart,
      updateCartItemQuantity,
      setCartItemQuantity,
      setCartItemPrice,
      setCartItemDiscount,
      removeFromCart,
      clearActiveCart,
      updateActiveTabInfo,
    ]
  );

  return <OrdersCartContext.Provider value={value}>{children}</OrdersCartContext.Provider>;
};

export const OrdersCartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <OrdersCartInnerProvider>{children}</OrdersCartInnerProvider>
    </Provider>
  );
};

export const useOrdersCart = (): OrdersCartContextType => {
  const context = useContext(OrdersCartContext);
  if (!context) {
    throw new Error('useOrdersCart must be used within an OrdersCartProvider');
  }
  return context;
};
