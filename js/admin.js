// admin.js - Admin Dashboard Logic

let supabaseClient = window.supabaseClient;
let currentUser = null;
// Bug #15: use centralized ADMIN_EMAIL from supabase.js (single source of truth).
// Fallback to hardcoded value only if supabase.js failed to load.
const ADMIN_EMAIL = window.ADMIN_EMAIL || 'raj@littlelayers.in';
let currentProducts = [];
let currentGallery = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        alert("Supabase client is not initialized.");
        return;
    }

    // -- Elements --
    const loadingContainer = document.getElementById('loading-container');
    const adminContent = document.getElementById('admin-content');
    const logoutBtn = document.getElementById('logout-btn');
    const productsList = document.getElementById('admin-products-list');
    
    // Form Elements
    const formPanel = document.getElementById('product-form-panel');
    const productForm = document.getElementById('product-form');
    const addNewBtn = document.getElementById('add-new-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const formTitle = document.getElementById('form-title');
    const saveProductBtn = document.getElementById('save-product-btn');
    const formStatus = document.getElementById('form-status');
    const imageUpload = document.getElementById('product-image-upload');
    const imagePreviewContainer = document.getElementById('image-preview');
    const imagePreviewImg = imagePreviewContainer.querySelector('img');

    // Gallery Elements
    const galleryList = document.getElementById('admin-gallery-list');
    const galleryFormPanel = document.getElementById('gallery-form-panel');
    const galleryForm = document.getElementById('gallery-form');
    const addNewGalleryBtn = document.getElementById('add-new-gallery-btn');
    const cancelGalleryEditBtn = document.getElementById('cancel-gallery-edit-btn');
    const galleryFormTitle = document.getElementById('gallery-form-title');
    const saveGalleryBtn = document.getElementById('save-gallery-btn');
    const galleryFormStatus = document.getElementById('gallery-form-status');
    const galleryImageUpload = document.getElementById('gallery-image-upload');
    const galleryImagePreviewContainer = document.getElementById('gallery-image-preview');
    const galleryImagePreviewImg = galleryImagePreviewContainer.querySelector('img');

    // -- Authentication Check --
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error || !session) {
        window.location.href = 'login.html';
        return;
    }

    currentUser = session.user;

    // ⚠️  SECURITY NOTE: This client-side check is a UX gate only.
    // True access control MUST be enforced via Supabase Row-Level Security (RLS)
    // policies on the 'products' and 'gallery' tables so that only the admin's
    // user ID can INSERT / UPDATE / DELETE rows, regardless of client-side code.
    if (currentUser.email !== ADMIN_EMAIL) {
        loadingContainer.innerHTML = `
            <div class="loadbox" style="margin-top: 100px;">
                <p style="color: #ff6b6b; margin-bottom: 16px;">Access Denied</p>
                <p>You do not have permission to view this page.</p>
                <a href="index.html" class="btn btn-border" style="margin-top: 20px;">Return Home</a>
            </div>
        `;
        // Ensure admin content is never visible to non-admin users on the client
        if (adminContent) adminContent.remove();
        return;
    }

    // Admin authenticated successfully
    loadingContainer.style.display = 'none';
    adminContent.style.display = 'block';

    // Load initial data
    loadProducts();
    loadGallery();
    loadOrders();
    loadEnquiries();
    loadSiteContentCMS();

    // -- Event Listeners --
    
    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });

    addNewBtn.addEventListener('click', () => {
        openForm();
    });

    cancelEditBtn.addEventListener('click', () => {
        closeForm();
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreviewImg.src = event.target.result;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            if (!document.getElementById('product-image-url').value) {
                imagePreviewContainer.style.display = 'none';
            }
        }
    });

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });

    // -- Gallery Event Listeners --
    addNewGalleryBtn.addEventListener('click', () => {
        openGalleryForm();
    });

    cancelGalleryEditBtn.addEventListener('click', () => {
        closeGalleryForm();
    });

    galleryImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                galleryImagePreviewImg.src = event.target.result;
                galleryImagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            if (!document.getElementById('gallery-image-url').value) {
                galleryImagePreviewContainer.style.display = 'none';
            }
        }
    });

    galleryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveGallery();
    });

    // -- Functions --

    async function loadProducts() {
        productsList.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading products...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            currentProducts = data || [];
            renderProducts(currentProducts);
        } catch (error) {
            console.error('Error loading products:', error);
            productsList.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ff6b6b;">Error: ${error.message}</td></tr>`;
        }
    }

    function renderProducts(products) {
        if (!products.length) {
            productsList.innerHTML = '<tr><td colspan="5" style="text-align:center;">No products found.</td></tr>';
            return;
        }

        productsList.innerHTML = products.map(p => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center;">
                        <img src="${p.image_url || 'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=100'}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'">
                        <div>
                            <div style="font-weight: 500;">${escapeHtml(p.name)}</div>
                            <div style="font-size: 12px; color: var(--gray4);">${p.badge ? `<span style="background: var(--accent); color: var(--gray9); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 6px;">${escapeHtml(p.badge)}</span>` : ''}</div>
                        </div>
                    </div>
                </td>
                <td style="text-transform: capitalize;">${escapeHtml(p.category)}</td>
                <td>₹${p.price} ${p.original_price ? `<span style="text-decoration: line-through; color: var(--gray4); font-size: 12px; margin-left: 6px;">₹${p.original_price}</span>` : ''}</td>
                <td>
                    ${p.active 
                        ? '<span style="color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px;">Active</span>' 
                        : '<span style="color: var(--gray4); background: var(--gray7); padding: 4px 8px; border-radius: 4px; font-size: 12px;">Hidden</span>'}
                </td>
                <td>
                    <div class="action-links">
                        <a onclick="window.editProduct(${p.id})">Edit</a>
                        <a onclick="window.deleteProduct(${p.id})" class="delete">Delete</a>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.editProduct = function(id) {
        const p = currentProducts.find(x => x.id === id);
        if (!p) return;
        
        openForm(p);
        window.scrollTo({ top: formPanel.offsetTop - 100, behavior: 'smooth' });
    };

    window.deleteProduct = async function(id) {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
        
        try {
            const product = currentProducts.find(x => x.id === id);
            const imageUrl = product ? product.image_url : null;

            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', id);
                
            if (error) throw error;

            if (imageUrl) {
                const oldPath = getStoragePathFromUrl(imageUrl, 'product-images');
                if (oldPath) {
                    await supabaseClient.storage.from('product-images').remove([oldPath]);
                }
            }
            
            // Reload table
            loadProducts();
        } catch (error) {
            alert('Error deleting product: ' + error.message);
        }
    };

    function openForm(product = null) {
        formPanel.classList.add('active');
        formStatus.style.display = 'none';
        
        if (product) {
            formTitle.textContent = 'Edit Product';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-original-price').value = product.original_price || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-badge').value = product.badge || '';
            document.getElementById('product-active').checked = product.active;
            
            document.getElementById('product-image-url').value = product.image_url || '';
            if (product.image_url) {
                imagePreviewImg.src = product.image_url;
                imagePreviewContainer.style.display = 'block';
            } else {
                imagePreviewContainer.style.display = 'none';
            }
        } else {
            formTitle.textContent = 'Add New Product';
            productForm.reset();
            document.getElementById('product-id').value = '';
            document.getElementById('product-image-url').value = '';
            document.getElementById('product-active').checked = true;
            imagePreviewContainer.style.display = 'none';
        }
    }

    function closeForm() {
        formPanel.classList.remove('active');
        productForm.reset();
    }

    function showStatus(msg, type) {
        formStatus.textContent = msg;
        formStatus.className = 'status-msg ' + type;
        formStatus.style.display = 'block';
    }

    async function saveProduct() {
        saveProductBtn.disabled = true;
        saveProductBtn.textContent = 'Saving...';
        showStatus('Saving product...', 'success');
        
        try {
            const id = document.getElementById('product-id').value;
            let imageUrl = document.getElementById('product-image-url').value;
            const existingProduct = id ? currentProducts.find(x => x.id === parseInt(id)) : null;
            const oldImageUrl = existingProduct ? existingProduct.image_url : null;
            let fileUploaded = false;
            
            // Handle image upload if a new file is selected
            if (imageUpload.files && imageUpload.files[0]) {
                showStatus('Uploading image...', 'success');
                const file = imageUpload.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `products/${fileName}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('product-images')
                    .upload(filePath, file);
                    
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('product-images')
                    .getPublicUrl(filePath);
                    
                imageUrl = publicUrl;
                fileUploaded = true;
            }
            
            const productData = {
                name: document.getElementById('product-name').value,
                category: document.getElementById('product-category').value,
                price: parseFloat(document.getElementById('product-price').value),
                original_price: document.getElementById('product-original-price').value ? parseFloat(document.getElementById('product-original-price').value) : null,
                description: document.getElementById('product-description').value,
                badge: document.getElementById('product-badge').value || null,
                image_url: imageUrl,
                active: document.getElementById('product-active').checked,
                updated_at: new Date()
            };
            
            showStatus('Updating database...', 'success');
            
            if (id) {
                // Update
                const { error } = await supabaseClient
                    .from('products')
                    .update(productData)
                    .eq('id', id);
                if (error) throw error;

                // Delete old image if a new one was successfully uploaded
                if (fileUploaded && oldImageUrl && oldImageUrl !== imageUrl) {
                    const oldPath = getStoragePathFromUrl(oldImageUrl, 'product-images');
                    if (oldPath) {
                        await supabaseClient.storage.from('product-images').remove([oldPath]);
                    }
                }
            } else {
                // Insert
                const { error } = await supabaseClient
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
            }
            
            showStatus('Product saved successfully!', 'success');
            loadProducts();
            
            setTimeout(() => {
                closeForm();
            }, 1500);
            
        } catch (error) {
            console.error('Save error:', error);
            showStatus('Error: ' + error.message, 'error');
        } finally {
            saveProductBtn.disabled = false;
            saveProductBtn.textContent = 'Save Product';
        }
    }

    // --- GALLERY CRUD FUNCTIONS ---

    async function loadGallery() {
        galleryList.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading gallery...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('gallery')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            currentGallery = data || [];
            renderGallery(currentGallery);
        } catch (error) {
            console.error('Error loading gallery:', error);
            galleryList.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #ff6b6b;">Error: ${error.message}</td></tr>`;
        }
    }

    function renderGallery(items) {
        if (!items.length) {
            galleryList.innerHTML = '<tr><td colspan="5" style="text-align:center;">No photos found.</td></tr>';
            return;
        }

        galleryList.innerHTML = items.map(p => `
            <tr>
                <td>
                    <img src="${p.image_url || 'https://images.unsplash.com/photo-1631378534457-aa7adf893b2d?w=100'}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                </td>
                <td style="font-weight: 500;">${escapeHtml(p.title)}</td>
                <td style="color: var(--gray4); font-size: 13px;">${escapeHtml(p.caption || '-')}</td>
                <td>
                    ${p.active !== false 
                        ? '<span style="color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; font-size: 12px;">Active</span>' 
                        : '<span style="color: var(--gray4); background: var(--gray7); padding: 4px 8px; border-radius: 4px; font-size: 12px;">Hidden</span>'}
                </td>
                <td>
                    <div class="action-links">
                        <a onclick="window.editGallery(${p.id})">Edit</a>
                        <a onclick="window.deleteGallery(${p.id})" class="delete">Delete</a>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    window.editGallery = function(id) {
        const p = currentGallery.find(x => x.id === id);
        if (!p) return;
        
        openGalleryForm(p);
        window.scrollTo({ top: galleryFormPanel.offsetTop - 100, behavior: 'smooth' });
    };

    window.deleteGallery = async function(id) {
        if (!confirm('Are you sure you want to delete this photo?')) return;
        
        try {
            const item = currentGallery.find(x => x.id === id);
            const imageUrl = item ? item.image_url : null;

            const { error } = await supabaseClient
                .from('gallery')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            if (imageUrl) {
                const oldPath = getStoragePathFromUrl(imageUrl, 'gallery-images');
                if (oldPath) {
                    await supabaseClient.storage.from('gallery-images').remove([oldPath]);
                }
            }
            
            loadGallery();
        } catch (error) {
            alert('Error deleting photo: ' + error.message);
        }
    };

    function openGalleryForm(item = null) {
        galleryFormPanel.classList.add('active');
        galleryFormStatus.style.display = 'none';
        
        if (item) {
            galleryFormTitle.textContent = 'Edit Photo';
            document.getElementById('gallery-id').value = item.id;
            document.getElementById('gallery-title').value = item.title;
            document.getElementById('gallery-caption').value = item.caption || '';
            document.getElementById('gallery-sort').value = item.sort_order || 0;
            document.getElementById('gallery-active').checked = item.active !== false;
            
            document.getElementById('gallery-image-url').value = item.image_url || '';
            if (item.image_url) {
                galleryImagePreviewImg.src = item.image_url;
                galleryImagePreviewContainer.style.display = 'block';
            } else {
                galleryImagePreviewContainer.style.display = 'none';
            }
        } else {
            galleryFormTitle.textContent = 'Add New Photo';
            galleryForm.reset();
            document.getElementById('gallery-id').value = '';
            document.getElementById('gallery-image-url').value = '';
            document.getElementById('gallery-sort').value = 0;
            document.getElementById('gallery-active').checked = true;
            galleryImagePreviewContainer.style.display = 'none';
        }
    }

    function closeGalleryForm() {
        galleryFormPanel.classList.remove('active');
        galleryForm.reset();
    }

    function showGalleryStatus(msg, type) {
        galleryFormStatus.textContent = msg;
        galleryFormStatus.className = 'status-msg ' + type;
        galleryFormStatus.style.display = 'block';
    }

    async function saveGallery() {
        saveGalleryBtn.disabled = true;
        saveGalleryBtn.textContent = 'Saving...';
        showGalleryStatus('Saving photo...', 'success');
        
        try {
            const id = document.getElementById('gallery-id').value;
            let imageUrl = document.getElementById('gallery-image-url').value;
            const existingItem = id ? currentGallery.find(x => x.id === parseInt(id)) : null;
            const oldImageUrl = existingItem ? existingItem.image_url : null;
            let fileUploaded = false;
            
            if (galleryImageUpload.files && galleryImageUpload.files[0]) {
                showGalleryStatus('Uploading image...', 'success');
                const file = galleryImageUpload.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `gallery/${fileName}`;
                
                const { error: uploadError } = await supabaseClient.storage
                    .from('gallery-images')
                    .upload(filePath, file);
                    
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('gallery-images')
                    .getPublicUrl(filePath);
                    
                imageUrl = publicUrl;
                fileUploaded = true;
            }
            
            const galleryData = {
                title: document.getElementById('gallery-title').value,
                caption: document.getElementById('gallery-caption').value || null,
                sort_order: parseInt(document.getElementById('gallery-sort').value) || 0,
                image_url: imageUrl,
                active: document.getElementById('gallery-active').checked
            };
            
            showGalleryStatus('Updating database...', 'success');
            
            if (id) {
                const { error } = await supabaseClient
                    .from('gallery')
                    .update(galleryData)
                    .eq('id', id);
                if (error) throw error;
                
                if (fileUploaded && oldImageUrl && oldImageUrl !== imageUrl) {
                    const oldPath = getStoragePathFromUrl(oldImageUrl, 'gallery-images');
                    if (oldPath) {
                        await supabaseClient.storage.from('gallery-images').remove([oldPath]);
                    }
                }
            } else {
                const { error } = await supabaseClient
                    .from('gallery')
                    .insert([galleryData]);
                if (error) throw error;
            }
            
            showGalleryStatus('Photo saved successfully!', 'success');
            loadGallery();
            
            setTimeout(() => {
                closeGalleryForm();
            }, 1500);
            
        } catch (error) {
            console.error('Save error:', error);
            showGalleryStatus('Error: ' + error.message, 'error');
        } finally {
            saveGalleryBtn.disabled = false;
            saveGalleryBtn.textContent = 'Save Photo';
        }
    }

    let currentSiteContent = {};

    async function loadSiteContentCMS() {
        try {
            const { data, error } = await supabaseClient
                .from('site_content')
                .select('*');

            if (error) throw error;
            
            if (data) {
                data.forEach(item => {
                    currentSiteContent[item.key] = item.content;
                    if (item.key === 'hero') populateHeroForm(item.content);
                    if (item.key === 'process') populateProcessForm(item.content);
                    if (item.key === 'about') populateAboutForm(item.content);
                });
            }
        } catch (error) {
            console.error('Error loading site content:', error);
        }
    }

    function populateHeroForm(content) {
        document.getElementById('hero-title').value = content.title || '';
        document.getElementById('hero-sub').value = content.sub || '';
        
        if (content.stats && content.stats.length >= 3) {
            document.getElementById('hero-stat-1-val').value = content.stats[0].value || '';
            document.getElementById('hero-stat-1-lbl').value = content.stats[0].label || '';
            document.getElementById('hero-stat-2-val').value = content.stats[1].value || '';
            document.getElementById('hero-stat-2-lbl').value = content.stats[1].label || '';
            document.getElementById('hero-stat-3-val').value = content.stats[2].value || '';
            document.getElementById('hero-stat-3-lbl').value = content.stats[2].label || '';
        }
        
        if (content.visuals && content.visuals.length >= 3) {
            for (let i = 1; i <= 3; i++) {
                const vis = content.visuals[i - 1];
                document.getElementById(`hero-vis-${i}-lbl`).value = vis.label || '';
                document.getElementById(`hero-vis-${i}-price`).value = vis.price || '';
                document.getElementById(`hero-vis-${i}-img-url`).value = vis.image_url || '';
                
                const previewImg = document.querySelector(`#hero-vis-${i}-preview img`);
                const previewDiv = document.getElementById(`hero-vis-${i}-preview`);
                if (vis.image_url) {
                    previewImg.src = vis.image_url;
                    previewDiv.style.display = 'block';
                } else {
                    previewDiv.style.display = 'none';
                }
            }
        }
    }

    function populateProcessForm(content) {
        document.getElementById('process-sub').value = content.sub || '';
        if (content.steps && content.steps.length >= 4) {
            for (let i = 1; i <= 4; i++) {
                const step = content.steps[i - 1];
                document.getElementById(`process-step-${i}-ico`).value = step.icon || '';
                document.getElementById(`process-step-${i}-title`).value = step.title || '';
                document.getElementById(`process-step-${i}-desc`).value = step.description || '';
                
                const previewImg = document.querySelector(`#process-step-${i}-preview img`);
                const previewDiv = document.getElementById(`process-step-${i}-preview`);
                const isUrl = /^(https?:\/\/|\/|data:image\/)/.test(step.icon || '') || /\.(jpeg|jpg|gif|png|svg|webp|ico)(\?.*)?$/i.test(step.icon || '');
                if (isUrl && step.icon) {
                    previewImg.src = step.icon;
                    previewDiv.style.display = 'block';
                } else {
                    previewDiv.style.display = 'none';
                }
            }
        }
    }

    function populateAboutForm(content) {
        document.getElementById('about-title').value = content.title || '';
        if (content.paragraphs && content.paragraphs.length >= 2) {
            document.getElementById('about-p1').value = content.paragraphs[0] || '';
            document.getElementById('about-p2').value = content.paragraphs[1] || '';
        }
        if (content.cards && content.cards.length >= 3) {
            for (let i = 1; i <= 3; i++) {
                const card = content.cards[i - 1];
                document.getElementById(`about-card-${i}-val`).value = card.value || '';
                document.getElementById(`about-card-${i}-lbl`).value = card.label || '';
                document.getElementById(`about-card-${i}-desc`).value = card.description || '';
            }
        }
    }

    // Setup file preview listeners
    for (let i = 1; i <= 3; i++) {
        const fileInput = document.getElementById(`hero-vis-${i}-file`);
        const previewDiv = document.getElementById(`hero-vis-${i}-preview`);
        const previewImg = previewDiv.querySelector('img');
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImg.src = event.target.result;
                    previewDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Setup file preview listeners for process step icons
    for (let i = 1; i <= 4; i++) {
        const fileInput = document.getElementById(`process-step-${i}-file`);
        const previewDiv = document.getElementById(`process-step-${i}-preview`);
        const previewImg = previewDiv.querySelector('img');
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImg.src = event.target.result;
                    previewDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }


    document.getElementById('hero-content-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-hero-btn');
        const statusEl = document.getElementById('hero-form-status');
        
        btn.disabled = true;
        btn.textContent = 'Saving...';
        statusEl.className = 'status-msg success';
        statusEl.textContent = 'Saving hero section...';
        statusEl.style.display = 'block';
        
        try {
            const visuals = [];
            const oldVisuals = currentSiteContent['hero']?.visuals || [];
            const filesToDelete = [];
            
            for (let i = 1; i <= 3; i++) {
                const fileInput = document.getElementById(`hero-vis-${i}-file`);
                let imageUrl = document.getElementById(`hero-vis-${i}-img-url`).value;
                const oldImageUrl = oldVisuals[i - 1]?.image_url;
                
                if (fileInput.files && fileInput.files[0]) {
                    statusEl.textContent = `Uploading card ${i} image...`;
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `hero/${fileName}`;
                    
                    const { error: uploadError } = await supabaseClient.storage
                        .from('site-images')
                        .upload(filePath, file);
                        
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('site-images')
                        .getPublicUrl(filePath);
                        
                    imageUrl = publicUrl;
                    document.getElementById(`hero-vis-${i}-img-url`).value = imageUrl;
                    
                    if (oldImageUrl && oldImageUrl !== imageUrl) {
                        filesToDelete.push(oldImageUrl);
                    }
                }
                
                visuals.push({
                    label: document.getElementById(`hero-vis-${i}-lbl`).value,
                    price: document.getElementById(`hero-vis-${i}-price`).value,
                    image_url: imageUrl
                });
            }
            
            const heroData = {
                title: document.getElementById('hero-title').value,
                sub: document.getElementById('hero-sub').value,
                stats: [
                    {
                        value: document.getElementById('hero-stat-1-val').value,
                        label: document.getElementById('hero-stat-1-lbl').value
                    },
                    {
                        value: document.getElementById('hero-stat-2-val').value,
                        label: document.getElementById('hero-stat-2-lbl').value
                    },
                    {
                        value: document.getElementById('hero-stat-3-val').value,
                        label: document.getElementById('hero-stat-3-lbl').value
                    }
                ],
                visuals: visuals
            };
            
            statusEl.textContent = 'Updating database...';
            
            const { error } = await supabaseClient
                .from('site_content')
                .upsert({ key: 'hero', content: heroData });
                
            if (error) throw error;
            
            currentSiteContent['hero'] = heroData;
            
            // Delete old files from storage
            for (const url of filesToDelete) {
                const oldPath = getStoragePathFromUrl(url, 'site-images');
                if (oldPath) {
                    await supabaseClient.storage.from('site-images').remove([oldPath]);
                }
            }
            
            statusEl.textContent = 'Hero section saved successfully!';
            setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error('Error saving hero section:', error);
            statusEl.className = 'status-msg error';
            statusEl.textContent = 'Error: ' + error.message;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Hero Section';
        }
    });

    document.getElementById('process-content-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-process-btn');
        const statusEl = document.getElementById('process-form-status');
        
        btn.disabled = true;
        btn.textContent = 'Saving...';
        statusEl.className = 'status-msg success';
        statusEl.textContent = 'Saving process section...';
        statusEl.style.display = 'block';
        
        try {
            const steps = [];
            const oldSteps = currentSiteContent['process']?.steps || [];
            const filesToDelete = [];
            
            for (let i = 1; i <= 4; i++) {
                const fileInput = document.getElementById(`process-step-${i}-file`);
                let iconVal = document.getElementById(`process-step-${i}-ico`).value;
                const oldIconVal = oldSteps[i - 1]?.icon;
                
                if (fileInput.files && fileInput.files[0]) {
                    statusEl.textContent = `Uploading step ${i} image icon...`;
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const filePath = `process/${fileName}`;
                    
                    const { error: uploadError } = await supabaseClient.storage
                        .from('site-images')
                        .upload(filePath, file);
                        
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('site-images')
                        .getPublicUrl(filePath);
                        
                    iconVal = publicUrl;
                    document.getElementById(`process-step-${i}-ico`).value = iconVal;
                    
                    if (oldIconVal && oldIconVal !== iconVal && (oldIconVal.startsWith('http') || oldIconVal.startsWith('/'))) {
                        filesToDelete.push(oldIconVal);
                    }
                }
                
                steps.push({
                    step: `Step 0${i}`,
                    icon: iconVal,
                    title: document.getElementById(`process-step-${i}-title`).value,
                    description: document.getElementById(`process-step-${i}-desc`).value
                });
            }
            
            const processData = {
                sub: document.getElementById('process-sub').value,
                steps: steps
            };
            
            statusEl.textContent = 'Updating database...';
            const { error } = await supabaseClient
                .from('site_content')
                .upsert({ key: 'process', content: processData });
                
            if (error) throw error;
            
            currentSiteContent['process'] = processData;
            
            // Delete old files from storage
            for (const url of filesToDelete) {
                const oldPath = getStoragePathFromUrl(url, 'site-images');
                if (oldPath) {
                    await supabaseClient.storage.from('site-images').remove([oldPath]);
                }
            }
            
            statusEl.textContent = 'Process section saved successfully!';
            setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error('Error saving process section:', error);
            statusEl.className = 'status-msg error';
            statusEl.textContent = 'Error: ' + error.message;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Process Section';
        }
    });

    document.getElementById('about-content-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-about-btn');
        const statusEl = document.getElementById('about-form-status');
        
        btn.disabled = true;
        btn.textContent = 'Saving...';
        statusEl.className = 'status-msg success';
        statusEl.textContent = 'Saving about section...';
        statusEl.style.display = 'block';
        
        try {
            const cards = [];
            for (let i = 1; i <= 3; i++) {
                cards.push({
                    value: document.getElementById(`about-card-${i}-val`).value,
                    label: document.getElementById(`about-card-${i}-lbl`).value,
                    description: document.getElementById(`about-card-${i}-desc`).value
                });
            }
            
            const aboutData = {
                title: document.getElementById('about-title').value,
                paragraphs: [
                    document.getElementById('about-p1').value,
                    document.getElementById('about-p2').value
                ],
                cards: cards
            };
            
            const { error } = await supabaseClient
                .from('site_content')
                .upsert({ key: 'about', content: aboutData });
                
            if (error) throw error;
            
            statusEl.textContent = 'About section saved successfully!';
            setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
        } catch (error) {
            console.error('Error saving about section:', error);
            statusEl.className = 'status-msg error';
            statusEl.textContent = 'Error: ' + error.message;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save About Section';
        }
    });

    async function loadOrders() {
        const listEl = document.getElementById('admin-orders-list');
        if (!listEl) return;
        listEl.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading orders...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (!data || !data.length) {
                listEl.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--gray4);">No orders found.</td></tr>';
                return;
            }
            
            const STATUS_STYLES = {
                pending: 'background: rgba(255, 193, 7, 0.15); color: #ffc107;',
                confirmed: 'background: rgba(33, 150, 243, 0.15); color: #2196f3;',
                printing: 'background: rgba(156, 39, 176, 0.15); color: #9c27b0;',
                dispatched: 'background: rgba(255, 87, 34, 0.15); color: #ff5722;',
                delivered: 'background: rgba(76, 175, 80, 0.15); color: #4caf50;'
            };
            
            listEl.innerHTML = data.map(order => {
                const date = new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let itemsHtml = '';
                if (Array.isArray(order.items)) {
                    itemsHtml = order.items.map(item => `• ${escapeHtml(item.name)} (x${item.qty || item.quantity || 1})`).join('<br>');
                } else if (typeof order.items === 'string') {
                    try {
                        const parsed = JSON.parse(order.items);
                        itemsHtml = parsed.map(item => `• ${escapeHtml(item.name)} (x${item.qty || item.quantity || 1})`).join('<br>');
                    } catch (e) {
                        itemsHtml = escapeHtml(order.items);
                    }
                }
                
                const statusOptions = ['pending', 'confirmed', 'printing', 'dispatched', 'delivered'].map(s => {
                    const sel = order.status === s ? 'selected' : '';
                    return `<option value="${s}" ${sel}>${s.toUpperCase()}</option>`;
                }).join('');
                
                const style = STATUS_STYLES[order.status || 'pending'] || STATUS_STYLES.pending;
                
                return `
                <tr>
                    <td style="font-family: monospace; font-weight: 600;">${escapeHtml(order.order_ref)}</td>
                    <td style="font-size: 13px; color: var(--gray4);">${date}</td>
                    <td style="font-size: 13px; line-height: 1.5; text-align: left;">${itemsHtml}</td>
                    <td style="font-weight: 500;">₹${Number(order.total).toLocaleString('en-IN')}</td>
                    <td>
                        <span class="status-pill" style="text-transform: uppercase; font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600; ${style}">
                            ${escapeHtml(order.status || 'pending')}
                        </span>
                    </td>
                    <td>
                        <select onchange="updateOrderStatus('${order.id}', this.value)" style="background: var(--gray8); border: 1px solid var(--line); color: var(--white); padding: 6px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            ${statusOptions}
                        </select>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) {
            console.error('Error loading orders:', e);
            listEl.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ff6b6b;">Failed to load orders.</td></tr>';
        }
    }

    window.updateOrderStatus = async function(orderId, newStatus) {
        try {
            const { error } = await supabaseClient
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);
                
            if (error) throw error;
            
            loadOrders();
        } catch (e) {
            console.error('Error updating order status:', e);
            alert('Failed to update order status.');
        }
    };

    async function loadEnquiries() {
        const listEl = document.getElementById('admin-enquiries-list');
        if (!listEl) return;
        listEl.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading enquiries...</td></tr>';
        
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (!data || !data.length) {
                listEl.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--gray4);">No enquiries found.</td></tr>';
                return;
            }
            
            listEl.innerHTML = data.map(msg => {
                const date = new Date(msg.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const cleanPhone = msg.phone.replace(/[^0-9]/g, '');
                const phoneWithCode = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
                
                return `
                <tr>
                    <td style="font-size: 13px; color: var(--gray4);">${date}</td>
                    <td style="font-weight: 500;">${escapeHtml(msg.name)}</td>
                    <td style="font-size: 13px; line-height: 1.4; text-align: left;">
                        📱 ${escapeHtml(msg.phone)}<br>
                        ✉️ ${escapeHtml(msg.email)}
                    </td>
                    <td style="text-transform: capitalize; font-size: 13px;">${escapeHtml(msg.service || 'Other')}</td>
                    <td style="font-size: 13px; max-width: 250px; white-space: pre-wrap; line-height: 1.4; text-align: left;">${escapeHtml(msg.message)}</td>
                    <td>
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <a href="https://wa.me/${phoneWithCode}" target="_blank" class="btn btn-white" style="padding: 6px 12px; font-size: 12px; text-decoration: none;">Reply</a>
                            <button onclick="deleteEnquiry('${msg.id}')" class="btn btn-border" style="padding: 6px 12px; font-size: 12px; color: #ff6b6b; border-color: rgba(255,107,107,0.3); background: transparent;">Delete</button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) {
            console.error('Error loading enquiries:', e);
            listEl.innerHTML = '<tr><td colspan="6" style="text-align:center; color: #ff6b6b;">Failed to load enquiries.</td></tr>';
        }
    }

    window.deleteEnquiry = async function(msgId) {
        if (!confirm('Are you sure you want to delete this enquiry?')) return;
        try {
            const { error } = await supabaseClient
                .from('messages')
                .delete()
                .eq('id', msgId);
                
            if (error) throw error;
            
            loadEnquiries();
        } catch (e) {
            console.error('Error deleting enquiry:', e);
            alert('Failed to delete enquiry.');
        }
    };

    // Bug #16: removed local duplicate — use centralized window.escHtml from supabase.js.
    const escapeHtml = window.escHtml;

    function getStoragePathFromUrl(url, bucketName) {
        if (!url) return null;
        const marker = `/storage/v1/object/public/${bucketName}/`;
        const index = url.indexOf(marker);
        if (index !== -1) {
            return decodeURIComponent(url.substring(index + marker.length));
        }
        return null;
    }
});
