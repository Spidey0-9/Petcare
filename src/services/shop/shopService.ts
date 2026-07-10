import { SupabaseRepository } from '../../repositories';
import { STORAGE_BUCKETS, TABLES } from '../../constants';
import type { ProductRecord } from '../../types';
import { supabase } from '../../core/services/supabase';
import { classifySupabaseError, throwIfError } from '../errors';
import { logDatabaseFailure } from '../database/databaseDiagnostics';

type ShopOrderRecord = { id?: string; localOnly?: boolean; [key: string]: unknown };

export type ShopCategory = {
  id: string;
  name: string;
};

export type ShopProduct = ProductRecord & {
  description?: string | null;
  updated_at?: string;
  category?: ShopCategory | null;
};

export type ShopCartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
  product?: ShopProduct | null;
};

export type ShopWishlistItem = {
  id: string;
  user_id: string;
  product_id: string;
  created_at?: string;
  product?: ShopProduct | null;
};

function resolveProductImageUrl(value?: string | null) {
  if (!value) return value ?? null;
  if (/^(https?:|data:|file:|content:)/i.test(value)) return value;
  const cleanPath = value.replace(/^product-images\//, '').replace(/^\//, '');
  const { data } = supabase.storage.from(STORAGE_BUCKETS.productImages).getPublicUrl(cleanPath);
  return data.publicUrl;
}

function normalizeProduct(product?: ShopProduct | null): ShopProduct | null {
  if (!product) return null;
  return { ...product, image_url: resolveProductImageUrl(product.image_url) };
}

function normalizeCartItem(item: ShopCartItem): ShopCartItem {
  return { ...item, product: normalizeProduct(item.product) };
}

function normalizeWishlistItem(item: ShopWishlistItem): ShopWishlistItem {
  return { ...item, product: normalizeProduct(item.product) };
}

export class ShopService {
  private readonly products = new SupabaseRepository<ShopProduct>(TABLES.products);
  private readonly cart = new SupabaseRepository<{ id?: string }>(TABLES.cart);
  private readonly orders = new SupabaseRepository<ShopOrderRecord>(TABLES.orders);
  private readonly wishlist = new SupabaseRepository<{ id?: string }>(TABLES.wishlist);

  listProducts(page = 1, pageSize = 20) {
    return this.searchProducts({ page, pageSize });
  }

  listProductsByCategory(categoryId: string, page = 1) {
    return this.products.list({ filters: { category_id: categoryId }, page, orderBy: 'created_at' });
  }

  async listCategories() {
    const { data, error } = await supabase
      .from(TABLES.categories)
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.categories, operation: 'listCategories', query: 'select shop categories' }, error);
      throwIfError(error, 'Unable to load shop categories.');
    }
    return (data ?? []) as ShopCategory[];
  }

  async searchProducts(options: {
    query?: string;
    categoryId?: string | null;
    page?: number;
    pageSize?: number;
  } = {}) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 40;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(TABLES.products)
      .select('*, category:categories(id, name)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (options.categoryId) query = query.eq('category_id', options.categoryId);

    const search = options.query?.trim();
    if (search) {
      const escaped = search.replace(/[%_,]/g, '\\$&');
      query = query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.products, operation: 'searchProducts', query: 'select products with category' }, error);
      throwIfError(error, 'Unable to load shop products.');
    }
    return ((data ?? []) as ShopProduct[]).map(product => normalizeProduct(product)!);
  }

  addToCart(payload: Record<string, unknown>) {
    return this.cart.create(payload);
  }

  addToWishlist(payload: Record<string, unknown>) {
    return this.wishlist.create(payload);
  }

  async createOrder(payload: Record<string, unknown>) {
    try {
      return await this.orders.create(payload);
    } catch (error) {
      await logDatabaseFailure({
        module: 'ShopService',
        table: TABLES.orders,
        operation: 'createOrder',
        query: 'insert order for authenticated user',
      }, error);

      const category = classifySupabaseError(error);
      if (category === 'table_not_found') {
        throw new Error('Orders are unavailable because the orders table is missing. Apply the latest Supabase migration.');
      }
      if (category === 'schema_mismatch') {
        throw new Error('Orders are unavailable because the app and Supabase schema are out of sync.');
      }
      throw error;
    }
  }

  async listCart(userId: string) {
    const { data, error } = await supabase
      .from(TABLES.cart)
      .select('*, product:products(*, category:categories(id, name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.cart, operation: 'listCart', query: 'select cart with product' }, error);
      throwIfError(error, 'Unable to load cart.');
    }
    return ((data ?? []) as ShopCartItem[]).map(normalizeCartItem);
  }

  async addOrIncrementCartItem(userId: string, productId: string) {
    const { data: existing, error: lookupError } = await supabase
      .from(TABLES.cart)
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (lookupError) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.cart, operation: 'lookupCartItem', query: 'select cart item by user and product' }, lookupError);
      throwIfError(lookupError, 'Unable to update cart.');
    }

    if (existing) {
      const { data, error } = await supabase
        .from(TABLES.cart)
        .update({ quantity: Number(existing.quantity ?? 0) + 1 })
        .eq('id', existing.id)
        .select('*, product:products(*, category:categories(id, name))')
        .single();
      if (error) {
        await logDatabaseFailure({ module: 'ShopService', table: TABLES.cart, operation: 'incrementCartItem', query: 'update cart quantity' }, error);
        throwIfError(error, 'Unable to update cart.');
      }
      return normalizeCartItem(data as ShopCartItem);
    }

    const { data, error } = await supabase
      .from(TABLES.cart)
      .insert({ user_id: userId, product_id: productId, quantity: 1 })
      .select('*, product:products(*, category:categories(id, name))')
      .single();
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.cart, operation: 'addCartItem', query: 'insert cart item' }, error);
      throwIfError(error, 'Unable to add product to cart.');
    }
    return normalizeCartItem(data as ShopCartItem);
  }

  async clearCart(userId: string) {
    const { error } = await supabase.from(TABLES.cart).delete().eq('user_id', userId);
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.cart, operation: 'clearCart', query: 'delete cart items by user' }, error);
      throwIfError(error, 'Unable to clear cart.');
    }
  }

  async listWishlist(userId: string) {
    const { data, error } = await supabase
      .from(TABLES.wishlist)
      .select('*, product:products(*, category:categories(id, name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.wishlist, operation: 'listWishlist', query: 'select wishlist with product' }, error);
      throwIfError(error, 'Unable to load wishlist.');
    }
    return ((data ?? []) as ShopWishlistItem[]).map(normalizeWishlistItem);
  }

  async toggleWishlistItem(userId: string, productId: string) {
    const { data: existing, error: lookupError } = await supabase
      .from(TABLES.wishlist)
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (lookupError) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.wishlist, operation: 'lookupWishlistItem', query: 'select wishlist item by user and product' }, lookupError);
      throwIfError(lookupError, 'Unable to update wishlist.');
    }

    if (existing) {
      const { error } = await supabase.from(TABLES.wishlist).delete().eq('id', existing.id);
      if (error) {
        await logDatabaseFailure({ module: 'ShopService', table: TABLES.wishlist, operation: 'removeWishlistItem', query: 'delete wishlist item' }, error);
        throwIfError(error, 'Unable to remove wishlist item.');
      }
      return null;
    }

    const { data, error } = await supabase
      .from(TABLES.wishlist)
      .insert({ user_id: userId, product_id: productId })
      .select('*, product:products(*, category:categories(id, name))')
      .single();
    if (error) {
      await logDatabaseFailure({ module: 'ShopService', table: TABLES.wishlist, operation: 'addWishlistItem', query: 'insert wishlist item' }, error);
      throwIfError(error, 'Unable to add product to wishlist.');
    }
    return normalizeWishlistItem(data as ShopWishlistItem);
  }

  subscribeToStock(callback: (payload: unknown) => void) {
    return this.products.subscribe('UPDATE', callback);
  }
}

export const shopService = new ShopService();

