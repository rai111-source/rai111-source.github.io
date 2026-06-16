// ============================================================
//  js/supabase.js  —  LittleLayers Supabase config + helpers
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your values
//  from: https://supabase.com/dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL  = window.ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase credentials not found. Make sure build.js has run and process.env is configured.');
}

// Supabase JS v2 loaded via CDN in each HTML file
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = sb;

// ── SHARED GLOBALS ────────────────────────────────────────────
// Bug #15: single source of truth for admin email — referenced by auth.js and admin.js.
window.ADMIN_EMAIL = 'raj@littlelayers.in';

// Bug #16: centralized HTML-escaping so scripts.js, admin.js, index.js and main.js
// all use one implementation instead of four slightly-different local copies.
window.escHtml = function(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ── TABLE NAMES ──────────────────────────────────────────────
const TABLES = {
  products: 'products',
  gallery:  'gallery',
  orders:   'orders',
  messages: 'messages',
};


// ── CENTRALIZED CART MANAGER ──────────────────────────────────
window.CartManager = {
  getCart() {
    return JSON.parse(localStorage.getItem('littleLayersCart') || '[]');
  },

  saveCart(cart) {
    localStorage.setItem('littleLayersCart', JSON.stringify(cart));
  },

  getCartCount(cart) {
    if (!cart) cart = this.getCart();
    return cart.reduce((s, i) => s + (i.quantity || i.qty || 1), 0);
  },

  getCartTotal(cart) {
    if (!cart) cart = this.getCart();
    return cart.reduce((s, i) => s + Number(i.price) * (i.quantity || i.qty || 1), 0);
  },

  mapDbToLocal(dbItem) {
    return {
      id: Number(dbItem.product_id),
      name: dbItem.product_name,
      price: Number(dbItem.product_price),
      image: dbItem.product_image,
      quantity: dbItem.quantity
    };
  },

  async syncCartFromSupabase(userId) {
    if (!userId || typeof sb === 'undefined') return this.getCart();
    try {
      const { data: dbItems, error } = await sb
        .from('cart_items')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      let cart = this.getCart();
      if (cart.length > 0) {
        const itemsToUpsert = cart.map(localItem => ({
          user_id: userId,
          product_id: Number(localItem.id),
          product_name: localItem.name,
          product_price: localItem.price,
          product_image: localItem.image,
          quantity: localItem.quantity,
          updated_at: new Date()
        }));

        const { data: upsertedItems, error: upsertError } = await sb
          .from('cart_items')
          .upsert(itemsToUpsert, { onConflict: 'user_id, product_id, product_name' })
          .select();

        if (upsertError) throw upsertError;

        const localItemKeys = new Set(cart.map(i => `${Number(i.id)}::${i.name}`));
        const otherDbItems = dbItems.filter(i => !localItemKeys.has(`${Number(i.product_id)}::${i.product_name}`));

        cart = [...upsertedItems, ...otherDbItems].map(this.mapDbToLocal);
      } else {
        cart = dbItems.map(this.mapDbToLocal);
      }

      this.saveCart(cart);
      return cart;
    } catch (e) {
      console.error('Error syncing cart:', e);
      return this.getCart();
    }
  },

  async addDbItem(userId, product) {
    if (!userId || typeof sb === 'undefined') return;
    const { error } = await sb
      .from('cart_items')
      .upsert({
        user_id: userId,
        product_id: Number(product.id),
        product_name: product.name,
        product_price: product.price,
        product_image: product.image,
        quantity: product.quantity,
        updated_at: new Date()
      }, { onConflict: 'user_id, product_id, product_name' });

    if (error) console.error('Error adding to DB cart:', error.message);
  },

  async updateDbItem(userId, productId, productName, quantity) {
    if (!userId || typeof sb === 'undefined') return;
    const { error } = await sb
      .from('cart_items')
      .update({ quantity: quantity, updated_at: new Date() })
      .eq('user_id', userId)
      .eq('product_id', Number(productId))
      .eq('product_name', productName);

    if (error) console.error('Error updating DB cart:', error.message);
  },

  async removeDbItem(userId, productId, productName) {
    if (!userId || typeof sb === 'undefined') return;
    const { error } = await sb
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', Number(productId))
      .eq('product_name', productName);

    if (error) console.error('Error removing from DB cart:', error.message);
  },

  async clearDbCart(userId) {
    if (!userId || typeof sb === 'undefined') return;
    const { error } = await sb
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    if (error) console.error('Error clearing DB cart:', error.message);
  }
};



// ── PRODUCTS ─────────────────────────────────────────────────
async function getProducts(category = null) {
  let query = sb.from(TABLES.products).select('*').eq('active', true).order('created_at', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) { console.error('getProducts:', error); return []; }
  return data;
}



// ── GALLERY ──────────────────────────────────────────────────
async function getGallery() {
  const { data, error } = await sb.from(TABLES.gallery).select('*').eq('active', true).order('sort_order', { ascending: true });
  if (error) { console.error('getGallery:', error); return []; }
  return data;
}



// ── ORDERS ────────────────────────────────────────────────────
// Bug #14 fix: distinguish 'no rows found' (PGRST116) from real DB errors.
// Previously all errors silently returned null, masking network/permission failures.
async function getOrder(orderId) {
  const { data, error } = await sb.from(TABLES.orders).select('*').eq('order_ref', orderId).single();
  if (error) {
    if (error.code !== 'PGRST116') console.error('getOrder:', error); // log real errors
    return null; // null for both 'not found' and errors — caller shows appropriate UI
  }
  return data;
}



// ── MESSAGES ──────────────────────────────────────────────────
async function submitMessage(msg) {
  const { error } = await sb.from(TABLES.messages).insert(msg);
  if (error) throw error;
}


