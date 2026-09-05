import { Product, StockInVoucherItem, StockInVoucher } from '../../types';
import { apiClient } from '../../services/apiClient';
import { savePendingChange } from '../shared/syncQueue';
import { useToast } from '../slices/ToastContext';
import { useAuth } from '../slices/AuthContext';
import { useUiShell } from '../slices/UiShellContext';
import { useCatalog } from '../slices/CatalogContext';
import { useSuppliers } from '../slices/SuppliersContext';
import { useCashbook } from '../slices/CashbookContext';
import { useStoreSettings } from '../slices/StoreSettingsContext';
import { useInventoryAudit } from '../slices/InventoryAuditContext';

// Các thao tác ghi xuyên nhiều domain quanh sản phẩm/tồn kho: thêm SP (có thể phát sinh phiếu chi
// nếu gộp kho), nhập kho (Catalog + Suppliers + Cashbook), duyệt giá (Catalog + StoreSettings),
// kiểm kê (Catalog + InventoryAudit). Port nguyên trạng logic từ AppContext.tsx gốc.
export function useCatalogOrchestrator() {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { currentBranch } = useUiShell();
  const { products, setProducts } = useCatalog();
  const { setSuppliers } = useSuppliers();
  const { addCashbookEntry } = useCashbook();
  const { storeSettings, updateStoreSettings } = useStoreSettings();
  const { inventoryAudits, setInventoryAudits } = useInventoryAudit();

  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const cleanSku = productData.sku?.trim().toLowerCase();
    const cleanBarcode = productData.barcode?.trim();
    const cleanName = productData.name?.trim().toLowerCase();

    const existing = products.find((p) => {
      if (cleanSku && p.sku && p.sku.trim().toLowerCase() === cleanSku) return true;
      if (cleanBarcode && p.barcode && cleanBarcode !== '' && p.barcode.trim() === cleanBarcode) return true;
      if (cleanName && p.name && p.name.trim().toLowerCase() === cleanName) return true;
      return false;
    });

    if (existing) {
      const incomingStock = Math.max(0, productData.stock || 0);
      const incomingCost = productData.cost_price !== undefined && productData.cost_price > 0 ? productData.cost_price : existing.cost_price;
      const currentStock = Math.max(0, existing.stock);
      const currentCost = existing.cost_price;
      const newTotalStock = currentStock + incomingStock;
      const newWeightedCost = newTotalStock > 0
        ? Math.round((currentStock * currentCost + incomingStock * incomingCost) / newTotalStock)
        : incomingCost;

      const updatedProd: Product = {
        ...existing,
        stock: newTotalStock,
        cost_price: newWeightedCost,
        selling_price: productData.selling_price > 0 ? productData.selling_price : existing.selling_price,
        unit: productData.unit || existing.unit,
        category: productData.category || existing.category,
        min_stock: productData.min_stock !== undefined ? productData.min_stock : existing.min_stock,
        last_received_date: incomingStock > 0 ? new Date().toISOString().slice(0, 10) : existing.last_received_date,
      };

      setProducts((prev) => prev.map((p) => (p.id === existing.id ? updatedProd : p)));
      apiClient.updateProduct(existing.id, updatedProd).catch((err) => {
        console.warn('[Product] Sync update failed:', err);
        savePendingChange('products', updatedProd);
      });

      if (incomingStock > 0 && incomingCost > 0) {
        addCashbookEntry({
          type: 'OUT',
          amount: incomingStock * incomingCost,
          category: 'Chi tiền nhập hàng hóa',
          note: `Nhập gộp kho ${incomingStock} ${existing.unit} ${existing.name} (Giá nhập: ${incomingCost.toLocaleString('vi-VN')} đ)`,
          ref_code: `NK-${Date.now().toString().slice(-6)}`,
        });
      }

      showToast(
        `⚠️ Sản phẩm "${existing.name}" (Mã: ${existing.sku}) đã tồn tại trong danh mục! Đã tự động gộp vào sản phẩm có sẵn (+${incomingStock} ${existing.unit}) và tính lại giá vốn bình quân (${newWeightedCost.toLocaleString('vi-VN')} đ).`,
        'warning'
      );
      return updatedProd;
    }

    const newProd: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      status: productData.status || 'ACTIVE',
      image: productData.image || '',
    };
    setProducts((prev) => [newProd, ...prev]);
    apiClient.createProduct(newProd).catch((err) => {
      console.warn('[Product] Sync create failed:', err);
      savePendingChange('products', newProd);
    });
    showToast(`Đã thêm sản phẩm mới: ${newProd.name}`, 'success');
    return newProd;
  };

  const receiveStockWithWeightedCost = (productId: string, receivedQty: number, receivedCostPerUnit: number) => {
    if (receivedQty <= 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const currentStock = Math.max(0, p.stock);
        const currentCost = p.cost_price;
        const totalValue = currentStock * currentCost + receivedQty * receivedCostPerUnit;
        const newTotalStock = currentStock + receivedQty;
        const newWeightedCost = Math.round(totalValue / newTotalStock);

        return {
          ...p,
          stock: newTotalStock,
          cost_price: newWeightedCost,
          last_received_date: new Date().toISOString().slice(0, 10),
        };
      })
    );

    const targetProd = products.find((p) => p.id === productId);
    if (targetProd) {
      const currentStock = Math.max(0, targetProd.stock);
      const currentCost = targetProd.cost_price;
      const totalValue = currentStock * currentCost + receivedQty * receivedCostPerUnit;
      const newTotalStock = currentStock + receivedQty;
      const newWeightedCost = Math.round(totalValue / newTotalStock);
      const todayStr = new Date().toISOString().slice(0, 10);
      apiClient.updateProduct(productId, {
        stock: newTotalStock,
        cost_price: newWeightedCost,
        last_received_date: todayStr,
      }).catch((err) => {
        console.warn('[StockIn] Update product sync failed:', err);
      });
    }

    const product = products.find((p) => p.id === productId);
    const totalAmount = receivedQty * receivedCostPerUnit;
    addCashbookEntry({
      type: 'OUT',
      amount: totalAmount,
      category: 'Chi tiền nhập hàng hóa',
      note: `Nhập ${receivedQty} ${product?.unit || 'sp'} ${product?.name} (Giá nhập: ${receivedCostPerUnit.toLocaleString('vi-VN')} đ)`,
      ref_code: `NK-${Date.now().toString().slice(-6)}`,
    });

    showToast(`Đã nhập kho ${receivedQty} sản phẩm. Giá vốn bình quân mới đã được cập nhật!`, 'success');
  };

  const receiveStockVoucher = (payload: {
    supplier_id?: string;
    supplier_name?: string;
    payment_method?: 'CASH' | 'TRANSFER' | 'DEBT';
    note?: string;
    items: StockInVoucherItem[];
  }): StockInVoucher => {
    const voucherCode = `NK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const paymentMethod = payload.payment_method || 'CASH';

    let totalQty = 0;
    let totalAmt = 0;
    let newlyCreatedCount = 0;
    let mergedCount = 0;
    const modifiedProducts: Product[] = [];

    setProducts((prev) => {
      const idMap = new Map<string, Product>();
      const skuMap = new Map<string, Product>();
      const barcodeMap = new Map<string, Product>();
      const nameMap = new Map<string, Product>();

      prev.forEach((p) => {
        idMap.set(p.id, p);
        if (p.sku) skuMap.set(p.sku.trim().toLowerCase(), p);
        if (p.barcode) barcodeMap.set(p.barcode.trim(), p);
        if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
      });

      const updatedList = [...prev];

      payload.items.forEach((item) => {
        const qty = Math.max(1, item.quantity || 1);
        const cost = Math.max(0, item.cost_price || 0);
        totalQty += qty;
        totalAmt += qty * cost;

        const cleanSku = item.sku?.trim().toLowerCase();
        const cleanBarcode = item.barcode?.trim();
        const cleanName = item.name?.trim().toLowerCase();

        let existing: Product | undefined = undefined;
        if (item.product_id && idMap.has(item.product_id)) {
          existing = idMap.get(item.product_id);
        } else if (cleanSku && skuMap.has(cleanSku)) {
          existing = skuMap.get(cleanSku);
        } else if (cleanBarcode && cleanBarcode !== '' && barcodeMap.has(cleanBarcode)) {
          existing = barcodeMap.get(cleanBarcode);
        } else if (cleanName && nameMap.has(cleanName)) {
          existing = nameMap.get(cleanName);
        }

        if (existing) {
          mergedCount++;
          const currentStock = Math.max(0, existing.stock);
          const currentCost = existing.cost_price;
          const newTotalStock = currentStock + qty;
          const newWeightedCost = newTotalStock > 0
            ? Math.round((currentStock * currentCost + qty * cost) / newTotalStock)
            : cost;

          const updatedProd: Product = {
            ...existing,
            stock: newTotalStock,
            cost_price: newWeightedCost,
            selling_price: item.selling_price && item.selling_price > 0 ? item.selling_price : existing.selling_price,
            unit: item.unit || existing.unit,
            last_received_date: todayStr,
          };

          const idx = updatedList.findIndex((p) => p.id === existing!.id);
          if (idx >= 0) {
            updatedList[idx] = updatedProd;
          }
          idMap.set(updatedProd.id, updatedProd);
          if (updatedProd.sku) skuMap.set(updatedProd.sku.trim().toLowerCase(), updatedProd);
          if (updatedProd.barcode) barcodeMap.set(updatedProd.barcode.trim(), updatedProd);
          modifiedProducts.push(updatedProd);
        } else {
          newlyCreatedCount++;
          const newId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
          const newSku = item.sku?.trim() || `SP-${Date.now().toString().slice(-4)}${newlyCreatedCount}`;
          const newBarcode = item.barcode?.trim() || `893600${Math.floor(100000 + Math.random() * 900000)}`;
          const newSelling = item.selling_price && item.selling_price > 0 ? item.selling_price : Math.round(cost * 1.25 || 10000);

          const newProd: Product = {
            id: newId,
            sku: newSku,
            barcode: newBarcode,
            name: item.name.trim(),
            category: item.category || 'cat-electronics',
            unit: item.unit || 'Cái',
            cost_price: cost,
            selling_price: newSelling,
            stock: qty,
            min_stock: item.min_stock || 5,
            status: 'ACTIVE',
            last_received_date: todayStr,
          };

          updatedList.unshift(newProd);
          idMap.set(newProd.id, newProd);
          skuMap.set(newProd.sku.trim().toLowerCase(), newProd);
          barcodeMap.set(newProd.barcode.trim(), newProd);
          nameMap.set(newProd.name.trim().toLowerCase(), newProd);
          modifiedProducts.push(newProd);
        }
      });

      return updatedList;
    });

    if (modifiedProducts.length > 0) {
      apiClient.batchUpsertProducts(modifiedProducts, 'OVERWRITE').catch((err) => {
        console.warn('[Stock Voucher] Batch upsert products failed:', err);
      });
    }

    if (paymentMethod !== 'DEBT' && totalAmt > 0) {
      addCashbookEntry({
        type: 'OUT',
        amount: totalAmt,
        category: 'Chi tiền nhập hàng hóa',
        note: `Chi thanh toán phiếu nhập kho ${voucherCode} (${payload.supplier_name || 'Nhà cung cấp'})`,
        ref_code: voucherCode,
      });
    }

    if (payload.supplier_id || payload.supplier_name) {
      setSuppliers((prev) =>
        prev.map((s) => {
          const match =
            (payload.supplier_id && s.id === payload.supplier_id) ||
            (payload.supplier_name && s.name.toLowerCase() === payload.supplier_name.toLowerCase());
          if (!match) return s;
          return {
            ...s,
            total_purchased: s.total_purchased + totalAmt,
            debt: paymentMethod === 'DEBT' ? s.debt + totalAmt : s.debt,
          };
        })
      );
    }

    const voucher: StockInVoucher = {
      id: 'voucher-' + Date.now(),
      code: voucherCode,
      date: todayStr,
      supplier_id: payload.supplier_id,
      supplier_name: payload.supplier_name,
      items: payload.items,
      total_quantity: totalQty,
      total_amount: totalAmt,
      payment_method: paymentMethod,
      note: payload.note,
      created_by: currentUser.name,
      branch: currentBranch.name,
    };

    let toastMsg = `Nhập kho ${voucherCode} thành công! (${payload.items.length} mặt hàng, ${totalQty} sp, ${totalAmt.toLocaleString('vi-VN')} đ)`;
    if (newlyCreatedCount > 0) toastMsg += ` | Thêm mới: ${newlyCreatedCount} SP`;
    if (mergedCount > 0) toastMsg += ` | Gộp kho chung: ${mergedCount} SP`;

    showToast(toastMsg, 'success');
    return voucher;
  };

  const confirmProductPriceAudit = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const currentMap = storeSettings.confirmedPriceAudits || {};
    const nextMap = {
      ...currentMap,
      [productId]: {
        cost_price: Number(prod.cost_price || 0),
        selling_price: Number(prod.selling_price || 0),
        confirmed_at: new Date().toISOString(),
        confirmed_by: currentUser?.name || 'Quản lý',
      },
    };
    updateStoreSettings({ confirmedPriceAudits: nextMap });
    showToast(`Đã duyệt giá sản phẩm "${prod.name}" là hợp lệ`, 'success');
  };

  const unconfirmProductPriceAudit = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const currentMap = storeSettings.confirmedPriceAudits || {};
    if (!currentMap[productId]) return;
    const nextMap = { ...currentMap };
    delete nextMap[productId];
    updateStoreSettings({ confirmedPriceAudits: nextMap });
    showToast(`Đã hủy duyệt giá sản phẩm "${prod ? prod.name : productId}"`, 'info');
  };

  const confirmAllProductPriceAudits = (productIds: string[]) => {
    if (!productIds.length) return;
    const currentMap = { ...(storeSettings.confirmedPriceAudits || {}) };
    let count = 0;
    for (const id of productIds) {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        currentMap[id] = {
          cost_price: Number(prod.cost_price || 0),
          selling_price: Number(prod.selling_price || 0),
          confirmed_at: new Date().toISOString(),
          confirmed_by: currentUser?.name || 'Quản lý',
        };
        count++;
      }
    }
    updateStoreSettings({ confirmedPriceAudits: currentMap });
    showToast(`Đã duyệt giá hợp lệ cho ${count} sản phẩm!`, 'success');
  };

  const isPriceAuditConfirmed = (product: { id: string; cost_price: number; selling_price: number }): boolean => {
    if (!product || !product.id) return false;
    const record = storeSettings.confirmedPriceAudits?.[product.id];
    if (!record) return false;
    return (
      Number(record.cost_price) === Number(product.cost_price || 0) &&
      Number(record.selling_price) === Number(product.selling_price || 0)
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createInventoryAudit = (auditor: string, items: any[], notes?: string, initialStatus: 'DRAFT' | 'BALANCED' = 'DRAFT') => {
    const code = `KK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const auditItems = items.map((i) => {
      const diff = i.actual_stock - i.system_stock;
      const product = products.find((p) => p.id === i.product_id);
      const cost = product?.cost_price || 0;
      return { ...i, diff, diff_value: diff * cost };
    });

    const totalDiff = auditItems.reduce((acc, cur) => acc + cur.diff, 0);
    const totalDiffVal = auditItems.reduce((acc, cur) => acc + cur.diff_value, 0);

    const isBalanced = initialStatus === 'BALANCED';
    const newAudit = {
      id: 'audit-' + Date.now(),
      code,
      date: new Date().toISOString().slice(0, 10),
      auditor: auditor || currentUser.name,
      status: initialStatus,
      balanced_at: isBalanced ? new Date().toLocaleString('vi-VN') : undefined,
      items: auditItems,
      total_diff_items: totalDiff,
      total_diff_value: totalDiffVal,
      notes: notes || '',
    };

    if (isBalanced) {
      setProducts((prev) =>
        prev.map((p) => {
          const auditItem = auditItems.find((i) => i.product_id === p.id);
          if (!auditItem) return p;
          return { ...p, stock: auditItem.actual_stock };
        })
      );
    }

    setInventoryAudits((prev) => [newAudit, ...prev]);
    apiClient.createInventoryAudit(newAudit).catch((err) => {
      console.warn('[Audit] Sync create failed:', err);
      savePendingChange('inventory_audits', newAudit);
    });
    showToast(isBalanced ? `Đã tạo và cân bằng kho ngay theo phiếu ${code}!` : `Đã tạo phiếu kiểm kê ${code}`, 'success');
    return newAudit;
  };

  const balanceInventoryAudit = (auditId: string) => {
    const audit = inventoryAudits.find((a) => a.id === auditId);
    if (!audit) return;
    if (audit.status === 'BALANCED') {
      showToast('Phiếu kiểm kê này đã được cân bằng kho trước đó!', 'info');
      return;
    }

    setProducts((prev) =>
      prev.map((p) => {
        const auditItem = audit.items.find((i) => i.product_id === p.id);
        if (!auditItem) return p;
        return { ...p, stock: auditItem.actual_stock };
      })
    );

    setInventoryAudits((prev) =>
      prev.map((a) => (a.id === auditId ? { ...a, status: 'BALANCED', balanced_at: new Date().toLocaleString('vi-VN') } : a))
    );
    apiClient.balanceInventoryAudit(auditId).catch((err) => console.warn('[Audit] Sync balance failed:', err));

    showToast(`Cân bằng kho thành công theo phiếu ${audit.code}! Tồn kho đã được đồng bộ chuẩn xác.`, 'success');
  };

  return {
    addProduct,
    receiveStockWithWeightedCost,
    receiveStockVoucher,
    confirmProductPriceAudit,
    unconfirmProductPriceAudit,
    confirmAllProductPriceAudits,
    isPriceAuditConfirmed,
    createInventoryAudit,
    balanceInventoryAudit,
  };
}
