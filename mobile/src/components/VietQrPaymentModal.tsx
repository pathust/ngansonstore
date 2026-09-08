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
import { ThemeColors, useMobileTheme } from '../theme/ThemeContext';

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
  bankId = '',
  accountNumber = '',
  accountHolder = '',
}) => {
  const { colors } = useMobileTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = React.useState(true);
  const qrUrl = getVietQRUrl(
    bankId,
    accountNumber,
    'compact2',
    amount,
    `NGANSON ${orderCode}`,
    accountHolder
  );

  React.useEffect(() => {
    if (visible) setLoading(Boolean(qrUrl));
  }, [qrUrl, visible]);

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
            {!qrUrl ? (
              <View style={styles.loadingBox}>
                <Text style={styles.configWarningTitle}>Chưa cấu hình VietQR</Text>
                <Text style={styles.loadingText}>Hãy nhập ngân hàng và số tài khoản trong Cài đặt trước khi nhận chuyển khoản.</Text>
              </View>
            ) : loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Đang tạo mã VietQR...</Text>
              </View>
            ) : null}
            {qrUrl ? (
              <Image
                source={{ uri: qrUrl }}
                style={styles.qrImage}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
              />
            ) : null}
          </View>

          {/* Bank Info */}
          {qrUrl ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Ngân hàng: <Text style={styles.boldText}>{bankId}</Text>
              </Text>
              <Text style={styles.infoText}>
                Số TK: <Text style={styles.boldText}>{accountNumber}</Text>
              </Text>
              {accountHolder ? (
                <Text style={styles.infoText}>
                  Chủ TK: <Text style={styles.boldText}>{accountHolder}</Text>
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !qrUrl && styles.confirmBtnDisabled]}
              onPress={onConfirmPaid}
              disabled={!qrUrl}
            >
              <Text style={styles.confirmBtnText}>✓ Đã nhận tiền</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  amountBox: {
    backgroundColor: colors.primarySoft,
    padding: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 2,
  },
  memoText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  qrContainer: {
    width: 220,
    height: 220,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textMuted,
  },
  configWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 6,
  },
  infoBox: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
    marginVertical: 1,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.inverse,
  },
});
