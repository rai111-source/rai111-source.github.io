// LittleLayers.Co - Track Order Script
document.addEventListener('DOMContentLoaded', () => {
    // expose trackOrder globally
    window.trackOrder = async function() {
        const val = document.getElementById('trackInput').value.trim().toUpperCase();
        if (!val) { showNotif('Please enter your Order ID'); return; }
        const res = document.getElementById('trackResult');
        const msg = document.getElementById('trackMsg');
        const tl = document.getElementById('trackTimeline');
        const det = document.getElementById('trackDetails');
        
        let order = null;
        const sb = window.supabaseClient;
        try { 
            if (typeof sb !== 'undefined') { 
                const { data } = await sb.from('orders').select('*').eq('order_ref', val).single(); 
                order = data; 
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
                      ✉️ ${escapeHtml(cust.email)}
                    </div>
                  </div>
                `;
            }

            const paymentMethodName = (cust && cust.payment_method) 
                ? (cust.payment_method.toUpperCase() === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment')
                : 'WhatsApp Direct';

            det.innerHTML = `
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

    function showNotif(msg) { 
        const el = document.getElementById('notif'); 
        if (el) {
            el.textContent = msg; 
            el.classList.add('show'); 
            clearTimeout(window._nt); 
            window._nt = setTimeout(() => el.classList.remove('show'), 3000); 
        }
    }

    // Auto-track if URL query has ref
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam) {
        const inputEl = document.getElementById('trackInput');
        if (inputEl) {
            inputEl.value = refParam;
            window.trackOrder();
        }
    }
});
