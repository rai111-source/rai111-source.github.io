// ============================================================
//  js/admin.js  —  LittleLayers Admin Panel logic
// ============================================================

let adminSection = 'products';
let editingProduct = null;
let editingGallery  = null;

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const session = await getAdminSession();
  if (!session) {
    showLoginScreen();
    return;
  }
  showDashboard();
  await loadSection('products');
});

// ── AUTH ─────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}
function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'grid';
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const btn   = e.target.querySelector('button');
  const email = document.getElementById('adminEmail').value;
  const pass  = document.getElementById('adminPass').value;
  const err   = document.getElementById('loginError');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    await adminSignIn(email, pass);
    showDashboard();
    await loadSection('products');
    adminToast('Welcome back! 👋');
  } catch(ex) {
    err.textContent = ex.message || 'Invalid credentials';
    err.style.display = 'block';
  } finally {
    btn.disabled = false; btn.textContent = 'Sign In →';
  }
}

async function handleSignOut() {
  await adminSignOut();
  showLoginScreen();
}

// ── NAVIGATION ───────────────────────────────────────────────
async function loadSection(section) {
  adminSection = section;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.section === section));
  document.querySelectorAll('.admin-section').forEach(el => el.style.display = el.id === section + 'Section' ? 'block' : 'none');

  if (section === 'products') await renderProductsAdmin();
  if (section === 'gallery')  await renderGalleryAdmin();
  if (section === 'orders')   await renderOrdersAdmin();
  if (section === 'messages') await renderMessagesAdmin();
  if (section === 'dashboard') await renderDashboardStats();
}

// ── DASHBOARD STATS ───────────────────────────────────────────
async function renderDashboardStats() {
  const [products, orders, messages, gallery] = await Promise.all([
    getAllProductsAdmin(), getAllOrdersAdmin(), getAllMessagesAdmin(), getAllGalleryAdmin()
  ]);
  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statOrders').textContent   = orders.length;
  document.getElementById('statMessages').textContent = messages.length;
  document.getElementById('statGallery').textContent  = gallery.length;
  const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  document.getElementById('statRevenue').textContent  = '₹' + revenue.toLocaleString('en-IN');
}

// ── PRODUCTS ADMIN ────────────────────────────────────────────
async function renderProductsAdmin() {
  const products = await getAllProductsAdmin();
  const tbody = document.getElementById('productsTable');
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No products yet. Add your first one!</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image_url || ''}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" onerror="this.style.display='none'"></td>
      <td><strong style="color:var(--white)">${escHtml(p.name)}</strong></td>
      <td><span class="badge">${escHtml(p.category)}</span></td>
      <td style="color:var(--accent);font-weight:700">₹${Number(p.price).toLocaleString('en-IN')}</td>
      <td>${p.badge ? `<span class="badge badge-accent">${escHtml(p.badge)}</span>` : '—'}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${p.active ? 'checked' : ''} onchange="toggleProduct(${p.id}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn" onclick="openProductModal(${p.id})">✏️ Edit</button>
          <button class="admin-btn admin-btn-danger" onclick="confirmDeleteProduct(${p.id}, '${escHtml(p.name)}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function openProductModal(id = null) {
  editingProduct = id;
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form  = document.getElementById('productForm');
  form.reset();
  document.getElementById('productImagePreview').style.display = 'none';

  if (id) {
    title.textContent = 'Edit Product';
    const products = await getAllProductsAdmin();
    const p = products.find(x => x.id === id);
    if (p) {
      document.getElementById('pName').value     = p.name || '';
      document.getElementById('pCategory').value = p.category || '';
      document.getElementById('pPrice').value    = p.price || '';
      document.getElementById('pOrigPrice').value= p.original_price || '';
      document.getElementById('pBadge').value    = p.badge || '';
      document.getElementById('pDesc').value     = p.description || '';
      document.getElementById('pActive').checked = p.active ?? true;
      if (p.image_url) {
        const prev = document.getElementById('productImagePreview');
        prev.src = p.image_url; prev.style.display = 'block';
      }
    }
  } else {
    title.textContent = 'Add Product';
    document.getElementById('pActive').checked = true;
  }
  modal.classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  editingProduct = null;
}

async function saveProduct(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let imageUrl = null;
    const fileInput = document.getElementById('pImage');
    if (fileInput.files[0]) {
      const file = fileInput.files[0];
      const path = `${Date.now()}-${file.name.replace(/\s+/g,'-')}`;
      imageUrl = await uploadImage(BUCKETS.products, file, path);
    } else if (editingProduct) {
      // Keep existing image
      const products = await getAllProductsAdmin();
      const p = products.find(x => x.id === editingProduct);
      imageUrl = p?.image_url || null;
    }

    const payload = {
      name:           document.getElementById('pName').value,
      category:       document.getElementById('pCategory').value,
      price:          parseFloat(document.getElementById('pPrice').value),
      original_price: parseFloat(document.getElementById('pOrigPrice').value) || null,
      badge:          document.getElementById('pBadge').value || null,
      description:    document.getElementById('pDesc').value || null,
      active:         document.getElementById('pActive').checked,
      image_url:      imageUrl,
    };
    if (editingProduct) payload.id = editingProduct;

    await upsertProduct(payload);
    adminToast(editingProduct ? 'Product updated! ✅' : 'Product added! 🎉');
    closeProductModal();
    await renderProductsAdmin();
  } catch(err) {
    adminToast('Error: ' + err.message, true);
    console.error(err);
  } finally {
    btn.disabled = false; btn.textContent = 'Save Product';
  }
}

async function toggleProduct(id, active) {
  try {
    await toggleProductActive(id, active);
    adminToast(active ? 'Product visible ✅' : 'Product hidden 🚫');
  } catch(err) { adminToast('Toggle failed', true); }
}

async function confirmDeleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteProduct(id);
    adminToast('Product deleted');
    await renderProductsAdmin();
  } catch(err) { adminToast('Delete failed: ' + err.message, true); }
}

function previewProductImage(input) {
  if (!input.files[0]) return;
  const prev = document.getElementById('productImagePreview');
  prev.src = URL.createObjectURL(input.files[0]);
  prev.style.display = 'block';
}

// ── GALLERY ADMIN ─────────────────────────────────────────────
async function renderGalleryAdmin() {
  const items = await getAllGalleryAdmin();
  const grid  = document.getElementById('galleryAdminGrid');
  if (!items.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">No gallery items yet.</div>`;
    return;
  }
  grid.innerHTML = items.map(item => `
    <div class="gallery-admin-card">
      <img src="${item.image_url}" alt="${escHtml(item.title || '')}"
           onerror="this.src='https://via.placeholder.com/300x200?text=Image+Missing'">
      <div class="gallery-admin-info">
        <div class="gallery-admin-title">${escHtml(item.title || 'Untitled')}</div>
        <div class="gallery-admin-caption">${escHtml(item.caption || '')}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;">
          <label class="toggle-switch" style="transform:scale(0.85);transform-origin:left;">
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleGalleryItem(${item.id}, this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <div style="display:flex;gap:6px;">
            <button class="admin-btn" onclick="openGalleryModal(${item.id})">✏️</button>
            <button class="admin-btn admin-btn-danger" onclick="confirmDeleteGallery(${item.id})">🗑</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

async function openGalleryModal(id = null) {
  editingGallery = id;
  const modal = document.getElementById('galleryModal');
  document.getElementById('galleryForm').reset();
  document.getElementById('galleryImagePreview').style.display = 'none';
  document.getElementById('galleryModalTitle').textContent = id ? 'Edit Gallery Item' : 'Add Gallery Image';

  if (id) {
    const items = await getAllGalleryAdmin();
    const item  = items.find(x => x.id === id);
    if (item) {
      document.getElementById('gTitle').value      = item.title || '';
      document.getElementById('gCaption').value    = item.caption || '';
      document.getElementById('gSortOrder').value  = item.sort_order ?? 0;
      document.getElementById('gActive').checked   = item.active ?? true;
      if (item.image_url) {
        const prev = document.getElementById('galleryImagePreview');
        prev.src = item.image_url; prev.style.display = 'block';
      }
    }
  } else {
    document.getElementById('gActive').checked = true;
  }
  modal.classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
}

function closeGalleryModal() {
  document.getElementById('galleryModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  editingGallery = null;
}

async function saveGalleryItem(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let imageUrl = null;
    const fileInput = document.getElementById('gImage');
    if (fileInput.files[0]) {
      const file = fileInput.files[0];
      const path = `gallery/${Date.now()}-${file.name.replace(/\s+/g,'-')}`;
      imageUrl = await uploadImage(BUCKETS.gallery, file, path);
    } else if (editingGallery) {
      const items = await getAllGalleryAdmin();
      imageUrl = items.find(x => x.id === editingGallery)?.image_url || null;
    }

    const payload = {
      title:      document.getElementById('gTitle').value,
      caption:    document.getElementById('gCaption').value || null,
      sort_order: parseInt(document.getElementById('gSortOrder').value) || 0,
      active:     document.getElementById('gActive').checked,
      image_url:  imageUrl,
    };
    if (editingGallery) payload.id = editingGallery;

    await upsertGalleryItem(payload);
    adminToast(editingGallery ? 'Gallery updated! ✅' : 'Image added! 🎉');
    closeGalleryModal();
    await renderGalleryAdmin();
  } catch(err) {
    adminToast('Error: ' + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Save';
  }
}

async function toggleGalleryItem(id, active) {
  await sb.from('gallery').update({ active }).eq('id', id);
  adminToast(active ? 'Visible ✅' : 'Hidden 🚫');
}

async function confirmDeleteGallery(id) {
  if (!confirm('Delete this gallery image?')) return;
  await deleteGalleryItem(id);
  adminToast('Deleted');
  await renderGalleryAdmin();
}

function previewGalleryImage(input) {
  if (!input.files[0]) return;
  const prev = document.getElementById('galleryImagePreview');
  prev.src = URL.createObjectURL(input.files[0]);
  prev.style.display = 'block';
}

// ── ORDERS ADMIN ──────────────────────────────────────────────
async function renderOrdersAdmin() {
  const orders = await getAllOrdersAdmin();
  const tbody  = document.getElementById('ordersTable');
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No orders yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong style="color:var(--accent);font-family:var(--font-head)">${escHtml(o.order_ref)}</strong></td>
      <td style="color:var(--white)">₹${Number(o.total || 0).toLocaleString('en-IN')}</td>
      <td><span class="status-badge status-${o.status}">${o.status}</span></td>
      <td style="color:var(--muted);font-size:13px">${new Date(o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
      <td>
        <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
          ${['pending','confirmed','printing','dispatched','delivered'].map(s =>
            `<option value="${s}" ${o.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <button class="admin-btn" onclick="viewOrderItems(${JSON.stringify(o.items).replace(/"/g,'&quot;')})">View Items</button>
      </td>
    </tr>
  `).join('');
}

async function updateStatus(id, status) {
  try {
    await updateOrderStatus(id, status);
    adminToast('Order status updated ✅');
  } catch(err) { adminToast('Update failed', true); }
}

function viewOrderItems(items) {
  if (!items || !items.length) { adminToast('No items data'); return; }
  alert(items.map(i => `${i.name} × ${i.qty} = ₹${(Number(i.price)*i.qty).toLocaleString('en-IN')}`).join('\n'));
}

// ── MESSAGES ADMIN ────────────────────────────────────────────
async function renderMessagesAdmin() {
  const messages = await getAllMessagesAdmin();
  const list     = document.getElementById('messagesList');
  if (!messages.length) {
    list.innerHTML = `<div style="text-align:center;padding:60px;color:var(--muted)">No messages yet.</div>`;
    return;
  }
  list.innerHTML = messages.map(m => `
    <div class="message-card">
      <div class="message-header">
        <div>
          <div class="message-name">${escHtml(m.name || 'Unknown')}</div>
          <div class="message-meta">${escHtml(m.email || '')} ${m.phone ? '· ' + escHtml(m.phone) : ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          ${m.service ? `<span class="badge">${escHtml(m.service)}</span>` : ''}
          <span class="message-date">${new Date(m.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
        </div>
      </div>
      <div class="message-body">${escHtml(m.message || '')}</div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        ${m.phone ? `<a href="https://wa.me/91${m.phone.replace(/\D/g,'')}" target="_blank" class="admin-btn">💬 WhatsApp</a>` : ''}
        ${m.email ? `<a href="mailto:${escHtml(m.email)}" class="admin-btn">✉️ Email</a>` : ''}
      </div>
    </div>
  `).join('');
}

// ── MODAL OVERLAY ─────────────────────────────────────────────
function closeAllModals() {
  document.querySelectorAll('.admin-modal').forEach(m => m.classList.remove('open'));
  document.getElementById('modalOverlay').classList.remove('open');
  editingProduct = null;
  editingGallery = null;
}

// ── TOAST ─────────────────────────────────────────────────────
function adminToast(msg, isError = false) {
  const el = document.getElementById('adminToast');
  el.textContent = (isError ? '❌ ' : '✅ ') + msg;
  el.style.background = isError ? '#c0392b' : 'var(--accent)';
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
