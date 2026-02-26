// API Configuration
const API_BASE = 'https://bhagwati-billing.onrender.com/api';  // âœ… LIVE


// Global App State
const App = {
  currentTab: 'invoices-create',
  
  // Initialize application
  init() {
    console.log('ðŸš€ Bhagwati Billing App Starting...');
    
    this.setupEventListeners();
    this.setCurrentDate();
    this.loadInitialData();
    
    console.log('âœ… App Initialized');
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
    document.getElementById('customer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Customer.save();
    });
    
    document.getElementById('hsn-form').addEventListener('submit', (e) => {
      e.preventDefault();
      HSN.save();
    });
    
    document.getElementById('invoice-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Invoice.create();
    });
  },
  
  // Switch between tabs
  switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Load tab-specific data
    this.currentTab = tabName;
    this.loadTabData(tabName);
  },
  
  // Load data for specific tab
  loadTabData(tabName) {
    switch(tabName) {
      case 'customers':
        Customer.loadAll();
        break;
      case 'hsn':
        HSN.loadAll();
        break;
      case 'invoices-create':
        Customer.loadForDropdown();
        Invoice.suggestNextNumber();
        Invoice.addLine(); // Add first line
        break;
      case 'invoices-list':
        Invoice.loadList();
        break;
    }
  },
  
  // Load initial data on startup
  async loadInitialData() {
    try {
      await Customer.loadAll();
      await HSN.loadAll();

      await Customer.loadForDropdown(); 
      await Invoice.suggestNextNumber();
      Invoice.addLine(); // Add first invoice line

    } catch (error) {
      this.showMessage('Error loading initial data', 'error');
    }
  },
  
  // Show message to user
  showMessage(text, type = 'info') {
    const msgBar = document.getElementById('message-bar');
    msgBar.textContent = text;
    msgBar.className = `message-bar ${type}`;
    msgBar.style.display = 'block';
    
    setTimeout(() => {
      msgBar.style.display = 'none';
    }, 4000);
  },
  
  // Set current date in header
  setCurrentDate() {
    const dateEl = document.getElementById('current-date');
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Set invoice date to today
    document.getElementById('inv-date').valueAsDate = now;
  },
  
  // API Helper - GET
  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
  
  // API Helper - POST
  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },
  
  // API Helper - DELETE
  async delete(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  },

  // API Helper - PUT
  async put(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return response.json();
  }

};


// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
