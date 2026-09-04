import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Product } from '../types';
import { mobileApi } from '../services/api';

export const ProductScannerScreen: React.FC = () => {
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [recentScans, setRecentScans] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchBarcode = async (code: string) => {
    if (!code.trim()) return;
    setIsSearching(true);
    try {
      const prod = await mobileApi.getProductByBarcode(code.trim());
      if (prod) {
        setFoundProduct(prod);
        setRecentScans((prev) => [prod, ...prev.filter((p) => p.id !== prod.id)].slice(0, 10));
      } else {
        Alert.alert('Không tìm thấy', `Không tìm thấy sản phẩm có mã "${code}" trong kho.`);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Scanner Input Header */}
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>🔍 Quét Mã Vạch & Tra Cứu Kho</Text>
        <Text style={styles.headerSub}>Nhập hoặc quét Barcode sản phẩm để kiểm tra tồn kho & giá bán</Text>

        <View style={styles.inputRow}>
          <TextInput
            value={barcodeQuery}
            onChangeText={setBarcodeQuery}
            placeholder="Nhập mã vạch hoặc SKU (VD: 8936...)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            onSubmitEditing={() => handleSearchBarcode(barcodeQuery)}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => handleSearchBarcode(barcodeQuery)}
          >
            <Text style={styles.searchBtnText}>Tra cứu</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Sample Barcodes */}
        <View style={styles.sampleRow}>
          <Text style={styles.sampleLabel}>Mẫu nhanh:</Text>
          {['893600100101', '893600100102', '893600100103'].map((code) => (
            <TouchableOpacity
              key={code}
              style={styles.sampleChip}
              onPress={() => {
                setBarcodeQuery(code);
                handleSearchBarcode(code);
              }}
            >
              <Text style={styles.sampleChipText}>{code.slice(-4)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Found Product Result Card */}
      {foundProduct && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prodName}>{foundProduct.name}</Text>
              <Text style={styles.prodSku}>
                Mã SKU: {foundProduct.sku} • Barcode: {foundProduct.barcode}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                foundProduct.stock <= 0
                  ? styles.badgeOut
                  : foundProduct.stock <= foundProduct.min_stock
                  ? styles.badgeLow
                  : styles.badgeOk,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  foundProduct.stock <= 0
                    ? styles.badgeTextOut
                    : foundProduct.stock <= foundProduct.min_stock
                    ? styles.badgeTextLow
                    : styles.badgeTextOk,
                ]}
              >
                {foundProduct.stock <= 0
                  ? 'Hết hàng'
                  : foundProduct.stock <= foundProduct.min_stock
                  ? 'Sắp hết'
                  : 'Còn hàng'}
              </Text>
            </View>
          </View>

          <View style={styles.gridInfo}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Giá bán niêm yết:</Text>
              <Text style={styles.valPrice}>
                {foundProduct.selling_price.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.label}>Giá vốn hiện tại:</Text>
              <Text style={styles.valCost}>
                {foundProduct.cost_price.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>

          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Số lượng tồn trong kho:</Text>
            <Text style={styles.stockVal}>
              {foundProduct.stock} {foundProduct.unit}
            </Text>
          </View>
        </View>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Lịch sử quét gần đây</Text>
          {recentScans.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentRow}
              onPress={() => setFoundProduct(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{item.name}</Text>
                <Text style={styles.recentSku}>SKU: {item.sku}</Text>
              </View>
              <Text style={styles.recentPrice}>
                {item.selling_price.toLocaleString('vi-VN')} đ
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  headerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  searchBtn: {
    backgroundColor: '#0B63E5',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  sampleLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sampleChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sampleChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prodName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 20,
  },
  prodSku: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOk: { backgroundColor: '#ecfdf5' },
  badgeLow: { backgroundColor: '#fffbeb' },
  badgeOut: { backgroundColor: '#fef2f2' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextOk: { color: '#059669' },
  badgeTextLow: { color: '#d97706' },
  badgeTextOut: { color: '#dc2626' },
  gridInfo: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoCol: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#64748b',
  },
  valPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B63E5',
    marginTop: 2,
  },
  valCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 2,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  stockLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  stockVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  recentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  recentSku: {
    fontSize: 11,
    color: '#64748b',
  },
  recentPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0B63E5',
  },
});
