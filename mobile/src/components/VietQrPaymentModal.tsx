import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { getVietQRUrl } from '../services/api';

interface VietQrPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmPaid: () => void;
  amount: number;
  orderCode: string;
  bankId?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export const VietQrPaymentModal: React.FC<VietQrPaymentModalProps> = ({
  visible,
  onClose,
  onConfirmPaid,
  amount,
  orderCode,
  bankId = 'MB',
  accountNumber = '0912345678',
  accountHolder = 'PHAN ANH TAI',
}) => {
  const [loading, setLoading] = React.useState(true);
  const qrUrl = getVietQRUrl(
    bankId,
    accountNumber,
    'compact2',
    amount,
    `NGANSON ${orderCode}`,
    accountHolder
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Quét Mã VietQR Thanh Toán</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Badge */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Số tiền cần thanh toán:</Text>
            <Text style={styles.amountValue}>{amount.toLocaleString('vi-VN')} đ</Text>
            <Text style={styles.memoText}>Nội dung: NGANSON {orderCode}</Text>
          </View>

          {/* QR Image Box */}
          <View style={styles.qrContainer}>
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0B63E5" />
                <Text style={styles.loadingText}>Đang tạo mã VietQR...</Text>
              </View>
            )}
            <Image
              source={{ uri: qrUrl }}
              style={styles.qrImage}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          </View>

          {/* Bank Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Ngân hàng: <Text style={styles.boldText}>{bankId}</Text>
            </Text>
            <Text style={styles.infoText}>
              Số TK: <Text style={styles.boldText}>{accountNumber}</Text>
            </Text>
            <Text style={styles.infoText}>
              Chủ TK: <Text style={styles.boldText}>{accountHolder}</Text>
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirmPaid}>
              <Text style={styles.confirmBtnText}>✓ Đã nhận tiền</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  amountBox: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  amountLabel: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1d4ed8',
    marginVertical: 2,
  },
  memoText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  qrContainer: {
    width: 220,
    height: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  qrImage: {
    width: 210,
    height: 210,
  },
  loadingBox: {
    position: 'absolute',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748b',
  },
  infoBox: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    marginVertical: 1,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0B63E5',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
