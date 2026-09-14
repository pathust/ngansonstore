import { describe, it, expect } from 'vitest';
import posCartReducer, {
  createNewTab,
  closeTab,
  switchTab,
  clearActiveCart,
  addToCart,
  updateCartItemQuantity,
  setCartItemQuantity,
  setCartItemPrice,
  setCartItemDiscount,
  removeFromCart,
  updateActiveTabInfo,
  createDefaultTab,
  PosCartState,
} from './posCartSlice';
import { Product } from '../../types';

const mockProduct: Product = {
  id: 'prod-01',
  sku: 'SP001',
  barcode: '893001',
  name: 'Bóng đèn LED 9W',
  category: 'cat-dien',
  unit: 'Bóng',
  cost_price: 25000,
  selling_price: 40000,
  stock: 10,
  min_stock: 3,
  status: 'ACTIVE',
};

describe('posCartSlice (Redux Toolkit)', () => {
  const getInitialState = (): PosCartState => ({
    orderTabs: [createDefaultTab('tab-1', 'Đơn 1')],
    activeTabId: 'tab-1',
  });

  it('khởi tạo state mặc định với 1 tab rỗng', () => {
    const state = posCartReducer(undefined, { type: 'unknown' });
    expect(state.orderTabs.length).toBe(1);
    expect(state.activeTabId).toBe('tab-1');
    expect(state.orderTabs[0].items).toEqual([]);
    expect(state.orderTabs[0].customer_name).toBe('Khách lẻ');
  });

  it('thêm tab bán hàng mới (createNewTab) và tự động kích hoạt tab mới', () => {
    let state = getInitialState();
    state = posCartReducer(state, createNewTab('tab-2'));

    expect(state.orderTabs.length).toBe(2);
    expect(state.activeTabId).toBe('tab-2');
    expect(state.orderTabs[1].title).toBe('Đơn 2');
  });

  it('chuyển đổi qua lại giữa các tab (switchTab)', () => {
    let state = getInitialState();
    state = posCartReducer(state, createNewTab('tab-2'));
    expect(state.activeTabId).toBe('tab-2');

    state = posCartReducer(state, switchTab('tab-1'));
    expect(state.activeTabId).toBe('tab-1');
  });

  it('đóng tab (closeTab) và tự chuyển activeTab sang tab còn lại', () => {
    let state = getInitialState();
    state = posCartReducer(state, createNewTab('tab-2'));
    state = posCartReducer(state, closeTab('tab-2'));

    expect(state.orderTabs.length).toBe(1);
    expect(state.activeTabId).toBe('tab-1');
  });

  it('nếu chỉ còn 1 tab duy nhất, đóng tab sẽ xóa trắng dữ liệu thay vì xóa tab', () => {
    let state = getInitialState();
    state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 2 }));
    expect(state.orderTabs[0].items.length).toBe(1);

    state = posCartReducer(state, closeTab('tab-1'));
    expect(state.orderTabs.length).toBe(1);
    expect(state.orderTabs[0].items.length).toBe(0);
  });

  describe('Thao tác giỏ hàng (Cart Operations)', () => {
    it('thêm sản phẩm vào giỏ hàng (addToCart)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 2 }));

      const activeTab = state.orderTabs[0];
      expect(activeTab.items.length).toBe(1);
      expect(activeTab.items[0].product_id).toBe('prod-01');
      expect(activeTab.items[0].quantity).toBe(2);
      expect(activeTab.items[0].price).toBe(40000);
    });

    it('cộng dồn số lượng nếu sản phẩm đã có trong giỏ hàng', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 2 }));
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 3 }));

      const activeTab = state.orderTabs[0];
      expect(activeTab.items[0].quantity).toBe(5);
    });

    it('không cho phép thêm sản phẩm nếu hết tồn kho (stock <= 0)', () => {
      let state = getInitialState();
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      state = posCartReducer(state, addToCart({ product: outOfStockProduct, quantity: 1 }));

      expect(state.orderTabs[0].items.length).toBe(0);
    });

    it('cập nhật số lượng bằng delta (updateCartItemQuantity)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 3 }));

      // Giảm 1
      state = posCartReducer(state, updateCartItemQuantity({ productId: 'prod-01', delta: -1 }));
      expect(state.orderTabs[0].items[0].quantity).toBe(2);

      // Tăng 1
      state = posCartReducer(state, updateCartItemQuantity({ productId: 'prod-01', delta: 1 }));
      expect(state.orderTabs[0].items[0].quantity).toBe(3);

      // Giảm về 0 thì tự động xóa khỏi giỏ
      state = posCartReducer(state, updateCartItemQuantity({ productId: 'prod-01', delta: -3 }));
      expect(state.orderTabs[0].items.length).toBe(0);
    });

    it('đặt số lượng tuyệt đối (setCartItemQuantity)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 2 }));

      state = posCartReducer(state, setCartItemQuantity({ productId: 'prod-01', quantity: 7 }));
      expect(state.orderTabs[0].items[0].quantity).toBe(7);

      // Đặt về 0 tự xóa
      state = posCartReducer(state, setCartItemQuantity({ productId: 'prod-01', quantity: 0 }));
      expect(state.orderTabs[0].items.length).toBe(0);
    });

    it('sửa giá bán trực tiếp trên dòng sản phẩm (setCartItemPrice)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 1 }));

      state = posCartReducer(state, setCartItemPrice({ productId: 'prod-01', newPrice: 38000 }));
      expect(state.orderTabs[0].items[0].price).toBe(38000);
    });

    it('áp dụng chiết khấu % trên dòng sản phẩm (setCartItemDiscount)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 1 }));

      state = posCartReducer(state, setCartItemDiscount({ productId: 'prod-01', discountPercent: 10 }));
      expect(state.orderTabs[0].items[0].discount_percent).toBe(10);
    });

    it('xóa sản phẩm khỏi giỏ hàng (removeFromCart)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 1 }));
      expect(state.orderTabs[0].items.length).toBe(1);

      state = posCartReducer(state, removeFromCart('prod-01'));
      expect(state.orderTabs[0].items.length).toBe(0);
    });

    it('cập nhật thông tin tab bán hàng (updateActiveTabInfo)', () => {
      let state = getInitialState();
      state = posCartReducer(
        state,
        updateActiveTabInfo({
          customer_name: 'Nguyễn Văn A',
          customer_phone: '0988888888',
          discount_amount: 15000,
          payment_method: 'TRANSFER',
        })
      );

      const activeTab = state.orderTabs[0];
      expect(activeTab.customer_name).toBe('Nguyễn Văn A');
      expect(activeTab.customer_phone).toBe('0988888888');
      expect(activeTab.discount_amount).toBe(15000);
      expect(activeTab.payment_method).toBe('TRANSFER');
    });

    it('xóa toàn bộ giỏ hàng của tab hiện tại (clearActiveCart)', () => {
      let state = getInitialState();
      state = posCartReducer(state, addToCart({ product: mockProduct, quantity: 2 }));
      state = posCartReducer(
        state,
        updateActiveTabInfo({ customer_name: 'Khách VIP', discount_amount: 50000 })
      );

      state = posCartReducer(state, clearActiveCart());
      const activeTab = state.orderTabs[0];
      expect(activeTab.items.length).toBe(0);
      expect(activeTab.customer_name).toBe('Khách lẻ');
      expect(activeTab.discount_amount).toBe(0);
    });
  });
});
