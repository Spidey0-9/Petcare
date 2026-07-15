import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppScreen } from '../core/components/AppScreen';
import { colors, gradients, radii, shadows } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeTables } from '../services/realtime';
import { shopService, type ShopCartItem, type ShopCategory, type ShopProduct, type ShopWishlistItem } from '../services/shop';
import { GroomerBottomNavigation } from './GroomerBottomNavigation';

type LoadState = 'loading' | 'ready' | 'error';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type ShopData = {
  categories: ShopCategory[];
  products: ShopProduct[];
  cart: ShopCartItem[];
  wishlist: ShopWishlistItem[];
};

function money(value: number) {
  return `Rs ${Number(value ?? 0).toFixed(0)}`;
}

export function GroomerShopScreen() {
  const { session } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ShopData>({ categories: [], products: [], cart: [], wishlist: [] });

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    setError('');
    try {
      const userId = session?.user.id;
      const [categories, products, cart, wishlist] = await Promise.all([
        shopService.listCategories(),
        shopService.searchProducts({ pageSize: 24 }),
        userId ? shopService.listCart(userId) : Promise.resolve([]),
        userId ? shopService.listWishlist(userId) : Promise.resolve([]),
      ]);
      setData({ categories, products, cart, wishlist });
      setState('ready');
    } catch (loadError) {
      console.error('[GroomerShop] load failed:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load shop.');
      setState('error');
    }
  }, [session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  useRealtimeTables(
    'groomer-shop-screen',
    [TABLES.products, TABLES.categories, TABLES.cart, TABLES.wishlist, TABLES.orders],
    () => { void load(true); },
  );

  const stats = useMemo(() => {
    const lowStock = data.products.filter(product => Number(product.stock ?? 0) <= 5).length;
    const inventoryValue = data.products.reduce((sum, product) => sum + Number(product.price ?? 0) * Number(product.stock ?? 0), 0);
    return { lowStock, inventoryValue };
  }, [data.products]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  if (state === 'loading') {
    return <AppScreen contentStyle={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading shop...</Text></AppScreen>;
  }

  if (state === 'error') {
    return (
      <AppScreen contentStyle={styles.center}>
        <MaterialCommunityIcons name="alert-circle" size={40} color={colors.danger} />
        <Text style={styles.title}>Unable to load shop</Text>
        <Text style={styles.muted}>{error}</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <LinearGradient colors={gradients.premium} style={styles.hero}>
          <View style={styles.heroIcon}><MaterialCommunityIcons name="shopping-outline" size={30} color="#fff" /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Groomer Shop</Text>
            <Text style={styles.heroSubtitle}>Products, categories, inventory, orders, wishlist and cart from live shop data.</Text>
          </View>
        </LinearGradient>

        <View style={styles.statGrid}>
          <Stat icon="package-variant" label="Products" value={String(data.products.length)} color={colors.primary} />
          <Stat icon="shape-outline" label="Categories" value={String(data.categories.length)} color="#0EA5E9" />
          <Stat icon="clipboard-alert-outline" label="Low Stock" value={String(stats.lowStock)} color={colors.warning} />
          <Stat icon="cash" label="Inventory" value={money(stats.inventoryValue)} color="#22C55E" />
          <Stat icon="cart-outline" label="Cart" value={String(data.cart.length)} color="#EC4899" />
          <Stat icon="heart-outline" label="Wishlist" value={String(data.wishlist.length)} color={colors.danger} />
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        {data.categories.length === 0 ? <Empty text="No product categories found." /> : <View style={styles.chipRow}>{data.categories.map(category => <Text key={category.id} style={styles.chip}>{category.name}</Text>)}</View>}

        <Text style={styles.sectionTitle}>Products</Text>
        {data.products.length === 0 ? <Empty text="No shop products found." /> : data.products.slice(0, 12).map(product => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productIcon}><MaterialCommunityIcons name="shopping" size={22} color={colors.primary} /></View>
            <View style={styles.productCopy}>
              <Text style={styles.productTitle}>{product.name}</Text>
              <Text style={styles.productMeta}>{money(Number(product.price ?? 0))} - Stock {product.stock ?? 0}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Orders</Text>
        <Empty text="Order records appear in the Super Admin and owner shop flow when checkout is completed." />
      </ScrollView>
      <GroomerBottomNavigation activeRoute="Shop" />
    </AppScreen>
  );
}

function Stat({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}><MaterialCommunityIcons name={icon} size={18} color={color} /></View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <View style={styles.emptyCard}><Text style={styles.muted}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 112 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  muted: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  hero: { borderRadius: radii.xl, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center', ...shadows.premium },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroSubtitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', lineHeight: 19, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  statIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 17, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text, marginTop: 22, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.primarySoft, color: colors.primaryDark, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: '900' },
  productCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, ...shadows.soft },
  productIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  productCopy: { flex: 1, minWidth: 0 },
  productTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  productMeta: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 3 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
});
