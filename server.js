const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve frontend pages ✅
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/print.html', (req, res) => res.sendFile(__dirname + '/print.html'));

// Import database for custom routes
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const db = createClient(supabaseUrl, supabaseKey);


// ===== CUSTOM CUSTOMER ROUTES (BEFORE STANDARD ROUTES) =====

// Clear all customers
app.delete('/api/customers/clear-all', (req, res) => {
  console.log('🗑️ Clearing all customers...');
  
  db.serialize(() => {
    // First clear invoices to avoid foreign key issues
    db.run('DELETE FROM invoice_lines', (err) => {
      if (err) console.error('Clear invoice_lines error:', err);
    });
    
    db.run('DELETE FROM invoices', (err) => {
      if (err) console.error('Clear invoices error:', err);
    });
    
    db.run('DELETE FROM customers', [], function(err) {
      if (err) {
        console.error('Clear customers error:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Cleared ${this.changes} customers`);
      res.json({ 
        message: 'All customers cleared',
        deleted: this.changes 
      });
    });
  });
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
    
    const { data, error } = await db
      .from('customers')
      .insert(formattedCustomers);
    
    if (error) throw error;
    
    // ✅ FIX: Check data exists
    const insertedCount = data ? data.length : 0;
    
    console.log(`✅ Bulk imported ${insertedCount} customers`);
    res.json({ 
      success: true, 
      inserted: insertedCount, 
      total: customers.length 
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: error.message });
  }
});




// Add new customer with ID reuse
app.post('/api/customers', (req, res) => {
  const { name, gstin, state, state_code, address, mobile, email } = req.body;

  if (!name || !state || !state_code) {
    return res.status(400).json({ error: 'Name, state, and state_code required' });
  }

  console.log(`➕ Creating customer: ${name}`);

  // Find next available ID (fills gaps)
  db.get(`
    SELECT COALESCE(
      (SELECT MIN(id + 1) FROM customers WHERE (id + 1) NOT IN (SELECT id FROM customers)),
      (SELECT COALESCE(MAX(id), 0) + 1 FROM customers)
    ) as next_id
  `, [], (err, row) => {
    if (err) {
      console.error('Find ID error:', err);
      return res.status(500).json({ error: 'Failed to generate ID' });
    }
    
    const nextId = row.next_id;
    
    db.run(
      `INSERT INTO customers (id, name, gstin, state, state_code, address, mobile, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextId, name, gstin, state, state_code, address, mobile, email],
      function (err) {
        if (err) {
          console.error('Create customer error:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Customer created with ID ${nextId} (gap filled)`);
        res.json({ id: nextId, message: 'Customer created' });
      }
    );
  });
});



// Force delete customer and all their invoices
app.delete('/api/customers/:id/force', (req, res) => {
  const customerId = req.params.id;
  
  console.log(`💥 Force deleting customer ID: ${customerId} and all related invoices`);
  
  db.serialize(() => {
    let linesDeleted = 0;
    let invoicesDeleted = 0;
    
    // Delete invoice lines
    db.run(
      'DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE customer_id = ?)', 
      [customerId], 
      function(err) {
        if (err) console.error('Delete invoice lines error:', err);
        linesDeleted = this.changes;
        console.log(`  Deleted ${linesDeleted} invoice lines`);
      }
    );
    
    // Delete invoices
    db.run(
      'DELETE FROM invoices WHERE customer_id = ?', 
      [customerId], 
      function(err) {
        if (err) console.error('Delete invoices error:', err);
        invoicesDeleted = this.changes;
        console.log(`  Deleted ${invoicesDeleted} invoices`);
      }
    );
    
    // Delete customer
    db.run(
      'DELETE FROM customers WHERE id = ?', 
      [customerId], 
      function(err) {
        if (err) {
          console.error('Delete customer error:', err);
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Customer not found' });
        }
        
        console.log(`✅ Force deleted customer ${customerId}, ${invoicesDeleted} invoices, ${linesDeleted} lines`);
        res.json({ 
          deleted: this.changes, 
          invoicesDeleted: invoicesDeleted,
          linesDeleted: linesDeleted,
          message: 'Customer and all related data deleted' 
        });
      }
    );
  });
});

// ===== STANDARD ROUTES (AFTER CUSTOM ROUTES) =====

app.use('/api/customers', require('./routes/customers'));
app.use('/api/hsn', require('./routes/hsn'));
app.use('/api/invoices', require('./routes/invoices'));

// Get invoices by type (CUSTOM ROUTE - UPDATE TO SUPABASE)
app.get('/api/invoices/type/:type', async (req, res) => {
  try {
    const { data, error } = await db
      .from('invoices')
      .select(`
        *,
        customers(name, gstin, state)
      `)
      .eq('type', req.params.type)
      .order('id', { ascending: false });
    
    if (error) throw error;
    
    const rows = data.map(i => ({
      ...i,
      customer_name: i.customers?.name || '',
      customer_gstin: i.customers?.gstin || '',
      customer_state: i.customers?.state || ''
    }));
    
    res.json(rows || []);
  } catch (error) {
    console.error('Get invoices by type error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get single invoice for editing
app.get('/api/invoices/:id/edit', (req, res) => {
  const invoiceId = req.params.id;
  
  const invoiceQuery = `
    SELECT 
      i.*,
      c.name as customer_name,
      c.gstin as customer_gstin,
      c.state as customer_state,
      c.state_code as customer_state_code,
      c.address as customer_address,
      c.mobile as customer_mobile
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `;
  
  db.get(invoiceQuery, [invoiceId], (err, invoice) => {
    if (err) {
      console.error('Get invoice error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    db.all('SELECT * FROM invoice_lines WHERE invoice_id = ?', [invoiceId], (err, lines) => {
      if (err) {
        console.error('Get invoice lines error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      res.json({ invoice, lines: lines || [] });
    });
  });
});

// Update invoice
app.put('/api/invoices/:id', (req, res) => {
  const invoiceId = req.params.id;
  const { type, series, number, date, customer_id, truck_no, cash_credit, lines } = req.body;
  
  console.log(`✏️ Updating invoice ID: ${invoiceId}`);
  
  db.serialize(() => {
    // Delete existing lines
    db.run('DELETE FROM invoice_lines WHERE invoice_id = ?', [invoiceId], (err) => {
      if (err) console.error('Delete lines error:', err);
    });
    
    // Calculate totals (same logic as create)
    let taxableValue = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    const linesWithAmounts = lines.map(line => {
      const amount = (line.qty || 0) * (line.rate || 0);
      taxableValue += amount;
      return { ...line, amount };
    });
    
    // Get customer state for tax calculation
    db.get('SELECT state_code FROM customers WHERE id = ?', [customer_id], (err, customer) => {
      const isInterState = customer && customer.state_code !== '24';
      
      // Calculate GST (simplified - you can add HSN-based calculation)
      const gstRate = 0.18; // 18% default
      if (isInterState) {
        igstAmount = taxableValue * gstRate;
      } else {
        cgstAmount = taxableValue * (gstRate / 2);
        sgstAmount = taxableValue * (gstRate / 2);
      }
      
      const grandTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
      
      // Update invoice
      db.run(
        `UPDATE invoices 
         SET type=?, series=?, number=?, date=?, customer_id=?, truck_no=?, cash_credit=?,
             taxable_value=?, cgst_amount=?, sgst_amount=?, igst_amount=?, grand_total=?
         WHERE id=?`,
        [type, series, number, date, customer_id, truck_no, cash_credit,
         taxableValue, cgstAmount, sgstAmount, igstAmount, grandTotal, invoiceId],
        function(err) {
          if (err) {
            console.error('Update invoice error:', err);
            return res.status(500).json({ error: err.message });
          }
          
          // Insert updated lines
          const stmt = db.prepare(`
            INSERT INTO invoice_lines (invoice_id, hsn_code, description, qty, unit, rate, amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          linesWithAmounts.forEach(line => {
            stmt.run(invoiceId, line.hsn_code, line.description, line.qty, line.unit, line.rate, line.amount);
          });
          
          stmt.finalize(() => {
            console.log(`✅ Invoice ${invoiceId} updated successfully`);
            res.json({
              id: invoiceId,
              series,
              number,
              grand_total: grandTotal,
              message: 'Invoice updated'
            });
          });
        }
      );
    });
  });
});

// Delete invoice with ID reuse
app.delete('/api/invoices/:id', (req, res) => {
  const invoiceId = req.params.id;
  
  console.log(`🗑️ Deleting invoice ID: ${invoiceId}`);
  
  db.serialize(() => {
    // Delete lines first
    db.run('DELETE FROM invoice_lines WHERE invoice_id = ?', [invoiceId], (err) => {
      if (err) console.error('Delete lines error:', err);
    });
    
    // Delete invoice
    db.run('DELETE FROM invoices WHERE id = ?', [invoiceId], function(err) {
      if (err) {
        console.error('Delete invoice error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      console.log(`✅ Invoice ${invoiceId} deleted`);
      res.json({ deleted: this.changes, message: 'Invoice deleted' });
    });
  });
});

// Create invoice with ID reuse
app.post('/api/invoices', (req, res) => {
  const { type, series, number, date, customer_id, truck_no, cash_credit, lines } = req.body;
  
  // Find next available ID
  db.get(`
    SELECT COALESCE(
      (SELECT MIN(id + 1) FROM invoices WHERE (id + 1) NOT IN (SELECT id FROM invoices)),
      (SELECT COALESCE(MAX(id), 0) + 1 FROM invoices)
    ) as next_id
  `, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to generate ID' });
    }
    
    const nextId = row.next_id;
    
    // Rest of your existing create invoice logic but with specific ID
    // Calculate totals
    let taxableValue = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    const linesWithAmounts = lines.map(line => {
      const amount = (line.qty || 0) * (line.rate || 0);
      taxableValue += amount;
      return { ...line, amount };
    });
    
    db.get('SELECT state_code FROM customers WHERE id = ?', [customer_id], (err, customer) => {
      const isInterState = customer && customer.state_code !== '24';
      const gstRate = 0.18;
      
      if (isInterState) {
        igstAmount = taxableValue * gstRate;
      } else {
        cgstAmount = taxableValue * (gstRate / 2);
        sgstAmount = taxableValue * (gstRate / 2);
      }
      
      const grandTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
      
      db.run(
        `INSERT INTO invoices (id, type, series, number, date, customer_id, truck_no, cash_credit,
                               taxable_value, cgst_amount, sgst_amount, igst_amount, grand_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nextId, type, series, number, date, customer_id, truck_no, cash_credit,
         taxableValue, cgstAmount, sgstAmount, igstAmount, grandTotal],
        function(err) {
          if (err) {
            console.error('Create invoice error:', err);
            return res.status(500).json({ error: err.message });
          }
          
          const stmt = db.prepare(`
            INSERT INTO invoice_lines (invoice_id, hsn_code, description, qty, unit, rate, amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          linesWithAmounts.forEach(line => {
            stmt.run(nextId, line.hsn_code, line.description, line.qty, line.unit, line.rate, line.amount);
          });
          
          stmt.finalize(() => {
            console.log(`✅ Invoice created with ID ${nextId}`);
            res.json({ id: nextId, series, number, grand_total: grandTotal });
          });
        }
      );
    });
  });
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





