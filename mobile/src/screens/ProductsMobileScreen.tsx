import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { mobileApi } from '../services/api';
import { Product } from '../types';
import { ThemeColors, useMobileTheme } from '../theme/ThemeContext';

export const ProductsMobileScreen: React.FC = () => {
  const { colors } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [priceType, setPriceType] = useState<'selling_price' | 'cost_price'>('selling_price');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const loadProducts = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError('');

    try {
      setProducts(await mobileApi.getProducts());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách hàng hoá');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
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
    setFormSku(`SP-${Date.now().toString(36).toUpperCase()}`);
    setFormSellingPrice('');
    setFormCostPrice('');
    setFormStock('0');
    setFormUnit('Cái');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên hàng hoá!');
      return;
    }

    const sellingPrice = Number(formSellingPrice || 0);
    const costPrice = Number(formCostPrice || 0);
    const stock = Number(formStock || 0);
    if (![sellingPrice, costPrice, stock].every(Number.isFinite) || sellingPrice < 0 || costPrice < 0 || stock < 0) {
      Alert.alert('Dữ liệu chưa hợp lệ', 'Giá bán, giá vốn và tồn kho phải là số không âm.');
      return;
    }

    const sku = formSku.trim() || `SP-${Date.now().toString(36).toUpperCase()}`;
    setIsSaving(true);
    try {
      if (editingProduct) {
        const updated = await mobileApi.updateProduct(editingProduct.id, {
          name: formName.trim(),
          sku,
          selling_price: sellingPrice,
          cost_price: costPrice,
          stock,
          unit: formUnit.trim() || 'Cái',
        });
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        Alert.alert('Thành công', `Đã cập nhật hàng hoá "${formName.trim()}".`);
      } else {
        const created = await mobileApi.createProduct({
          id: `prod-${Date.now()}`,
          name: formName.trim(),
          sku,
          barcode: '',
          category: '',
          unit: formUnit.trim() || 'Cái',
          selling_price: sellingPrice,
          cost_price: costPrice,
          stock,
          min_stock: 0,
          status: 'ACTIVE',
        });
        setProducts((prev) => [created, ...prev]);
        Alert.alert('Thành công', `Đã thêm hàng hoá "${formName.trim()}".`);
      }
      setIsModalOpen(false);
    } catch (error) {
      Alert.alert('Không thể lưu', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingProduct) return;
    Alert.alert('Xác nhận xoá', `Bạn có chắc muốn xoá hàng hoá "${editingProduct.name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await mobileApi.deleteProduct(editingProduct.id);
            setProducts((prev) => prev.filter((p) => p.id !== editingProduct.id));
            setIsModalOpen(false);
          } catch (error) {
            Alert.alert('Không thể xoá', error instanceof Error ? error.message : 'Vui lòng thử lại.');
          } finally {
            setIsDeleting(false);
          }
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
          placeholderTextColor={colors.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loadError ? (
        <TouchableOpacity style={styles.errorBanner} onPress={() => loadProducts()}>
          <Text style={styles.errorText}>Không tải được dữ liệu. Chạm để thử lại.</Text>
        </TouchableOpacity>
      ) : null}

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProducts(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.emptyTitle}>{search ? 'Không tìm thấy hàng hoá' : 'Chưa có hàng hoá'}</Text>
                <Text style={styles.emptySub}>
                  {search ? 'Thử tên hoặc mã SKU khác.' : 'Nhấn + để thêm hàng hoá đầu tiên.'}
                </Text>
              </>
            )}
          </View>
        }
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

            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isSaving || isDeleting}>
              {isSaving ? <ActivityIndicator color={colors.inverse} /> : <Text style={styles.saveBtnText}>Lưu</Text>}
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
                placeholderTextColor={colors.textSubtle}
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
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            {/* Price Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Giá bán (VNĐ) *</Text>
                <TextInput
                  style={[styles.input, { color: colors.primary, fontWeight: 'bold' }]}
                  value={formSellingPrice}
                  onChangeText={setFormSellingPrice}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSubtle}
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
                  placeholderTextColor={colors.textSubtle}
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
                placeholderTextColor={colors.textSubtle}
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
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={isDeleting || isSaving}>
                {isDeleting ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <Text style={styles.deleteBtnText}>🗑️ Xoá hàng hoá này</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  headerIcons: { flexDirection: 'row', gap: 14 },
  icon: { fontSize: 18 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnText: { fontSize: 14 },
  pill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  summarySub: { fontSize: 11, color: colors.textMuted },
  summaryCount: { fontSize: 16, fontWeight: '900', color: colors.text },
  searchContainer: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    fontSize: 13,
    color: colors.text,
  },
  errorBanner: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  listContent: { padding: 12, paddingBottom: 100 },
  emptyState: { paddingVertical: 42, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: colors.text },
  productSku: { fontSize: 11, color: colors.textSubtle, fontFamily: 'monospace', marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  productPrice: { fontSize: 14, fontWeight: '800', color: colors.text },
  productStock: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  fabText: { fontSize: 30, color: colors.inverse, fontWeight: 'bold', marginTop: -2 },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backBtnText: { fontSize: 26, color: colors.textMuted, marginRight: 6, marginTop: -2 },
  modalTitleText: { fontSize: 16, fontWeight: '800', color: colors.text },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 56,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.inverse, fontWeight: 'bold', fontSize: 13 },
  formScroll: { flex: 1 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  row: { flexDirection: 'row' },
  unitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  unitChipActive: { backgroundColor: colors.primary },
  unitChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  unitChipTextActive: { color: colors.inverse, fontWeight: 'bold' },
  deleteBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { color: colors.danger, fontWeight: 'bold', fontSize: 13 },
});
