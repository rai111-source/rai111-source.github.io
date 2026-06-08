/* LittleLayers.Co - Main Scripts */

document.addEventListener('DOMContentLoaded', () => {

    // Bug #16: use centralized escHtml from supabase.js (loads before this script)
    // instead of a local duplicate that could silently diverge.
    const escapeHtml = window.escHtml;

    // -- State --
    let cart = JSON.parse(localStorage.getItem('littleLayersCart')) || [];

    // -- Elements --
    const cartCountElements = document.querySelectorAll('#cart-count');
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartTotalPriceElement = document.getElementById('cart-total-price');
    const cartSummary = document.getElementById('cart-summary');
    const checkoutItemsContainer = document.getElementById('checkout-items');
    const checkoutTotalElement = document.getElementById('checkout-total');
    const checkoutForm = document.getElementById('checkout-form');
    const menuBtn = document.querySelector('.menu-btn');
    const navDrawer = document.getElementById('nav-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerClose = document.getElementById('drawer-close');

    // -- Theme Toggle --
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

    // -- Supabase Integration --
    const supabase = window.supabaseClient;
    let currentUser = null;

    // -- Initialization --
    initCartSync();
    initNavDrawer();

    const productsGrid = document.getElementById('productsGrid');
    let allProducts = [];

    if (productsGrid) {
        loadProducts('all');
    }

    // Bug #10 fix: previously both a DB error and an empty result fell through to the
    // same 'No products found' message. Now errors are thrown to the catch block and
    // shown as a distinct 'failed to load' message; empty results are handled separately.
    async function loadProducts(category) {
        productsGrid.innerHTML = '<div class="loadbox"><div class="spin"></div><p>Loading products…</p></div>';
        try {
            if (supabase) {
                let q = supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false });
                if (category && category !== 'all') q = q.eq('category', category);
                const { data, error } = await q;
                if (error) throw error; // surface DB errors to the catch block below
                if (data && data.length) {
                    allProducts = data;
                    renderProducts(data);
                    return;
                }
                // No error but empty — distinct message from an actual failure
                productsGrid.innerHTML = '<div class="loadbox">No products found in this category yet.</div>';
                return;
            }
        } catch (e) {
            console.error('loadProducts:', e);
            productsGrid.innerHTML = '<div class="loadbox">⚠️ Failed to load products. Please refresh the page.</div>';
            return;
        }
        productsGrid.innerHTML = '<div class="loadbox">No products found.</div>';
    }

    function renderProducts(list) {
        if (!list.length) {
            productsGrid.innerHTML = '<div class="loadbox">No products in this category yet.</div>';
            return;
        }
        productsGrid.innerHTML = list.map(p => `
        <div class="pcard">
          <div class="pimg">
            <img src="${p.image_url || ''}" alt="${escapeHtml(p.name)}" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=400&q=70'">
            ${p.badge ? `<div class="pbadge">${escapeHtml(p.badge)}</div>` : ''}
            <div class="pacts">
              <button class="icob dyn-add-to-cart" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-image="${p.image_url || ''}">🛒</button>
            </div>
          </div>
          <div class="pbody">
            <div class="pcat">${escapeHtml(p.category)}</div>
            <div class="pname">${escapeHtml(p.name)}</div>
            ${p.description ? `<div class="pdesc">${escapeHtml(p.description.slice(0, 60))}…</div>` : ''}
            <div class="pfoot">
              <div class="pprice">₹${Number(p.price).toLocaleString('en-IN')}${p.original_price ? `<span class="was">₹${Number(p.original_price).toLocaleString('en-IN')}</span>` : ''}</div>
              <button class="addbtn dyn-add-to-cart" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-image="${p.image_url || ''}">+</button>
            </div>
          </div>
        </div>`).join('');
        
        productsGrid.querySelectorAll('.pcard').forEach((el, i) => {
            el.style.cssText = 'opacity:0;transform:translateY(18px);transition:opacity .4s ease,transform .4s ease,border-color .3s,box-shadow .35s';
            setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)' }, i * 55 + 60);
        });

        // Attach event listeners to new buttons
        document.querySelectorAll('.dyn-add-to-cart').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const product = {
                    id: Number(button.dataset.id),
                    name: button.dataset.name,
                    price: parseFloat(button.dataset.price),
                    image: button.dataset.image,
                    quantity: 1
                };
                await addToCart(product);
                alert(`${product.name} added to cart!`);
            });
        });
    }

    window.filterP = function(category, btn) {
        document.querySelectorAll('.flt').forEach(b => b.classList.remove('on'));
        if (btn) btn.classList.add('on');
        loadProducts(category);
    };

    function initNavDrawer() {
        if (!menuBtn || !navDrawer || !drawerOverlay) return;

        const openDrawer = () => {
            navDrawer.classList.add('active');
            drawerOverlay.classList.add('active');
            document.body.classList.add('no-scroll');
        };

        const closeDrawer = () => {
            navDrawer.classList.remove('active');
            drawerOverlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
        };

        menuBtn.addEventListener('click', openDrawer);
        if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
        drawerOverlay.addEventListener('click', closeDrawer);

        // Close drawer when clicking a link (optional, good for single-page anchors)
        navDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeDrawer);
        });
    }

    async function initCartSync() {
        if (!supabase) {
            updateCartCount();
            if (cartItemsContainer) renderCart();
            if (checkoutItemsContainer) renderCheckout();
            return;
        }

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session ? session.user : null;

        if (currentUser) {
            await syncCartFromSupabase();
        } else {
            updateCartCount();
            if (cartItemsContainer) renderCart();
            if (checkoutItemsContainer) renderCheckout();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            const newUser = session ? session.user : null;

            if (event === 'SIGNED_IN' || (newUser && !currentUser)) {
                currentUser = newUser;
                await syncCartFromSupabase();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                cart = [];
                localStorage.removeItem('littleLayersCart');
                updateCartCount();
                if (cartItemsContainer) renderCart();
                if (checkoutItemsContainer) renderCheckout();
            }
        });
    }

    async function syncCartFromSupabase() {
        if (!currentUser) return;

        try {
            // 1. Fetch from Supabase
            const { data: dbItems, error } = await supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', currentUser.id);

            if (error) throw error;

            // 2. Merge local cart into database (if local cart has items)
            if (cart.length > 0) {
                const itemsToUpsert = cart.map(localItem => {
                    const dbItem = dbItems.find(i => i.product_id === localItem.id);
                    // Local quantity wins — it reflects the user's most recent in-session
                    // intent (they may have reduced or removed items while offline).
                    // Using Math.max would silently restore quantities the user deliberately changed.
                    const quantity = localItem.quantity;
                    return {
                        user_id: currentUser.id,
                        product_id: localItem.id,
                        product_name: localItem.name,
                        product_price: localItem.price,
                        product_image: localItem.image,
                        quantity: quantity,
                        updated_at: new Date()
                    };
                });

                // Batch upsert to avoid N+1 queries
                const { data: upsertedItems, error: upsertError } = await supabase
                    .from('cart_items')
                    .upsert(itemsToUpsert, { onConflict: 'user_id, product_id' })
                    .select();

                if (upsertError) throw upsertError;

                // Merge upserted items with DB items that weren't in local cart
                const localItemIds = new Set(cart.map(i => i.id));
                const otherDbItems = dbItems.filter(i => !localItemIds.has(i.product_id));

                cart = [...upsertedItems, ...otherDbItems].map(mapDbToLocal);
            } else {
                // If local cart is empty, just take DB items
                cart = dbItems.map(mapDbToLocal);
            }

            saveCartLocally();
            if (cartItemsContainer) renderCart();
            if (checkoutItemsContainer) renderCheckout();
        } catch (error) {
            console.error('Error syncing cart:', error.message);
        }
    }

    function mapDbToLocal(dbItem) {
        return {
            id: dbItem.product_id,
            name: dbItem.product_name,
            price: dbItem.product_price,
            image: dbItem.product_image,
            quantity: dbItem.quantity
        };
    }

    async function addDbItem(product) {
        if (!currentUser) return;
        const { error } = await supabase
            .from('cart_items')
            .upsert({
                user_id: currentUser.id,
                product_id: product.id,
                product_name: product.name,
                product_price: product.price,
                product_image: product.image,
                quantity: product.quantity,
                updated_at: new Date()
            }, { onConflict: 'user_id, product_id' });

        if (error) console.error('Error adding to DB:', error.message);
    }

    async function updateDbItem(productId, quantity) {
        if (!currentUser) return;
        const { error } = await supabase
            .from('cart_items')
            .update({ quantity: quantity, updated_at: new Date() })
            .eq('user_id', currentUser.id)
            .eq('product_id', productId);

        if (error) console.error('Error updating DB:', error.message);
    }

    async function removeDbItem(productId) {
        if (!currentUser) return;
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', productId);

        if (error) console.error('Error removing from DB:', error.message);
    }

    /* --- Event Listeners --- */

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        });
    });

    // Add to Cart
    addToCartButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const product = {
                id: Number(button.dataset.id),
                name: button.dataset.name,
                price: parseFloat(button.dataset.price),
                image: button.dataset.image,
                quantity: 1
            };
            await addToCart(product);
            alert(`${product.name} added to cart!`);
        });
    });

    // Checkout Form
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!cart || !cart.length) {
                alert('Your cart is empty.');
                return;
            }

            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'PLACING ORDER...';
            }

            const name = document.getElementById('name').value;
            const address = document.getElementById('address').value;
            const city = document.getElementById('city').value;
            const zip = document.getElementById('zip').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value || '';
            
            const paymentMethodInput = document.querySelector('input[name="payment_method"]:checked');
            const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'cod';

            const customer = { name, address, city, zip, phone, email, payment_method: paymentMethod };
            const order_ref = 'LL-' + Date.now();
            const total = cart.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);

            try {
                if (supabase) {
                    const { error: orderError } = await supabase
                        .from('orders')
                        .insert({
                            order_ref,
                            items: cart,
                            total,
                            status: 'pending',
                            customer
                        });
                    if (orderError) throw orderError;
                }

                // Ensure we have current session to avoid race conditions
                let user = currentUser;
                if (supabase && !user) {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        user = session ? session.user : null;
                    } catch (e) {
                        console.error('Error getting session:', e);
                    }
                }

                if (user && supabase) {
                    // Clear DB cart on checkout
                    const { error } = await supabase
                        .from('cart_items')
                        .delete()
                        .eq('user_id', user.id);
                    if (error) console.error('Error clearing DB cart:', error.message);
                }

                // Set cart to empty and save locally to update badge and storage
                cart = [];
                saveCartLocally();
                
                // Save order reference locally for tracking
                try {
                    let myOrders = JSON.parse(localStorage.getItem('littleLayersUserOrders') || '[]');
                    if (!myOrders.includes(order_ref)) {
                        myOrders.push(order_ref);
                        localStorage.setItem('littleLayersUserOrders', JSON.stringify(myOrders));
                    }
                } catch (ex) {
                    console.error('Error saving order ref to localStorage:', ex);
                }
                
                alert(`Order #${order_ref} placed successfully!`);
                window.location.href = `track.html?ref=${order_ref}`;
            } catch (err) {
                console.error('Error placing order:', err.message);
                alert('Error placing order: ' + err.message);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'PLACE ORDER';
                }
            }
        });
    }

    /* --- Cart Functions --- */
    
    const WA = '916000061991';
    
    async function orderViaWhatsApp() {
        if (!cart || !cart.length) {
            alert('Your cart is empty.');
            return;
        }
        const total = cart.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0);
        const ref = 'LL-' + Date.now();
        const msg = `🛒 *New Order — ${ref}*\n\n` + 
            cart.map(i => `• ${i.name} × ${i.quantity} = ₹${(Number(i.price) * i.quantity).toLocaleString('en-IN')}`).join('\n') + 
            `\n\n*Total: ₹${total.toLocaleString('en-IN')}*\n\nPlease share your delivery address.`;
        
        try {
            if (supabase) {
                const { error: orderError } = await supabase.from('orders').insert({ order_ref: ref, items: cart, total, status: 'pending' });
                if (orderError) throw orderError;
            }
        } catch (e) {
            console.error('Error inserting order for WhatsApp:', e);
            alert('Error placing order: ' + e.message);
            return; // Stop checkout if order placement fails
        }

        // Ensure we have current session to avoid race conditions
        let user = currentUser;
        if (supabase && !user) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                user = session ? session.user : null;
            } catch (e) {
                console.error('Error getting session:', e);
            }
        }

        if (user && supabase) {
            try {
                // Clear DB cart on checkout
                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', user.id);
                if (error) console.error('Error clearing DB cart:', error.message);
            } catch (e) {
                console.error(e);
            }
        }

        // Save order reference locally for tracking
        try {
            let myOrders = JSON.parse(localStorage.getItem('littleLayersUserOrders') || '[]');
            if (!myOrders.includes(ref)) {
                myOrders.push(ref);
                localStorage.setItem('littleLayersUserOrders', JSON.stringify(myOrders));
            }
        } catch (ex) {
            console.error('Error saving order ref to localStorage:', ex);
        }

        window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
        cart = [];
        saveCartLocally();
        if (cartItemsContainer) renderCart();
        alert(`Order #${ref} sent to WhatsApp! 🎉`);
    }

    // Hook up the WhatsApp checkout button on cart.html page
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    if (btnWhatsapp) {
        btnWhatsapp.addEventListener('click', async () => {
            await orderViaWhatsApp();
        });
    }

    async function addToCart(productToAdd) {
        const existingItemIndex = cart.findIndex(item => Number(item.id) === Number(productToAdd.id));

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += 1;
            if (currentUser) {
                await updateDbItem(Number(productToAdd.id), cart[existingItemIndex].quantity);
            }
        } else {
            productToAdd.id = Number(productToAdd.id);
            cart.push(productToAdd);
            if (currentUser) {
                await addDbItem(productToAdd);
            }
        }

        saveCartLocally();
        if (cartItemsContainer) renderCart();
        if (checkoutItemsContainer) renderCheckout();
    }

    async function removeFromCart(productId) {
        cart = cart.filter(item => Number(item.id) !== Number(productId));
        if (currentUser) {
            await removeDbItem(Number(productId));
        }
        saveCartLocally();
        renderCart();
    }

    async function updateQuantity(productId, newQuantity) {
        const itemIndex = cart.findIndex(item => Number(item.id) === Number(productId));
        if (itemIndex > -1) {
            if (newQuantity < 1) {
                await removeFromCart(Number(productId));
            } else {
                cart[itemIndex].quantity = parseInt(newQuantity);
                if (currentUser) {
                    await updateDbItem(Number(productId), cart[itemIndex].quantity);
                }
                saveCartLocally();
                renderCart();
            }
        }
    }

    function saveCartLocally() {
        localStorage.setItem('littleLayersCart', JSON.stringify(cart));
        updateCartCount();
    }

    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCountElements.forEach(el => el.textContent = totalItems);
        updateFloatingCart();
    }

    function updateFloatingCart() {
        let floatBtn = document.getElementById('cartFloatBtn');
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        
        if (totalItems > 0) {
            if (!floatBtn) {
                floatBtn = document.createElement('a');
                floatBtn.id = 'cartFloatBtn';
                floatBtn.className = 'cartfloat';
                floatBtn.href = 'cart.html';
                
                // Position above WhatsApp float button if it exists
                const waFloat = document.querySelector('.wafloat');
                if (waFloat) {
                    floatBtn.style.bottom = '96px';
                } else {
                    floatBtn.style.bottom = '28px';
                }
                
                floatBtn.innerHTML = `
                    <i class="ph ph-shopping-cart" style="font-size: 24px;"></i>
                    <div class="cartfloat-badge" id="cartFloatCount">0</div>
                `;
                document.body.appendChild(floatBtn);
                
                // Trigger reflow for transition
                floatBtn.getBoundingClientRect();
            }
            
            floatBtn.classList.add('show');
            const countEl = document.getElementById('cartFloatCount');
            if (countEl) countEl.textContent = totalItems;
        } else if (floatBtn) {
            floatBtn.classList.remove('show');
        }
    }


    function renderCart() {
        if (!cartItemsContainer) return; // guard: not on cart page
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }

        if (cartSummary) cartSummary.style.display = 'block';

        let html = `
            <table class="cart-table">
                <thead>
                    <tr>
                        <th style="padding-bottom: 20px; text-transform: uppercase; font-size: 13px; color: var(--color-text-main);">Product</th>
                        <th style="padding-bottom: 20px; text-transform: uppercase; font-size: 13px; color: var(--color-text-main);">Price</th>
                        <th style="padding-bottom: 20px; text-transform: uppercase; font-size: 13px; color: var(--color-text-main);">Quantity</th>
                        <th style="padding-bottom: 20px; text-transform: uppercase; font-size: 13px; color: var(--color-text-main);">Total</th>
                        <th style="padding-bottom: 20px; text-transform: uppercase; font-size: 13px; color: var(--color-text-main);">Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cart.forEach(item => {
            const escapedImage = escapeHtml(item.image);
            const escapedName = escapeHtml(item.name);
            const escapedId = escapeHtml(item.id);
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 0;

            html += `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: 20px 0;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="${escapedImage}" alt="${escapedName}" class="cart-item-image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
                            <span style="font-weight: 500; font-size: 15px;">${escapedName}</span>
                        </div>
                    </td>
                    <td style="padding: 20px 0; font-size: 14px; color: var(--color-text-muted); text-align: center;">₹${price}</td>
                    <td style="padding: 20px 0; text-align: center;">
                        <input type="number" class="cart-quantity-input" min="1" value="${quantity}" data-id="${escapedId}" style="width: 60px; padding: 10px; border: 1px solid var(--color-border); border-radius: 4px; font-family: inherit; font-size: 14px; outline: none; text-align: center;">
                    </td>
                    <td style="padding: 20px 0; font-weight: 500; text-align: center;">₹${price * quantity}</td>
                    <td style="padding: 20px 0; text-align: right;">
                        <button class="btn-remove" data-id="${escapedId}" style="color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Remove</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        cartItemsContainer.innerHTML = html;
        if (cartTotalPriceElement) {
            cartTotalPriceElement.textContent = `₹${window.getCartTotal(cart)}`;
        }

        // Attach event listeners to new elements
        document.querySelectorAll('.cart-quantity-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                await updateQuantity(e.target.dataset.id, e.target.value);
            });
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await removeFromCart(e.target.dataset.id);
            });
        });
    }

    function renderCheckout() {
        if (cart.length === 0) {
            checkoutItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            return;
        }

        let html = '';
        cart.forEach(item => {
            const escapedName = escapeHtml(item.name);
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 0;

            html += `
                <div class="summary-item">
                    <span>${escapedName} x ${quantity}</span>
                    <span>₹${price * quantity}</span>
                </div>
            `;
        });

        checkoutItemsContainer.innerHTML = html;
        if (checkoutTotalElement) {
            checkoutTotalElement.textContent = `₹${window.getCartTotal(cart)}`;
        }
    }

});

window.getCartTotal = function(cartArray) {
    if (!cartArray || !Array.isArray(cartArray)) return 0;
    return cartArray.reduce((total, item) => total + (item.price * item.quantity), 0);
};

window.toggleMob = function() {
    const mobnav = document.getElementById('mobnav');
    if (mobnav) mobnav.classList.toggle('open');
};

window.closeMob = function() {
    const mobnav = document.getElementById('mobnav');
    if (mobnav) mobnav.classList.remove('open');
};
