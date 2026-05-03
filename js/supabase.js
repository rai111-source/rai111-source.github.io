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
async function getOrder(orderId) {
  const { data, error } = await sb.from(TABLES.orders).select('*').eq('order_ref', orderId).single();
  if (error) return null;
  return data;
}



// ── MESSAGES ──────────────────────────────────────────────────
async function submitMessage(msg) {
  const { error } = await sb.from(TABLES.messages).insert(msg);
  if (error) throw error;
}


