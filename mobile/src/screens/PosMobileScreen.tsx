import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Product, CartItem, Customer, Order } from '../types';
import { mobileApi } from '../services/api';
import { VietQrPaymentModal } from '../components/VietQrPaymentModal';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';

export const PosMobileScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isVietQrModalOpen, setIsVietQrModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [pendingOrderCode, setPendingOrderCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, custs] = await Promise.all([
        mobileApi.getProducts(),
        mobileApi.getCustomers(),
      ]);
      setProducts(prods);
      setCustomers(custs);
    } catch (e: any) {
      console.warn('Error loading POS data:', e);
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
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
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = [
    { id: 'ALL', name: 'Tất cả' },
    { id: 'cat-electronics', name: 'Thiết bị điện' },
    { id: 'cat-water', name: 'Ống & phụ kiện nước' },
    { id: 'cat-hardware', name: 'Kim khí & Dụng cụ' },
  ];

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
      total_cost: cart.reduce((sum, c) => sum + (c.product.cost_price || 0) * c.quantity, 0),
      profit: 0,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
      cashier: 'Thu ngân Mobile',
      branch: '318 Vũ Quang',
    };

    if (paymentMethod === 'TRANSFER') {
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
      total_cost: cart.reduce((sum, c) => sum + (c.product.cost_price || 0) * c.quantity, 0),
      profit: 0,
      payment_method: 'TRANSFER',
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
      cashier: 'Thu ngân Mobile',
      branch: '318 Vũ Quang',
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
            placeholderTextColor="#94a3b8"
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

      {/* Categories Filter Horizontal Scroll */}
      <View style={styles.catContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map((c) => {
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
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
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

      {/* VietQR Modal */}
      <VietQrPaymentModal
        visible={isVietQrModalOpen}
        onClose={() => setIsVietQrModalOpen(false)}
        onConfirmPaid={handleVietQrConfirmed}
        amount={totalAmount}
        orderCode={pendingOrderCode}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  micBtn: {
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  micIcon: {
    fontSize: 16,
  },
  catContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    backgroundColor: '#f1f5f9',
  },
  catPillActive: {
    backgroundColor: '#0B63E5',
  },
  catText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  catTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  productList: {
    padding: 12,
    gap: 10,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 18,
  },
  productSku: {
    fontSize: 11,
    color: '#64748b',
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
    color: '#0B63E5',
  },
  stockBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockOk: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  stockLow: {
    backgroundColor: '#fffbeb',
    color: '#d97706',
  },
  stockOut: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  addIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    fontSize: 18,
    color: '#0B63E5',
    fontWeight: 'bold',
  },
  bottomCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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
    backgroundColor: '#0B63E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartBarLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  cartBarTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B63E5',
  },
  cartCheckoutBtn: {
    backgroundColor: '#0B63E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartCheckoutText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cartModalContainer: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  closeBtnText: {
    fontSize: 18,
    color: '#64748b',
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
    borderBottomColor: '#f1f5f9',
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    minWidth: 20,
    textAlign: 'center',
  },
  cartModalFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B63E5',
  },
  paymentBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cashBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cashBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  },
  qrBtn: {
    flex: 1,
    backgroundColor: '#0B63E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
