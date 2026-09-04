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
} from 'react-native';
import { Order } from '../types';
import { mobileApi } from '../services/api';

export const InvoiceHistoryScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setRefreshing(true);
    try {
      const data = await mobileApi.getOrders();
      setOrders(data);
    } catch (e) {
      console.warn('Load orders error:', e);
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

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm hóa đơn theo mã HD hoặc tên khách..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={loadOrders}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => setSelectedOrder(item)}
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBox: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  list: {
    padding: 12,
    gap: 10,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTransfer: {
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  statusCash: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
  },
  orderMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  customerText: {
    fontSize: 12,
    color: '#475569',
  },
  bold: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  itemsCountText: {
    fontSize: 11,
    color: '#64748b',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B63E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  closeText: {
    fontSize: 18,
    color: '#64748b',
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
    color: '#64748b',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 12,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0B63E5',
  },
  totalBlock: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B63E5',
  },
});
