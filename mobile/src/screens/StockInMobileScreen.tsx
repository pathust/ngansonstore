import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Product, Supplier } from '../types';
import { mobileApi } from '../services/api';

export const StockInMobileScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inQuantity, setInQuantity] = useState('10');
  const [inCostPrice, setInCostPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, sups] = await Promise.all([
        mobileApi.getProducts(),
        mobileApi.getSuppliers(),
      ]);
      setProducts(prods);
      setSuppliers(sups);
    } catch (e: any) {
      console.warn('Load stock in data error:', e);
    }
  };

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setInCostPrice(p.cost_price ? String(p.cost_price) : '0');
    setSearch('');
  };

  const qtyNum = parseInt(inQuantity, 10) || 0;
  const costNum = parseInt(inCostPrice.replace(/\D/g, ''), 10) || 0;

  // Calculate Weighted Average Cost
  const oldStock = selectedProduct?.stock || 0;
  const oldCost = selectedProduct?.cost_price || 0;
  const newStock = oldStock + qtyNum;
  const newWeightedCost =
    newStock > 0
      ? Math.round((oldStock * oldCost + qtyNum * costNum) / newStock)
      : costNum;

  const totalVoucherAmount = qtyNum * costNum;

  const handleSubmitStockIn = async () => {
    if (!selectedProduct) {
      Alert.alert('Chưa chọn sản phẩm', 'Vui lòng chọn 1 mặt hàng để nhập kho!');
      return;
    }
    if (qtyNum <= 0) {
      Alert.alert('Số lượng không hợp lệ', 'Vui lòng nhập số lượng > 0!');
      return;
    }

    try {
      // Update product stock and cost
      const updatedStock = selectedProduct.stock + qtyNum;
      await mobileApi.updateProduct(selectedProduct.id, {
        ...selectedProduct,
        stock: updatedStock,
        cost_price: newWeightedCost,
      });

      Alert.alert(
        'Nhập kho thành công',
        `Đã cộng ${qtyNum} ${selectedProduct.unit} vào tồn kho.\nGiá vốn bình quân mới: ${newWeightedCost.toLocaleString('vi-VN')} đ`
      );

      // Reset
      setSelectedProduct(null);
      setInQuantity('10');
      setInCostPrice('');
      setNote('');
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Lập Phiếu Nhập Kho Di Động</Text>
        <Text style={styles.cardSubtitle}>
          Tự động tính giá vốn bình quân gia quyền (BQGQ) & cộng dồn tồn kho
        </Text>

        {/* Product selector */}
        <Text style={styles.fieldLabel}>Chọn mặt hàng cần nhập:</Text>
        {selectedProduct ? (
          <View style={styles.selectedProductBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>{selectedProduct.name}</Text>
              <Text style={styles.selectedMeta}>
                SKU: {selectedProduct.sku} • Tồn hiện tại: {selectedProduct.stock} {selectedProduct.unit}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => setSelectedProduct(null)}
            >
              <Text style={styles.changeBtnText}>Đổi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Gõ tên hoặc SKU để tìm hàng..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            {search.length > 0 && (
              <View style={styles.searchDropdown}>
                {products
                  .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                  .slice(0, 5)
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectProduct(p)}
                    >
                      <Text style={styles.dropItemName}>{p.name}</Text>
                      <Text style={styles.dropItemSku}>
                        Tồn: {p.stock} • Vốn cũ: {p.cost_price.toLocaleString('vi-VN')} đ
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* Input Quantity & Cost Price */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Số lượng nhập:</Text>
            <TextInput
              value={inQuantity}
              onChangeText={setInQuantity}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Đơn giá nhập (VNĐ):</Text>
            <TextInput
              value={inCostPrice}
              onChangeText={setInCostPrice}
              keyboardType="numeric"
              placeholder="VD: 150000"
              style={styles.input}
            />
          </View>
        </View>

        {/* Weighted Cost Preview Box */}
        {selectedProduct && (
          <View style={styles.calculationBox}>
            <Text style={styles.calcTitle}>💡 Phân tích Giá Vốn Bình Quân:</Text>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Giá vốn hiện tại:</Text>
              <Text style={styles.calcVal}>
                {oldCost.toLocaleString('vi-VN')} đ (Tồn: {oldStock})
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Giá nhập đợt này:</Text>
              <Text style={styles.calcVal}>
                {costNum.toLocaleString('vi-VN')} đ (Nhập: +{qtyNum})
              </Text>
            </View>
            <View style={[styles.calcRow, styles.calcHighlight]}>
              <Text style={styles.calcLabelBold}>Giá vốn BQGQ mới:</Text>
              <Text style={styles.calcValBold}>
                {newWeightedCost.toLocaleString('vi-VN')} đ
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Tổng tiền nhập:</Text>
              <Text style={styles.calcTotalVal}>
                {totalVoucherAmount.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        )}

        {/* Supplier & Note */}
        <Text style={styles.fieldLabel}>Nhà cung cấp:</Text>
        <TextInput
          value={supplierName}
          onChangeText={setSupplierName}
          placeholder="Tên nhà cung cấp (hoặc bỏ trống nếu mua lẻ)"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Ghi chú phiếu nhập:</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="VD: Hàng giao xe tải chiều nay..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmitStockIn}
        >
          <Text style={styles.submitBtnText}>✓ Xác Nhận Nhập Kho & Cập Nhật Giá Vốn</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  selectedProductBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  selectedMeta: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  changeBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  changeBtnText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: 'bold',
  },
  searchDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  dropItemSku: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  calculationBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  calcHighlight: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 6,
    marginVertical: 4,
  },
  calcLabel: {
    fontSize: 11,
    color: '#374151',
  },
  calcVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  calcLabelBold: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#15803d',
  },
  calcValBold: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15803d',
  },
  calcTotalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0B63E5',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
