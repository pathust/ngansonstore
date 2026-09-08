import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Product, CartItem, Customer, Order, StoreSettings, Category } from '../types';
import { mobileApi } from '../services/api';
import { VietQrPaymentModal } from '../components/VietQrPaymentModal';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { ThemeColors, useMobileTheme } from '../theme/ThemeContext';

export const PosMobileScreen: React.FC = () => {
  const { colors } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isVietQrModalOpen, setIsVietQrModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [pendingOrderCode, setPendingOrderCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError('');
    try {
      const [prods, custs, settings, cats] = await Promise.all([
        mobileApi.getProducts(),
        mobileApi.getCustomers(),
        mobileApi.getSettings(),
        mobileApi.getCategories(),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setStoreSettings(settings);
      setCategories(cats);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu bán hàng');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      Alert.alert('Hết hàng', `"${product.name}" hiện không còn tồn kho.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQuantity = existing.quantity + quantity;
        if (nextQuantity > product.stock) {
          Alert.alert('Không đủ tồn kho', `Chỉ còn ${product.stock} ${product.unit} "${product.name}".`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item
        );
      }
      if (quantity > product.stock) {
        Alert.alert('Không đủ tồn kho', `Chỉ còn ${product.stock} ${product.unit} "${product.name}".`);
        return prev;
      }
      return [
        ...prev,
        {
          product,
          quantity,
          unitPrice: product.selling_price,
          discount: 0,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.stock) return item;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categoryOptions = [{ id: 'ALL', name: 'Tất cả' }, ...categories.map((category) => ({ id: category.id, name: category.name }))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    const matchesCat = selectedCat === 'ALL' || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const handleCreateOrder = async (paymentMethod: 'CASH' | 'TRANSFER') => {
    if (cart.length === 0) return;

    const orderCode = `HD-${Date.now().toString().slice(-6)}`;
    const totalCost = cart.reduce((sum, c) => sum + (c.product.cost_price || 0) * c.quantity, 0);
    const newOrder: Partial<Order> = {
      code: orderCode,
      customer_name: selectedCustomer?.name || 'Khách lẻ',
      phone: selectedCustomer?.phone || '',
      items: cart.map((c) => ({
        product_id: c.product.id,
        sku: c.product.sku,
        name: c.product.name,
        unit: c.product.unit,
        quantity: c.quantity,
        price: c.unitPrice,
        cost_price: c.product.cost_price || 0,
      })),
      total: totalAmount,
      discount: 0,
      final_amount: totalAmount,
      total_cost: totalCost,
      profit: totalAmount - totalCost,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
      cashier: 'Thu ngân Mobile',
      branch: storeSettings?.address || storeSettings?.name || '',
    };

    if (paymentMethod === 'TRANSFER') {
      if (!storeSettings?.bankId?.trim() || !storeSettings?.accountNumber?.trim()) {
        Alert.alert(
          'Chưa cấu hình VietQR',
          'Vui lòng vào Nhiều hơn → Cài đặt để nhập ngân hàng và số tài khoản trước khi nhận chuyển khoản.'
        );
        return;
      }
      setPendingOrderCode(orderCode);
      setIsCartModalOpen(false);
      setIsVietQrModalOpen(true);
    } else {
      try {
        await mobileApi.createOrder(newOrder);
        Alert.alert('Thành công', `Đã tạo hóa đơn ${orderCode} tiền mặt!`);
        setCart([]);
        setIsCartModalOpen(false);
        loadData();
      } catch (err: any) {
        Alert.alert('Lỗi', err.message);
      }
    }
  };

  const handleVietQrConfirmed = async () => {
    const totalCost = cart.reduce((sum, c) => sum + (c.product.cost_price || 0) * c.quantity, 0);
    const newOrder: Partial<Order> = {
      code: pendingOrderCode,
      customer_name: selectedCustomer?.name || 'Khách lẻ',
      phone: selectedCustomer?.phone || '',
      items: cart.map((c) => ({
        product_id: c.product.id,
        sku: c.product.sku,
        name: c.product.name,
        unit: c.product.unit,
        quantity: c.quantity,
        price: c.unitPrice,
        cost_price: c.product.cost_price || 0,
      })),
      total: totalAmount,
      discount: 0,
      final_amount: totalAmount,
      total_cost: totalCost,
      profit: totalAmount - totalCost,
      payment_method: 'TRANSFER',
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
      cashier: 'Thu ngân Mobile',
      branch: storeSettings?.address || storeSettings?.name || '',
    };

    try {
      await mobileApi.createOrder(newOrder);
      setIsVietQrModalOpen(false);
      setCart([]);
      Alert.alert('Thành công', `Đã xác nhận thanh toán VietQR cho đơn ${pendingOrderCode}!`);
      loadData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.searchWrapper}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm sản phẩm, SKU, mã vạch..."
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Voice AI button */}
        <TouchableOpacity
          style={styles.micBtn}
          onPress={() => setIsVoiceModalOpen(true)}
        >
          <Text style={styles.micIcon}>🎙️</Text>
        </TouchableOpacity>
      </View>

      {loadError ? (
        <TouchableOpacity style={styles.errorBanner} onPress={() => loadData()}>
          <Text style={styles.errorText}>Không tải được dữ liệu bán hàng. Chạm để thử lại.</Text>
        </TouchableOpacity>
      ) : null}

      {/* Categories Filter Horizontal Scroll */}
      <View style={styles.catContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categoryOptions.map((c) => {
            const isSelected = selectedCat === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, isSelected && styles.catPillActive]}
                onPress={() => setSelectedCat(c.id)}
              >
                <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products Grid / List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.emptyTitle}>{search ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm để bán'}</Text>
                <Text style={styles.emptySub}>{search ? 'Thử tên, SKU hoặc mã vạch khác.' : 'Thêm hàng hoá trước khi tạo đơn.'}</Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.productCard, item.stock <= 0 && styles.productCardDisabled]}
            onPress={() => addToCart(item)}
            activeOpacity={item.stock <= 0 ? 1 : 0.7}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.productSku}>SKU: {item.sku} • ĐVT: {item.unit}</Text>
              <View style={styles.productBottom}>
                <Text style={styles.productPrice}>
                  {item.selling_price.toLocaleString('vi-VN')} đ
                </Text>
                <Text
                  style={[
                    styles.stockBadge,
                    item.stock <= 0 ? styles.stockOut : item.stock <= item.min_stock ? styles.stockLow : styles.stockOk,
                  ]}
                >
                  Tồn: {item.stock}
                </Text>
              </View>
            </View>
            <View style={styles.addIconBox}>
              <Text style={styles.addIconText}>+</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Sticky Bottom Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.bottomCartBar}>
          <TouchableOpacity style={styles.cartBarInfo} onPress={() => setIsCartModalOpen(true)}>
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{totalItemsCount}</Text>
            </View>
            <View>
              <Text style={styles.cartBarLabel}>Tổng tiền hàng:</Text>
              <Text style={styles.cartBarTotal}>{totalAmount.toLocaleString('vi-VN')} đ</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartCheckoutBtn} onPress={() => setIsCartModalOpen(true)}>
            <Text style={styles.cartCheckoutText}>Xem giỏ & Trả tiền ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Modal Drawer */}
      <Modal visible={isCartModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContainer}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Giỏ Hàng POS ({totalItemsCount})</Text>
              <TouchableOpacity onPress={() => setIsCartModalOpen(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItemsScroll}>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      {item.unitPrice.toLocaleString('vi-VN')} đ / {item.product.unit}
                    </Text>
                  </View>

                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, -1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.cartModalFooter}>
              <TouchableOpacity style={styles.customerSelector} onPress={() => setIsCustomerModalOpen(true)}>
                <View>
                  <Text style={styles.customerSelectorLabel}>Khách hàng</Text>
                  <Text style={styles.customerSelectorValue}>{selectedCustomer?.name || 'Khách lẻ'}</Text>
                </View>
                <Text style={styles.customerSelectorAction}>Chọn ›</Text>
              </TouchableOpacity>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Khách cần trả:</Text>
                <Text style={styles.summaryValue}>{totalAmount.toLocaleString('vi-VN')} đ</Text>
              </View>

              <View style={styles.paymentBtnRow}>
                <TouchableOpacity
                  style={styles.cashBtn}
                  onPress={() => handleCreateOrder('CASH')}
                >
                  <Text style={styles.cashBtnText}>💵 Tiền mặt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.qrBtn}
                  onPress={() => handleCreateOrder('TRANSFER')}
                >
                  <Text style={styles.qrBtnText}>📱 Quét VietQR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isCustomerModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.customerModalContainer}>
            <View style={styles.cartModalHeader}>
              <Text style={styles.cartModalTitle}>Chọn khách hàng</Text>
              <TouchableOpacity onPress={() => setIsCustomerModalOpen(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.customerRow}
              onPress={() => {
                setSelectedCustomer(null);
                setIsCustomerModalOpen(false);
              }}
            >
              <View>
                <Text style={styles.customerName}>Khách lẻ</Text>
                <Text style={styles.customerPhone}>Không gắn công nợ/khách hàng</Text>
              </View>
            </TouchableOpacity>
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerRow}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setIsCustomerModalOpen(false);
                  }}
                >
                  <View>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerPhone}>{item.phone || 'Không có số điện thoại'}</Text>
                  </View>
                  {selectedCustomer?.id === item.id ? <Text style={styles.customerSelected}>✓</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptySub}>Chưa có khách hàng.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* VietQR Modal */}
      <VietQrPaymentModal
        visible={isVietQrModalOpen}
        onClose={() => setIsVietQrModalOpen(false)}
        onConfirmPaid={handleVietQrConfirmed}
        amount={totalAmount}
        orderCode={pendingOrderCode}
        bankId={storeSettings?.bankId}
        accountNumber={storeSettings?.accountNumber}
        accountHolder={storeSettings?.accountHolder}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        visible={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        products={products}
        customers={customers}
        suppliers={[]}
        onAddToCart={(prod, qty) => addToCart(prod, qty)}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  micBtn: {
    backgroundColor: colors.primarySoft,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  micIcon: {
    fontSize: 16,
  },
  catContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  catPillActive: {
    backgroundColor: colors.primary,
  },
  catText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  catTextActive: {
    color: colors.inverse,
    fontWeight: 'bold',
  },
  productList: {
    padding: 12,
    gap: 10,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  productCardDisabled: { opacity: 0.55 },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    lineHeight: 18,
  },
  productSku: {
    fontSize: 11,
    color: colors.textMuted,
    marginVertical: 3,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  stockBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockOk: {
    backgroundColor: colors.surfaceRaised,
    color: colors.success,
  },
  stockLow: {
    backgroundColor: colors.surfaceRaised,
    color: colors.warning,
  },
  stockOut: {
    backgroundColor: colors.surfaceRaised,
    color: colors.danger,
  },
  addIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  bottomCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  cartBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartBarLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cartBarTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  cartCheckoutBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartCheckoutText: {
    color: colors.inverse,
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cartModalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartModalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  cartItemsScroll: {
    maxHeight: 260,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cartItemPrice: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  cartModalFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  paymentBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cashBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cashBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  qrBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.inverse,
  },
  errorBanner: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surfaceRaised,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  emptyState: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerSelectorLabel: { color: colors.textMuted, fontSize: 11 },
  customerSelectorValue: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
  customerSelectorAction: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  customerModalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '75%',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  customerPhone: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  customerSelected: { color: colors.primary, fontSize: 18, fontWeight: '900' },
});
