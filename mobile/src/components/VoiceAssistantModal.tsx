import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { mobileApi } from '../services/api';
import { Product, Customer, Supplier } from '../types';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  onAddToCart?: (product: Product, quantity: number) => void;
  onNavigate?: (screen: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  visible,
  onClose,
  products,
  customers,
  suppliers,
  onAddToCart,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const quickChips = [
    'Tìm bóng led 9w',
    'Bán 2 bóng led cho anh Tuấn',
    'Dây cadivi 2.5 giá bao nhiêu',
    'Kiểm tra nợ anh Hùng',
    'Mở sổ quỹ',
  ];

  const handleAnalyze = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setQuery(text);

    try {
      const data = await mobileApi.parseVoiceAssistant(text, products, customers, suppliers);
      setResult(data);
      if (data.intent === 'NAVIGATE' && data.target_screen && onNavigate) {
        onNavigate(data.target_screen);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Lỗi phân tích: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>🎙️ Trợ Lý AI Giọng Nói</Text>
              <Text style={styles.subtitle}>Gemini 3.7 Flash • Nhận diện tiếng Việt</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Prompt input */}
          <View style={styles.inputBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Nhập câu lệnh hoặc câu hỏi..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
              onSubmitEditing={() => handleAnalyze(query)}
            />
            <TouchableOpacity
              onPress={() => handleAnalyze(query)}
              disabled={isProcessing}
              style={styles.sendBtn}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>Gửi</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick chips */}
          <View style={styles.chipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickChips.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => handleAnalyze(chip)}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Result view */}
          <ScrollView style={styles.resultScroll}>
            {result && (
              <View style={styles.resultBox}>
                {/* Spoken feedback */}
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackText}>{result.spoken_feedback || result.note}</Text>
                </View>

                {/* Matched items */}
                {result.items && result.items.length > 0 && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>
                      Mặt hàng đề xuất ({result.items.length}):
                    </Text>
                    {result.items.map((item: any, idx: number) => {
                      const prod = products.find((p) => p.id === item.product_id);
                      return (
                        <View key={idx} style={styles.itemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{item.product_name}</Text>
                            <Text style={styles.itemMeta}>
                              SL: {item.quantity} {item.unit || 'cái'} • Giá: {(item.unit_price || 0).toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                          {prod && onAddToCart && (
                            <TouchableOpacity
                              style={styles.addCartBtn}
                              onPress={() => {
                                onAddToCart(prod, item.quantity);
                                Alert.alert('Thành công', `Đã thêm ${item.product_name} vào giỏ POS!`);
                              }}
                            >
                              <Text style={styles.addCartBtnText}>+ Thêm POS</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  inputBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  sendBtn: {
    backgroundColor: '#0B63E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipsRow: {
    marginTop: 10,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  chipText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  resultScroll: {
    maxHeight: 280,
  },
  resultBox: {
    paddingVertical: 8,
  },
  feedbackBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    lineHeight: 18,
  },
  itemsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  addCartBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCartBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
