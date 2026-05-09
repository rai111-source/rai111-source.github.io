    const WA = '91XXXXXXXXXX';

    const SAMPLES = [
      { id: 1, name: 'Goku Figurine', category: 'figurines', price: 599, original_price: 799, description: 'Custom SLA resin, 15cm tall.', badge: 'Popular', image_url: 'Images/Goku.jpeg' },
      { id: 2, name: 'Lithophane Keychain', category: 'keychains', price: 149, original_price: null, description: 'Your photo in glowing PLA.', badge: 'Bestseller', image_url: 'Images/Zubeen.jpeg' },
      { id: 3, name: 'Custom Room Décor', category: 'decor', price: 60, original_price: null, description: 'Nameplates, wall art, organizers.', badge: 'New', image_url: 'Images/Decor.jpeg' },
      { id: 4, name: 'Lithophane Portrait', category: 'portraits', price: 149, original_price: null, description: 'Turn photos into glowing 3D art.', badge: null, image_url: 'Images/LITHOPHANE.jpeg' },
      { id: 5, name: 'Dragon Figurine', category: 'figurines', price: 799, original_price: 999, description: 'Detailed dragon in SLA resin.', badge: 'Premium', image_url: 'Images/Dragon.jpeg' },
      { id: 6, name: 'Name Keychain', category: 'keychains', price: 99, original_price: null, description: 'Custom name or word in PLA.', badge: null, image_url: 'Images/Keychain.jpeg' },
      { id: 7, name: 'Custom Gift Box Set', category: 'gifts', price: 399, original_price: null, description: 'Keychain + portrait + figurine.', badge: 'Gift', image_url: 'Images/Gift.jpeg' },
      { id: 8, name: 'Wall Art Plaque', category: 'decor', price: 249, original_price: null, description: 'Geometric typographic wall art.', badge: null, image_url: 'Images/Wall-art.jpeg' },
    ];

    let cart = JSON.parse(localStorage.getItem('ll_cart') || '[]');
    let allP = [];
    let currentUser = null;

    document.addEventListener('DOMContentLoaded', () => {
      updateCart(); loadP('all'); initReveal();
      if (typeof sb !== 'undefined') {
        sb.auth.getSession().then(({ data }) => {
          if (data && data.session) currentUser = data.session.user;
          updateAuthUI();
        });
        sb.auth.onAuthStateChange((event, session) => {
          currentUser = session ? session.user : null;
          updateAuthUI();
        });
      }
    });

    function updateAuthUI() {
      const isLog = !!currentUser;
      const navLoginBtn = document.getElementById('navLoginBtn');
      const navSignupBtn = document.getElementById('navSignupBtn');
      const navLogoutBtn = document.getElementById('navLogoutBtn');
      const navProfileBtn = document.getElementById('navProfileBtn');

      const mobLoginBtn = document.getElementById('mobLoginBtn');
      const mobSignupBtn = document.getElementById('mobSignupBtn');
      const mobLogoutBtn = document.getElementById('mobLogoutBtn');
      const mobProfileBtn = document.getElementById('mobProfileBtn');

      if (navLoginBtn) navLoginBtn.style.display = isLog ? 'none' : 'inline-block';
      if (navSignupBtn) navSignupBtn.style.display = isLog ? 'none' : 'inline-block';
      if (navLogoutBtn) navLogoutBtn.style.display = isLog ? 'inline-block' : 'none';
      if (navProfileBtn) navProfileBtn.style.display = isLog ? 'inline-block' : 'none';

      if (mobLoginBtn) mobLoginBtn.style.display = isLog ? 'none' : 'block';
      if (mobSignupBtn) mobSignupBtn.style.display = isLog ? 'none' : 'block';
      if (mobLogoutBtn) mobLogoutBtn.style.display = isLog ? 'block' : 'none';
      if (mobProfileBtn) mobProfileBtn.style.display = isLog ? 'block' : 'none';
    }

    async function loadP(cat) {
      const g = document.getElementById('productsGrid');
      g.innerHTML = '<div class="loadbox"><div class="spin"></div><p>Loading products…</p></div>';
      try {
        if (typeof sb !== 'undefined') {
          let q = sb.from('products').select('*').eq('active', true).order('created_at', { ascending: false });
          if (cat && cat !== 'all') q = q.eq('category', cat);
          const { data, error } = await q;
          if (!error && data && data.length) { allP = data; renderP(data); return; }
        }
      } catch (e) { }
      allP = cat === 'all' ? SAMPLES : SAMPLES.filter(p => p.category === cat);
      renderP(allP);
    }

    function renderP(list) {
      const g = document.getElementById('productsGrid');
      if (!list.length) { g.innerHTML = '<div class="loadbox">No products in this category yet.</div>'; return; }
      g.innerHTML = list.map(p => `
    <div class="pcard">
      <div class="pimg">
        <img src="${p.image_url || ''}" alt="${esc(p.name)}" loading="lazy"
             onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=400&q=70'">
        ${p.badge ? `<div class="pbadge">${esc(p.badge)}</div>` : ''}
        <div class="pacts">
          <button class="icob" onclick="addToCart(${p.id},event)">🛒</button>
          <button class="icob" onclick="showNotif('Added to wishlist ❤️')">♡</button>
        </div>
      </div>
      <div class="pbody">
        <div class="pcat">${esc(p.category)}</div>
        <div class="pname">${esc(p.name)}</div>
        ${p.description ? `<div class="pdesc">${esc(p.description.slice(0, 60))}…</div>` : ''}
        <div class="pfoot">
          <div class="pprice">₹${Number(p.price).toLocaleString('en-IN')}${p.original_price ? `<span class="was">₹${Number(p.original_price).toLocaleString('en-IN')}</span>` : ''}</div>
          <button class="addbtn" onclick="addToCart(${p.id},event)">+</button>
        </div>
      </div>
    </div>`).join('');
      g.querySelectorAll('.pcard').forEach((el, i) => {
        el.style.cssText = 'opacity:0;transform:translateY(18px);transition:opacity .4s ease,transform .4s ease,border-color .3s,box-shadow .35s';
        setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)' }, i * 55 + 60);
      });
    }

    function filterP(cat, btn) {
      document.querySelectorAll('.flt').forEach(b => b.classList.remove('on'));
      btn.classList.add('on'); loadP(cat);
    }

    function addToCart(id, e) {
      if (e) e.stopPropagation();
      const p = allP.find(x => x.id === id); if (!p) return;
      const ex = cart.find(i => i.id === id);
      if (ex) ex.qty++; else cart.push({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, qty: 1 });
      saveCart(); updateCart(); showNotif(`${p.name} added to cart! 🛒`);
    }
    function changeQty(id, d) {
      const item = cart.find(i => i.id === id); if (!item) return;
      item.qty += d; if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
      saveCart(); updateCart();
    }
    function saveCart() { localStorage.setItem('ll_cart', JSON.stringify(cart)); }
    function updateCart() {
      const count = cart.reduce((s, i) => s + i.qty, 0);
      document.getElementById('cartCount').textContent = count;
      const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
      const tv = document.getElementById('cartTotal'); if (tv) tv.textContent = '₹' + total.toLocaleString('en-IN');
      const body = document.getElementById('cartItems'); const foot = document.getElementById('cartFt'); if (!body) return;
      if (!cart.length) {
        body.innerHTML = '<div class="c-empty"><div class="ei">🛒</div><p>Your cart is empty.<br>Add something awesome!</p></div>';
        if (foot) foot.style.display = 'none';
      } else {
        if (foot) foot.style.display = 'block';
        body.innerHTML = cart.map(item => `
      <div class="citem">
        <img src="${item.image_url || ''}" alt="${esc(item.name)}" onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=100'">
        <div class="ci-info"><div class="ci-name">${esc(item.name)}</div><div class="ci-price">₹${(Number(item.price) * item.qty).toLocaleString('en-IN')}</div></div>
        <div class="qctl">
          <button class="qb" onclick="changeQty(${item.id},-1)">−</button>
          <span class="qn">${item.qty}</span>
          <button class="qb" onclick="changeQty(${item.id},1)">+</button>
        </div>
      </div>`).join('');
      }
    }
    function toggleCart() { document.getElementById('cartDr').classList.toggle('open'); document.getElementById('cartOv').classList.toggle('open'); }
    async function checkout() {
      if (!cart.length) return;
      const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);
      const ref = 'LL-' + Date.now();
      const msg = `🛒 *New Order — ${ref}*\n\n` + cart.map(i => `• ${i.name} × ${i.qty} = ₹${(Number(i.price) * i.qty).toLocaleString('en-IN')}`).join('\n') + `\n\n*Total: ₹${total.toLocaleString('en-IN')}*\n\nPlease share your delivery address.`;
      try { if (typeof sb !== 'undefined') await sb.from('orders').insert({ order_ref: ref, items: cart, total, status: 'pending' }); } catch (e) { }
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
      cart = []; saveCart(); updateCart(); toggleCart(); showNotif(`Order #${ref} sent! 🎉`);
    }

    async function trackOrder() {
      const val = document.getElementById('trackInput').value.trim().toUpperCase();
      if (!val) { showNotif('Please enter your Order ID'); return; }
      const res = document.getElementById('trackResult'), msg = document.getElementById('trackMsg'), tl = document.getElementById('trackTimeline');
      let order = null;
      try { if (typeof sb !== 'undefined') { const { data } = await sb.from('orders').select('*').eq('order_ref', val).single(); order = data; } } catch (e) { }
      if (!order) { msg.textContent = `Order "${val}" not found. Please check the ID or contact us.`; msg.style.color = 'var(--gray2)'; res.style.display = 'block'; tl.style.display = 'none'; return; }
      const ss = ['pending', 'confirmed', 'printing', 'dispatched', 'delivered'];
      const ll = { pending: { icon: '🕐', title: 'Order Placed', sub: 'We received your order' }, confirmed: { icon: '✓', title: 'Design Confirmed', sub: 'Sent to printer' }, printing: { icon: '🖨', title: 'Printing', sub: 'Est. 2 more days' }, dispatched: { icon: '📦', title: 'Dispatched', sub: 'Shipped via courier' }, delivered: { icon: '✓', title: 'Delivered', sub: 'Enjoy your print!' } };
      const ci = ss.indexOf(order.status); msg.textContent = ''; tl.style.display = 'flex';
      tl.innerHTML = ss.map((s, i) => { const done = i < ci, active = i === ci, l = ll[s]; return `<div class="tstep${done ? ' done' : ''}${active ? ' active' : ''}"><div class="tdot">${done ? '✓' : l.icon}</div><div><div class="tsl">${l.title}</div><div class="tss">${l.sub}</div></div></div>`; }).join('');
      res.style.display = 'block';
    }

    async function submitForm(e) {
      e.preventDefault(); const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      const d = { name: e.target.name.value, phone: e.target.phone.value, email: e.target.email.value, service: e.target.service.value, message: e.target.message.value };
      try { if (typeof sb !== 'undefined') await sb.from('messages').insert(d); } catch (ex) { }
      showNotif("Message sent! We'll reply within 24h ✉️"); e.target.reset();
      btn.disabled = false; btn.textContent = 'Send Message →';
    }

    function openAuth(m) { document.getElementById('authOv').classList.add('open'); document.getElementById('authBox').classList.add('open'); switchTab(m); }
    function closeAuth() { document.getElementById('authOv').classList.remove('open'); document.getElementById('authBox').classList.remove('open'); }
    function switchTab(t) {
      document.getElementById('loginForm').style.display = t === 'login' ? 'block' : 'none';
      document.getElementById('signupForm').style.display = t === 'signup' ? 'block' : 'none';
      document.getElementById('loginTab').classList.toggle('on', t === 'login');
      document.getElementById('signupTab').classList.toggle('on', t === 'signup');
    }
    async function handleAuth(m) {
      const errEl = document.getElementById('authError');
      errEl.style.display = 'none';
      errEl.textContent = '';

      try {
        if (m === 'login') {
          const email = document.getElementById('loginEmail').value;
          const password = document.getElementById('loginPassword').value;
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          closeAuth();
          showNotif('Logged in! 👋');
        } else {
          const email = document.getElementById('signupEmail').value;
          const password = document.getElementById('signupPassword').value;
          const firstName = document.getElementById('signupFirstName').value;
          const lastName = document.getElementById('signupLastName').value;
          const phone = document.getElementById('signupPhone').value;

          const { data, error } = await sb.auth.signUp({ email, password });
          if (error) throw error;

          if (data.user) {
            await sb.from('profiles').upsert({
              id: data.user.id,
              name: `${firstName} ${lastName}`.trim(),
              phone: phone
            });
          }
          closeAuth();
          showNotif('Welcome to LittleLayers 🎉');
        }
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
      }
    }

    async function handleLogout() {
      if (typeof sb !== 'undefined') {
        await sb.auth.signOut();
        showNotif('Logged out');
      }
    }

    function openLb(src, cap) { document.getElementById('lbImg').src = src; document.getElementById('lbCap').textContent = cap; document.getElementById('lbOv').classList.add('open'); document.getElementById('lb').classList.add('open'); }
    function closeLb() { document.getElementById('lbOv').classList.remove('open'); document.getElementById('lb').classList.remove('open'); }

    function toggleFaq(btn) {
      const a = btn.nextElementSibling, on = btn.classList.contains('on');
      document.querySelectorAll('.fq.on').forEach(q => { q.classList.remove('on'); q.nextElementSibling.classList.remove('on'); });
      if (!on) { btn.classList.add('on'); a.classList.add('on'); }
    }

    function toggleMob() { document.getElementById('mobnav').classList.toggle('open'); }
    function closeMob() { document.getElementById('mobnav').classList.remove('open'); }

    function initReveal() {
      const ob = new IntersectionObserver((en) => { en.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); ob.unobserve(e.target); } }); }, { threshold: .07, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.rev').forEach((el, i) => { el.style.transitionDelay = (i % 5) * 55 + 'ms'; ob.observe(el); });
    }

    function showNotif(msg) { const el = document.getElementById('notif'); el.textContent = msg; el.classList.add('show'); clearTimeout(window._nt); window._nt = setTimeout(() => el.classList.remove('show'), 3000); }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
