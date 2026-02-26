const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 4000;

// ----- BASIC MIDDLEWARE -----
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ----- SUPABASE DB CLIENT (for data) -----
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let db = null;
if (supabaseUrl && supabaseAnonKey) {
  db = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase DB connected');
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_ANON_KEY missing (Render env)');
}

// ----- LOGIN PAGE (inject env vars into window.*) -----
app.get('/login.html', (req, res) => {
  const loginPath = path.join(__dirname, 'login.html');
  if (!fs.existsSync(loginPath)) {
    return res.status(404).send('login.html not found in root folder');
  }

  // Read file and inject vars at end of body
  fs.readFile(loginPath, 'utf8', (err, html) => {
    if (err) return res.status(500).send('Error reading login.html');

    const injectScript = `
<script>
window.SUPABASE_URL = "${supabaseUrl || ''}";
window.SUPABASE_ANON_KEY = "${supabaseAnonKey || ''}";
</script>
</body>`;
    const outHtml = html.replace('</body>', injectScript);
    res.send(outHtml);
  });
});

app.get('/login', (req, res) => res.redirect('/login.html'));

// ----- FRONTEND PAGES -----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/print.html', (req, res) => res.sendFile(path.join(__dirname, 'print.html')));

// ====== YOUR EXISTING API ROUTES (no auth enforced yet) ======

// Clear all customers
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

// Bulk customers
app.post('/api/customers/bulk', async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  const { customers, clearFirst } = req.body;

  if (!customers || !Array.isArray(customers)) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

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

    res.json({
      success: true,
      inserted: data ? data.length : 0,
      total: customers.length
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Existing modular routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/hsn', require('./routes/hsn'));

// Edit invoice (used by front-end & print)
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
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', req.params.id);

    if (lineError) throw lineError;

    res.json({ invoice: formattedInvoice, lines: lines || [] });
  } catch (error) {
    console.error('Edit invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/invoices', require('./routes/invoices'));

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
    console.error('Get invoices by type error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Bhagwati Wood Process - GST Billing API',
    version: '2.0.0',
    note: 'Login page enabled. API currently NOT enforcing auth.'
  });
});


module.exports = app;
