import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { OverviewMobileScreen } from './src/screens/OverviewMobileScreen';
import { ProductsMobileScreen } from './src/screens/ProductsMobileScreen';
import { PosMobileScreen } from './src/screens/PosMobileScreen';
import { InvoiceHistoryScreen } from './src/screens/InvoiceHistoryScreen';
import { MoreMenuMobileScreen } from './src/screens/MoreMenuMobileScreen';
import { SettingsMobileScreen } from './src/screens/SettingsMobileScreen';
import { VoiceAssistantModal } from './src/components/VoiceAssistantModal';
import { mobileApi } from './src/services/api';
import { Product, Customer, Supplier, StoreSettings } from './src/types';
import { MobileThemeProvider, ThemeColors, useMobileTheme } from './src/theme/ThemeContext';

type TabType = 'OVERVIEW' | 'PRODUCTS' | 'POS' | 'INVOICES' | 'MORE' | 'SETTINGS';

const AppContent: React.FC = () => {
  const { colors, resolvedTheme } = useMobileTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentTab, setCurrentTab] = useState<TabType>('OVERVIEW');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const results = await Promise.allSettled([
          mobileApi.getProducts(),
          mobileApi.getCustomers(),
          mobileApi.getSuppliers(),
          mobileApi.getSettings(),
        ]);

        const [productsResult, customersResult, suppliersResult, settingsResult] = results;
        if (productsResult.status === 'fulfilled') setProducts(productsResult.value as Product[]);
        if (customersResult.status === 'fulfilled') setCustomers(customersResult.value as Customer[]);
        if (suppliersResult.status === 'fulfilled') setSuppliers(suppliersResult.value as Supplier[]);
        if (settingsResult.status === 'fulfilled') setStoreSettings(settingsResult.value as StoreSettings);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const resource = ['products', 'customers', 'suppliers', 'settings'][index];
            console.warn(`Failed to load initial ${resource}:`, result.reason);
          }
        });
      } catch (e) {
        console.warn('Failed to load initial data:', e);
      }
    };
    loadData();
  }, []);

  const tabs = [
    { id: 'OVERVIEW', label: 'Tổng quan', icon: '📈' },
    { id: 'PRODUCTS', label: 'Hàng hoá', icon: '📦' },
    { id: 'POS', label: 'Bán hàng', icon: '🛍️' },
    { id: 'INVOICES', label: 'Hoá đơn', icon: '📄' },
    { id: 'MORE', label: 'Nhiều hơn', icon: '☰' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <View style={styles.contentContainer}>
        {/* Keep all screens mounted to preserve state */}
        <View style={[styles.screenContainer, currentTab === 'OVERVIEW' ? styles.visible : styles.hidden]}>
          <OverviewMobileScreen onNavigateTab={(tab) => setCurrentTab(tab as TabType)} />
        </View>
        <View style={[styles.screenContainer, currentTab === 'PRODUCTS' ? styles.visible : styles.hidden]}>
          <ProductsMobileScreen />
        </View>
        <View style={[styles.screenContainer, currentTab === 'POS' ? styles.visible : styles.hidden]}>
          <PosMobileScreen />
        </View>
        <View style={[styles.screenContainer, currentTab === 'INVOICES' ? styles.visible : styles.hidden]}>
          <InvoiceHistoryScreen />
        </View>
        <View style={[styles.screenContainer, currentTab === 'MORE' ? styles.visible : styles.hidden]}>
          <MoreMenuMobileScreen
            onNavigateTab={(tab) => setCurrentTab(tab as TabType)}
            storeName={storeSettings?.name}
            branchLabel={storeSettings?.address}
          />
        </View>
        <View style={[styles.screenContainer, currentTab === 'SETTINGS' ? styles.visible : styles.hidden]}>
          <SettingsMobileScreen onBack={() => setCurrentTab('MORE')} />
        </View>
      </View>

      <TouchableOpacity style={styles.floatingMicBtn} onPress={() => setIsVoiceOpen(true)} activeOpacity={0.85}>
        <Text style={styles.floatingMicIcon}>🎙️</Text>
      </TouchableOpacity>

      <View style={styles.bottomTabBar}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setCurrentTab(tab.id as TabType)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <VoiceAssistantModal
        visible={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        products={products}
        customers={customers}
        suppliers={suppliers}
        onNavigate={(screen) => {
          if (screen === 'pos') setCurrentTab('POS');
          else if (screen === 'products' || screen === 'inventory') setCurrentTab('PRODUCTS');
          else if (screen === 'invoices') setCurrentTab('INVOICES');
          else if (screen === 'settings') setCurrentTab('SETTINGS');
          else if (screen === 'more') setCurrentTab('MORE');
          else if (screen === 'overview') setCurrentTab('OVERVIEW');
          setIsVoiceOpen(false);
        }}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <MobileThemeProvider>
      <AppContent />
    </MobileThemeProvider>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  contentContainer: { flex: 1, backgroundColor: colors.background },
  screenContainer: { ...StyleSheet.absoluteFillObject },
  visible: { display: 'flex' },
  hidden: { display: 'none' },
  floatingMicBtn: { position: 'absolute', right: 18, bottom: 80, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8, zIndex: 30, borderWidth: 2, borderColor: colors.surface },
  floatingMicIcon: { fontSize: 22 },
  bottomTabBar: { height: 64, paddingBottom: 4, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: colors.border, elevation: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  tabItemActive: { borderTopWidth: 2, borderTopColor: colors.primary },
  tabIcon: { fontSize: 18, opacity: 0.6 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: 'bold' },
});
