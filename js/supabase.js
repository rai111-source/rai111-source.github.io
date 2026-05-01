// ============================================================
//  js/supabase.js  —  LittleLayers Supabase config + helpers
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your values
//  from: https://supabase.com/dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL  = 'https://amzijtwogsibxganxsty.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AU321-iXA66NaZ0d4FShPw_0h83Qy9J';

// Supabase JS v2 loaded via CDN in each HTML file
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = sb;

// ── TABLE NAMES ──────────────────────────────────────────────
const TABLES = {
  products: 'products',
  gallery:  'gallery',
  orders:   'orders',
  messages: 'messages',
};

// ── STORAGE BUCKET NAMES ─────────────────────────────────────
const BUCKETS = {
  products: 'product-images',
  gallery:  'gallery-images',
};

// ── PRODUCTS ─────────────────────────────────────────────────
async function getProducts(category = null) {
  let query = sb.from(TABLES.products).select('*').eq('active', true).order('created_at', { ascending: false });
  if (category && category !== 'all') query = query.eq('category', category);
  const { data, error } = await query;
  if (error) { console.error('getProducts:', error); return []; }
  return data;
}

async function getAllProductsAdmin() {
  const { data, error } = await sb.from(TABLES.products).select('*').order('created_at', { ascending: false });
  if (error) { console.error('getAllProductsAdmin:', error); return []; }
  return data;
}

async function upsertProduct(product) {
  const { data, error } = await sb.from(TABLES.products).upsert(product).select().single();
  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  const { error } = await sb.from(TABLES.products).delete().eq('id', id);
  if (error) throw error;
}

async function toggleProductActive(id, active) {
  const { error } = await sb.from(TABLES.products).update({ active }).eq('id', id);
  if (error) throw error;
}

// ── GALLERY ──────────────────────────────────────────────────
async function getGallery() {
  const { data, error } = await sb.from(TABLES.gallery).select('*').eq('active', true).order('sort_order', { ascending: true });
  if (error) { console.error('getGallery:', error); return []; }
  return data;
}

async function getAllGalleryAdmin() {
  const { data, error } = await sb.from(TABLES.gallery).select('*').order('sort_order', { ascending: true });
  if (error) { console.error('getAllGalleryAdmin:', error); return []; }
  return data;
}

async function upsertGalleryItem(item) {
  const { data, error } = await sb.from(TABLES.gallery).upsert(item).select().single();
  if (error) throw error;
  return data;
}

async function deleteGalleryItem(id) {
  const { error } = await sb.from(TABLES.gallery).delete().eq('id', id);
  if (error) throw error;
}

// ── STORAGE UPLOAD ────────────────────────────────────────────
async function uploadImage(bucket, file, path) {
  const { data, error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) throw error;
  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

// ── ORDERS ────────────────────────────────────────────────────
async function getOrder(orderId) {
  const { data, error } = await sb.from(TABLES.orders).select('*').eq('order_ref', orderId).single();
  if (error) return null;
  return data;
}

async function getAllOrdersAdmin() {
  const { data, error } = await sb.from(TABLES.orders).select('*').order('created_at', { ascending: false });
  if (error) { console.error('getAllOrdersAdmin:', error); return []; }
  return data;
}

async function updateOrderStatus(id, status) {
  const { error } = await sb.from(TABLES.orders).update({ status }).eq('id', id);
  if (error) throw error;
}

// ── MESSAGES ──────────────────────────────────────────────────
async function submitMessage(msg) {
  const { error } = await sb.from(TABLES.messages).insert(msg);
  if (error) throw error;
}

async function getAllMessagesAdmin() {
  const { data, error } = await sb.from(TABLES.messages).select('*').order('created_at', { ascending: false });
  if (error) { console.error('getAllMessagesAdmin:', error); return []; }
  return data;
}

// ── AUTH ──────────────────────────────────────────────────────
async function adminSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function adminSignOut() {
  await sb.auth.signOut();
}

async function getAdminSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
}
