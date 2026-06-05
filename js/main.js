// ============================================================
//  js/main.js  —  LittleLayers public site logic
// ============================================================

// ── STATE ────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('ll_cart') || '[]');
let allProducts = [];
let activeFilter = 'all';

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateCartUI();
  await Promise.all([loadProducts(), loadGallery()]);
});

// ── PRODUCTS ─────────────────────────────────────────────────
async function loadProducts(category = 'all') {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = `<div class="loading-spinner" style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted);">
    <div class="spinner"></div><p style="margin-top:16px;">Loading products...</p>
  </div>`;

  allProducts = await getProducts(category === 'all' ? null : category);
  renderProducts(allProducts);
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted);">No products found in this category.</div>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        <img src="${escHtml(p.image_url || 'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=400&q=80')}"
             alt="${escHtml(p.name)}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=400&q=80'">
        ${p.badge ? `<div class="product-badge">${escHtml(p.badge)}</div>` : ''}
        <div class="product-actions">
          <button class="icon-btn" title="Wishlist" onclick="wishlist(${p.id}, event)">♡</button>
          <button class="icon-btn" title="Quick View" onclick="quickView(${p.id}, event)">👁</button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-cat">${escHtml(p.category)}</div>
        <div class="product-name">${escHtml(p.name)}</div>
        ${p.description ? `<div class="product-desc-short">${escHtml(p.description.slice(0,60))}${p.description.length>60?'…':''}</div>` : ''}
        <div class="product-footer">
          <div class="product-price">
            ₹${Number(p.price).toLocaleString('en-IN')}
            ${p.original_price ? `<span class="orig">₹${Number(p.original_price).toLocaleString('en-IN')}</span>` : ''}
          </div>
          <button class="add-cart-btn" onclick="addToCart(${p.id}, event)" title="Add to cart">+</button>
        </div>
      </div>
    </div>
  `).join('');

  // animate in
  document.querySelectorAll('.product-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s ease, border-color 0.3s, box-shadow 0.3s';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, i * 60);
  });
}

function filterProducts(cat, btn) {
  activeFilter = cat;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadProducts(cat);
}

// ── GALLERY ──────────────────────────────────────────────────
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const items = await getGallery();
  if (!items.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">No gallery items yet.</div>`;
    return;
  }

  // Assign layout classes for first 6 items
  const layouts = ['gallery-tall', '', '', '', 'gallery-wide', ''];
  grid.innerHTML = items.slice(0, 6).map((item, i) => `
    <div class="gallery-item ${layouts[i] || ''}" onclick="openLightbox('${item.image_url}','${escHtml(item.caption || item.title || '')}')">
      <img src="${item.image_url}" alt="${escHtml(item.title || '')}" loading="lazy">
      <div class="gallery-caption">${escHtml(item.title || '')}</div>
    </div>
  `).join('');
}

// ── CART ─────────────────────────────────────────────────────
function addToCart(id, e) {
  if (e) e.stopPropagation();
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty++;
  else cart.push({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty: 1 });
  saveCart();
  updateCartUI();
  showNotif(`${escHtml(product.name)} added to cart! 🛒`);
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('ll_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = count;

  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = '₹' + total.toLocaleString('en-IN');

  const itemsEl = document.getElementById('cartItems');
  const footer  = document.getElementById('cartFooter');
  if (!itemsEl) return;

  if (!cart.length) {
    itemsEl.innerHTML = `<div class="cart-empty"><div class="empty-icon">🛒</div><p>Your cart is empty.<br>Add something awesome!</p></div>`;
    if (footer) footer.style.display = 'none';
  } else {
    if (footer) footer.style.display = 'block';
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${escHtml(item.image_url || 'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=100&q=70')}"
             alt="${escHtml(item.name)}"
             onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=100&q=70'">
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(item.name)}</div>
          <div class="cart-item-price">₹${(Number(item.price) * item.qty).toLocaleString('en-IN')}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `).join('');
  }
}

function toggleCart() {
  document.getElementById('cartDrawer').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

async function checkout() {
  if (!cart.length) return;
  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const orderRef = 'LL-' + Date.now();
  const msg = `🛒 *New Order — ${orderRef}*\n\n` +
    cart.map(i => `• ${i.name} × ${i.qty} = ₹${(Number(i.price)*i.qty).toLocaleString('en-IN')}`).join('\n') +
    `\n\n*Total: ₹${total.toLocaleString('en-IN')}*\n\nPlease share your delivery address to confirm.`;

  // Save order to Supabase
  try {
    await sb.from('orders').insert({
      order_ref: orderRef,
      items: cart,
      total,
      status: 'pending',
    });
  } catch(e) { console.warn('Order save failed:', e); }

  // Redirect to WhatsApp
  const waNum = document.body.dataset.waNumber || '916000061991';
  window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
  cart = [];
  saveCart();
  updateCartUI();
  toggleCart();
  showNotif(`Order #${orderRef} placed! Check WhatsApp 🎉`);
}

// ── ORDER TRACKING ────────────────────────────────────────────
async function trackOrder() {
  const val = document.getElementById('trackInput').value.trim().toUpperCase();
  if (!val) { showNotif('Please enter your Order ID'); return; }
  const order = await getOrder(val);
  const result = document.getElementById('trackResult');
  const msg    = document.getElementById('trackMsg');

  if (!order) {
    msg.textContent = `Order "${val}" not found. Please check the ID or contact us via WhatsApp.`;
    msg.style.color = 'var(--accent)';
    result.style.display = 'block';
    document.getElementById('trackTimeline').style.display = 'none';
    return;
  }

  const statuses = ['pending','confirmed','printing','dispatched','delivered'];
  const statusLabels = {
    pending:    { icon: '🕐', title: 'Order Placed',        sub: 'We received your order' },
    confirmed:  { icon: '✓',  title: 'Design Confirmed',    sub: 'File approved & sent to printer' },
    printing:   { icon: '🖨', title: 'Printing in Progress',sub: 'Your item is being printed' },
    dispatched: { icon: '📦', title: 'Packed & Dispatched', sub: 'Shipped via courier' },
    delivered:  { icon: '✓',  title: 'Delivered',           sub: 'Enjoy your print!' },
  };

  const currentIdx = statuses.indexOf(order.status);
  msg.textContent = '';
  const timeline = document.getElementById('trackTimeline');
  timeline.style.display = 'flex';
  timeline.innerHTML = statuses.map((s, i) => {
    const done   = i < currentIdx;
    const active = i === currentIdx;
    const lbl    = statusLabels[s];
    return `
      <div class="track-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
        <div class="track-dot">${done ? '✓' : lbl.icon}</div>
        <div class="track-info">
          <div class="track-step-title">${lbl.title}</div>
          <div class="track-step-sub">${lbl.sub}</div>
        </div>
      </div>`;
  }).join('');
  result.style.display = 'block';
}

// ── CONTACT FORM ─────────────────────────────────────────────
async function submitContactForm(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const data = {
    name:    form.querySelector('[name=name]').value,
    phone:   form.querySelector('[name=phone]').value,
    email:   form.querySelector('[name=email]').value,
    service: form.querySelector('[name=service]').value,
    message: form.querySelector('[name=message]').value,
  };

  try {
    await submitMessage(data);
    showNotif('Message sent! We\'ll reply within 24 hours ✉️');
    form.reset();
  } catch(err) {
    showNotif('Failed to send — please try WhatsApp instead.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Message →';
  }
}

// ── AUTH MODAL ───────────────────────────────────────────────
function openAuth(mode) {
  document.getElementById('authOverlay').classList.add('open');
  document.getElementById('authModal').classList.add('open');
  switchTab(mode);
}
function closeAuth() {
  document.getElementById('authOverlay').classList.remove('open');
  document.getElementById('authModal').classList.remove('open');
}
function switchTab(tab) {
  document.getElementById('loginForm').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
}
function handleAuth(mode) {
  closeAuth();
  showNotif(mode === 'login' ? 'Logged in! 👋' : 'Welcome to LittleLayers 🎉');
}

// ── LIGHTBOX ─────────────────────────────────────────────────
function openLightbox(src, caption) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxCaption').textContent = caption;
  document.getElementById('lightboxOverlay').classList.add('open');
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightboxOverlay').classList.remove('open');
  document.getElementById('lightbox').classList.remove('open');
}

// ── MOBILE NAV ───────────────────────────────────────────────
function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
}

// ── WISHLIST ─────────────────────────────────────────────────
function wishlist(id, e) {
  if (e) e.stopPropagation();
  showNotif('Added to wishlist ❤️');
}

function quickView(id, e) {
  if (e) e.stopPropagation();
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  showNotif(`Quick view: ${escHtml(p.name)} — ₹${Number(p.price).toLocaleString('en-IN')}`);
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
function showNotif(msg) {
  const el = document.getElementById('notification');
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(window._notifTimer);
  window._notifTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── SCROLL ANIMATIONS ────────────────────────────────────────
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.08 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.feature-card, .service-card, .testimonial-card, .how-step, .faq-item, .info-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s';
    scrollObserver.observe(el);
  });
});

// ── FAQ ───────────────────────────────────────────────────────
function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const isOpen = el.classList.contains('open');
  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) { el.classList.add('open'); answer.classList.add('open'); }
}

// ── UTILS ─────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
