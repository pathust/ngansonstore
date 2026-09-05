import { Order, DuplicateStrategy, ImportOrderResult } from '../../types';
import { formatDateTime, parseDateToTimestamp, getCurrentVietnameseDateTime } from '../../utils/formatters';
import { apiClient } from '../../services/apiClient';
import { savePendingChange } from '../shared/syncQueue';
import confetti from 'canvas-confetti';
import { useToast } from '../slices/ToastContext';
import { useAuth } from '../slices/AuthContext';
import { useUiShell } from '../slices/UiShellContext';
import { useCatalog } from '../slices/CatalogContext';
import { useCustomers } from '../slices/CustomersContext';
import { useCashbook } from '../slices/CashbookContext';
import { useOrdersCart } from '../slices/OrdersCartContext';
import { useOrdersData } from '../slices/OrdersDataContext';

// Checkout & vòng đời hóa đơn — ghi xuyên Catalog (trừ/hoàn tồn kho), Customers (công nợ/tổng mua),
// Cashbook (thu/chi) cùng lúc với Orders. Port nguyên trạng logic + đúng thứ tự side-effect từ bản gốc.
export function useOrderOrchestrator() {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { currentBranch } = useUiShell();
  const { setProducts } = useCatalog();
  const { setCustomers } = useCustomers();
  const { addCashbookEntry } = useCashbook();
  const { activeTab, clearActiveCart } = useOrdersCart();
  const { orders, setOrders, setLastCompletedOrder, setIsReceiptModalOpen } = useOrdersData();

  const completeCheckout = (paymentMethod: 'CASH' | 'TRANSFER' | 'CARD', customerPaidAmount?: number): Order | null => {
    if (!activeTab || activeTab.items.length === 0) {
      showToast('Giỏ hàng trống! Vui lòng chọn sản phẩm để thanh toán.', 'warning');
      return null;
    }

    const subtotal = activeTab.items.reduce((sum, item) => {
      const discountedPrice = item.price * (1 - item.discount_percent / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);

    const discount = activeTab.discount_type === 'PERCENT' ? (subtotal * activeTab.discount_amount) / 100 : activeTab.discount_amount;
    const finalAmount = Math.max(0, Math.round(subtotal - discount));
    const totalCost = activeTab.items.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
    const profit = finalAmount - totalCost;
    const orderCode = `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      code: orderCode,
      customer_name: activeTab.customer_name || 'Khách lẻ',
      phone: activeTab.customer_phone || '',
      items: activeTab.items.map((i) => ({
        product_id: i.product_id,
        sku: i.sku,
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        price: i.price,
        cost_price: i.cost_price,
      })),
      total: subtotal,
      discount: discount,
      final_amount: finalAmount,
      total_cost: totalCost,
      profit: profit,
      payment_method: paymentMethod,
      created_at: getCurrentVietnameseDateTime(),
      status: 'COMPLETED',
      cashier: currentUser.name,
      branch: currentBranch.name,
      note: activeTab.note,
    };

    // 1. Trừ tồn kho
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = activeTab.items.find((i) => i.product_id === p.id);
        if (!cartItem) return p;
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      })
    );

    // 2. Thêm vào Orders
    setOrders((prev) => [newOrder, ...prev]);
    apiClient.createOrder(newOrder).catch((err) => {
      savePendingChange('orders', newOrder);
      console.warn('[Order] Sync create failed:', err);
    });

    // 3. Cập nhật công nợ/tổng mua khách hàng nếu có chỉ định khách
    const customerPaid = customerPaidAmount !== undefined ? customerPaidAmount : finalAmount;
    const actualCollected = Math.min(finalAmount, Math.max(0, customerPaid));
    const debtIncrease = Math.max(0, finalAmount - actualCollected);

    if (activeTab.customer_name && activeTab.customer_name !== 'Khách lẻ') {
      setCustomers((prev) =>
        prev.map((c) => {
          const matchPhone = activeTab.customer_phone && c.phone === activeTab.customer_phone;
          const matchName = c.name.toLowerCase().trim() === activeTab.customer_name.toLowerCase().trim();
          if (matchPhone || matchName) {
            const updatedTotalPurchased = (c.total_purchased || 0) + finalAmount;
            const updatedDebt = (c.debt || 0) + debtIncrease;
            const updatedCust = { ...c, total_purchased: updatedTotalPurchased, debt: updatedDebt };
            apiClient.updateCustomer(c.id, updatedCust).catch((err) => {
              console.warn('[Customer] Sync update failed:', err);
              savePendingChange('customers', updatedCust);
            });
            return updatedCust;
          }
          return c;
        })
      );
    }

    // 4. Ghi Sổ quỹ số tiền thực thu
    if (actualCollected > 0) {
      addCashbookEntry({
        type: 'IN',
        amount: actualCollected,
        category: 'Thu tiền bán hàng POS',
        note: `Thu tiền đơn hàng ${orderCode} (${activeTab.customer_name || 'Khách lẻ'})${debtIncrease > 0 ? ` [Ghi nợ: ${debtIncrease.toLocaleString('vi-VN')} đ]` : ''}`,
        ref_code: orderCode,
      });
    }

    // 5. Mở modal biên lai K80
    setLastCompletedOrder(newOrder);
    setIsReceiptModalOpen(true);

    // 6. Reset giỏ hàng
    clearActiveCart();

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch (e) {
      // Ignore if confetti fails
    }

    showToast(`Thanh toán thành công hóa đơn ${orderCode}!`, 'success');
    return newOrder;
  };

  const updateOrder = (
    orderId: string,
    updates: Partial<Order>,
    options: { adjustStock?: boolean; adjustCashbook?: boolean } = { adjustStock: true, adjustCashbook: true }
  ) => {
    const existingOrder = orders.find((o) => o.id === orderId);
    if (!existingOrder) {
      showToast('Không tìm thấy hóa đơn cần cập nhật!', 'error');
      return;
    }

    if (options.adjustStock && updates.items && existingOrder.status === 'COMPLETED') {
      const oldItemMap = new Map<string, number>();
      existingOrder.items.forEach((i) => oldItemMap.set(i.product_id, (oldItemMap.get(i.product_id) || 0) + i.quantity));

      const newItemMap = new Map<string, number>();
      updates.items.forEach((i) => newItemMap.set(i.product_id, (newItemMap.get(i.product_id) || 0) + i.quantity));

      const allProductIds = Array.from(new Set([...oldItemMap.keys(), ...newItemMap.keys()]));

      setProducts((prev) =>
        prev.map((prod) => {
          if (!allProductIds.includes(prod.id)) return prod;
          const oldQty = oldItemMap.get(prod.id) || 0;
          const newQty = newItemMap.get(prod.id) || 0;
          const diff = newQty - oldQty;
          return { ...prod, stock: Math.max(0, prod.stock - diff) };
        })
      );
    }

    if (options.adjustCashbook && updates.final_amount !== undefined && existingOrder.status === 'COMPLETED') {
      const oldAmount = existingOrder.final_amount;
      const newAmount = updates.final_amount;
      const amountDiff = newAmount - oldAmount;

      if (amountDiff !== 0) {
        if (amountDiff > 0) {
          addCashbookEntry({
            type: 'IN',
            amount: amountDiff,
            category: 'Điều chỉnh tăng tiền hóa đơn cũ',
            note: `Thu bổ sung chênh lệch khi sửa hóa đơn ${existingOrder.code}`,
            ref_code: existingOrder.code,
          });
        } else {
          addCashbookEntry({
            type: 'OUT',
            amount: Math.abs(amountDiff),
            category: 'Điều chỉnh giảm / Hoàn tiền hóa đơn cũ',
            note: `Hoàn trả chênh lệch khi sửa hóa đơn ${existingOrder.code}`,
            ref_code: existingOrder.code,
          });
        }
      }
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          ...updates,
          total: updates.total !== undefined ? updates.total : o.total,
          discount: updates.discount !== undefined ? updates.discount : o.discount,
          final_amount: updates.final_amount !== undefined ? updates.final_amount : o.final_amount,
          total_cost: updates.total_cost !== undefined ? updates.total_cost : o.total_cost,
          profit:
            updates.profit !== undefined
              ? updates.profit
              : (updates.final_amount !== undefined ? updates.final_amount : o.final_amount) -
                (updates.total_cost !== undefined ? updates.total_cost : o.total_cost),
        };
      })
    );
    apiClient.updateOrder(orderId, updates).catch((err) => {
      console.warn('[Order] Sync update failed:', err);
      const ord = orders.find((o) => o.id === orderId);
      if (ord) savePendingChange('orders', { ...ord, ...updates, id: orderId });
    });

    showToast(`Đã cập nhật hóa đơn ${existingOrder.code} thành công!`, 'success');
  };

  const cancelOrder = (orderId: string, returnStock: boolean = true, reason?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (order.status === 'CANCELLED') {
      showToast(`Hóa đơn ${order.code} đã ở trạng thái Đã hủy!`, 'info');
      return;
    }

    if (returnStock) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = order.items.find((i) => i.product_id === p.id);
          if (!item) return p;
          return { ...p, stock: p.stock + item.quantity };
        })
      );
    }

    addCashbookEntry({
      type: 'OUT',
      amount: order.final_amount,
      category: 'Hoàn tiền hủy hóa đơn bán hàng',
      note: `Hoàn tiền hủy hóa đơn ${order.code}${reason ? ` (Lý do: ${reason})` : ''}`,
      ref_code: order.code,
    });

    if (order.customer_name && order.customer_name !== 'Khách lẻ') {
      setCustomers((prev) =>
        prev.map((c) => {
          const matchPhone = order.phone && c.phone === order.phone;
          const matchName = c.name.toLowerCase().trim() === order.customer_name.toLowerCase().trim();
          if (matchPhone || matchName) {
            const updatedCust = { ...c, total_purchased: Math.max(0, (c.total_purchased || 0) - order.final_amount) };
            apiClient.updateCustomer(c.id, updatedCust).catch((err) => {
              console.warn('[Customer] Sync update failed:', err);
              savePendingChange('customers', updatedCust);
            });
            return updatedCust;
          }
          return c;
        })
      );
    }

    const updatedNote = `${order.note ? order.note + ' | ' : ''}[Đã hủy: ${reason || 'Khách hủy/Hoàn trả'}]`;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED', note: updatedNote } : o)));
    apiClient.updateOrder(orderId, { status: 'CANCELLED', note: updatedNote }).catch((err) => {
      savePendingChange('orders', { ...order, status: 'CANCELLED', note: updatedNote });
      console.warn('[Order] Sync cancel failed:', err);
    });

    showToast(`Đã hủy hóa đơn ${order.code} và hoàn trả ${order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm về kho!`, 'success');
  };

  const restoreOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === 'COMPLETED') return;

    setProducts((prev) =>
      prev.map((p) => {
        const item = order.items.find((i) => i.product_id === p.id);
        if (!item) return p;
        return { ...p, stock: Math.max(0, p.stock - item.quantity) };
      })
    );

    addCashbookEntry({
      type: 'IN',
      amount: order.final_amount,
      category: 'Thu tiền khôi phục hóa đơn',
      note: `Thu tiền khi khôi phục hóa đơn ${order.code}`,
      ref_code: order.code,
    });

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'COMPLETED' } : o)));
    apiClient.updateOrder(orderId, { status: 'COMPLETED' }).catch((err) => {
      savePendingChange('orders', { ...order, status: 'COMPLETED' });
      console.warn('[Order] Sync restore failed:', err);
    });

    showToast(`Đã khôi phục trạng thái hoàn thành cho hóa đơn ${order.code}!`, 'success');
  };

  const deleteOrder = (orderId: string, returnStock: boolean = false) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (returnStock && order.status === 'COMPLETED') {
      setProducts((prev) =>
        prev.map((p) => {
          const item = order.items.find((i) => i.product_id === p.id);
          if (!item) return p;
          return { ...p, stock: p.stock + item.quantity };
        })
      );
    }

    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    apiClient.deleteOrder(orderId, returnStock).catch((err) => {
      console.warn('[Order] Sync delete failed:', err);
    });
    showToast(`Đã xóa vĩnh viễn hóa đơn ${order.code}!`, 'info');
  };

  const createOrderDirect = (
    orderData: Partial<Order>,
    duplicateStrategy: 'OVERWRITE' | 'KEEP_BOTH' | 'ERROR' = 'KEEP_BOTH',
    options: { syncStock?: boolean; syncCashbook?: boolean } = { syncStock: true, syncCashbook: true }
  ): Order | null => {
    let orderCode =
      orderData.code?.trim() || `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const existingIndex = orders.findIndex((o) => o.code.trim().toLowerCase() === orderCode.toLowerCase());

    if (existingIndex >= 0) {
      if (duplicateStrategy === 'ERROR') {
        showToast(`Mã hóa đơn ${orderCode} đã tồn tại trong hệ thống!`, 'error');
        return null;
      }
      if (duplicateStrategy === 'KEEP_BOTH') {
        orderCode = `${orderCode}-DUP${Math.floor(10 + Math.random() * 90)}`;
      }
    }

    const items = orderData.items || [];
    const total = orderData.total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const discount = orderData.discount ?? 0;
    const final_amount = orderData.final_amount ?? total - discount;
    const total_cost = orderData.total_cost ?? items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
    const profit = orderData.profit ?? final_amount - total_cost;

    const newOrder: Order = {
      id: orderData.id || `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      code: orderCode,
      customer_name: orderData.customer_name?.trim() || 'Khách lẻ',
      phone: orderData.phone?.trim() || '',
      items,
      total,
      discount,
      final_amount,
      total_cost,
      profit,
      payment_method: orderData.payment_method || 'CASH',
      created_at: orderData.created_at ? formatDateTime(orderData.created_at) : getCurrentVietnameseDateTime(),
      status: orderData.status || 'COMPLETED',
      cashier: orderData.cashier || currentUser.name || 'Phan Minh',
      branch: orderData.branch || currentBranch.name,
      note: orderData.note || '',
    };

    if (options.syncStock !== false && newOrder.status === 'COMPLETED' && items.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const item = items.find((i) => i.product_id === p.id);
          if (!item) return p;
          return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        })
      );
    }

    if (options.syncCashbook !== false && newOrder.status === 'COMPLETED' && final_amount > 0) {
      addCashbookEntry({
        type: 'IN',
        amount: final_amount,
        category: 'Thu tiền bán hàng POS (Voice AI / Trực tiếp)',
        note: `Thu tiền hóa đơn ${orderCode} (${newOrder.customer_name})`,
        ref_code: orderCode,
      });
    }

    if (newOrder.phone || (newOrder.customer_name && newOrder.customer_name !== 'Khách lẻ')) {
      setCustomers((prev) =>
        prev.map((c) => {
          const isMatch = (newOrder.phone && c.phone === newOrder.phone) || c.name.toLowerCase() === newOrder.customer_name.toLowerCase();
          if (isMatch) {
            return { ...c, total_purchased: (c.total_purchased || 0) + final_amount };
          }
          return c;
        })
      );
    }

    if (existingIndex >= 0 && duplicateStrategy === 'OVERWRITE') {
      setOrders((prev) =>
        prev.map((o, idx) => (idx === existingIndex ? newOrder : o)).sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at))
      );
      showToast(`Đã cập nhật (ghi đè) hóa đơn ${orderCode}!`, 'success');
    } else {
      setOrders((prev) => [newOrder, ...prev].sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at)));
      showToast(`Đã lưu hóa đơn ${orderCode} thành công!`, 'success');
    }

    setLastCompletedOrder(newOrder);

    apiClient.createOrder(newOrder).catch((err) => {
      savePendingChange('orders', newOrder);
      console.warn('[SYNC] Async order creation to backend failed:', err.message);
    });

    return newOrder;
  };

  const importOrders = (
    newOrders: Partial<Order>[],
    duplicateStrategy: DuplicateStrategy = 'OVERWRITE',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: { syncStock?: boolean; syncCashbook?: boolean } = {}
  ): ImportOrderResult => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions?.canImportData) {
      showToast('Chỉ Quản trị viên (Admin) mới có quyền nhập dữ liệu Hóa đơn!', 'error');
      return { total: 0, inserted: 0, updated: 0, skipped: 0, renamed: 0, duplicateCodes: [] };
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let renamed = 0;
    const duplicateCodes: string[] = [];

    setOrders((prev) => {
      if (duplicateStrategy === 'REPLACE_ALL') {
        const generatedList: Order[] = newOrders
          .map((ord, idx) => {
            const items = ord.items || [];
            const total = ord.total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
            const discount = ord.discount ?? 0;
            const final_amount = ord.final_amount ?? total - discount;
            const total_cost = ord.total_cost ?? items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
            const profit = ord.profit ?? final_amount - total_cost;

            return {
              id: ord.id || `order-${Date.now()}-${idx}`,
              code: ord.code?.trim() || `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${1000 + idx}`,
              customer_name: ord.customer_name?.trim() || 'Khách lẻ',
              phone: ord.phone?.trim() || '',
              items,
              total,
              discount,
              final_amount,
              total_cost,
              profit,
              payment_method: ord.payment_method || 'CASH',
              created_at: ord.created_at ? formatDateTime(ord.created_at) : getCurrentVietnameseDateTime(),
              status: ord.status || 'COMPLETED',
              cashier: ord.cashier || 'Phan Minh',
              branch: ord.branch || currentBranch.name,
              note: ord.note || '',
            };
          })
          .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
        inserted = generatedList.length;
        return generatedList;
      }

      const orderMap = new Map<string, Order>();
      prev.forEach((o) => {
        orderMap.set(o.code.trim().toLowerCase(), { ...o });
      });

      newOrders.forEach((item, index) => {
        let code = item.code?.trim() || `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${1000 + index}`;
        const codeKey = code.toLowerCase();
        const existing = orderMap.get(codeKey);

        const items = item.items || [];
        const total = item.total ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        const discount = item.discount ?? 0;
        const final_amount = item.final_amount ?? total - discount;
        const total_cost = item.total_cost ?? items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
        const profit = item.profit ?? final_amount - total_cost;

        if (existing) {
          duplicateCodes.push(code);

          if (duplicateStrategy === 'SKIP') {
            skipped++;
            return;
          }

          if (duplicateStrategy === 'OVERWRITE') {
            const updatedOrder: Order = {
              ...existing,
              customer_name: item.customer_name?.trim() || existing.customer_name,
              phone: item.phone?.trim() || existing.phone,
              items: items.length > 0 ? items : existing.items,
              total,
              discount,
              final_amount,
              total_cost,
              profit,
              payment_method: item.payment_method || existing.payment_method,
              created_at: item.created_at ? formatDateTime(item.created_at) : existing.created_at,
              status: item.status || existing.status,
              cashier: item.cashier || existing.cashier,
              branch: item.branch || existing.branch,
              note: item.note || existing.note,
            };
            orderMap.set(codeKey, updatedOrder);
            updated++;
            return;
          }

          if (duplicateStrategy === 'KEEP_BOTH') {
            let dupIndex = 1;
            let newCode = `${code}-DUP${dupIndex}`;
            while (orderMap.has(newCode.toLowerCase())) {
              dupIndex++;
              newCode = `${code}-DUP${dupIndex}`;
            }
            code = newCode;
            renamed++;
          }
        }

        const newOrder: Order = {
          id: item.id || `order-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          code,
          customer_name: item.customer_name?.trim() || 'Khách lẻ',
          phone: item.phone?.trim() || '',
          items,
          total,
          discount,
          final_amount,
          total_cost,
          profit,
          payment_method: item.payment_method || 'CASH',
          created_at: item.created_at ? formatDateTime(item.created_at) : getCurrentVietnameseDateTime(),
          status: item.status || 'COMPLETED',
          cashier: item.cashier || 'Phan Minh',
          branch: item.branch || currentBranch.name,
          note: item.note || '',
        };

        orderMap.set(code.toLowerCase(), newOrder);
        inserted++;
      });

      return Array.from(orderMap.values()).sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
    });

    const result: ImportOrderResult = { total: newOrders.length, inserted, updated, skipped, renamed, duplicateCodes };

    let msg = `Nhập hóa đơn hoàn tất: ${inserted} thêm mới`;
    if (updated > 0) msg += `, ${updated} ghi đè`;
    if (skipped > 0) msg += `, ${skipped} bỏ qua`;
    if (renamed > 0) msg += `, ${renamed} đổi mã`;

    showToast(msg, 'success');
    return result;
  };

  return { completeCheckout, updateOrder, cancelOrder, restoreOrder, deleteOrder, createOrderDirect, importOrders };
}
