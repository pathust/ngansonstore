import React, { useState, useEffect } from 'react';
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
import { StoreSettings } from '../types';

export const SettingsMobileScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [connectionStatus, setConnectionStatus] = useState<string>('Chưa kiểm tra');
  const [latency, setLatency] = useState<number>(-1);
  const [isTesting, setIsTesting] = useState(false);

  // Store & VietQR settings state
  const [storeName, setStoreName] = useState('Cửa hàng Điện Nước & Kim Khí Ngân Sơn');
  const [storePhone, setStorePhone] = useState('0912.345.678');
  const [storeAddress, setStoreAddress] = useState('318 Vũ Quang, TP. Hà Tĩnh');
  const [bankId, setBankId] = useState('MB');
  const [accountNumber, setAccountNumber] = useState('0912345678');
  const [accountHolder, setAccountHolder] = useState('PHAN ANH TAI');
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
        setStoreName(settings.name || 'Cửa hàng Điện Nước & Kim Khí Ngân Sơn');
        setStorePhone(settings.phone || '0912.345.678');
        setStoreAddress(settings.address || '318 Vũ Quang, TP. Hà Tĩnh');
        setBankId(settings.bankId || 'MB');
        setAccountNumber(settings.accountNumber || '0912345678');
        setAccountHolder(settings.accountHolder || 'PHAN ANH TAI');
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
      {/* Store Info Banner */}
      <View style={styles.storeCard}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>NS</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName}>{storeName}</Text>
          <Text style={styles.storeAddr}>📍 {storeAddress}</Text>
          <Text style={styles.storePhone}>📞 Hotline: {storePhone}</Text>
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
          placeholderTextColor="#94a3b8"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0B63E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  storeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  storeAddr: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  storePhone: {
    fontSize: 11,
    color: '#0B63E5',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 8,
    marginBottom: 3,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  testBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  testBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0B63E5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
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
    borderTopColor: '#f1f5f9',
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statusValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusSuccess: {
    color: '#16a34a',
  },
  statusFailed: {
    color: '#dc2626',
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  subVersionText: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },
});
