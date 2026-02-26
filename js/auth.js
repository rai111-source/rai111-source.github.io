// Initialize Supabase client
const SUPABASE_URL = 'https://amzijtwogsibxganxsty.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AU321-iXA66NaZ0d4FShPw_0h83Qy9J';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;


document.addEventListener('DOMContentLoaded', () => {
    // -- Elements --
    const userBtn = document.getElementById('user-btn'); // The user icon in the header

    // Login Page Elements
    const pageLoginForm = document.getElementById('page-login-form');
    const pageAuthEmailInput = document.getElementById('page-auth-email');
    const pageAuthPasswordInput = document.getElementById('page-auth-password');
    const pageAuthToggleText = document.getElementById('page-auth-toggle-text');
    const pageAuthErrorMsg = document.getElementById('page-auth-error');
    const pageTitle = document.getElementById('page-title');
    const pageAuthBtn = document.getElementById('page-auth-btn');

    // Profile Page Elements
    const profileForm = document.getElementById('profile-form');
    const profileEmailDisplay = document.getElementById('profile-email-display');
    const logoutBtn = document.getElementById('logout-btn');
    const profileStatus = document.getElementById('profile-status');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Profile Fields
    const profileName = document.getElementById('profile-name');
    const profileDob = document.getElementById('profile-dob');
    const profileAddress = document.getElementById('profile-address');
    const profileAvatarInput = document.getElementById('profile-avatar-input');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const profileAvatarIcon = document.getElementById('profile-avatar-icon');

    let isSignUpMode = false;
    let currentUser = null;

    // -- Check Session on Load --
    checkUserSession();

    // -- Header Icon Logic --
    if (userBtn) {
        userBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                // Currently logged in, go to profile
                window.location.href = 'profile.html';
            } else {
                // Go to login page
                window.location.href = 'login.html';
            }
        });
    }

    // -- Check URL Params for Sign Up Mode --
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup' && pageAuthToggleText) {
        isSignUpMode = true;
        updatePageAuthUI();
    }

    // -- Login Page Logic --
    if (pageAuthToggleText) {
        pageAuthToggleText.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                isSignUpMode = !isSignUpMode;
                updatePageAuthUI();
            }
        });
    }

    if (pageLoginForm) {
        pageLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            pageAuthErrorMsg.textContent = ''; // clear previous errors
            const email = pageAuthEmailInput.value;
            const password = pageAuthPasswordInput.value;

            if (isSignUpMode) {
                await handleSignUp(email, password);
            } else {
                await handleLogin(email, password);
            }
        });
    }

    // -- Profile Page Logic --
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            toggleProfileEdit(true);
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            toggleProfileEdit(false);
            // Reset fields to original values by re-fetching
            if (currentUser) fetchUserProfile(currentUser.id);
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUserProfile();
        });
    }

    if (profileAvatarInput) {
        profileAvatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    updateAvatarUI(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    /* --- Auth Functions --- */

    async function checkUserSession() {
        const { data, error } = await supabaseClient.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
            updateHeaderUI();
            handleProfilePageLoad();
        } else {
            currentUser = null;
            updateHeaderUI();

            // If on profile page and not logged in, redirect to login
            if (window.location.pathname.includes('profile.html')) {
                window.location.href = 'login.html';
            }
        }

        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                currentUser = session.user;
            } else {
                currentUser = null;
            }
            updateHeaderUI();
        });
    }

    async function handleSignUp(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (error) throw error;

            alert('Signup successful! Please check your email for verification. Or you may be logged in automatically.');
            window.location.href = 'profile.html';
        } catch (error) {
            pageAuthErrorMsg.textContent = error.message;
        }
    }

    async function handleLogin(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            window.location.href = 'profile.html';
        } catch (error) {
            pageAuthErrorMsg.textContent = "Invalid login credentials";
        }
    }

    async function handleLogout() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;

            window.location.href = 'logout.html';
        } catch (error) {
            console.error('Logout error:', error.message);
        }
    }

    /* --- Profile Functions --- */

    async function handleProfilePageLoad() {
        if (!profileEmailDisplay || !currentUser) return;

        profileEmailDisplay.textContent = currentUser.email;
        await fetchUserProfile(currentUser.id);
    }

    async function fetchUserProfile(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 means zero rows found, which is fine for first login
                throw error;
            }

            if (data) {
                if (profileName) profileName.value = data.name || '';
                if (profileDob) profileDob.value = data.dob || '';
                if (profileAddress) profileAddress.value = data.address || '';
                if (profileAvatar) profileAvatar.value = data.avatar_url || '';

                updateAvatarUI(data.avatar_url);
            }
        } catch (error) {
            console.error('Error fetching profile:', error.message);
        }
    }

    async function saveUserProfile() {
        if (!currentUser) return;

        showProfileStatus('Saving...', 'var(--color-text-muted)');
        toggleProfileEdit(false);

        let avatarUrl = profileAvatar.value;

        // --- Handle File Upload ---
        if (profileAvatarInput && profileAvatarInput.files && profileAvatarInput.files[0]) {
            try {
                const file = profileAvatarInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${currentUser.id}/${fileName}`;


                showProfileStatus('Uploading image...', 'var(--color-text-muted)');

                let { error: uploadError, data } = await supabaseClient.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                avatarUrl = publicUrl;
                profileAvatar.value = avatarUrl; // Update hidden input for consistency

            } catch (error) {
                showProfileStatus('Upload failed: ' + error.message, 'var(--color-accent)');
                toggleProfileEdit(true);
                return;
            }
        }

        const updates = {
            id: currentUser.id,
            name: profileName.value,
            dob: profileDob.value || null, // Handle empty date
            address: profileAddress.value,
            avatar_url: avatarUrl,
            updated_at: new Date()
        };

        try {
            const { error } = await supabaseClient
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            showProfileStatus('Profile saved successfully!', 'green');
            updateAvatarUI(profileAvatar.value);

            setTimeout(() => {
                profileStatus.style.display = 'none';
            }, 3000);

        } catch (error) {
            showProfileStatus('Error saving profile: ' + error.message, 'var(--color-accent)');
            toggleProfileEdit(true); // Re-enable editing on error
        }
    }

    /* --- UI Helpers --- */

    function updatePageAuthUI() {
        if (!pageTitle || !pageAuthBtn || !pageAuthToggleText) return;

        if (isSignUpMode) {
            pageTitle.textContent = 'Create Account';
            pageAuthBtn.textContent = 'Sign Up';
            pageAuthToggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-auth-mode">Login</a>';
        } else {
            pageTitle.textContent = 'Login';
            pageAuthBtn.textContent = 'Sign In';
            pageAuthToggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-auth-mode">Sign up</a>';
        }
    }

    function updateHeaderUI() {
        const authButtons = document.getElementById('auth-buttons');

        if (userBtn) {
            const icon = userBtn.querySelector('i');
            const textSpan = userBtn.querySelector('span#user-btn-text');

            if (currentUser) {
                // Logged in state
                if (authButtons) authButtons.style.display = 'none';

                if (icon) {
                    icon.className = 'ph-fill ph-user';
                    icon.style.display = 'inline-block';
                }
                if (textSpan) textSpan.style.display = 'none';
                userBtn.title = `Profile (${currentUser.email})`;
                userBtn.style.padding = ""; // Reset to default
                userBtn.style.display = "flex";
                userBtn.style.alignItems = "center";
            } else {
                // Logged out state
                if (authButtons) {
                    authButtons.style.display = 'flex';
                    userBtn.style.display = 'none';
                } else {
                    if (icon) icon.style.display = 'none';
                    if (textSpan) textSpan.style.display = 'block';
                    userBtn.title = 'Login';
                    userBtn.style.display = "flex";
                    userBtn.style.alignItems = "center";
                }
            }
        }
    }

    function toggleProfileEdit(isEditing) {
        const inputs = [profileName, profileDob, profileAddress, profileAvatarInput];

        inputs.forEach(input => {
            if (input) input.disabled = !isEditing;
        });

        if (editProfileBtn) editProfileBtn.style.display = isEditing ? 'none' : 'block';
        if (saveProfileBtn) saveProfileBtn.style.display = isEditing ? 'block' : 'none';
        if (cancelEditBtn) cancelEditBtn.style.display = isEditing ? 'block' : 'none';

        if (isEditing && profileName) {
            profileName.focus();
        }
    }

    function showProfileStatus(message, color) {
        if (!profileStatus) return;
        profileStatus.textContent = message;
        profileStatus.style.backgroundColor = color === 'green' ? '#e6f4ea' : (color === 'var(--color-accent)' ? '#fdecea' : '#f1f3f4');
        profileStatus.style.color = color === 'green' ? '#137333' : color;
        profileStatus.style.display = 'block';
    }

    function updateAvatarUI(url) {
        if (!profileAvatarImg || !profileAvatarIcon) return;

        if (url && url.trim() !== '') {
            profileAvatarImg.src = url;
            profileAvatarImg.style.display = 'block';
            profileAvatarIcon.style.display = 'none';
        } else {
            profileAvatarImg.style.display = 'none';
            profileAvatarIcon.style.display = 'block';
        }
    }
});
