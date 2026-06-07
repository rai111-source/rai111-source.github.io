// LittleLayers.Co - Standalone Gallery Script
document.addEventListener('DOMContentLoaded', () => {
    const sb = window.supabaseClient;

    // Helper functions
    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    window.openLb = function(src, cap) {
        const lbImg = document.getElementById('lbImg');
        const lbCap = document.getElementById('lbCap');
        const lbOv = document.getElementById('lbOv');
        const lb = document.getElementById('lb');
        if (lbImg && lbCap && lbOv && lb) {
            lbImg.src = src;
            lbCap.textContent = cap;
            lbOv.classList.add('open');
            lb.classList.add('open');
        }
    };

    window.closeLb = function() {
        const lbOv = document.getElementById('lbOv');
        const lb = document.getElementById('lb');
        if (lbOv && lb) {
            lbOv.classList.remove('open');
            lb.classList.remove('open');
        }
    };

    // Load gallery data
    async function loadGallery() {
        const g = document.getElementById('galleryGrid');
        if (!g) return;
        g.innerHTML = '<div class="loadbox"><div class="spin"></div><p>Loading gallery…</p></div>';
        try {
            if (typeof sb !== 'undefined') {
                const { data, error } = await sb.from('gallery')
                    .select('*')
                    .eq('active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });
                if (!error && data && data.length) {
                    renderGallery(data);
                    return;
                }
            }
        } catch (e) {
            console.error(e);
        }
        g.innerHTML = '<div class="loadbox">Gallery coming soon.</div>';
    }

    let galleryInterval = null;

    function renderGallery(list) {
        const g = document.getElementById('galleryGrid');
        if (!g) return;
        if (!list.length) {
            g.innerHTML = '<div class="loadbox">Gallery coming soon.</div>';
            return;
        }

        if (galleryInterval) {
            clearInterval(galleryInterval);
            galleryInterval = null;
        }

        const slotCount = Math.min(6, list.length);
        const shuffledList = [...list].sort(() => 0.5 - Math.random());
        const visibleItems = shuffledList.slice(0, slotCount);
        const hiddenPool = shuffledList.slice(slotCount);

        g.innerHTML = visibleItems.map((item, i) => {
            return `
            <div class="gi" id="gallery-slot-${i}" data-caption="${esc(item.caption || '')}"
              onclick="openLb('${item.image_url || ''}','${esc(item.title)}${item.caption ? ' — ' + esc(item.caption) : ''}')">
              <img src="${item.image_url || ''}" alt="${esc(item.title)}" loading="lazy" style="transition: transform .55s, opacity .5s ease; opacity: 1;">
              <div class="gcap">${esc(item.title)}</div>
            </div>`;
        }).join('');

        if (list.length > slotCount) {
            galleryInterval = setInterval(() => {
                const width = window.innerWidth;
                let visibleSlots = 6;
                if (width <= 576) {
                    visibleSlots = 2; // mobile: 1x2 grid (displays 2)
                } else if (width <= 900) {
                    visibleSlots = 4; // tablet: 2x2 grid (displays 4)
                }
                
                const activeSlotsCount = Math.min(visibleSlots, slotCount);
                if (activeSlotsCount <= 0 || hiddenPool.length === 0) return;

                const slotIndex = Math.floor(Math.random() * activeSlotsCount);
                const slotEl = document.getElementById(`gallery-slot-${slotIndex}`);
                if (!slotEl) return;

                const imgEl = slotEl.querySelector('img');
                const capEl = slotEl.querySelector('.gcap');
                if (!imgEl || !capEl) return;

                imgEl.style.opacity = '0';
                
                setTimeout(() => {
                    if (hiddenPool.length === 0) return;
                    const newItem = hiddenPool.shift();
                    
                    const oldItem = {
                        image_url: imgEl.src,
                        title: imgEl.alt,
                        caption: slotEl.getAttribute('data-caption') || ''
                    };
                    hiddenPool.push(oldItem);

                    imgEl.src = newItem.image_url || '';
                    imgEl.alt = newItem.title || '';
                    capEl.textContent = newItem.title || '';
                    slotEl.setAttribute('data-caption', newItem.caption || '');
                    
                    slotEl.onclick = () => {
                        openLb(newItem.image_url || '', `${esc(newItem.title)}${newItem.caption ? ' — ' + esc(newItem.caption) : ''}`);
                    };

                    imgEl.style.opacity = '1';
                }, 500);
            }, 3500);
        }
    }

    // Initialize gallery loading
    loadGallery();
});
