const express = require('express');
const cors = require('cors');
const path = require('path');

// Supabase Admin Client (server-side)
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;  // Service role from Supabase
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: 'https://bhagwati-billing.onrender.com',  // Secure your domain
  credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// ✅ FIXED AUTH MIDDLEWARE (server-side Supabase)
app.use('/api/*', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    // Verify JWT with Supabase Admin
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log(`✅ Auth OK: ${user.email}`);
    next();
  } catch (e) {
    console.error('Auth middleware error:', e);
    res.status(401).json({ error: 'Auth failed' });
  }
});

// Serve login page
app.get('/login.html', (req, res) => res.sendFile(__dirname + '/login.html'));
app.get('/login', (req, res) => res.redirect('/login.html'));

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/print.html', (req, res) => res.sendFile(__dirname + '/print.html'));

// Database client (for custom routes)
const supabaseUrlAnon = process.env.SUPABASE_URL;
const supabaseKeyAnon = process.env.SUPABASE_ANON_KEY;
const db = createClient(supabaseUrlAnon, supabaseKeyAnon);

// ===== CUSTOM CUSTOMER ROUTES =====
app.delete('/api/customers/clear-all', async (req, res) => {
  console.log('🗑️ Clearing all customers...');
  try {
    // Clear in correct order (lines → invoices → customers)
    await db.from('invoice_lines').delete().neq('id', 0);
    await db.from('invoices').delete().neq('id', 0);
    await db.from('customers').delete().neq('id', 0);
    
    console.log('✅ Cleared all data');
    res.json({ message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers/bulk', async (req, res) => {
  const { customers, clearFirst } = req.body;
  
  if (!customers || !Array.isArray(customers)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  console.log(`📥 Importing ${customers.length} customers`);
  
  try {
    if (clearFirst) {
      await db.from('invoice_lines').delete().neq('id', 0);
      await db.from('invoices').delete().neq('id', 0);
      await db.from('customers').delete().neq('id', 0);
      console.log('✅ Cleared existing data');
    }
    
    const formattedCustomers = customers.map(cust => ({
      name: cust.name || '',
      gstin: cust.gstin || '',
      state: cust.state || 'Gujarat',
      state_code: cust.state_code || '24',
      address: cust.address || '',
      mobile: cust.mobile || '',
      email: cust.email || ''
    }));
    
    const { data, error } = await db.from('customers').insert(formattedCustomers);
    if (error) throw error;
    
    console.log(`✅ Bulk imported ${data?.length || 0} customers`);
    res.json({ 
      success: true, 
      inserted: data?.length || 0, 
      total: customers.length 
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== STANDARD ROUTES =====
app.use('/api/customers', require('./routes/customers'));
app.use('/api/hsn', require('./routes/hsn'));

// ✅ KEEP YOUR WORKING EDIT ROUTE
app.get('/api/invoices/:id/edit', async (req, res) => {
  try {
    const { data: invoice, error: invError } = await db
      .from('invoices')
      .select('*, customers(name, gstin, address, state, state_code, mobile)')
      .eq('id', req.params.id)
      .single();
    if (invError || !invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    const formattedInvoice = {
      ...invoice,
      customer_name: invoice.customers?.name || '',
      customer_gstin: invoice.customers?.gstin || '',
      customer_address: invoice.customers?.address || '',
      customer_state: invoice.customers?.state || '',
      customer_state_code: invoice.customers?.state_code || '',
      customer_mobile: invoice.customers?.mobile || ''
    };
    
    const { data: lines, error: lineError } = await db
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', req.params.id);
    if (lineError) throw lineError;
    
    res.json({ invoice: formattedInvoice, lines: lines || [] });
  } catch (error) {
    console.error('Edit error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/invoices', require('./routes/invoices'));

// Invoices by type
app.get('/api/invoices/type/:type', async (req, res) => {
  try {
    const { data, error } = await db
      .from('invoices')
      .select('*, customers(name, gstin, state)')
      .eq('type', req.params.type)
      .order('id', { ascending: false });
    if (error) throw error;
    
    const rows = data.map(i => ({
      ...i,
      customer_name: i.customers?.name || '',
      customer_gstin: i.customers?.gstin || '',
      customer_state: i.customers?.state || ''
    }));
    
    res.json(rows);
  } catch (error) {
    console.error('Type error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API info (public)
app.get('/api', (req, res) => {
  res.json({
    name: 'Bhagwati Wood Process - GST Billing API v2.0 (Protected)',
    endpoints: {
      customers: '/api/customers* (AUTH)',
      hsn: '/api/hsn* (AUTH)',
      invoices: '/api/invoices* (AUTH)'
    },
    status: 'Protected - Login required'
  });
});


module.exports = app;
