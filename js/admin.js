// admin.js - Admin Dashboard Logic

let supabaseClient = window.supabaseClient;
let currentUser = null;
const ADMIN_EMAIL = 'raj@littlelayers.in';
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

    if (currentUser.email !== ADMIN_EMAIL) {
        loadingContainer.innerHTML = `
            <div class="loadbox" style="margin-top: 100px;">
                <p style="color: #ff6b6b; margin-bottom: 16px;">Access Denied</p>
                <p>You do not have permission to view this page.</p>
                <a href="index.html" class="btn btn-border" style="margin-top: 20px;">Return Home</a>
            </div>
        `;
        return;
    }

    // Admin authenticated successfully
    loadingContainer.style.display = 'none';
    adminContent.style.display = 'block';

    // Load initial data
    loadProducts();
    loadGallery();

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
            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
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
            const { error } = await supabaseClient
                .from('gallery')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
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
            }
            
            const galleryData = {
                title: document.getElementById('gallery-title').value,
                caption: document.getElementById('gallery-caption').value || null,
                sort_order: parseInt(document.getElementById('gallery-sort').value) || 0,
                image_url: imageUrl,
                active: document.getElementById('gallery-active').checked,
                updated_at: new Date()
            };
            
            showGalleryStatus('Updating database...', 'success');
            
            if (id) {
                const { error } = await supabaseClient
                    .from('gallery')
                    .update(galleryData)
                    .eq('id', id);
                if (error) throw error;
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

    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
