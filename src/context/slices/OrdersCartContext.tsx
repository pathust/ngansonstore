import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { OrderTab, CartItem, Product } from '../../types';
import { useToast } from './ToastContext';

// Giỏ hàng đa tab của POS — chỉ tồn tại trong phiên làm việc (không persist localStorage,
// giữ nguyên hành vi gốc). completeCheckout (đọc activeTab rồi ghi Order/Product/Customer/Cashbook)
// nằm ở orchestrator, không nằm ở slice này.
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

export const OrdersCartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [orderTabs, setOrderTabs] = useState<OrderTab[]>([
    {
      id: 'tab-1',
      title: 'Đơn 1',
      items: [],
      customer_name: 'Khách lẻ',
      customer_phone: '',
      discount_amount: 0,
      discount_type: 'AMOUNT',
      note: '',
      payment_method: 'CASH',
      customer_paid: 0,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  const activeTab = orderTabs.find((t) => t.id === activeTabId) || orderTabs[0];

  const createNewTab = () => {
    const newTabNum = orderTabs.length + 1;
    const newTabId = 'tab-' + Date.now();
    const newTab: OrderTab = {
      id: newTabId,
      title: `Đơn ${newTabNum}`,
      items: [],
      customer_name: 'Khách lẻ',
      customer_phone: '',
      discount_amount: 0,
      discount_type: 'AMOUNT',
      note: '',
      payment_method: 'CASH',
      customer_paid: 0,
    };
    setOrderTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    showToast(`Đã mở thêm ${newTab.title}`, 'info');
  };

  const clearActiveCart = () => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          items: [],
          customer_name: 'Khách lẻ',
          customer_phone: '',
          discount_amount: 0,
          note: '',
          customer_paid: 0,
        };
      })
    );
  };

  const closeTab = (tabId: string) => {
    if (orderTabs.length <= 1) {
      clearActiveCart();
      return;
    }
    const remaining = orderTabs.filter((t) => t.id !== tabId);
    setOrderTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      showToast(`Sản phẩm "${product.name}" đã hết hàng trong kho!`, 'error');
      return;
    }

    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const existingItem = tab.items.find((item) => item.product_id === product.id);
        if (existingItem) {
          const newQty = existingItem.quantity + quantity;
          if (newQty > product.stock) {
            showToast(`Vượt quá tồn kho khả dụng (${product.stock} ${product.unit})!`, 'warning');
            return tab;
          }
          return {
            ...tab,
            items: tab.items.map((i) => (i.product_id === product.id ? { ...i, quantity: newQty } : i)),
          };
        } else {
          const newItem: CartItem = {
            product_id: product.id,
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            quantity: quantity,
            price: product.selling_price,
            cost_price: product.cost_price,
            unit: product.unit,
            discount_percent: 0,
            max_stock: product.stock,
            image: product.image,
          };
          return { ...tab, items: [...tab.items, newItem] };
        }
      })
    );
  };

  const updateCartItemQuantity = (productId: string, delta: number) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const item = tab.items.find((i) => i.product_id === productId);
        if (!item) return tab;
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          return { ...tab, items: tab.items.filter((i) => i.product_id !== productId) };
        }
        if (newQty > item.max_stock) {
          showToast(`Tối đa ${item.max_stock} ${item.unit} trong kho!`, 'warning');
          return tab;
        }
        return {
          ...tab,
          items: tab.items.map((i) => (i.product_id === productId ? { ...i, quantity: newQty } : i)),
        };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return { ...tab, items: tab.items.filter((i) => i.product_id !== productId) };
      })
    );
  };

  const setCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const item = tab.items.find((i) => i.product_id === productId);
        if (!item) return tab;
        const validQty = Math.min(quantity, item.max_stock);
        return {
          ...tab,
          items: tab.items.map((i) => (i.product_id === productId ? { ...i, quantity: validQty } : i)),
        };
      })
    );
  };

  const setCartItemPrice = (productId: string, newPrice: number) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          items: tab.items.map((i) => (i.product_id === productId ? { ...i, price: Math.max(0, newPrice) } : i)),
        };
      })
    );
  };

  const setCartItemDiscount = (productId: string, discountPercent: number) => {
    setOrderTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          items: tab.items.map((i) =>
            i.product_id === productId ? { ...i, discount_percent: Math.min(100, Math.max(0, discountPercent)) } : i
          ),
        };
      })
    );
  };

  const updateActiveTabInfo = (updates: Partial<OrderTab>) => {
    setOrderTabs((prev) => prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab)));
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderTabs, activeTabId, showToast]
  );

  return <OrdersCartContext.Provider value={value}>{children}</OrdersCartContext.Provider>;
};

export const useOrdersCart = (): OrdersCartContextType => {
  const context = useContext(OrdersCartContext);
  if (!context) {
    throw new Error('useOrdersCart must be used within an OrdersCartProvider');
  }
  return context;
};
