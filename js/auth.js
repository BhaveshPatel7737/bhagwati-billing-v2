// Initialize Supabase client
const supabaseUrl = window.location.origin.includes('localhost') 
    ? 'YOUR_SUPABASE_URL' 
    : 'YOUR_SUPABASE_URL';
const supabaseKey = window.location.origin.includes('localhost')
    ? 'YOUR_SUPABASE_ANON_KEY'
    : 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Check if user is already logged in
async function checkAuth() {
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
    supabase.auth.signOut().then(() => {
        window.location.href = '/login.html';
    });
}

// Run auth check on page load
if (window.location.pathname !== '/login.html') {
    checkAuth();
}