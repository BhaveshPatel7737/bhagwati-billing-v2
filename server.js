const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/login.html', (req, res) => res.sendFile(__dirname + '/login.html'));
app.get('/print.html', (req, res) => res.sendFile(__dirname + '/print.html'));

// Expose Supabase config to frontend (only public credentials)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
  });
});

// Supabase client
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);


// ===== CUSTOM CUSTOMER ROUTES (BEFORE STANDARD ROUTES) =====

// Clear all customers (and related invoices)
app.delete('/api/customers/clear-all', async (req, res) => {
  console.log('🗑️ Clearing all customers...');
  try {
    await db.from('invoice_lines').delete().neq('id', 0);
    await db.from('invoices').delete().neq('id', 0);
    const { error } = await db.from('customers').delete().neq('id', 0);
    if (error) throw error;
    console.log('✅ All customers cleared');
    res.json({ message: 'All customers cleared' });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk import customers
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

    const insertedCount = data ? data.length : formattedCustomers.length;
    console.log(`✅ Bulk imported ${insertedCount} customers`);
    res.json({ success: true, inserted: insertedCount, total: customers.length });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new customer (Supabase auto-generates ID)
app.post('/api/customers', async (req, res) => {
  const { name, gstin, state, state_code, address, mobile, email } = req.body;

  if (!name || !state || !state_code) {
    return res.status(400).json({ error: 'Name, state, and state_code required' });
  }

  console.log(`➕ Creating customer: ${name}`);

  try {
    const { data, error } = await db
      .from('customers')
      .insert([{ name, gstin, state, state_code, address, mobile, email }])
      .select('id')
      .single();

    if (error) throw error;

    console.log(`✅ Customer created with ID ${data.id}`);
    res.json({ id: data.id, message: 'Customer created' });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Force delete customer and all their invoices
app.delete('/api/customers/:id/force', async (req, res) => {
  const customerId = req.params.id;
  console.log(`💥 Force deleting customer ID: ${customerId}`);

  try {
    // Delete invoice lines for this customer's invoices
    const { data: invoices } = await db
      .from('invoices')
      .select('id')
      .eq('customer_id', customerId);

    const invoiceIds = (invoices || []).map(i => i.id);

    if (invoiceIds.length > 0) {
      await db.from('invoice_lines').delete().in('invoice_id', invoiceIds);
    }

    // Delete invoices
    const { data: deletedInvoices } = await db
      .from('invoices')
      .delete()
      .eq('customer_id', customerId)
      .select('id');

    // Delete customer
    const { error } = await db
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;

    const invoicesDeleted = deletedInvoices ? deletedInvoices.length : 0;
    console.log(`✅ Force deleted customer ${customerId}, ${invoicesDeleted} invoices`);
    res.json({
      deleted: 1,
      invoicesDeleted,
      message: 'Customer and all related data deleted'
    });
  } catch (error) {
    console.error('Force delete error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ===== STANDARD ROUTES =====

app.use('/api/customers', require('./routes/customers'));
app.use('/api/hsn', require('./routes/hsn'));

// Get single invoice for edit
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
    console.error('Direct edit error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/invoices', require('./routes/invoices'));

// Get invoices by type
app.get('/api/invoices/type/:type', async (req, res) => {
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
    endpoints: {
      customers: '/api/customers',
      hsn: '/api/hsn',
      invoices: '/api/invoices'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🏢 BHAGWATI WOOD PROCESS              ║
║   📄 GST Billing System v2.0             ║
║                                           ║
║   🌐 Server: http://localhost:${PORT}      ║
║   📊 API: http://localhost:${PORT}/api    ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
