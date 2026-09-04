import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { mobileApi } from '../services/api';
import { Product } from '../types';

export const ProductsMobileScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [priceType, setPriceType] = useState<'selling_price' | 'cost_price'>('selling_price');

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formUnit, setFormUnit] = useState('Cái');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    mobileApi.getProducts().then(setProducts).catch(() => {});
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormSellingPrice(String(p.selling_price || 0));
    setFormCostPrice(String(p.cost_price || 0));
    setFormStock(String(p.stock || 0));
    setFormUnit(p.unit || 'Cái');
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`SP-${Date.now().toString().slice(-4)}`);
    setFormSellingPrice('');
    setFormCostPrice('');
    setFormStock('10');
    setFormUnit('Cái');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên hàng hoá!');
      return;
    }

    if (editingProduct) {
      // Update existing
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formName.trim(),
                sku: formSku.trim() || p.sku,
                selling_price: Number(formSellingPrice) || 0,
                cost_price: Number(formCostPrice) || 0,
                stock: Number(formStock) || 0,
                unit: formUnit.trim() || 'Cái',
              }
            : p
        )
      );
      Alert.alert('Thành công', `Đã cập nhật hàng hoá "${formName}"!`);
    } else {
      // Add new
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name: formName.trim(),
        sku: formSku.trim() || `SP-${Date.now().toString().slice(-4)}`,
        barcode: `893${Date.now().toString().slice(-10)}`,
        category: 'cat-dien',
        unit: formUnit.trim() || 'Cái',
        selling_price: Number(formSellingPrice) || 0,
        cost_price: Number(formCostPrice) || 0,
        stock: Number(formStock) || 0,
        min_stock: 5,
        status: 'ACTIVE',
      };
      setProducts((prev) => [newProd, ...prev]);
      Alert.alert('Thành công', `Đã thêm mới hàng hoá "${formName}"!`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingProduct) return;
    Alert.alert('Xác nhận xoá', `Bạn có chắc muốn xoá hàng hoá "${editingProduct.name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => {
          setProducts((prev) => prev.filter((p) => p.id !== editingProduct.id));
          setIsModalOpen(false);
        },
      },
    ]);
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const commonUnits = ['Cái', 'Cuộn', 'Cây', 'Hộp', 'Bộ', 'Mét', 'Bình', 'Kg'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hàng hoá</Text>
        <View style={styles.headerIcons}>
          <Text style={styles.icon}>🔍</Text>
          <Text style={styles.icon}>⇅</Text>
          <Text style={styles.icon}>•••</Text>
        </View>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterBtnText}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill}>
          <Text style={styles.pillText}>Tất cả loại hàng ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pill}
          onPress={() => setPriceType(priceType === 'selling_price' ? 'cost_price' : 'selling_price')}
        >
          <Text style={styles.pillText}>{priceType === 'selling_price' ? 'Giá bán' : 'Giá vốn'} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View>
          <Text style={styles.summaryTitle}>Tổng tồn</Text>
          <Text style={styles.summarySub}>{products.length} hàng hoá</Text>
        </View>
        <Text style={styles.summaryCount}>{totalStock.toLocaleString('vi-VN')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên, mã SKU..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => handleOpenEdit(item)}
            activeOpacity={0.7}
          >
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 20 }}>📦</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.productSku}>{item.sku}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.productPrice}>
                {((priceType === 'selling_price' ? item.selling_price : item.cost_price) || 0).toLocaleString('vi-VN')}
              </Text>
              <Text style={styles.productStock}>
                Tồn: {item.stock} {item.unit}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB (+) */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAdd} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Edit / Add Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>‹</Text>
              <Text style={styles.modalTitleText}>
                {editingProduct ? 'Sửa hàng hoá' : 'Thêm hàng hoá'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          {/* Form Scroll */}
          <ScrollView style={styles.formScroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên hàng hoá *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Nhập tên sản phẩm..."
              />
            </View>

            {/* SKU */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mã hàng (SKU)</Text>
              <TextInput
                style={styles.input}
                value={formSku}
                onChangeText={setFormSku}
                placeholder="SP-0001"
              />
            </View>

            {/* Price Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Giá bán (VNĐ) *</Text>
                <TextInput
                  style={[styles.input, { color: '#0066FF', fontWeight: 'bold' }]}
                  value={formSellingPrice}
                  onChangeText={setFormSellingPrice}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Giá vốn (VNĐ)</Text>
                <TextInput
                  style={styles.input}
                  value={formCostPrice}
                  onChangeText={setFormCostPrice}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            {/* Stock */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tồn kho hiện tại</Text>
              <TextInput
                style={styles.input}
                value={formStock}
                onChangeText={setFormStock}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            {/* Units Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Đơn vị tính</Text>
              <View style={styles.unitChips}>
                {commonUnits.map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setFormUnit(u)}
                    style={[styles.unitChip, formUnit === u && styles.unitChipActive]}
                  >
                    <Text
                      style={[styles.unitChipText, formUnit === u && styles.unitChipTextActive]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Delete Button (if editing) */}
            {editingProduct && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>🗑️ Xoá hàng hoá này</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerIcons: { flexDirection: 'row', gap: 14 },
  icon: { fontSize: 18 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnText: { fontSize: 14 },
  pill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  summarySub: { fontSize: 11, color: '#6B7280' },
  summaryCount: { fontSize: 16, fontWeight: '900', color: '#111827' },
  searchContainer: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#ffffff' },
  searchInput: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    fontSize: 13,
  },
  listContent: { padding: 12, paddingBottom: 100 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  productSku: { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  productPrice: { fontSize: 14, fontWeight: '800', color: '#111827' },
  productStock: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  fabText: { fontSize: 30, color: '#ffffff', fontWeight: 'bold', marginTop: -2 },
  modalContainer: { flex: 1, backgroundColor: '#F5F6F8' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backBtnText: { fontSize: 26, color: '#374151', marginRight: 6, marginTop: -2 },
  modalTitleText: { fontSize: 16, fontWeight: '800', color: '#111827' },
  saveBtn: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  formScroll: { flex: 1 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  row: { flexDirection: 'row' },
  unitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  unitChipActive: { backgroundColor: '#0066FF' },
  unitChipText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  unitChipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  deleteBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 13 },
});
