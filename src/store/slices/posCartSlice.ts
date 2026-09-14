import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrderTab, CartItem, Product } from '../../types';

export interface PosCartState {
  orderTabs: OrderTab[];
  activeTabId: string;
}

export const createDefaultTab = (id: string = 'tab-1', title: string = 'Đơn 1'): OrderTab => ({
  id,
  title,
  items: [],
  customer_name: 'Khách lẻ',
  customer_phone: '',
  discount_amount: 0,
  discount_type: 'AMOUNT',
  note: '',
  payment_method: 'CASH',
  customer_paid: 0,
});

const initialState: PosCartState = {
  orderTabs: [createDefaultTab()],
  activeTabId: 'tab-1',
};

export const posCartSlice = createSlice({
  name: 'posCart',
  initialState,
  reducers: {
    createNewTab: (state, action: PayloadAction<string | undefined>) => {
      const newTabNum = state.orderTabs.length + 1;
      const newTabId = action.payload || 'tab-' + Date.now();
      const newTab = createDefaultTab(newTabId, `Đơn ${newTabNum}`);
      state.orderTabs.push(newTab);
      state.activeTabId = newTabId;
    },

    closeTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload;
      if (state.orderTabs.length <= 1) {
        // Nếu chỉ còn 1 tab thì chỉ xóa trắng nội dung
        const current = state.orderTabs.find((t) => t.id === tabId) || state.orderTabs[0];
        current.items = [];
        current.customer_name = 'Khách lẻ';
        current.customer_phone = '';
        current.discount_amount = 0;
        current.note = '';
        current.customer_paid = 0;
        return;
      }

      state.orderTabs = state.orderTabs.filter((t) => t.id !== tabId);
      if (state.activeTabId === tabId) {
        state.activeTabId = state.orderTabs[0].id;
      }
    },

    switchTab: (state, action: PayloadAction<string>) => {
      if (state.orderTabs.some((t) => t.id === action.payload)) {
        state.activeTabId = action.payload;
      }
    },

    setActiveTabId: (state, action: PayloadAction<string>) => {
      if (state.orderTabs.some((t) => t.id === action.payload)) {
        state.activeTabId = action.payload;
      }
    },

    clearActiveCart: (state) => {
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (activeTab) {
        activeTab.items = [];
        activeTab.customer_name = 'Khách lẻ';
        activeTab.customer_phone = '';
        activeTab.discount_amount = 0;
        activeTab.note = '';
        activeTab.customer_paid = 0;
      }
    },

    addToCart: (
      state,
      action: PayloadAction<{ product: Product; quantity?: number }>
    ) => {
      const { product, quantity = 1 } = action.payload;
      if (product.stock <= 0) return;

      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (!activeTab) return;

      const existingItem = activeTab.items.find((item) => item.product_id === product.id);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (newQty <= product.stock) {
          existingItem.quantity = newQty;
        }
      } else {
        const newItem: CartItem = {
          product_id: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          quantity: Math.min(quantity, product.stock),
          price: product.selling_price,
          cost_price: product.cost_price,
          unit: product.unit,
          discount_percent: 0,
          max_stock: product.stock,
          image: product.image,
        };
        activeTab.items.push(newItem);
      }
    },

    updateCartItemQuantity: (
      state,
      action: PayloadAction<{ productId: string; delta: number }>
    ) => {
      const { productId, delta } = action.payload;
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (!activeTab) return;

      const item = activeTab.items.find((i) => i.product_id === productId);
      if (!item) return;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        activeTab.items = activeTab.items.filter((i) => i.product_id !== productId);
      } else if (newQty <= item.max_stock) {
        item.quantity = newQty;
      }
    },

    setCartItemQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>
    ) => {
      const { productId, quantity } = action.payload;
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (!activeTab) return;

      if (quantity <= 0) {
        activeTab.items = activeTab.items.filter((i) => i.product_id !== productId);
      } else {
        const item = activeTab.items.find((i) => i.product_id === productId);
        if (item) {
          item.quantity = Math.min(quantity, item.max_stock);
        }
      }
    },

    setCartItemPrice: (
      state,
      action: PayloadAction<{ productId: string; newPrice: number }>
    ) => {
      const { productId, newPrice } = action.payload;
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (!activeTab) return;

      const item = activeTab.items.find((i) => i.product_id === productId);
      if (item) {
        item.price = Math.max(0, newPrice);
      }
    },

    setCartItemDiscount: (
      state,
      action: PayloadAction<{ productId: string; discountPercent: number }>
    ) => {
      const { productId, discountPercent } = action.payload;
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (!activeTab) return;

      const item = activeTab.items.find((i) => i.product_id === productId);
      if (item) {
        item.discount_percent = Math.min(100, Math.max(0, discountPercent));
      }
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (!activeTab) return;
      activeTab.items = activeTab.items.filter((i) => i.product_id !== action.payload);
    },

    updateActiveTabInfo: (state, action: PayloadAction<Partial<OrderTab>>) => {
      const activeTab = state.orderTabs.find((t) => t.id === state.activeTabId);
      if (activeTab) {
        Object.assign(activeTab, action.payload);
      }
    },

    setOrderTabs: (state, action: PayloadAction<OrderTab[]>) => {
      state.orderTabs = action.payload;
      if (!state.orderTabs.some((t) => t.id === state.activeTabId) && state.orderTabs.length > 0) {
        state.activeTabId = state.orderTabs[0].id;
      }
    },
  },
});

export const {
  createNewTab,
  closeTab,
  switchTab,
  setActiveTabId,
  clearActiveCart,
  addToCart,
  updateCartItemQuantity,
  setCartItemQuantity,
  setCartItemPrice,
  setCartItemDiscount,
  removeFromCart,
  updateActiveTabInfo,
  setOrderTabs,
} = posCartSlice.actions;

export default posCartSlice.reducer;
