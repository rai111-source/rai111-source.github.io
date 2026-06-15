// js/product.js - Product Details Page Logic

(function () {
  let supabase = null;
  let productId = null;
  let currentProduct = null;
  let currentUser = null;
  let selectedColor = 'White';
  let selectedRating = 5;

  const esc = window.escHtml || function(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Initialize Supabase Client
  let attempts = 0;
  const initInterval = setInterval(() => {
    attempts++;
    if (window.supabaseClient) {
      clearInterval(initInterval);
      supabase = window.supabaseClient;
      initPage();
    } else if (attempts >= 50) {
      clearInterval(initInterval);
      console.warn('Supabase client failed to initialize after 50 attempts.');
    }
  }, 100);

  async function initPage() {
    // Read query parameters
    const params = new URLSearchParams(window.location.search);
    productId = parseInt(params.get('id'));

    if (!productId || isNaN(productId)) {
      showErrorState();
      return;
    }

    // Check user auth state
    try {
      const { data: { session } } = await supabase.auth.getSession();
      currentUser = session ? session.user : null;
      if (currentUser && document.getElementById('review-user-name')) {
        // Pre-fill user name in review form if logged in
        fetchProfileName(currentUser.id);
      }
    } catch (e) {
      console.error('Error checking user session in product.js:', e);
    }

    // Load page data
    await loadProductDetails();
  }

  async function fetchProfileName(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();
      if (!error && data && data.name) {
        document.getElementById('review-user-name').value = data.name;
      }
    } catch (err) {
      console.error('Error prefilling name:', err);
    }
  }

  async function loadProductDetails() {
    const loading = document.getElementById('product-loading');
    const details = document.getElementById('product-details');

    try {
      // Fetch product details
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('active', true)
        .single();

      if (error || !product) {
        showErrorState();
        return;
      }

      currentProduct = product;

      // Update HTML metadata title
      document.title = `${product.name} | LittleLayers.Co`;

      // Render details
      document.getElementById('product-title').textContent = product.name;
      document.getElementById('product-description').textContent = product.description || 'Custom 3D printed model designed with high accuracy and precision.';
      document.getElementById('product-price').textContent = `₹${Number(product.price).toLocaleString('en-IN')}`;
      
      const wasPrice = document.getElementById('product-was-price');
      const discount = document.getElementById('product-discount');
      if (product.original_price && Number(product.original_price) > Number(product.price)) {
        wasPrice.textContent = `₹${Number(product.original_price).toLocaleString('en-IN')}`;
        wasPrice.style.display = 'inline';
        
        // Calculate discount percentage
        const discPct = Math.round(((Number(product.original_price) - Number(product.price)) / Number(product.original_price)) * 100);
        discount.textContent = `${discPct}% OFF`;
        discount.style.display = 'inline';
      } else {
        wasPrice.style.display = 'none';
        discount.style.display = 'none';
      }

      // Badge
      const badge = document.getElementById('product-badge');
      if (product.badge) {
        badge.textContent = product.badge.toUpperCase();
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }

      // Spec mapping based on category and specifications JSONB
      const specs = product.specifications || {};
      document.getElementById('spec-material').textContent = specs.material || 
        (product.category === 'figurines' ? 'SLA Resin (Ultra-fine details)' : 'PLA / PETG (Eco-friendly filament)');
      if (document.getElementById('spec-resolution')) {
        document.getElementById('spec-resolution').textContent = specs.resolution || '0.12mm - 0.2mm (Highly precise)';
      }
      if (document.getElementById('spec-infill')) {
        document.getElementById('spec-infill').textContent = specs.infill || '15% - 20% (Optimized for weight & strength)';
      }
      if (document.getElementById('spec-origin')) {
        document.getElementById('spec-origin').textContent = specs.origin || 'Made in Assam, India';
      }

      // Setup Image Gallery
      setupGallery(product.image_url, product.images);

      // Setup Color Selector
      setupColorSelector(product.colors);

      // Setup Quantity Controls
      setupQuantitySelector();

      // Setup CTA Event Handlers
      setupCtaButtons();

      // Setup Tab Controls
      setupTabControls();

      // Load Related Reviews & Suggested Products
      await Promise.all([
        loadProductReviews(),
        loadSuggestedProducts(product.category)
      ]);

      // Show layout
      loading.style.display = 'none';
      details.style.display = 'block';

    } catch (err) {
      console.error('Error loading product details page:', err);
      showErrorState();
    }
  }

  function setupGallery(mainImgUrl, additionalImages = []) {
    const mainImg = document.getElementById('main-product-img');
    const fallbackUrl = 'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=800';
    mainImg.src = mainImgUrl || fallbackUrl;
    mainImg.onerror = () => { mainImg.src = fallbackUrl; };

    // Setup thumbs — only show the actual uploaded image(s)
    let thumbs = [];
    if (additionalImages && additionalImages.length > 0) {
      thumbs = [
        { url: mainImgUrl || fallbackUrl, label: 'Main View' },
        ...additionalImages.map((url, idx) => ({ url, label: `View ${idx + 2}` }))
      ];
    } else {
      // Only show the real product image — no dummy placeholders
      thumbs = [
        { url: mainImgUrl || fallbackUrl, label: 'Main View' }
      ];
    }

    const thumbsContainer = document.getElementById('product-thumbnails');
    thumbsContainer.innerHTML = thumbs.map((t, idx) => `
      <div class="p-thumb ${idx === 0 ? 'active' : ''}" data-url="${t.url}">
        <img src="${t.url}" alt="${t.label}" onerror="this.src='${fallbackUrl}'">
      </div>
    `).join('');

    // Add click listener to thumbnails
    thumbsContainer.querySelectorAll('.p-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbsContainer.querySelectorAll('.p-thumb').forEach(el => el.classList.remove('active'));
        thumb.classList.add('active');
        mainImg.src = thumb.dataset.url;
      });
    });
  }

  function setupColorSelector(colors = []) {
    const dotsContainer = document.getElementById('color-dots-container');
    if (!dotsContainer) return;

    let colorList = colors;
    if (!colorList || colorList.length === 0) {
      colorList = [
        { name: 'White', hex: '#ffffff' },
        { name: 'Grey', hex: '#555555' },
        { name: 'Black', hex: '#111111' },
        { name: 'Gold', hex: '#ffd700' }
      ];
    }

    dotsContainer.innerHTML = colorList.map((c, idx) => `
      <div class="color-dot ${idx === 0 ? 'active' : ''}" 
           style="background: ${c.hex}; ${c.hex.toLowerCase() === '#ffffff' ? 'border: 1px solid var(--line);' : ''}" 
           data-color="${c.name}" 
           title="${c.name}"></div>
    `).join('');

    selectedColor = colorList[0].name;

    dotsContainer.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        dotsContainer.querySelectorAll('.color-dot').forEach(el => el.classList.remove('active'));
        dot.classList.add('active');
        selectedColor = dot.dataset.color;
      });
    });
  }

  function setupQuantitySelector() {
    const qtyInput = document.getElementById('qty-input');
    const minusBtn = document.getElementById('qty-minus');
    const plusBtn = document.getElementById('qty-plus');

    if (!qtyInput || !minusBtn || !plusBtn) return;

    minusBtn.addEventListener('click', () => {
      let qty = parseInt(qtyInput.value) || 1;
      if (qty > 1) {
        qtyInput.value = qty - 1;
      }
    });

    plusBtn.addEventListener('click', () => {
      let qty = parseInt(qtyInput.value) || 1;
      qtyInput.value = qty + 1;
    });
  }

  function setupCtaButtons() {
    const addCartBtn = document.getElementById('btn-add-cart');
    const buyNowBtn = document.getElementById('btn-buy-now');

    if (addCartBtn) {
      addCartBtn.addEventListener('click', async () => {
        const qty = parseInt(document.getElementById('qty-input').value) || 1;
        await addProductToCart(qty);
        showLocalNotification(`${currentProduct.name} (${selectedColor}) added to cart! 🛒`);
      });
    }

    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', async () => {
        const qty = parseInt(document.getElementById('qty-input').value) || 1;
        await addProductToCart(qty);
        window.location.href = 'checkout.html';
      });
    }
  }

  async function addProductToCart(quantity) {
    if (!currentProduct) return;

    const cartItem = {
      id: Number(currentProduct.id),
      name: `${currentProduct.name} - ${selectedColor}`,
      price: parseFloat(currentProduct.price),
      image: currentProduct.image_url,
      quantity: quantity
    };

    let cart = window.CartManager.getCart();
    const existingIndex = cart.findIndex(item => Number(item.id) === Number(cartItem.id) && item.name === cartItem.name);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    window.CartManager.saveCart(cart);
    updateCartBadgeCount(cart);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session ? session.user : null;

      if (user) {
        const targetQty = existingIndex > -1 ? cart[existingIndex].quantity : quantity;
        await window.CartManager.addDbItem(user.id, {
          id: cartItem.id,
          name: cartItem.name,
          price: cartItem.price,
          image: cartItem.image,
          quantity: targetQty
        });
      }
    } catch (err) {
      console.error('Error syncing cart addition to DB:', err);
    }
  }

  function updateCartBadgeCount(cartArray) {
    const totalCount = window.CartManager.getCartCount(cartArray);
    const countBadge = document.getElementById('cart-count');
    if (countBadge) countBadge.textContent = totalCount;
  }

  function setupTabControls() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        document.getElementById(`tab-${targetTab}`).classList.add('active');
      });
    });

    // Rating star selection behavior
    const starSelectBtns = document.querySelectorAll('.star-select-btn');
    const ratingInput = document.getElementById('review-rating-value');
    
    starSelectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        selectedRating = rating;
        ratingInput.value = rating;

        starSelectBtns.forEach(el => {
          const rVal = parseInt(el.dataset.rating);
          el.classList.toggle('active', rVal <= rating);
        });
      });
    });

    // Handle review form submission
    const reviewForm = document.getElementById('add-review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', handleReviewSubmit);
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const userName = document.getElementById('review-user-name').value.trim();
    const comment = document.getElementById('review-comment').value.trim();

    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert([{
          product_id: productId,
          user_name: userName,
          rating: selectedRating,
          comment: comment
        }]);

      if (error) throw error;

      showLocalNotification('Review submitted successfully! Thank you ❤️');
      reviewForm.reset();

      // Reset rating selection to 5 stars
      selectedRating = 5;
      document.getElementById('review-rating-value').value = 5;
      document.querySelectorAll('.star-select-btn').forEach(el => el.classList.add('active'));

      // Reload reviews
      await loadProductReviews();

    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Review';
    }
  }

  async function loadProductReviews() {
    const listEl = document.getElementById('reviews-list');
    const badgeEl = document.getElementById('reviews-count-badge');
    const avgNumEl = document.getElementById('avg-rating-value');
    const avgStarsEl = document.getElementById('avg-rating-stars');
    const totalCountEl = document.getElementById('total-ratings-count');
    const headerStars = document.getElementById('product-stars-avg');
    const headerRatingText = document.getElementById('product-rating-text');

    if (!listEl) return;

    listEl.innerHTML = '<div style="color: var(--gray4); font-size: 13.5px; padding: 20px 0;">Loading reviews...</div>';

    try {
      const { data: reviews, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      badgeEl.textContent = reviews ? reviews.length : 0;

      if (!reviews || !reviews.length) {
        listEl.innerHTML = '<div style="color: var(--gray4); font-size: 13.5px; padding: 20px 0;">No reviews yet. Be the first to write a review!</div>';
        avgNumEl.textContent = '0.0';
        avgStarsEl.textContent = getStarString(0);
        totalCountEl.textContent = 'Based on 0 reviews';
        headerStars.textContent = getStarString(0);
        headerRatingText.textContent = 'No reviews yet';
        return;
      }

      // Calculate Average Rating
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = (sum / reviews.length).toFixed(1);

      avgNumEl.textContent = avg;
      avgStarsEl.textContent = getStarString(avg);
      totalCountEl.textContent = `Based on ${reviews.length} review${reviews.length > 1 ? 's' : ''}`;

      headerStars.textContent = getStarString(avg);
      headerRatingText.textContent = `${avg} (${reviews.length} Review${reviews.length > 1 ? 's' : ''})`;

      // Render Reviews List
      listEl.innerHTML = reviews.map(r => {
        const stars = getStarString(r.rating);
        const dateStr = new Date(r.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const escName = esc(r.user_name);
        const escComment = esc(r.comment);

        return `
          <div class="review-item">
            <div class="review-header">
              <div>
                <span class="review-user">${escName}</span>
                <span style="margin-left: 10px; font-size: 13px; color: #FFB020;">${stars}</span>
              </div>
              <span class="review-date">${dateStr}</span>
            </div>
            <p class="review-comment">${escComment}</p>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('Error loading reviews:', err);
      listEl.innerHTML = '<div style="color: #ff6b6b; font-size: 13.5px; padding: 20px 0;">Failed to load customer reviews.</div>';
    }
  }

  function getStarString(rating) {
    const val = Math.round(parseFloat(rating));
    return '★'.repeat(val) + '☆'.repeat(5 - val);
  }

  async function loadSuggestedProducts(category) {
    const grid = document.getElementById('suggestedProductsGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loadbox"><div class="spin"></div><p>Loading suggestions...</p></div>';

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .neq('id', productId)
        .limit(4);

      if (error) throw error;

      if (!products || !products.length) {
        // Fallback: load any other 4 products
        const { data: fallbackProducts } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .neq('id', productId)
          .limit(4);

        renderSuggestionsList(fallbackProducts || []);
      } else {
        renderSuggestionsList(products);
      }

    } catch (err) {
      console.error('Error loading suggestions:', err);
      grid.innerHTML = '<div style="color: var(--gray4); font-size: 14px; padding: 20px 0;">No suggestions available.</div>';
    }
  }

  function renderSuggestionsList(list) {
    const grid = document.getElementById('suggestedProductsGrid');
    if (!list.length) {
      grid.innerHTML = '<div style="color: var(--gray4); font-size: 14px; padding: 20px 0;">No suggestions available.</div>';
      return;
    }



    grid.innerHTML = list.map(p => `
      <div class="pcard" onclick="if(!event.target.closest('button')){ window.location.href='product.html?id=${p.id}'; }">
        <div class="pimg">
          <img src="${p.image_url || ''}" alt="${esc(p.name)}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=400&q=70'">
          ${p.badge ? `<div class="pbadge">${esc(p.badge)}</div>` : ''}
          <div class="pacts">
            <button class="icob dyn-add-to-cart-suggested" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}" data-image="${p.image_url || ''}">🛒</button>
          </div>
        </div>
        <div class="pbody">
          <div class="pcat">${esc(p.category)}</div>
          <div class="pname">${esc(p.name)}</div>
          ${p.description ? `<div class="pdesc">${esc(p.description.slice(0, 60))}…</div>` : ''}
          <div class="pfoot">
            <div class="pprice">₹${Number(p.price).toLocaleString('en-IN')}${p.original_price ? `<span class="was">₹${Number(p.original_price).toLocaleString('en-IN')}</span>` : ''}</div>
            <button class="addbtn dyn-add-to-cart-suggested" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}" data-image="${p.image_url || ''}">+</button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach cart listener to suggestion buttons
    grid.querySelectorAll('.dyn-add-to-cart-suggested').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const p = {
          id: Number(button.dataset.id),
          name: button.dataset.name,
          price: parseFloat(button.dataset.price),
          image: button.dataset.image,
          quantity: 1
        };

        // Load current cart from localStorage
        let cart = window.CartManager.getCart();
        const existingIndex = cart.findIndex(item => Number(item.id) === Number(p.id) && item.name === p.name);

        if (existingIndex > -1) {
          cart[existingIndex].quantity += 1;
        } else {
          cart.push(p);
        }

        window.CartManager.saveCart(cart);
        updateCartBadgeCount(cart);

        // Database Sync
        if (currentUser) {
          const targetQty = existingIndex > -1 ? cart[existingIndex].quantity : 1;
          await window.CartManager.addDbItem(currentUser.id, {
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            quantity: targetQty
          });
        }

        showLocalNotification(`${p.name} added to cart! 🛒`);
      });
    });
  }

  function showErrorState() {
    document.getElementById('product-loading').style.display = 'none';
    document.getElementById('product-details').style.display = 'none';
    document.getElementById('product-error').style.display = 'block';
  }

  function showLocalNotification(msg) {
    const el = document.getElementById('notif');
    if (el) {
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(window._notifTimer);
      window._notifTimer = setTimeout(() => el.classList.remove('show'), 3000);
    } else {
      // Fallback
      alert(msg);
    }
  }

})();
