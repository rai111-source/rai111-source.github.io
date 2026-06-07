// LittleLayers.Co - Track Order Script
document.addEventListener('DOMContentLoaded', () => {
    // expose trackOrder globally
    window.trackOrder = async function() {
        const val = document.getElementById('trackInput').value.trim().toUpperCase();
        if (!val) { showNotif('Please enter your Order ID'); return; }
        const res = document.getElementById('trackResult'), msg = document.getElementById('trackMsg'), tl = document.getElementById('trackTimeline');
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
