/* LittleLayers.Co - Main Scripts */

document.addEventListener('DOMContentLoaded', () => {

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

    // -- Supabase Integration --
    const supabase = window.supabaseClient;
    let currentUser = null;

    // -- Initialization --
    initCartSync();
    initNavDrawer();

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
            return;
        }

        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session ? session.user : null;

        if (currentUser) {
            await syncCartFromSupabase();
        } else {
            updateCartCount();
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
                for (const localItem of cart) {
                    const dbItem = dbItems.find(i => i.product_id === localItem.id);
                    if (dbItem) {
                        // If exists in DB, take the higher quantity (or just replace if you prefer)
                        const newQty = Math.max(dbItem.quantity, localItem.quantity);
                        await updateDbItem(localItem.id, newQty);
                    } else {
                        // If not in DB, add it
                        await addDbItem(localItem);
                    }
                }

                // Re-fetch to get correct state
                const { data: updatedDbItems } = await supabase
                    .from('cart_items')
                    .select('*')
                    .eq('user_id', currentUser.id);

                cart = updatedDbItems.map(mapDbToLocal);
            } else {
                // If local cart is empty, just take DB items
                cart = dbItems.map(mapDbToLocal);
            }

            saveCartLocally();
            if (cartItemsContainer) renderCart();
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
    // (Existing smooth scrolling and mobile menu listeners remain the same)
    // ... code truncated for readability in replace_file_content ...

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
                id: button.dataset.id,
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
            alert('Order placed successfully! (This is a mock checkout)');

            if (currentUser) {
                // Clear DB cart on checkout
                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', currentUser.id);
                if (error) console.error('Error clearing DB cart:', error.message);
            }

            localStorage.removeItem('littleLayersCart');
            window.location.href = 'index.html';
        });
    }

    /* --- Cart Functions --- */

    async function addToCart(productToAdd) {
        const existingItemIndex = cart.findIndex(item => item.id === productToAdd.id);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += 1;
            if (currentUser) {
                await updateDbItem(productToAdd.id, cart[existingItemIndex].quantity);
            }
        } else {
            cart.push(productToAdd);
            if (currentUser) {
                await addDbItem(productToAdd);
            }
        }

        saveCartLocally();
    }

    async function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        if (currentUser) {
            await removeDbItem(productId);
        }
        saveCartLocally();
        renderCart();
    }

    async function updateQuantity(productId, newQuantity) {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            if (newQuantity < 1) {
                await removeFromCart(productId);
            } else {
                cart[itemIndex].quantity = parseInt(newQuantity);
                if (currentUser) {
                    await updateDbItem(productId, cart[itemIndex].quantity);
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
    }

    function getCartTotal() {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    function renderCart() {
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
            html += `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: 20px 0;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="${item.image}" alt="${item.name}" class="cart-item-image" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
                            <span style="font-weight: 500; font-size: 15px;">${item.name}</span>
                        </div>
                    </td>
                    <td style="padding: 20px 0; font-size: 14px; color: var(--color-text-muted); text-align: center;">₹${item.price}</td>
                    <td style="padding: 20px 0; text-align: center;">
                        <input type="number" class="cart-quantity-input" min="1" value="${item.quantity}" data-id="${item.id}" style="width: 60px; padding: 10px; border: 1px solid var(--color-border); border-radius: 4px; font-family: inherit; font-size: 14px; outline: none; text-align: center;">
                    </td>
                    <td style="padding: 20px 0; font-weight: 500; text-align: center;">₹${item.price * item.quantity}</td>
                    <td style="padding: 20px 0; text-align: right;">
                        <button class="btn-remove" data-id="${item.id}" style="color: var(--color-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">Remove</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        cartItemsContainer.innerHTML = html;
        if (cartTotalPriceElement) {
            cartTotalPriceElement.textContent = `₹${getCartTotal()}`;
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
            html += `
                <div class="summary-item">
                    <span>${item.name} x ${item.quantity}</span>
                    <span>₹${item.price * item.quantity}</span>
                </div>
            `;
        });

        checkoutItemsContainer.innerHTML = html;
        if (checkoutTotalElement) {
            checkoutTotalElement.textContent = `₹${getCartTotal()}`;
        }
    }

});
