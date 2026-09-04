import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { mobileApi } from '../services/api';
import { Order } from '../types';

interface OverviewMobileScreenProps {
  onNavigateTab?: (tab: string) => void;
}

export const OverviewMobileScreen: React.FC<OverviewMobileScreenProps> = ({ onNavigateTab }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showProfit, setShowProfit] = useState(false);
  const [timeRange, setTimeRange] = useState('Tháng trước');

  useEffect(() => {
    mobileApi.getOrders().then(setOrders).catch(() => {});
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.final_amount || 0), 0) || 12645350;
  const totalCount = orders.length || 15;
  const totalProfit = orders.reduce((sum, o) => sum + ((o.final_amount || 0) - (o.total_cost || 0)), 0) || 3450000;

  const formatMillion = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)} triệu`;
    return num.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>NS</Text>
          </View>
          <Text style={styles.brandTitle}>NgânSơn</Text>
        </View>
        <View style={styles.headerActions}>
          <Text style={styles.headerIcon}>📞</Text>
          <Text style={styles.headerIcon}>🔔</Text>
          <Text style={styles.headerIcon}>✉️</Text>
        </View>
      </View>

      {/* Time Filter Pill */}
      <TouchableOpacity style={styles.timePill}>
        <Text style={styles.timePillText}>{timeRange} ▾</Text>
      </TouchableOpacity>

      {/* KPI Card */}
      <View style={styles.kpiCard}>
        <View style={styles.kpiRow}>
          <View>
            <Text style={styles.kpiSub}>{totalCount} hoá đơn</Text>
            <Text style={styles.kpiRevenue}>{formatMillion(totalRevenue)}</Text>
          </View>
          <View>
            <View style={styles.profitHeader}>
              <Text style={styles.kpiSub}>Lợi nhuận</Text>
              <TouchableOpacity onPress={() => setShowProfit(!showProfit)}>
                <Text style={styles.eyeIcon}>{showProfit ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.kpiProfit}>{showProfit ? formatMillion(totalProfit) : '*** ***'}</Text>
          </View>
        </View>

        <View style={styles.kpiDivider} />
        <Text style={styles.returnOrdersText}>📦 0 đơn trả hàng - 0</Text>
      </View>

      {/* Quick Action Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.actionEmoji}>💰</Text>
          </View>
          <Text style={styles.actionLabel}>Vay vốn</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#ECFEFF' }]}>
            <Text style={styles.actionEmoji}>🚚</Text>
          </View>
          <Text style={styles.actionLabel}>Giao hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => onNavigateTab && onNavigateTab('POS')}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.actionEmoji}>💳</Text>
          </View>
          <Text style={styles.actionLabel}>Thanh toán</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.actionEmoji}>👤</Text>
          </View>
          <Text style={styles.actionLabel}>Nhân viên</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#F0F9FF' }]}>
            <Text style={styles.actionEmoji}>📑</Text>
          </View>
          <Text style={styles.actionLabel}>Thuế & KT</Text>
        </TouchableOpacity>
      </View>

      {/* Revenue Chart Section */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Doanh thu ›</Text>
          <Text style={styles.chartSub}>📊 ⛶</Text>
        </View>

        <View style={styles.chartBody}>
          <View style={styles.barItem}>
            <View style={[styles.barColumn, { height: 120 }]} />
            <Text style={styles.barDayActive}>01</Text>
          </View>
          <View style={styles.barItem}>
            <View style={[styles.barColumn, { height: 30 }]} />
            <Text style={styles.barDayActive}>02</Text>
          </View>
          <View style={styles.barItem}>
            <View style={[styles.barColumn, { height: 45 }]} />
            <Text style={styles.barDay}>03</Text>
          </View>
          <View style={styles.barItem}>
            <View style={[styles.barColumn, { height: 0 }]} />
            <Text style={styles.barDayEmpty}>04</Text>
          </View>
          <View style={styles.barItem}>
            <View style={[styles.barColumn, { height: 0 }]} />
            <Text style={styles.barDayEmpty}>05</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 14, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  brandTitle: { fontSize: 18, fontWeight: '800', color: '#0066FF' },
  headerActions: { flexDirection: 'row', gap: 14 },
  headerIcon: { fontSize: 16 },
  timePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  timePillText: { color: '#0066FF', fontSize: 12, fontWeight: '700' },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  kpiSub: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  kpiRevenue: { fontSize: 22, fontWeight: '900', color: '#0066FF' },
  profitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyeIcon: { fontSize: 13 },
  kpiProfit: { fontSize: 20, fontWeight: '900', color: '#059669' },
  kpiDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 10 },
  returnOrdersText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  actionGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionItem: { alignItems: 'center', flex: 1 },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 10, color: '#374151', fontWeight: '600' },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  chartSub: { fontSize: 14, color: '#9CA3AF' },
  chartBody: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 4,
  },
  barItem: { alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barColumn: { width: 22, backgroundColor: '#0066FF', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barDayActive: { fontSize: 10, fontWeight: '700', color: '#EF4444', marginTop: 6 },
  barDay: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginTop: 6 },
  barDayEmpty: { fontSize: 10, color: '#D1D5DB', marginTop: 6 },
});
