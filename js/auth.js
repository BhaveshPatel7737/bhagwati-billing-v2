// Initialize Supabase client
// Note: These values are fetched from your backend environment variables
let supabaseUrl = '';
let supabaseKey = '';
let supabase = null;

// Fetch Supabase config from backend
async function initSupabase() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        supabaseUrl = config.supabaseUrl;
        supabaseKey = config.supabaseKey;
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Check if user is already logged in
async function checkAuth() {
    if (!supabase) {
        const initialized = await initSupabase();
        if (!initialized) {
            console.error('Supabase initialization failed');
            return;
        }
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // User is logged in
        if (window.location.pathname === '/login.html') {
            window.location.href = '/';
        }
    } else {
        // User is not logged in
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }
}

// Login form handler
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!supabase) {
            await initSupabase();
        }
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        const loginBtn = document.getElementById('loginBtn');
        
        // Disable button
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMsg.style.display = 'none';
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            // Success - redirect to main page
            window.location.href = '/';
            
        } catch (error) {
            errorMsg.textContent = error.message || 'Login failed. Please try again.';
            errorMsg.style.display = 'block';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });
}

// Logout function
function logout() {
    if (supabase) {
        supabase.auth.signOut().then(() => {
            window.location.href = '/login.html';
        });
    }
}

// Run auth check on page load
if (window.location.pathname !== '/login.html') {
    checkAuth();
}