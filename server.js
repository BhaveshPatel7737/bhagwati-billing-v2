const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ✅ SAFE Supabase (no crash if env missing)
let db, supabaseAdmin;
const { createClient } = require('@supabase/supabase-js');

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  console.log('✅ Supabase DB connected');
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_ANON_KEY missing');
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('✅ Supabase Admin connected');
} else {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY missing - auth bypassed');
}

// ✅ AUTH MIDDLEWARE
app.use('/api/*', async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: 'Invalid token' });
      console.log('Auth OK:', user.email);
    } catch (e) {
      return res.status(401).json({ error: 'Auth check failed' });
    }
  } else {
    console.warn('Auth skipped - no service key');
  }
  next();
});

// Serve pages
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login', (req, res) => res.redirect('/login.html'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/print.html', (req, res) => res.sendFile(path.join(__dirname, 'print.html')));

// ===== CUSTOMER ROUTES =====
app.delete('/api/customers/clear-all', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  try {
    await db.from('invoice_lines').delete().neq('id', 0);
    await db.from('invoices').delete().neq('id', 0);
    await db.from('customers').delete().neq('id', 0);
    console.log('✅ All data cleared');
    res.json({ message: 'All customers cleared' });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers/bulk', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  const { customers, clearFirst } = req.body;
  if (!customers || !Array.isArray(customers)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  console.log(`Importing ${customers.length} customers`);
  try {
    if (clearFirst) {
      await db.from('invoice_lines').delete().neq('id', 0);
      await db.from('invoices').delete().neq('id', 0);
      await db.from('customers').delete().neq('id', 0);
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
    res.json({ success: true, inserted: data?.length || 0, total: customers.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id/force', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  const customerId = req.params.id;
  try {
    const { data: invoices } = await db
      .from('invoices').select('id').eq('customer_id', customerId);

    if (invoices?.length > 0) {
      const invoiceIds = invoices.map(i => i.id);
      await db.from('invoice_lines').delete().in('invoice_id', invoiceIds);
      await db.from('invoices').delete().eq('customer_id', customerId);
    }

    const { data: customer, error } = await db
      .from('customers').delete().eq('id', customerId).select();

    if (error) throw error;
    if (!customer || customer.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ deleted: customer.length, message: 'Customer and all related data deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== STANDARD ROUTES =====
app.use('/api/customers', require('./routes/customers'));
app.use('/api/hsn', require('./routes/hsn'));

// Edit invoice (BEFORE generic invoices route)
app.get('/api/invoices/:id/edit', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
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
      .from('invoice_lines').select('*').eq('invoice_id', req.params.id);

    if (lineError) throw lineError;
    res.json({ invoice: formattedInvoice, lines: lines || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/invoices', require('./routes/invoices'));

// Invoices by type
app.get('/api/invoices/type/:type', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  try {
    const { data, error } = await db
      .from('invoices')
      .select('*, customers(name, gstin, state)')
      .eq('type', req.params.type)
      .order('id', { ascending: false });
    if (error) throw error;
    const rows = (data || []).map(i => ({
      ...i,
      customer_name: i.customers?.name || '',
      customer_gstin: i.customers?.gstin || '',
      customer_state: i.customers?.state || ''
    }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Bhagwati Wood Process - GST Billing API v2.0',
    status: 'Protected - Login required'
  });
});



module.exports = app;
