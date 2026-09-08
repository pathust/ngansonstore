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
  Animated,
  PanResponder,
} from 'react-native';
import { Order } from '../types';
import { mobileApi } from '../services/api';
import { ThemeColors, useMobileTheme } from '../theme/ThemeContext';

type ScreenStyles = ReturnType<typeof createStyles>;

const SwipeableOrderCard: React.FC<{
  item: Order;
  onOpen: (order: Order) => void;
  onDelete: (order: Order) => void;
  styles: ScreenStyles;
}> = ({ item, onOpen, onDelete, styles }) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const didSwipe = React.useRef(false);
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.max(-88, Math.min(0, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          didSwipe.current = Math.abs(gesture.dx) > 12;
          Animated.spring(translateX, {
            toValue: gesture.dx < -44 ? -88 : 0,
            useNativeDriver: false,
            bounciness: 0,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 0,
          }).start();
        },
      }),
    [translateX]
  );

  return (
    <View style={styles.swipeContainer}>
      <TouchableOpacity style={styles.swipeDelete} onPress={() => onDelete(item)} activeOpacity={0.8}>
        <Text style={styles.swipeDeleteIcon}>⌫</Text>
        <Text style={styles.swipeDeleteText}>Xóa</Text>
      </TouchableOpacity>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        <TouchableOpacity
          style={styles.orderCard}
          onPress={() => {
            if (didSwipe.current) {
              didSwipe.current = false;
              return;
            }
            onOpen(item);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.orderTop}>
            <Text style={styles.orderCode}>{item.code}</Text>
            <Text
              style={[
                styles.statusBadge,
                item.payment_method === 'TRANSFER'
                  ? styles.statusTransfer
                  : styles.statusCash,
              ]}
            >
              {item.payment_method === 'TRANSFER' ? 'VietQR' : 'Tiền mặt'}
            </Text>
          </View>

          <View style={styles.orderMid}>
            <Text style={styles.customerText}>
              Khách: <Text style={styles.bold}>{item.customer_name}</Text>
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              - {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          <View style={styles.orderBottom}>
            <Text style={styles.itemsCountText}>{item.items.length} mặt hàng</Text>
            <Text style={styles.orderTotal}>
              {item.final_amount.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const InvoiceHistoryScreen: React.FC = () => {
  const { colors } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setRefreshing(true);
    setLoadError('');
    try {
      const data = await mobileApi.getOrders();
      setOrders(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Không thể tải lịch sử hóa đơn');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      !search ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const deleteOrder = (order: Order) => {
    const performDelete = async (returnStock: boolean) => {
      const previousOrders = orders;
      setOrders((current) => current.filter((item) => item.id !== order.id));
      if (selectedOrder?.id === order.id) setSelectedOrder(null);

      try {
        await mobileApi.deleteOrder(order.id, returnStock);
      } catch (error) {
        console.warn('Delete order error:', error);
        setOrders(previousOrders);
        Alert.alert('Không thể xóa hóa đơn', 'Dữ liệu đã được khôi phục. Vui lòng kiểm tra kết nối và thử lại.');
      }
    };

    Alert.alert(
      `Xóa ${order.code}?`,
      order.status === 'COMPLETED'
        ? 'Bạn có thể xóa hóa đơn hoặc xóa và hoàn lại số lượng hàng vào kho.'
        : 'Hóa đơn sẽ bị xóa vĩnh viễn khỏi lịch sử.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => void performDelete(false) },
        ...(order.status === 'COMPLETED'
          ? [{ text: 'Xóa + hoàn kho', onPress: () => void performDelete(true) }]
          : []),
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm hóa đơn theo mã HD hoặc tên khách..."
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
        />
      </View>

      {loadError ? (
        <TouchableOpacity style={styles.errorBanner} onPress={loadOrders}>
          <Text style={styles.errorText}>Không tải được lịch sử hóa đơn. Chạm để thử lại.</Text>
        </TouchableOpacity>
      ) : null}

      {/* List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={loadOrders}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{search ? 'Không tìm thấy hóa đơn' : 'Chưa có hóa đơn'}</Text>
              <Text style={styles.emptySub}>{search ? 'Thử mã hóa đơn hoặc tên khách khác.' : 'Các đơn đã thanh toán sẽ xuất hiện tại đây.'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <SwipeableOrderCard item={item} onOpen={setSelectedOrder} onDelete={deleteOrder} styles={styles} />
        )}
      />

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết hóa đơn {selectedOrder.code}</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Khách hàng:</Text>
                  <Text style={styles.metaVal}>{selectedOrder.customer_name}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Thu ngân:</Text>
                  <Text style={styles.metaVal}>{selectedOrder.cashier || 'Thu ngân'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Hình thức:</Text>
                  <Text style={styles.metaVal}>
                    {selectedOrder.payment_method === 'TRANSFER'
                      ? 'Chuyển khoản (VietQR)'
                      : 'Tiền mặt'}
                  </Text>
                </View>

                <Text style={styles.sectionHeader}>Danh sách mặt hàng:</Text>
                {selectedOrder.items.map((i, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{i.name}</Text>
                      <Text style={styles.itemSub}>
                        {i.quantity} {i.unit} x {i.price.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {(i.quantity * i.price).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                ))}

                <View style={styles.totalBlock}>
                  <Text style={styles.totalLabel}>Tổng cộng thanh toán:</Text>
                  <Text style={styles.totalNumber}>
                    {selectedOrder.final_amount.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
                <TouchableOpacity style={styles.modalDeleteButton} onPress={() => deleteOrder(selectedOrder)}>
                  <Text style={styles.modalDeleteText}>Xóa hóa đơn</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBox: {
    padding: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  swipeDelete: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 88,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteIcon: {
    color: colors.inverse,
    fontSize: 20,
    fontWeight: '900',
  },
  swipeDeleteText: {
    color: colors.inverse,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTransfer: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },
  statusCash: {
    backgroundColor: colors.surfaceRaised,
    color: colors.success,
  },
  orderMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  customerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bold: {
    fontWeight: 'bold',
    color: colors.text,
  },
  dateText: {
    fontSize: 11,
    color: colors.textSubtle,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemsCountText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 400,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginTop: 12,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  itemSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalBlock: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  totalNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  modalDeleteButton: {
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
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
});
