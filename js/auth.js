// Supabase client is initialized globally in js/supabase.js
let supabaseClient = window.supabaseClient;


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
    const googleLoginBtn = document.getElementById('google-login-btn');
    const githubLoginBtn = document.getElementById('github-login-btn');

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

    let authMode = 'login'; // 'login', 'signup', 'forgot', 'reset'
    let currentUser = null;

    // Recheck Supabase client variable in case it was loaded asynchronously
    if (!supabaseClient) {
        supabaseClient = window.supabaseClient;
    }

    // Guard against unconfigured database client
    if (!supabaseClient) {
        console.error("Supabase client is not initialized. Please configure YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY in js/supabase.js.");
        if (pageAuthErrorMsg) {
            pageAuthErrorMsg.textContent = "Authentication is currently unavailable. Please verify database configuration.";
        }
        if (pageAuthBtn) pageAuthBtn.disabled = true;
        if (googleLoginBtn) googleLoginBtn.disabled = true;
        if (githubLoginBtn) githubLoginBtn.disabled = true;
        return;
    }

    // -- Check Session on Load --
    checkUserSession();

    // -- Header Icon Logic --
    if (userBtn) {
        userBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                // Currently logged in, go to profile or admin
                if (currentUser.email === 'raj@littlelayers.in') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'profile.html';
                }
            } else {
                // Go to login page
                window.location.href = 'login.html';
            }
        });
    }

    // -- Check URL Params/Hash for Auth Mode --
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    if (modeParam === 'signup') {
        authMode = 'signup';
    } else if (modeParam === 'reset') {
        authMode = 'reset';
    }

    // -- Login Page Logic --
    if (pageAuthToggleText) {
        pageAuthToggleText.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const targetId = e.target.id;
                if (targetId === 'toggle-auth-mode') {
                    authMode = (authMode === 'login') ? 'signup' : 'login';
                } else if (targetId === 'back-to-login-link') {
                    authMode = 'login';
                }
                updatePageAuthUI();
            }
        });
    }

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            authMode = 'forgot';
            updatePageAuthUI();
        });
    }

    updatePageAuthUI();

    if (pageLoginForm) {
        pageLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (pageAuthErrorMsg) pageAuthErrorMsg.textContent = ''; // clear previous errors
            
            if (authMode === 'signup') {
                const email = pageAuthEmailInput.value;
                const password = pageAuthPasswordInput.value;
                await handleSignUp(email, password);
            } else if (authMode === 'login') {
                const email = pageAuthEmailInput.value;
                const password = pageAuthPasswordInput.value;
                await handleLogin(email, password);
            } else if (authMode === 'forgot') {
                const email = pageAuthEmailInput.value;
                await handleForgotPassword(email);
            } else if (authMode === 'reset') {
                const password = pageAuthPasswordInput.value;
                await handleResetPassword(password);
            }
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleGoogleLogin();
        });
    }

    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleGithubLogin();
        });
    }

    // Intercept clicks on login links to save the return URL
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a && a.href && a.href.includes('login.html')) {
            // Only save if we are not already on the login page
            if (!window.location.href.includes('login.html') && !window.location.href.includes('logout.html')) {
                sessionStorage.setItem('redirectAfterAuth', window.location.href);
            }
        }
    });

    // -- Profile Page Logic --
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const mobLogoutBtn = document.getElementById('mobnav-logout');
    if (mobLogoutBtn) {
        mobLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const mobnav = document.getElementById('mobnav');
            if (mobnav) mobnav.classList.remove('open');
            handleLogout();
        });
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
                if (event === 'PASSWORD_RECOVERY') {
                    authMode = 'reset';
                    updatePageAuthUI();
                }
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

            if (data.session) {
                if (pageAuthErrorMsg) {
                    pageAuthErrorMsg.style.color = "#10B981";
                    pageAuthErrorMsg.textContent = "Signup successful! Redirecting...";
                }
                setTimeout(() => {
                    const returnUrl = sessionStorage.getItem('redirectAfterAuth');
                    if (returnUrl) {
                        sessionStorage.removeItem('redirectAfterAuth');
                        window.location.href = returnUrl;
                    } else {
                        window.location.href = 'profile.html';
                    }
                }, 1000);
            } else {
                // If data.session is null, email confirmation is still enabled in Supabase Auth settings
                if (pageAuthErrorMsg) {
                    pageAuthErrorMsg.style.color = "#ffb020";
                    pageAuthErrorMsg.textContent = "Account created, but email verification is required. Please check your inbox or disable 'Confirm email' in your Supabase settings.";
                }
                alert('Account created, but email verification is required. Please check your inbox or disable "Confirm email" in your Supabase Auth settings to bypass verification.');
            }
        } catch (error) {
            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#ff6b6b";
                pageAuthErrorMsg.textContent = error.message;
            }
        }
    }

    async function handleLogin(email, password) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (email === 'raj@littlelayers.in') {
                sessionStorage.removeItem('redirectAfterAuth'); // Admin always goes to admin panel
                window.location.href = 'admin.html';
            } else {
                const returnUrl = sessionStorage.getItem('redirectAfterAuth');
                if (returnUrl) {
                    sessionStorage.removeItem('redirectAfterAuth');
                    window.location.href = returnUrl;
                } else {
                    window.location.href = 'profile.html';
                }
            }
        } catch (error) {
            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#ff6b6b";
                pageAuthErrorMsg.textContent = error.message;
            }
        }
    }

    async function handleForgotPassword(email) {
        try {
            const redirectUrl = window.location.origin + window.location.pathname + '?mode=reset';
            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;

            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#10B981";
                pageAuthErrorMsg.textContent = "Password reset link sent to your email!";
            }
            alert('Password reset link sent! Please check your email inbox.');
        } catch (error) {
            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#ff6b6b";
                pageAuthErrorMsg.textContent = error.message;
            }
        }
    }

    async function handleResetPassword(password) {
        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#10B981";
                pageAuthErrorMsg.textContent = "Password updated successfully! Redirecting...";
            }
            alert('Password updated successfully! Redirecting to your profile...');
            window.location.href = 'profile.html';
        } catch (error) {
            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#ff6b6b";
                pageAuthErrorMsg.textContent = error.message;
            }
        }
    }

    async function handleGoogleLogin() {
        try {
            let redirectUrl = sessionStorage.getItem('redirectAfterAuth');
            if (!redirectUrl) {
                redirectUrl = window.location.href.split('login.html')[0] + 'profile.html';
            } else {
                // We leave it in sessionStorage so when OAuth redirects back to the site, 
                // the session is verified and we are on the requested page. 
                // Actually, OAuth redirects directly to redirectUrl.
                sessionStorage.removeItem('redirectAfterAuth');
            }
            
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });
            if (error) throw error;
        } catch (error) {
            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#ff6b6b";
                pageAuthErrorMsg.textContent = "Google login error: " + error.message;
            }
            console.error('Google login error:', error.message);
        }
    }

    async function handleGithubLogin() {
        try {
            let redirectUrl = sessionStorage.getItem('redirectAfterAuth');
            if (!redirectUrl) {
                redirectUrl = window.location.href.split('login.html')[0] + 'profile.html';
            } else {
                sessionStorage.removeItem('redirectAfterAuth');
            }

            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: redirectUrl
                }
            });
            if (error) throw error;
        } catch (error) {
            if (pageAuthErrorMsg) {
                pageAuthErrorMsg.style.color = "#ff6b6b";
                pageAuthErrorMsg.textContent = "GitHub login error: " + error.message;
            }
            console.error('GitHub login error:', error.message);
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

        const emailGroup = document.getElementById('email-group');
        const passwordGroup = document.getElementById('password-group');
        const passwordLabel = document.getElementById('password-label');
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        const authDivider = document.querySelector('.auth-divider');
        const googleBtn = document.getElementById('google-login-btn');
        const githubBtn = document.getElementById('github-login-btn');

        // Reset visibility of elements
        if (emailGroup) emailGroup.style.display = 'flex';
        if (passwordGroup) passwordGroup.style.display = 'flex';
        if (passwordLabel) passwordLabel.textContent = 'Password';
        if (forgotPasswordLink) forgotPasswordLink.style.display = 'inline';
        if (authDivider) authDivider.style.display = 'block';
        if (googleBtn) googleBtn.style.display = 'flex';
        if (githubBtn) githubBtn.style.display = 'flex';

        // Toggle required attributes to prevent browser blockages on hidden inputs
        if (pageAuthEmailInput) pageAuthEmailInput.required = (authMode !== 'reset');
        if (pageAuthPasswordInput) pageAuthPasswordInput.required = (authMode !== 'forgot');

        if (pageAuthErrorMsg) pageAuthErrorMsg.textContent = ''; // Clear prior message

        if (authMode === 'signup') {
            pageTitle.textContent = 'Create Account';
            pageAuthBtn.textContent = 'Sign Up';
            pageAuthToggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-auth-mode" style="color: var(--white); text-decoration: underline; text-underline-offset: 3px;">Login</a>';
        } else if (authMode === 'login') {
            pageTitle.textContent = 'Login';
            pageAuthBtn.textContent = 'Sign In';
            pageAuthToggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggle-auth-mode" style="color: var(--white); text-decoration: underline; text-underline-offset: 3px;">Sign up</a>';
        } else if (authMode === 'forgot') {
            pageTitle.textContent = 'Reset Password';
            pageAuthBtn.textContent = 'Send Reset Link';
            if (passwordGroup) passwordGroup.style.display = 'none';
            if (authDivider) authDivider.style.display = 'none';
            if (googleBtn) googleBtn.style.display = 'none';
            if (githubBtn) githubBtn.style.display = 'none';
            pageAuthToggleText.innerHTML = 'Remembered your password? <a href="#" id="back-to-login-link" style="color: var(--white); text-decoration: underline; text-underline-offset: 3px;">Login</a>';
        } else if (authMode === 'reset') {
            pageTitle.textContent = 'Update Password';
            pageAuthBtn.textContent = 'Update Password';
            if (emailGroup) emailGroup.style.display = 'none';
            if (passwordLabel) passwordLabel.textContent = 'New Password';
            if (forgotPasswordLink) forgotPasswordLink.style.display = 'none';
            if (authDivider) authDivider.style.display = 'none';
            if (googleBtn) googleBtn.style.display = 'none';
            if (githubBtn) githubBtn.style.display = 'none';
            pageAuthToggleText.innerHTML = 'Go to <a href="#" id="back-to-login-link" style="color: var(--white); text-decoration: underline; text-underline-offset: 3px;">Login</a>';
        }
    }

    function updateHeaderUI() {
        const authButtons = document.getElementById('auth-buttons');

        // Toggle mobile nav auth links depending on session state
        const mobGuests = document.querySelectorAll('.mobnav-guest');
        const mobUsers = document.querySelectorAll('.mobnav-user');
        const mobDividers = document.querySelectorAll('.mobnav-divider');

        if (currentUser) {
            mobGuests.forEach(el => el.style.display = 'none');
            mobUsers.forEach(el => el.style.display = 'block');
            mobDividers.forEach(el => el.style.display = 'block');
        } else {
            mobGuests.forEach(el => el.style.display = 'block');
            mobUsers.forEach(el => el.style.display = 'none');
            mobDividers.forEach(el => el.style.display = 'none');
        }

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
