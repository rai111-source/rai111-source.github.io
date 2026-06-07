    const WA = '916000061991';

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

    document.addEventListener('DOMContentLoaded', () => { 
      updateCart(); 
      loadP('all'); 
      loadSiteContent();
      initReveal(); 
      initThemeToggle();
      initGalleryBg();
    });

    function initThemeToggle() {
      const themeToggle = document.getElementById('theme-toggle');
      const themeIcon = document.getElementById('theme-icon');
      if (themeToggle && themeIcon) {
          const updateIcon = (isLight) => {
              if (isLight) {
                  themeIcon.className = 'ph ph-moon';
              } else {
                  themeIcon.className = 'ph ph-sun';
              }
          };

          // Set initial icon
          updateIcon(document.documentElement.classList.contains('light-theme'));

          themeToggle.addEventListener('click', () => {
              const isLight = document.documentElement.classList.toggle('light-theme');
              localStorage.setItem('theme', isLight ? 'light' : 'dark');
              updateIcon(isLight);
          });
      }
    }

    async function loadP(cat) {
      const g = document.getElementById('productsGrid');
      g.innerHTML = '<div class="loadbox"><div class="spin"></div><p>Loading products…</p></div>';
      try {
        if (typeof sb !== 'undefined') {
          let q = sb.from('products').select('*').eq('active', true).order('created_at', { ascending: false });
          if (cat && cat !== 'all') q = q.eq('category', cat);
          const { data, error } = await q;
          if (!error && data && data.length) { allP = data.slice(0, 4); renderP(allP); return; }
        }
      } catch (e) { console.error(e); }
      allP = (cat === 'all' ? SAMPLES : SAMPLES.filter(p => p.category === cat)).slice(0, 4);
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
      try { if (typeof sb !== 'undefined') await sb.from('orders').insert({ order_ref: ref, items: cart, total, status: 'pending' }); } catch (e) { console.error(e); }
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
      cart = []; saveCart(); updateCart(); toggleCart(); showNotif(`Order #${ref} sent! 🎉`);
    }


    async function submitForm(e) {
      e.preventDefault(); const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      const d = { name: e.target.name.value, phone: e.target.phone.value, email: e.target.email.value, service: e.target.service.value, message: e.target.message.value };
      try { if (typeof sb !== 'undefined') await sb.from('messages').insert(d); } catch (ex) { console.error(ex); }
      showNotif("Message sent! We'll reply within 24h ✉️"); e.target.reset();
      btn.disabled = false; btn.textContent = 'Send Message →';
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

    async function loadSiteContent() {
      try {
        if (typeof sb !== 'undefined') {
          const { data, error } = await sb.from('site_content').select('*');
          if (!error && data && data.length) {
            data.forEach(item => {
              if (item.key === 'hero') renderHero(item.content);
              if (item.key === 'process') renderProcess(item.content);
              if (item.key === 'about') renderAbout(item.content);
            });
            initReveal();
          }
        }
      } catch (e) { console.error('Error loading site content:', e); }
    }

    function renderHero(content) {
      const titleEl = document.getElementById('hero-title-el');
      const subEl = document.getElementById('hero-sub-el');
      const statsEl = document.getElementById('hero-stats-el');
      const visEl = document.getElementById('hero-vis-el');

      if (titleEl && content.title) {
        let titleText = content.title.replace(/\\n/g, '\n');
        const hasMarkdownItalic = /[\*_][^*_]+[\*_]/.test(titleText);
        const hasHtmlItalic = /<span class="italic">|<em\b/.test(titleText);
        
        if (hasMarkdownItalic) {
          titleText = titleText.replace(/[\*_]([^*_]+)[\*_]/g, '<span class="italic">$1</span>');
        }
        
        const lines = titleText.split('\n');
        if (lines.length === 3 && !hasMarkdownItalic && !hasHtmlItalic) {
          titleEl.innerHTML = `${lines[0]}<br><span class="italic">${lines[1]}</span><br>${lines[2]}`;
        } else {
          titleEl.innerHTML = lines.join('<br>');
        }
      }
      if (subEl && content.sub) {
        subEl.textContent = content.sub;
      }
      if (statsEl && content.stats) {
        statsEl.innerHTML = content.stats.map(s => `
          <div class="hstat">
            <div class="hstat-v">${esc(s.value)}</div>
            <div class="hstat-l">${esc(s.label)}</div>
          </div>
        `).join('');
      }
      if (visEl && content.visuals) {
        visEl.innerHTML = content.visuals.map(v => `
          <div class="hvc">
            <img src="${v.image_url || ''}" alt="${esc(v.label)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=100'">
            <div class="hvc-lbl">${esc(v.label)}</div>
            <div class="hvc-price">${esc(v.price)}</div>
          </div>
        `).join('');
      }
    }

    function renderProcess(content) {
      const subEl = document.getElementById('process-sub-el');
      const stepsEl = document.getElementById('process-steps-el');

      if (subEl && content.sub) {
        subEl.textContent = content.sub;
      }
      if (stepsEl && content.steps) {
        stepsEl.innerHTML = content.steps.map(s => {
          const isUrl = /^(https?:\/\/|\/|data:image\/)/.test(s.icon) || /\.(jpeg|jpg|gif|png|svg|webp|ico)(\?.*)?$/i.test(s.icon);
          const iconHtml = isUrl ? `<img src="${s.icon}" alt="${esc(s.title)}" onerror="this.style.display='none'">` : esc(s.icon);
          return `
            <div class="step">
              <div class="step-n">${esc(s.step)}</div>
              <div class="step-ico">${iconHtml}</div>
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.description)}</p>
            </div>
          `;
        }).join('');
      }
    }

    function renderAbout(content) {
      const titleEl = document.getElementById('about-title-el');
      const textEl = document.getElementById('about-text-el');
      const cardsEl = document.getElementById('about-cards-el');

      if (titleEl && content.title) {
        titleEl.innerHTML = content.title.replace(/\n/g, '<br>').replace(/\\n/g, '<br>');
      }
      if (textEl && content.paragraphs) {
        textEl.innerHTML = content.paragraphs.map(p => `
          <p style="font-size:15.5px;color:var(--gray3);line-height:1.8;margin-bottom:16px">${esc(p)}</p>
        `).join('');
      }
      if (cardsEl && content.cards) {
        cardsEl.innerHTML = content.cards.map((c, i) => {
          let extraClass = '';
          if (i === 2) extraClass = ' s2';
          return `
            <div class="ac${extraClass}">
              <div class="acv">${esc(c.value)}</div>
              <div class="acl">${esc(c.label)}</div>
              <div class="acs">${esc(c.description)}</div>
            </div>
          `;
        }).join('');
      }
    }

    async function initGalleryBg() {
      const container = document.getElementById('gallery-bg-container');
      if (!container) return;
      
      let images = [];
      try {
        if (typeof sb !== 'undefined') {
          const { data, error } = await sb.from('gallery').select('image_url');
          if (!error && data && data.length) {
            images = data.map(item => item.image_url).filter(Boolean);
          }
        }
      } catch (e) {
        console.error('Error fetching gallery for bg:', e);
      }
      
      if (!images.length) {
        images = [
          'Images/Goku.jpeg',
          'Images/Zubeen.jpeg',
          'Images/Decor.jpeg',
          'Images/LITHOPHANE.jpeg',
          'Images/Dragon.jpeg',
          'Images/Keychain.jpeg',
          'Images/Gift.jpeg',
          'Images/Wall-art.jpeg'
        ];
      }
      
      const positions = [
        { left: '4%', top: '8%', anim: 'anim-fade' },
        { left: '16%', top: '55%', anim: 'anim-zoom' },
        { left: '8%', top: '32%', anim: 'anim-pop' },
        { left: '22%', top: '75%', anim: 'anim-fade' },
        { right: '4%', top: '12%', anim: 'anim-zoom' },
        { right: '18%', top: '48%', anim: 'anim-pop' },
        { right: '8%', top: '72%', anim: 'anim-fade' },
        { right: '22%', top: '28%', anim: 'anim-zoom' }
      ];
      
      const shuffledImages = [...images].sort(() => 0.5 - Math.random());
      
      positions.forEach((pos, idx) => {
        const imgUrl = shuffledImages[idx % shuffledImages.length];
        const imgEl = document.createElement('img');
        imgEl.className = `bg-anim-img ${pos.anim}`;
        imgEl.src = imgUrl;
        
        if (pos.left) imgEl.style.left = pos.left;
        if (pos.right) imgEl.style.right = pos.right;
        imgEl.style.top = pos.top;
        
        const delay = (idx * 1.8) + (Math.random() * 1.5);
        imgEl.style.animationDelay = `${delay}s`;
        
        const baseDuration = pos.anim === 'anim-fade' ? 12 : (pos.anim === 'anim-zoom' ? 15 : 10);
        const duration = baseDuration + (Math.random() * 3 - 1.5);
        imgEl.style.animationDuration = `${duration}s`;
        
        container.appendChild(imgEl);
      });
    }

