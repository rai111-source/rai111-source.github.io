let initialGalleryPromise = null;
const sb = window.supabaseClient;

if (typeof sb !== 'undefined') {
    initialGalleryPromise = sb.from('gallery')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
}

document.addEventListener('DOMContentLoaded', () => {

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
            let data, error;
            if (initialGalleryPromise) {
                const res = await initialGalleryPromise;
                data = res.data;
                error = res.error;
            } else if (typeof sb !== 'undefined') {
                const res = await sb.from('gallery')
                    .select('*')
                    .eq('active', true)
                    .order('sort_order', { ascending: true })
                    .order('created_at', { ascending: false });
                data = res.data;
                error = res.error;
            }
            if (!error && data && data.length) {
                renderGallery(data);
                return;
            }
        } catch (e) {
            console.error(e);
        }
        g.innerHTML = '<div class="loadbox">Gallery coming soon.</div>';
    }

    function renderGallery(list) {
        const g = document.getElementById('galleryGrid');
        if (!g) return;
        if (!list.length) {
            g.innerHTML = '<div class="loadbox">Gallery coming soon.</div>';
            return;
        }

        g.innerHTML = list.map((item, i) => {
            return `
            <div class="gi" id="gallery-slot-${i}" data-caption="${esc(item.caption || '')}"
              onclick="openLb('${item.image_url || ''}','${esc(item.title)}${item.caption ? ' — ' + esc(item.caption) : ''}')">
              <img src="${item.image_url || ''}" alt="${esc(item.title)}" loading="lazy" style="transition: transform .55s, opacity .5s ease; opacity: 1;">
              <div class="gcap">${esc(item.title)}</div>
            </div>`;
        }).join('');
    }

    // Initialize gallery loading
    loadGallery();
});
