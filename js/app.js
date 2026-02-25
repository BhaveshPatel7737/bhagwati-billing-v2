// API & Supabase Configuration (use env vars)
const API_BASE = 'https://bhagwati-billing.onrender.com/api';  // ✅ LIVE

// Load from global/window (set in index.html or server)
const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global App State
const App = {
  currentTab: 'invoices-create',
  
  // Initialize application
  init: async function() {
    console.log('🔐 Checking authentication...');
    
    // AUTH FIRST - BLOCKS APP UNTIL LOGGED IN
    const isAuth = await this.checkAuth();
    if (!isAuth) return;
    
    console.log('🚀 Bhagwati Billing App Starting...');
    this.setupEventListeners();
    this.setCurrentDate();
    this.loadInitialData();
    
    console.log('✅ App Initialized');
  },
  
  // Check Supabase auth
  checkAuth: async function() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error || !session) {
        console.log('❌ No session - redirecting to login');
        window.location.href = '/login.html';
        return false;
      }
      
      console.log('✅ Authenticated:', session.user.email);
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/login.html';
      return false;
    }
  },
  
  // Logout
  logout: function() {
    supabaseClient.auth.signOut();
    window.location.href = '/login.html';
  },
  
  // Setup all event listeners
  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Form submissions
    document.getElementById('customer-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      Customer.save();
    });
    
    document.getElementById('hsn-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      HSN.save();
    });
    
    document.getElementById('invoice-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      Invoice.create();
    });
    
    // Logout button (add to HTML: <button onclick="App.logout()">Logout</button>)
    document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
  },
  
  // Switch between tabs
  switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) btn.classList.add('active');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    
    this.currentTab = tabName;
    this.loadTabData(tabName);
  },
  
  loadTabData(tabName) {
    switch(tabName) {
      case 'customers': Customer.loadAll(); break;
      case 'hsn': HSN.loadAll(); break;
      case 'invoices-create':
        Customer.loadForDropdown();
        Invoice.suggestNextNumber();
        Invoice.addLine();
        break;
      case 'invoices-list': Invoice.loadList(); break;
    }
  },
  
  // Load initial data
  async loadInitialData() {
    try {
      await Promise.all([
        Customer.loadAll(),
        HSN.loadAll(),
        Customer.loadForDropdown(),
        Invoice.suggestNextNumber()
      ]);
      Invoice.addLine();
    } catch (error) {
      this.showMessage('Error loading data: ' + error.message, 'error');
    }
  },
  
  showMessage(text, type = 'info') {
    const msgBar = document.getElementById('message-bar');
    if (!msgBar) return;
    msgBar.textContent = text;
    msgBar.className = `message-bar ${type}`;
    msgBar.style.display = 'block';
    setTimeout(() => msgBar.style.display = 'none', 4000);
  },
  
  setCurrentDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
    
    // FIXED: Safe assignment
    const invDateEl = document.getElementById('inv-date');
    if (invDateEl) {
      invDateEl.valueAsDate = new Date();
    }
  },

  
  // AUTHENTICATED API HELPERS
  async get(endpoint) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
    return response.json();
  },
  
  async post(endpoint, data) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  },
  
  async put(endpoint, data) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  },
  
  async delete(endpoint) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }
};

// Load Supabase CDN + Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase to load
  if (typeof supabase === 'undefined') {
    document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    return setTimeout(() => App.init(), 500);
  }
  await App.init();
});
