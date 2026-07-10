import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';
import { authService } from '../services/auth';
import { paymentService } from '../services/payments';
import { shopService, type ShopCartItem, type ShopCategory, type ShopProduct, type ShopWishlistItem } from '../services/shop';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';

const ALL_CATEGORY: ShopCategory = { id: 'all', name: 'All' };

type ProductView = ShopProduct & { categoryName: string; reviewCount: number; inStock: boolean };

export function ShopScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [categories, setCategories] = useState<ShopCategory[]>([ALL_CATEGORY]);
  const [categoryId, setCategoryId] = useState(ALL_CATEGORY.id);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [cart, setCart] = useState<ShopCartItem[]>([]);
  const [wishlist, setWishlist] = useState<ShopWishlistItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const loadShop = useCallback(async (nextSearch: string, nextCategoryId: string) => {
    const user = await authService.getCurrentUser();
    const [categoryRows, productRows, cartRows, wishlistRows] = await Promise.all([
      shopService.listCategories(),
      shopService.searchProducts({ query: nextSearch, categoryId: nextCategoryId === ALL_CATEGORY.id ? null : nextCategoryId }),
      user ? shopService.listCart(user.id) : Promise.resolve([]),
      user ? shopService.listWishlist(user.id) : Promise.resolve([]),
    ]);
    setErrorMessage(null);
    setCategories([ALL_CATEGORY, ...categoryRows.filter(category => !!category?.id && !!category?.name)]);
    setProducts(productRows.filter(product => !!product?.id && !!product?.name));
    setCart(cartRows.filter(item => !!item?.id && !!item?.product_id));
    setWishlist(wishlistRows.filter(item => !!item?.id && !!item?.product_id));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadShop('', ALL_CATEGORY.id)
      .catch(error => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Please try again.';
        console.error('Unable to load shop:', error);
        setErrorMessage(message);
        Alert.alert('Shop unavailable', message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadShop]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadShop(search, categoryId).catch(error => {
        const message = error instanceof Error ? error.message : 'Unable to search products.';
        console.error('Unable to search products:', error);
        setErrorMessage(message);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [categoryId, loadShop, search]);

  const refresh = async () => {
    setRefreshing(true);
    try { await loadShop(search, categoryId); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setErrorMessage(message);
      Alert.alert('Refresh failed', message);
    }
    finally { setRefreshing(false); }
  };

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleShopRealtime = useCallback(() => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => {
      loadShop(search, categoryId).catch(error => {
        const message = error instanceof Error ? error.message : 'Unable to refresh shop data.';
        console.warn('[ShopScreen] Realtime refresh failed:', error);
        setErrorMessage(message);
      });
    }, 400);
  }, [categoryId, loadShop, search]);

  useRealtimeTables('shop-screen', [TABLES.products, TABLES.categories, TABLES.cart, TABLES.wishlist, TABLES.orders, TABLES.payments, TABLES.invoices, TABLES.reviews], handleShopRealtime);

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const productViews = useMemo<ProductView[]>(() => products.map(product => ({
    ...product,
    categoryName: product.category?.name ?? 'Pet Care',
    reviewCount: Number((product as any).review_count ?? 0),
    inStock: Number(product.stock ?? 0) > 0,
  })), [products]);

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product?.price ?? 0) * Number(item.quantity ?? 0), 0);
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  const wishlistIds = useMemo(() => new Set(wishlist.map(item => item.product_id)), [wishlist]);
  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach(item => map.set(item.product_id, Number(item.quantity ?? 0)));
    return map;
  }, [cart]);

  const addToCart = async (productId: string) => {
    const user = await authService.getCurrentUser();
    if (!user) { Alert.alert('Login required', 'Please sign in to add products to your cart.'); return; }
    try {
      await shopService.addOrIncrementCartItem(user.id, productId);
      setCart(await shopService.listCart(user.id));
    } catch (error) {
      Alert.alert('Cart update failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const toggleWishlist = async (productId: string) => {
    const user = await authService.getCurrentUser();
    if (!user) { Alert.alert('Login required', 'Please sign in to use your wishlist.'); return; }
    try {
      await shopService.toggleWishlistItem(user.id, productId);
      setWishlist(await shopService.listWishlist(user.id));
    } catch (error) {
      Alert.alert('Wishlist update failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || checkingOut) return;
    try {
      setCheckingOut(true);
      const user = await authService.getCurrentUser();
      if (!user) { Alert.alert('Login required', 'Please sign in before checkout.'); return; }
      const items = cart.map(item => ({ product_id: item.product_id, name: item.product?.name ?? 'Product', quantity: item.quantity, price: Number(item.product?.price ?? 0) }));
      const order = await shopService.createOrder({ user_id: user.id, status: 'pending', total: cartTotal, items });
      const orderId = typeof order.id === 'string' && !order.localOnly ? order.id : null;
      const result = await paymentService.startCheckout({
        amount: cartTotal,
        orderId,
        description: 'PetCare+ shop order',
        customer: { email: user.email ?? undefined },
        metadata: { source: 'shop', item_count: cartCount },
      });
      if (result.status === 'paid') {
        await shopService.clearCart(user.id);
        setCart([]);
        setShowCart(false);
        Alert.alert('Payment successful', 'Your order has been placed.');
      } else {
        Alert.alert('Payment pending', 'We will update your order after the gateway confirms payment.');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };
  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pet Shop</Text>
          <Text style={styles.subtitle}>{loading ? 'Loading products...' : `${productViews.length} products`}</Text>
        </View>
        <View style={styles.headerBtns}>
          <Pressable style={styles.iconBtn} onPress={() => Alert.alert('Wishlist', `${wishlist.length} saved product${wishlist.length === 1 ? '' : 's'}.`)}>
            <MaterialCommunityIcons name="heart-outline" size={22} color={colors.primary} />
            {wishlist.length > 0 && <View style={styles.iconBadge}><Text style={styles.iconBadgeText}>{wishlist.length}</Text></View>}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setShowCart(value => !value)}>
            <MaterialCommunityIcons name="cart-outline" size={22} color={colors.primary} />
            {cartCount > 0 && <View style={styles.iconBadge}><Text style={styles.iconBadgeText}>{cartCount}</Text></View>}
          </Pressable>
        </View>
      </View>

      {showCart && cart.length > 0 && (
        <View style={styles.cartBanner}>
          <MaterialCommunityIcons name="cart" size={18} color={colors.primary} />
          <Text style={styles.cartBannerText}>{cartCount} items • INR {cartTotal.toFixed(0)}</Text>
          <Pressable style={[styles.checkoutBtn, checkingOut && styles.checkoutBtnDisabled]} onPress={handleCheckout} disabled={checkingOut}>
            <Text style={styles.checkoutBtnText}>{checkingOut ? 'Paying...' : 'Checkout'}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search pet products..."
          placeholderTextColor={colors.muted}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
        <Pressable style={styles.filterBtn} onPress={() => Alert.alert('Filters', 'Advanced filters will arrive in Phase 8B.')}>
          <MaterialCommunityIcons name="tune-variant" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catsRow}>
        {categories.map(cat => (
          <Pressable key={cat.id} style={[styles.catChip, categoryId === cat.id && styles.catChipActive]} onPress={() => setCategoryId(cat.id)}>
            <Text style={[styles.catText, categoryId === cat.id && styles.catTextActive]}>{cat.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.promoBanner}>
        <View style={styles.promoCopy}>
          <Text style={styles.promoTitle}>Premium Pet Essentials</Text>
          <Text style={styles.promoSub}>Fresh products loaded directly from PetCare+ inventory</Text>
        </View>
        <View style={styles.promoIcon}>
          <MaterialCommunityIcons name="sale" size={36} color="#FF8F00" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading products...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <MaterialCommunityIcons name="wifi-alert" size={42} color={colors.danger} />
            <Text style={styles.stateTitle}>Shop unavailable</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable style={styles.retryBtn} onPress={refresh}>
              <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : productViews.length === 0 ? (
          <View style={styles.stateBox}>
            <MaterialCommunityIcons name="package-variant-closed" size={42} color={colors.muted} />
            <Text style={styles.stateTitle}>No products found</Text>
            <Text style={styles.stateText}>Add products in Supabase or try a different search.</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {productViews.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                inCart={cartQuantities.get(product.id) ?? 0}
                inWishlist={wishlistIds.has(product.id)}
                onAdd={() => addToCart(product.id)}
                onWishlist={() => toggleWishlist(product.id)}
              />
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function ProductCard({ product, index, inCart, inWishlist, onAdd, onWishlist }: {
  product: ProductView; index: number; inCart: number; inWishlist: boolean; onAdd: () => void; onWishlist: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, delay: index * 50, useNativeDriver: true }).start();
  }, [index, scaleAnim]);

  const onPressIn = () => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
  const onPressOut = () => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  const stockLabel = product.inStock ? `${Number(product.stock ?? 0)} in stock` : 'Out of stock';

  return (
    <Animated.View style={[styles.productCard, { opacity: scaleAnim, transform: [{ scale: pressAnim }] }]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={styles.productImg}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} />
          ) : (
            <View style={styles.imageMissing}>
              <MaterialCommunityIcons name="image-off-outline" size={32} color={colors.muted} />
              <Text style={styles.imageMissingText}>Image pending</Text>
            </View>
          )}
          <View style={[styles.stockBadge, !product.inStock && styles.stockBadgeMuted]}><Text style={styles.stockBadgeText}>{product.inStock ? 'In Stock' : 'Sold Out'}</Text></View>
          <Pressable style={styles.wishBtn} onPress={onWishlist}>
            <MaterialCommunityIcons name={inWishlist ? 'heart' : 'heart-outline'} size={18} color={inWishlist ? '#EF4444' : colors.muted} />
          </Pressable>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.brandText} numberOfLines={1}>{product.categoryName}</Text>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          {!!product.description && <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>}
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={12} color="#FF8F00" />
            <Text style={styles.ratingText}>{Number(product.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewText}>({product.reviewCount})</Text>
          </View>
          <Text style={styles.stockText}>{stockLabel}</Text>
          <View style={styles.priceRow}><Text style={styles.price}>INR {Number(product.price ?? 0).toFixed(0)}</Text></View>
          <Pressable style={[styles.addBtn, inCart > 0 && styles.addBtnActive, !product.inStock && styles.addBtnDisabled]} onPress={onAdd} disabled={!product.inStock}>
            <MaterialCommunityIcons name="cart-plus" size={14} color="#fff" />
            <Text style={styles.addBtnText}>{inCart > 0 ? `In Cart (${inCart})` : product.inStock ? 'Add to Cart' : 'Unavailable'}</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  iconBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  cartBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '15', paddingHorizontal: 20, paddingVertical: 10 },
  cartBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.primary },
  checkoutBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  checkoutBtnDisabled: { opacity: 0.65 },
  checkoutBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.line },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  filterBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  catsRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  catTextActive: { color: '#fff' },
  promoBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 14, backgroundColor: '#FFF8E1', borderRadius: 16, padding: 14, gap: 8 },
  promoCopy: { flex: 1 },
  promoTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  promoSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  promoIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: 16 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  stateTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  stateText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  productCard: { width: '47.5%', backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  productImg: { height: 132, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageMissing: { alignItems: 'center', gap: 4 },
  imageMissingText: { fontSize: 10, color: colors.muted, fontWeight: '800' },
  stockBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockBadgeMuted: { backgroundColor: '#64748B' },
  stockBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  wishBtn: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  productInfo: { padding: 12, gap: 6 },
  brandText: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase' },
  productName: { fontSize: 12, fontWeight: '800', color: colors.text, lineHeight: 17 },
  productDesc: { fontSize: 10, color: colors.muted, lineHeight: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '700', color: colors.text },
  reviewText: { fontSize: 10, color: colors.muted },
  stockText: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 15, fontWeight: '900', color: colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, marginTop: 4 },
  addBtnActive: { backgroundColor: colors.success },
  addBtnDisabled: { backgroundColor: colors.muted, opacity: 0.7 },
  addBtnText: { fontSize: 10, fontWeight: '900', color: '#fff' },
});



