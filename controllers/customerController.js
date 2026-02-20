const db = require('../database/db');

class CustomerController {
 // Get all customers - SORTED BY ID DESC
static getAll(req, res) {
  db.all('SELECT * FROM customers ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Get customers error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
}


  // Get single customer
  static getById(req, res) {
    db.get('SELECT * FROM customers WHERE id = ?', [req.params.id], (err, row) => {
      if (err) {
        console.error('Get customer error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!row) return res.status(404).json({ error: 'Customer not found' });
      res.json(row);
    });
  }

  // Create customer
  static create(req, res) {
    const { name, gstin, state, state_code, address, mobile, email } = req.body;

    if (!name || !state || !state_code) {
      return res.status(400).json({ error: 'Name, state, and state_code required' });
    }

    db.run(
      `INSERT INTO customers (name, gstin, state, state_code, address, mobile, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, gstin, state, state_code, address, mobile, email],
      function (err) {
        if (err) {
          console.error('Create customer error:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Customer created: ID ${this.lastID}`);
        res.json({ id: this.lastID, message: 'Customer created' });
      }
    );
  }

  // Update customer
  static update(req, res) {
    const { name, gstin, state, state_code, address, mobile, email } = req.body;

    db.run(
      `UPDATE customers 
       SET name=?, gstin=?, state=?, state_code=?, address=?, mobile=?, email=?
       WHERE id=?`,
      [name, gstin, state, state_code, address, mobile, email, req.params.id],
      function (err) {
        if (err) {
          console.error('Update customer error:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log(`✅ Customer updated: ID ${req.params.id}`);
        res.json({ updated: this.changes });
      }
    );
  }

  // Delete customer (ORIGINAL - no changes)
  static delete(req, res) {
    const customerId = req.params.id;
    
    console.log(`🗑️ Attempting to delete customer ID: ${customerId}`);
    
    db.run('DELETE FROM customers WHERE id = ?', [customerId], function (err) {
      if (err) {
        console.error('Delete customer error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        console.log(`⚠️ No customer found with ID: ${customerId}`);
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      console.log(`✅ Customer deleted: ID ${customerId}`);
      res.json({ deleted: this.changes, message: 'Customer deleted successfully' });
    });
  }
}

module.exports = CustomerController;
