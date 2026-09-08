import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { mobileApi } from '../services/api';
import { Order } from '../types';
import { ThemeColors, useMobileTheme } from '../theme/ThemeContext';

interface OverviewMobileScreenProps {
  onNavigateTab?: (tab: string) => void;
}

export const OverviewMobileScreen: React.FC<OverviewMobileScreenProps> = ({ onNavigateTab }) => {
  const { colors, resolvedTheme, toggleTheme } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showProfit, setShowProfit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setOrders(await mobileApi.getOrders());
    } catch (error: any) {
      setLoadError(error?.message || 'Không thể tải dữ liệu doanh thu');
    } finally {
      setIsLoading(false);
    }
  };

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === 'COMPLETED'),
    [orders]
  );

  const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.final_amount || 0), 0);
  const totalCount = completedOrders.length;
  const totalProfit = completedOrders.reduce(
    (sum, order) => sum + ((order.final_amount || 0) - (order.total_cost || 0)),
    0
  );

  const sevenDayRevenue = useMemo(() => {
    const today = new Date();
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: 0,
      };
    });

    const byDate = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    completedOrders.forEach((order) => {
      const date = new Date(order.created_at);
      if (Number.isNaN(date.getTime())) return;
      date.setHours(0, 0, 0, 0);
      const bucket = byDate.get(date.toISOString().slice(0, 10));
      if (bucket) bucket.revenue += order.final_amount || 0;
    });

    return buckets;
  }, [completedOrders]);

  const maxDailyRevenue = Math.max(...sevenDayRevenue.map((item) => item.revenue), 0);

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
          <TouchableOpacity onPress={toggleTheme} accessibilityLabel="Đổi giao diện sáng tối">
            <Text style={styles.headerIcon}>{resolvedTheme === 'dark' ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerIcon}>🔔</Text>
        </View>
      </View>

      {/* Time Filter Pill */}
      <View style={styles.timePill}>
        <Text style={styles.timePillText}>7 ngày gần nhất</Text>
      </View>

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadOrders} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* KPI Card */}
      <View style={styles.kpiCard}>
        <View style={styles.kpiRow}>
          <View>
            <Text style={styles.kpiSub}>{isLoading ? 'Đang tải…' : `${totalCount} hoá đơn hoàn thành`}</Text>
            <Text style={styles.kpiRevenue}>{isLoading ? '—' : formatMillion(totalRevenue)}</Text>
          </View>
          <View>
            <View style={styles.profitHeader}>
              <Text style={styles.kpiSub}>Lợi nhuận</Text>
              <TouchableOpacity onPress={() => setShowProfit(!showProfit)}>
                <Text style={styles.eyeIcon}>{showProfit ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.kpiProfit}>{isLoading ? '—' : showProfit ? formatMillion(totalProfit) : '••••••'}</Text>
          </View>
        </View>

        <View style={styles.kpiDivider} />
        <Text style={styles.returnOrdersText}>Chỉ tính dữ liệu giao dịch thực tế có trạng thái hoàn thành</Text>
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
          <Text style={styles.chartSub}>7 ngày</Text>
        </View>

        {isLoading ? (
          <View style={styles.emptyChart}><Text style={styles.emptyChartText}>Đang tổng hợp dữ liệu…</Text></View>
        ) : maxDailyRevenue === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartTitle}>Chưa có doanh thu trong 7 ngày</Text>
            <Text style={styles.emptyChartText}>Biểu đồ sẽ xuất hiện khi có hóa đơn hoàn thành.</Text>
          </View>
        ) : (
          <View style={styles.chartBody}>
            {sevenDayRevenue.map((item) => (
              <View style={styles.barItem} key={item.key}>
                <View
                  style={[
                    styles.barColumn,
                    { height: item.revenue > 0 ? Math.max(6, Math.round((item.revenue / maxDailyRevenue) * 104)) : 0 },
                  ]}
                />
                <Text style={item.revenue > 0 ? styles.barDay : styles.barDayEmpty}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.inverse, fontWeight: '900', fontSize: 13 },
  brandTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  headerActions: { flexDirection: 'row', gap: 14 },
  headerIcon: { fontSize: 16 },
  timePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  timePillText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorTitle: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  errorText: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  retryButton: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  retryButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  kpiSub: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  kpiRevenue: { fontSize: 22, fontWeight: '900', color: colors.primary },
  profitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyeIcon: { fontSize: 13 },
  kpiProfit: { fontSize: 20, fontWeight: '900', color: colors.success },
  kpiDivider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
  returnOrdersText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  actionGrid: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  actionLabel: { fontSize: 10, color: colors.text, fontWeight: '600' },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  chartSub: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chartBody: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  barItem: { alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barColumn: { width: 22, backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barDay: { fontSize: 9, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
  barDayEmpty: { fontSize: 9, color: colors.textSubtle, marginTop: 6 },
  emptyChart: { height: 140, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyChartTitle: { color: colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  emptyChartText: { color: colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
});
