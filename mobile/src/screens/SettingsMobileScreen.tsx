import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { mobileApi, DEFAULT_SERVER_URL } from '../services/api';
import { ThemeColors, ThemePreference, useMobileTheme } from '../theme/ThemeContext';

interface SettingsMobileScreenProps {
  onBack?: () => void;
}

export const SettingsMobileScreen: React.FC<SettingsMobileScreenProps> = ({ onBack }) => {
  const { colors, preference, setPreference } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [connectionStatus, setConnectionStatus] = useState<string>('Chưa kiểm tra');
  const [latency, setLatency] = useState<number>(-1);
  const [isTesting, setIsTesting] = useState(false);

  // Store & VietQR settings state
  const [storeName, setStoreName] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [bankId, setBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await mobileApi.getServerUrl();
      setServerUrl(url);

      const settings = await mobileApi.getSettings();
      if (settings) {
        setStoreName(settings.name || '');
        setStorePhone(settings.phone || '');
        setStoreAddress(settings.address || '');
        setBankId(settings.bankId || '');
        setAccountNumber(settings.accountNumber || '');
        setAccountHolder(settings.accountHolder || '');
      }
    } catch (e) {
      console.warn('Load settings error:', e);
    }
  };

  const handleSaveUrl = async () => {
    try {
      await mobileApi.setServerUrl(serverUrl);
      Alert.alert('Đã lưu', 'Đã lưu cấu hình địa chỉ IP máy chủ!');
      handleTestConnection();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('Đang kết nối...');
    const result = await mobileApi.testConnection();
    setIsTesting(false);
    if (result.success) {
      setConnectionStatus('Kết nối thành công (Online)');
      setLatency(result.latencyMs);
    } else {
      setConnectionStatus('Không thể kết nối tới máy chủ (Offline)');
      setLatency(-1);
    }
  };

  const handleSaveStoreSettings = async () => {
    setIsSavingSettings(true);
    try {
      await mobileApi.updateSettings({
        name: storeName,
        phone: storePhone,
        address: storeAddress,
        bankId,
        accountNumber,
        accountHolder,
      });
      Alert.alert('Thành công', 'Đã lưu cài đặt cửa hàng & tài khoản VietQR lên máy chủ!');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu cài đặt');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.pageHeader}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Cài đặt</Text>
          <Text style={styles.pageSubtitle}>Cửa hàng, kết nối, VietQR và giao diện</Text>
        </View>
      </View>

      {/* Store Info Banner */}
      <View style={styles.storeCard}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>NS</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName}>{storeName || 'Chưa cấu hình tên cửa hàng'}</Text>
          {storeAddress ? <Text style={styles.storeAddr}>📍 {storeAddress}</Text> : null}
          {storePhone ? <Text style={styles.storePhone}>📞 Hotline: {storePhone}</Text> : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Giao diện</Text>
        <Text style={styles.sectionDesc}>Giữ cùng bảng màu Ngân Sơn ở chế độ sáng, tối hoặc theo hệ thống.</Text>
        <View style={styles.themeRow}>
          {([
            ['light', 'Sáng'],
            ['dark', 'Tối'],
            ['system', 'Hệ thống'],
          ] as Array<[ThemePreference, string]>).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setPreference(value)}
              style={[styles.themeOption, preference === value && styles.themeOptionActive]}
            >
              <Text style={[styles.themeOptionText, preference === value && styles.themeOptionTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Server Config Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🌐 Kết Nối Máy Chủ Cửa Hàng</Text>
        <Text style={styles.sectionDesc}>
          Địa chỉ IP nội bộ của máy chủ POS trong mạng Wi-Fi của cửa hàng:
        </Text>

        <TextInput
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="http://10.0.2.2:3001/api"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestConnection}
            disabled={isTesting}
          >
            <Text style={styles.testBtnText}>⚡ Kiểm tra kết nối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveUrl}
          >
            <Text style={styles.saveBtnText}>Lưu IP</Text>
          </TouchableOpacity>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Trạng thái:</Text>
          <Text
            style={[
              styles.statusValue,
              latency >= 0 ? styles.statusSuccess : styles.statusFailed,
            ]}
          >
            {connectionStatus} {latency >= 0 ? `(${latency}ms)` : ''}
          </Text>
        </View>
      </View>

      {/* Store Info Config Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🏪 Thông Tin Cửa Hàng</Text>

        <Text style={styles.label}>Tên cửa hàng:</Text>
        <TextInput
          value={storeName}
          onChangeText={setStoreName}
          style={styles.input}
        />

        <Text style={styles.label}>Số điện thoại:</Text>
        <TextInput
          value={storePhone}
          onChangeText={setStorePhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Địa chỉ:</Text>
        <TextInput
          value={storeAddress}
          onChangeText={setStoreAddress}
          style={styles.input}
        />
      </View>

      {/* VietQR Bank Account Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💳 Tài Khoản Ngân Hàng VietQR</Text>
        <Text style={styles.sectionDesc}>
          Cấu hình nhận thanh toán chuyển khoản hiển thị trên màn hình POS và in bill:
        </Text>

        <Text style={styles.label}>Mã ngân hàng (MB, VCB, TCB, BIDV, CTG...):</Text>
        <TextInput
          value={bankId}
          onChangeText={setBankId}
          autoCapitalize="characters"
          style={styles.input}
        />

        <Text style={styles.label}>Số tài khoản:</Text>
        <TextInput
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Chủ tài khoản:</Text>
        <TextInput
          value={accountHolder}
          onChangeText={(val) => setAccountHolder(val.toUpperCase())}
          autoCapitalize="characters"
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { marginTop: 12, width: '100%' }]}
          onPress={handleSaveStoreSettings}
          disabled={isSavingSettings}
        >
          <Text style={styles.saveBtnText}>
            {isSavingSettings ? 'Đang lưu...' : '✓ Lưu cấu hình Cửa hàng & VietQR'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Version Info */}
      <View style={styles.footerInfo}>
        <Text style={styles.versionText}>Phiên bản: Ngân Sơn Store Mobile v4.3 (React Native)</Text>
        <Text style={styles.subVersionText}>Đồng bộ tức thì với phiên bản Web & Server Express</Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 14,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: { color: colors.text, fontSize: 26, lineHeight: 28 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  pageSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.inverse,
    fontSize: 18,
    fontWeight: '900',
  },
  storeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  storeAddr: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  storePhone: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 3,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeOptionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  themeOptionText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  themeOptionTextActive: { color: colors.primary },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  testBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  testBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusSuccess: {
    color: colors.success,
  },
  statusFailed: {
    color: colors.danger,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: 'bold',
  },
  subVersionText: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 2,
  },
});
