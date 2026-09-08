import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ThemeColors, useMobileTheme } from '../theme/ThemeContext';

interface MoreMenuMobileScreenProps {
  onNavigateTab?: (tab: string) => void;
  storeName?: string;
  branchLabel?: string;
}

export const MoreMenuMobileScreen: React.FC<MoreMenuMobileScreenProps> = ({ onNavigateTab, storeName, branchLabel }) => {
  const { colors } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleFeatureNotice = (featureName: string, desc?: string) => {
    Alert.alert(
      featureName,
      desc
        ? `${desc}\n\nTính năng này hiện chưa khả dụng trên app mobile.`
        : 'Tính năng này hiện chưa khả dụng trên app mobile.',
      [{ text: 'Đóng', style: 'cancel' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <TouchableOpacity 
        style={styles.profileCard}
        onPress={() => onNavigateTab && onNavigateTab('SETTINGS')}
        activeOpacity={0.8}
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{storeName || 'Cửa hàng Ngân Sơn'}</Text>
            <Text style={styles.branchName}>{branchLabel ? `Chi nhánh ${branchLabel}` : 'Chưa cấu hình địa chỉ chi nhánh'}</Text>
          </View>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </View>
        <View style={styles.profileDivider} />
        <View style={styles.infoLinkRow}>
          <Text style={styles.infoLinkText}>Thông tin cửa hàng & Cài đặt VietQR</Text>
          <Text style={{ fontSize: 14, color: colors.textSubtle }}>›</Text>
        </View>
      </TouchableOpacity>

      {/* Đối tác & Khách hàng */}
      <View style={styles.groupCard}>
        <Text style={styles.groupTitle}>Đối tác & Khách hàng</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => handleFeatureNotice('Khách hàng', 'Quản lý 10+ khách hàng, tích điểm và công nợ mua sắm.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>👥</Text>
            <View>
              <Text style={styles.itemText}>Khách hàng</Text>
              <Text style={styles.itemSub}>Quản lý & Công nợ</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => handleFeatureNotice('Nhà cung cấp', 'Quản lý nhà phân phối vật tư: Cadivi, Rạng Đông, Panasonic...')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🚚</Text>
            <View>
              <Text style={styles.itemText}>Nhà cung cấp</Text>
              <Text style={styles.itemSub}>Nhập hàng & Nợ NCC</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Giao dịch */}
      <View style={styles.groupCard}>
        <Text style={styles.groupTitle}>Giao dịch</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => onNavigateTab && onNavigateTab('POS')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🛍️</Text>
            <View>
              <Text style={styles.itemText}>Bán hàng</Text>
              <Text style={styles.itemSub}>Thu ngân & POS</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => onNavigateTab && onNavigateTab('INVOICES')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🧾</Text>
            <View>
              <Text style={styles.itemText}>Hóa đơn</Text>
              <Text style={styles.itemSub}>Lịch sử bán lẻ</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Đặt hàng', 'Danh sách đơn đặt trước của khách hàng thợ và bán sỉ.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📦</Text>
            <View>
              <Text style={styles.itemText}>Đặt hàng</Text>
              <Text style={styles.itemSub}>Đơn đặt trước</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Trả hàng', 'Tạo phiếu nhận trả hàng và hoàn tiền mặt cho khách.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🔄</Text>
            <View>
              <Text style={styles.itemText}>Trả hàng</Text>
              <Text style={styles.itemSub}>Đổi trả & Hoàn tiền</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Sổ quỹ Thu - Chi', 'Theo dõi quỹ tiền mặt: Thu tiền khách, chi trả NCC, nộp tiền ngân hàng.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>💰</Text>
            <View>
              <Text style={styles.itemText}>Sổ quỹ</Text>
              <Text style={styles.itemSub}>Thu - Chi tiền mặt</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Phiếu giao ca', 'Bàn giao ca thu ngân, kiểm đếm tiền mặt két thu ngân.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>⏰</Text>
            <View>
              <Text style={styles.itemText}>Phiếu giao ca</Text>
              <Text style={styles.itemSub}>Kiểm kê & Kết ca</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hàng hoá & Kho */}
      <View style={styles.groupCard}>
        <Text style={styles.groupTitle}>Hàng hoá & Kho</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => onNavigateTab && onNavigateTab('PRODUCTS')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📦</Text>
            <View>
              <Text style={styles.itemText}>Hàng hoá</Text>
              <Text style={styles.itemSub}>Danh mục & Giá bán</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Kiểm kho', 'Tạo phiếu kiểm kê thực tế và tự động cân bằng số lượng tồn kho.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📋</Text>
            <View>
              <Text style={styles.itemText}>Kiểm kho</Text>
              <Text style={styles.itemSub}>Cân bằng tồn</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Nhập hàng', 'Tạo phiếu nhập từ NCC, tự động cộng tồn kho và ghi sổ quỹ/công nợ.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📥</Text>
            <View>
              <Text style={styles.itemText}>Nhập hàng</Text>
              <Text style={styles.itemSub}>Phiếu nhập kho</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Trả hàng nhập', 'Xuất trả thiết bị lỗi cho nhà sản xuất/nhà phân phối.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📤</Text>
            <View>
              <Text style={styles.itemText}>Trả hàng nhập</Text>
              <Text style={styles.itemSub}>Xuất trả NCC</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vận chuyển & Tiện ích */}
      <View style={styles.groupCard}>
        <Text style={styles.groupTitle}>Vận chuyển & Tiện ích</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Đối tác vận chuyển', 'Kết nối Ahamove, Viettel Post, GHTK, VNPost.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🚚</Text>
            <View>
              <Text style={styles.itemText}>Đối tác giao hàng</Text>
              <Text style={styles.itemSub}>Vận chuyển Ahamove</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Nhân viên & Phân quyền', 'Quản lý nhân viên thu ngân, thủ kho, mã PIN đăng nhập.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>👥</Text>
            <View>
              <Text style={styles.itemText}>Nhân viên</Text>
              <Text style={styles.itemSub}>Phân quyền & PIN</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Vay vốn KD KiotViet', 'Gói vay hạn mức 20M - 500M đồng hành cùng VPBank & KBank.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🎖️</Text>
            <View>
              <Text style={styles.itemText}>Vay vốn KD</Text>
              <Text style={styles.itemSub}>Lãi suất ưu đãi</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Thuế & Hóa đơn điện tử', 'Tích hợp VNPT-Invoice, Viettel S-Invoice và kết xuất báo cáo thuế.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🏛️</Text>
            <View>
              <Text style={styles.itemText}>Thuế & Hóa đơn</Text>
              <Text style={styles.itemSub}>Hóa đơn điện tử</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Báo cáo & Cài đặt */}
      <View style={styles.groupCard}>
        <Text style={styles.groupTitle}>Báo cáo & Cài đặt</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Báo cáo cuối ngày', 'Tổng kết doanh thu bán lẻ, tiền mặt, VietQR và lợi nhuận gộp trong ngày.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📊</Text>
            <View>
              <Text style={styles.itemText}>Báo cáo cuối ngày</Text>
              <Text style={styles.itemSub}>Tổng kết ca</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => handleFeatureNotice('Báo cáo bán hàng', 'Biểu đồ tăng trưởng doanh số theo tuần, tháng và top mặt hàng bán chạy.')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>📈</Text>
            <View>
              <Text style={styles.itemText}>Báo cáo bán hàng</Text>
              <Text style={styles.itemSub}>Doanh số & Xu hướng</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => onNavigateTab && onNavigateTab('SETTINGS')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>🏦</Text>
            <View>
              <Text style={styles.itemText}>Ngân hàng VietQR</Text>
              <Text style={styles.itemSub}>Cấu hình nhận tiền</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => onNavigateTab && onNavigateTab('SETTINGS')}
            activeOpacity={0.7}
          >
            <Text style={styles.itemEmoji}>⚙️</Text>
            <View>
              <Text style={styles.itemText}>Cài đặt hệ thống</Text>
              <Text style={styles.itemSub}>Máy in & Âm thanh</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 100 },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontSize: 15, fontWeight: '800', color: colors.text },
  branchName: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  profileDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  infoLinkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLinkText: { fontSize: 13, fontWeight: '600', color: colors.text },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  gridItem: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemEmoji: { fontSize: 18 },
  itemText: { fontSize: 12, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
});
