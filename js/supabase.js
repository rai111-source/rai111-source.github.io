// ============================================================
//  js/supabase.js  —  LittleLayers Supabase config + helpers
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY with your values
//  from: https://supabase.com/dashboard → Project Settings → API
// ============================================================

const SUPABASE_URL  = window.ENV?.SUPABASE_URL || 'https://amzijtwogsibxganxsty.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'sb_publishable_AU321-iXA66NaZ0d4FShPw_0h83Qy9J';

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


