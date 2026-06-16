// LittleLayers.Co - Track Order Script
document.addEventListener('DOMContentLoaded', () => {
    
    // Load recent orders list on page load
    loadRecentOrders();

    // expose trackOrder globally
    window.trackOrder = async function(orderRef) {
        let val = orderRef;
        if (!val) {
            val = document.getElementById('trackInput').value.trim().toUpperCase();
        } else {
            document.getElementById('trackInput').value = val;
        }
        if (!val) { showNotif('Please enter your Order ID'); return; }
        
        // Hide the recent orders list when tracking
        const recentSection = document.getElementById('recentOrdersSection');
        if (recentSection) {
            recentSection.style.display = 'none';
        }
        
        const backBtn = document.getElementById('backToOrdersBtn');
        if (backBtn) {
            const hasOrders = recentSection && recentSection.dataset.hasOrders === 'true';
            backBtn.style.display = hasOrders ? 'inline-block' : 'none';
        }

        const res = document.getElementById('trackResult');
        const msg = document.getElementById('trackMsg');
        const tl = document.getElementById('trackTimeline');
        const det = document.getElementById('trackDetails');
        
        let order = null;
        const sb = window.supabaseClient;
        try { 
            if (typeof sb !== 'undefined') { 
                const { data, error } = await sb.rpc('get_order_by_ref', { order_ref_param: val }); 
                if (error) throw error;
                order = data && data[0]; 
            } 
        } catch (e) { 
            console.error(e); 
        }
        
        if (!order) { 
            msg.textContent = `Order "${val}" not found. Please check the ID or contact us.`; 
            msg.style.color = 'var(--gray2)'; 
            res.style.display = 'block'; 
            tl.style.display = 'none'; 
            if (det) det.style.display = 'none';
            return; 
        }
        
        const ss = ['pending', 'confirmed', 'printing', 'dispatched', 'delivered'];
        const ll = { 
            pending: { icon: '🕐', title: 'Order Placed', sub: 'We received your order' }, 
            confirmed: { icon: '✓', title: 'Design Confirmed', sub: 'Sent to printer' }, 
            printing: { icon: '🖨', title: 'Printing', sub: 'Est. 2 more days' }, 
            dispatched: { icon: '📦', title: 'Dispatched', sub: 'Shipped via courier' }, 
            delivered: { icon: '✓', title: 'Delivered', sub: 'Enjoy your print!' } 
        };
        const ci = ss.indexOf(order.status); 
        msg.textContent = ''; 
        tl.style.display = 'flex';
        tl.innerHTML = ss.map((s, i) => {
            const done = i < ci;
            const active = i === ci;
            const l = ll[s];
            return `
              <div class="tstep${done ? ' done' : ''}${active ? ' active' : ''}">
                <div class="tdot">${done ? '✓' : l.icon}</div>
                <div>
                  <div class="tsl">${l.title}</div>
                  <div class="tss">${l.sub}</div>
                </div>
              </div>
            `;
        }).join('');
        
        function escapeHtml(str) {
            if (!str && str !== 0) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        
        if (det) {
            let itemsHtml = '';
            let itemsArr = [];
            if (Array.isArray(order.items)) {
                itemsArr = order.items;
            } else if (typeof order.items === 'string') {
                try {
                    itemsArr = JSON.parse(order.items);
                } catch (e) {
                    console.error(e);
                }
            }
            
            if (Array.isArray(itemsArr) && itemsArr.length) {
                itemsHtml = itemsArr.map(item => {
                    const qty = item.qty || item.quantity || 1;
                    const price = Number(item.price || 0);
                    const subtotal = price * qty;
                    const img = item.image_url || item.image || 'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=80';
                    return `
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 8px; padding: 8px 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <img src="${img}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.src='https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=80'">
                          <div style="text-align: left;">
                            <div style="font-weight: 500; font-size: 13px; color: var(--white);">${escapeHtml(item.name)}</div>
                            <div style="font-size: 11px; color: var(--gray4);">Qty: ${qty} · Price: ₹${price.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                        <div style="font-weight: 500; font-size: 13px; color: var(--white);">₹${subtotal.toLocaleString('en-IN')}</div>
                      </div>
                    `;
                }).join('');
            } else {
                itemsHtml = `<div style="font-size: 13px; color: var(--gray4);">${escapeHtml(String(order.items || 'No items listed.'))}</div>`;
            }

            let shippingHtml = '';
            let cust = null;
            if (order.customer) {
                if (typeof order.customer === 'object') {
                    cust = order.customer;
                } else if (typeof order.customer === 'string') {
                    try {
                        cust = JSON.parse(order.customer);
                    } catch (e) {}
                }
            }

            if (cust && (cust.name || cust.address)) {
                shippingHtml = `
                  <div style="border-top: 1px dashed var(--line); padding-top: 16px; margin-top: 16px; display: flex; flex-direction: column; gap: 4px; text-align: left;">
                    <div style="font-size: 11px; font-weight: 600; color: var(--white); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Shipping Information:</div>
                    <div style="font-size: 13px; line-height: 1.5; color: var(--gray3);">
                      <strong style="color: var(--white);">${escapeHtml(cust.name)}</strong><br>
                      ${escapeHtml(cust.address)}<br>
                      ${escapeHtml(cust.city)} - ${escapeHtml(cust.zip)}<br>
                      📱 ${escapeHtml(cust.phone || '-')}${cust.email ? `<br>✉️ ${escapeHtml(cust.email)}` : ''}
                    </div>
                  </div>
                `;
            }

            const paymentMethodName = (cust && cust.payment_method) 
                ? (cust.payment_method.toUpperCase() === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment')
                : 'WhatsApp Direct';

            let reviewHtml = '';
            if (order.status === 'delivered') {
                let alreadyReviewed = false;
                if (typeof sb !== 'undefined') {
                    try {
                        const { data: revData } = await sb.from('reviews').select('id').eq('order_ref', order.order_ref);
                        if (revData && revData.length > 0) {
                            alreadyReviewed = true;
                        }
                    } catch (e) {
                        console.error('Error checking review:', e);
                    }
                }
                
                const custName = cust ? (cust.name || '') : '';
                
                if (alreadyReviewed) {
                    reviewHtml = `
                      <div style="background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--line); border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--gray3); font-size: 13.5px;">
                        <span>✅</span> Thanks for sharing your feedback! Your review has been submitted.
                      </div>
                    `;
                } else {
                    reviewHtml = `
                      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--line); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                        <div style="font-size: 32px;">🎉</div>
                        <h4 style="font-family: var(--head); color: var(--white); font-size: 18px; font-weight: 700; margin: 0;">How was your experience?</h4>
                        <p style="font-size: 13px; color: var(--gray3); margin: 0; max-width: 420px; line-height: 1.6;">Your order has been delivered! We would love to hear your feedback on our custom 3D printing. (Writing a review is optional)</p>
                        <button class="btn btn-white" style="padding: 10px 20px; font-size: 13.5px; border-radius: 9px; cursor: pointer;" onclick="openReviewModal('${escapeHtml(order.order_ref)}', '${escapeHtml(custName)}')">Write a Review</button>
                      </div>
                    `;
                }
            }

            det.innerHTML = `
              ${reviewHtml}
              <h3 style="font-size: 14px; font-weight: 600; color: var(--white); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid var(--line); padding-top: 24px; text-align: left;">Order Details</h3>
              <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px;">
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 8px; padding: 12px; text-align: left;">
                    <div style="font-size: 10px; color: var(--gray4); text-transform: uppercase; margin-bottom: 4px;">Payment Method</div>
                    <div style="font-weight: 600; color: var(--white); font-size: 12px;">${escapeHtml(paymentMethodName)}</div>
                  </div>
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 8px; padding: 12px; text-align: left;">
                    <div style="font-size: 10px; color: var(--gray4); text-transform: uppercase; margin-bottom: 4px;">Order Status</div>
                    <div style="font-weight: 600; color: var(--white); font-size: 12px; text-transform: capitalize;">${escapeHtml(order.status)}</div>
                  </div>
                  <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 8px; padding: 12px; text-align: left;">
                    <div style="font-size: 10px; color: var(--gray4); text-transform: uppercase; margin-bottom: 4px;">Total Amount</div>
                    <div style="font-weight: 600; color: var(--white); font-size: 12px;">₹${Number(order.total).toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <!-- Items Ordered -->
                <div>
                  <div style="font-size: 12px; font-weight: 600; color: var(--white); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; text-align: left;">Items Ordered:</div>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${itemsHtml}
                  </div>
                </div>

                <!-- Shipping Information -->
                ${shippingHtml}
              </div>
            `;
            det.style.display = 'block';
        }
        
        res.style.display = 'block';
    }

    window.showRecentOrdersList = function() {
        document.getElementById('trackResult').style.display = 'none';
        document.getElementById('trackInput').value = '';
        const listSection = document.getElementById('recentOrdersSection');
        if (listSection && listSection.dataset.hasOrders === 'true') {
            listSection.style.display = 'block';
        }
        loadRecentOrders();
    }

    async function loadRecentOrders() {
        const recentSection = document.getElementById('recentOrdersSection');
        const recentList = document.getElementById('recentOrdersList');
        if (!recentSection || !recentList) return;

        const sb = window.supabaseClient;
        let userEmail = null;
        if (typeof sb !== 'undefined') {
            try {
                const { data: { session } } = await sb.auth.getSession();
                if (session && session.user) {
                    userEmail = session.user.email;
                }
            } catch (e) {
                console.error(e);
            }
        }

        let localRefs = JSON.parse(localStorage.getItem('littleLayersUserOrders') || '[]');
        
        if (localRefs.length === 0 && !userEmail) {
            recentSection.style.display = 'none';
            recentSection.dataset.hasOrders = 'false';
            return;
        }

        let ordersToShow = [];
        if (typeof sb !== 'undefined') {
            try {
                let dbOrders = [];
                let rpcOrders = [];
                if (userEmail) {
                    const { data, error } = await sb.from('orders').select('*').eq('customer->email', userEmail);
                    if (!error && data) dbOrders = data;
                }
                if (localRefs.length > 0) {
                    const { data, error } = await sb.rpc('get_orders_by_refs', { refs: localRefs });
                    if (!error && data) rpcOrders = data;
                }
                const combined = [...dbOrders, ...rpcOrders];
                const seen = new Set();
                ordersToShow = combined.filter(o => {
                    if (seen.has(o.order_ref)) return false;
                    seen.add(o.order_ref);
                    return true;
                });
            } catch (e) {
                console.error('Error fetching recent orders:', e);
            }
        }

        if (ordersToShow.length === 0) {
            recentSection.style.display = 'none';
            recentSection.dataset.hasOrders = 'false';
            return;
        }

        ordersToShow.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        recentSection.dataset.hasOrders = 'true';
        recentSection.style.display = 'block';

        recentList.innerHTML = ordersToShow.map(order => {
            const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            let itemsArr = [];
            if (Array.isArray(order.items)) {
                itemsArr = order.items;
            } else if (typeof order.items === 'string') {
                try {
                    itemsArr = JSON.parse(order.items);
                } catch (e) {}
            }

            const itemsSummary = itemsArr.map(item => `${item.name} (x${item.qty || item.quantity || 1})`).join(', ');

            const statusThemes = {
                pending: { bg: 'rgba(255,193,7,0.1)', color: '#ffc107', icon: '🕐' },
                confirmed: { bg: 'rgba(0,123,255,0.1)', color: '#007bff', icon: '✓' },
                printing: { bg: 'rgba(23,162,184,0.1)', color: '#17a2b8', icon: '🖨' },
                dispatched: { bg: 'rgba(108,117,125,0.1)', color: '#6c757d', icon: '📦' },
                delivered: { bg: 'rgba(40,167,69,0.1)', color: '#28a745', icon: '✓' }
            };
            const theme = statusThemes[order.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--white)', icon: '•' };

            return `
              <div class="order-brief-card" onclick="trackOrder('${order.order_ref}')" style="background: var(--gray9); border: 1px solid var(--line); border-radius: 12px; padding: 18px; cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease; display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;">
                  <span style="font-weight: 700; font-size: 15px; color: var(--white);">${order.order_ref}</span>
                  <span style="background: ${theme.bg}; color: ${theme.color}; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                    <span>${theme.icon}</span> <span>${order.status}</span>
                  </span>
                </div>
                <div style="font-size: 12px; color: var(--gray4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: left;">
                  ${itemsSummary || 'No items info'}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--gray3); border-top: 1px solid var(--line); padding-top: 10px; margin-top: 4px; width: 100%;">
                  <span>Ordered on ${dateStr}</span>
                  <span style="font-weight: 700; color: var(--white); font-size: 14px;">₹${Number(order.total).toLocaleString('en-IN')}</span>
                </div>
              </div>
            `;
        }).join('');

        const styleId = 'order-brief-card-hover-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
              .order-brief-card:hover {
                transform: translateY(-2px);
                border-color: var(--gray4) !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
              }
            `;
            document.head.appendChild(style);
        }
    }

    function showNotif(msg) { 
        const el = document.getElementById('notif'); 
        if (el) {
            el.textContent = msg; 
            el.classList.add('show'); 
            clearTimeout(window._nt); 
            window._nt = setTimeout(() => el.classList.remove('show'), 3000); 
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        const inputEl = document.getElementById('trackInput');
        if (inputEl) {
            inputEl.value = refParam;
            window.trackOrder(refParam);
        }
    }

    /* --- Order Reviews Modal --- */
    window.openReviewModal = function(orderRef, customerName) {
        document.getElementById('reviewOrderRef').value = orderRef;
        document.getElementById('reviewName').value = customerName || '';
        document.getElementById('reviewComment').value = '';
        setRating(5); // Default to 5 stars
        
        document.getElementById('reviewOverlay').classList.add('open');
        document.getElementById('reviewModal').classList.add('open');
    };
    
    window.closeReviewModal = function() {
        document.getElementById('reviewOverlay').classList.remove('open');
        document.getElementById('reviewModal').classList.remove('open');
    };
    
    window.setRating = function(val) {
        document.getElementById('reviewRating').value = val;
        const stars = document.querySelectorAll('#reviewStars span');
        stars.forEach((star, idx) => {
            if (idx < val) {
                star.style.color = '#ffc107'; // Golden/Yellow
            } else {
                star.style.color = 'var(--gray6)'; // Default gray
            }
        });
    };
    
    window.submitReview = async function() {
        const orderRef = document.getElementById('reviewOrderRef').value;
        const name = document.getElementById('reviewName').value.trim();
        const rating = parseInt(document.getElementById('reviewRating').value, 10);
        const comment = document.getElementById('reviewComment').value.trim();
        
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        
        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'SUBMITTING...';
        }
        
        try {
            if (typeof sb !== 'undefined') {
                const { error } = await sb.from('reviews').insert({
                    order_ref: orderRef,
                    name,
                    rating,
                    comment
                });
                
                if (error) throw error;
                
                showNotif('Thank you for your review! 🎉');
                closeReviewModal();
                
                // Re-track the order to show the thanks card
                window.trackOrder(orderRef);
            }
        } catch (e) {
            console.error('Error submitting review:', e);
            alert('Failed to submit review: ' + e.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
            }
        }
    };
});
