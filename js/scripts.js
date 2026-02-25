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

    // -- Initialization --
    updateCartCount();

    if (cartItemsContainer) {
        renderCart();
    }

    if (checkoutItemsContainer) {
        renderCheckout();
    }

    /* --- Event Listeners --- */

    // Mobile Menu
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return; // Allow normal links
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
        button.addEventListener('click', () => {
            const product = {
                id: button.dataset.id,
                name: button.dataset.name,
                price: parseFloat(button.dataset.price),
                image: button.dataset.image,
                quantity: 1
            };
            addToCart(product);
            alert(`${product.name} added to cart!`);
        });
    });

    // Checkout Form
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Order placed successfully! (This is a mock checkout)');
            localStorage.removeItem('littleLayersCart');
            window.location.href = 'index.html';
        });
    }

    /* --- Cart Functions --- */

    function addToCart(productToAdd) {
        const existingItemIndex = cart.findIndex(item => item.id === productToAdd.id);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += 1;
        } else {
            cart.push(productToAdd);
        }

        saveCart();
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        saveCart();
        renderCart(); // Re-render if on cart page
    }

    function updateQuantity(productId, newQuantity) {
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            if (newQuantity < 1) {
                removeFromCart(productId);
            } else {
                cart[itemIndex].quantity = parseInt(newQuantity);
                saveCart();
                renderCart();
            }
        }
    }

    function saveCart() {
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
            input.addEventListener('change', (e) => {
                updateQuantity(e.target.dataset.id, e.target.value);
            });
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeFromCart(e.target.dataset.id);
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
