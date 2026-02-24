const Customer = {
  data: [],
  editingId: null,
  
  // Show add form
showAddForm() {
  this.editingId = null;
  document.getElementById('customer-form-title').textContent = '➕ Add New Customer';
  document.getElementById('customer-form-container').style.display = 'block';
  document.getElementById('customer-form').reset();
  document.getElementById('cust-id').value = '';
  document.getElementById('cust-state').value = 'Gujarat';
  document.getElementById('cust-state-code').value = '24';
  
  // Scroll to form smoothly
  setTimeout(() => {
    const formContainer = document.getElementById('customer-form-container');
    formContainer.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
    // Focus on name field
    document.getElementById('cust-name').focus();
  }, 100);
},

  
 // Show edit form
showEditForm(id) {
  const customer = this.data.find(c => c.id === id);
  if (!customer) {
    App.showMessage('Customer not found', 'error');
    return;
  }
  
  this.editingId = id;
  document.getElementById('customer-form-title').textContent = '✏️ Edit Customer';
  document.getElementById('customer-form-container').style.display = 'block';
  
  // Fill form with customer data
  document.getElementById('cust-id').value = customer.id;
  document.getElementById('cust-name').value = customer.name || '';
  document.getElementById('cust-gstin').value = customer.gstin || '';
  document.getElementById('cust-state').value = customer.state || 'Gujarat';
  document.getElementById('cust-state-code').value = customer.state_code || '24';
  document.getElementById('cust-address').value = customer.address || '';
  document.getElementById('cust-mobile').value = customer.mobile || '';
  document.getElementById('cust-email').value = customer.email || '';
  
  // Scroll to form smoothly
  setTimeout(() => {
    const formContainer = document.getElementById('customer-form-container');
    formContainer.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
    // Focus on name field
    document.getElementById('cust-name').focus();
  }, 100);
},

  
  // Hide form
  hideForm() {
    this.editingId = null;
    document.getElementById('customer-form-container').style.display = 'none';
    document.getElementById('customer-form').reset();
  },
  
  // Load all customers
  async loadAll() {
    try {
      this.data = await App.get('/customers');
      this.render();
      console.log(`✅ Loaded ${this.data.length} customers`);
    } catch (error) {
      console.error('Error loading customers:', error);
      App.showMessage('Failed to load customers', 'error');
    }
  },
  
  // Render customers table
  render() {
    const tbody = document.getElementById('customers-tbody');
    
    if (this.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">No customers yet. Add your first customer!</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.data.map(c => `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td><strong>${c.name}</strong></td>
        <td>${c.gstin || '-'}</td>
        <td>${c.state} (${c.state_code})</td>
        <td>${c.address || '-'}</td>
        <td>${c.mobile || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="Customer.showEditForm(${c.id})" style="margin-right: 5px;">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="Customer.delete(${c.id})">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  // Save customer (Create or Update)
  async save() {
    const data = {
      name: document.getElementById('cust-name').value.trim(),
      gstin: document.getElementById('cust-gstin').value.trim(),
      state: document.getElementById('cust-state').value.trim(),
      state_code: document.getElementById('cust-state-code').value.trim(),
      address: document.getElementById('cust-address').value.trim(),
      mobile: document.getElementById('cust-mobile').value.trim(),
      email: document.getElementById('cust-email').value.trim()
    };
    
    if (!data.name || !data.state || !data.state_code) {
      App.showMessage('Please fill required fields', 'error');
      return;
    }
    
    try {
      if (this.editingId) {
        // UPDATE existing customer
        await App.post(`/customers/${this.editingId}`, data, 'PUT');
        App.showMessage('✅ Customer updated successfully!', 'success');
      } else {
        // CREATE new customer
        await App.post('/customers', data);
        App.showMessage('✅ Customer added successfully!', 'success');
      }
      
      this.hideForm();
      this.loadAll();
    } catch (error) {
      console.error('Error saving customer:', error);
      App.showMessage('Failed to save customer', 'error');
    }
  },
  
  // Delete customer with force delete option
  async delete(id) {
    if (!confirm('Delete this customer?')) return;
    
    try {
      await App.delete(`/customers/${id}`);
      App.showMessage('✅ Customer deleted', 'success');
      this.loadAll();
      
    } catch (error) {
      console.error('Error deleting customer:', error);
      
      const errorMsg = error.message || '';
      
      if (errorMsg.includes('FOREIGN KEY') || errorMsg.includes('SQLITE_CONSTRAINT')) {
        const forceDelete = confirm(
          '⚠️ WARNING: This customer has existing invoices!\n\n' +
          'Click OK to DELETE CUSTOMER + ALL THEIR INVOICES\n' +
          'Click Cancel to keep the customer\n\n' +
          'This action CANNOT be undone!'
        );
        
        if (forceDelete) {
          try {
            const result = await App.delete(`/customers/${id}/force`);
            App.showMessage(
              `✅ Deleted customer + ${result.invoicesDeleted || 0} invoice(s)`, 
              'success'
            );
            this.loadAll();
          } catch (forceError) {
            console.error('Force delete error:', forceError);
            App.showMessage('Failed to force delete customer', 'error');
          }
        }
      } else {
        App.showMessage('Failed to delete customer: ' + errorMsg, 'error');
      }
    }
  },
  
  // Load customers for invoice dropdown
  async loadForDropdown() {
    if (this.data.length === 0) {
      await this.loadAll();
    }
    
    const select = document.getElementById('inv-customer');
    select.innerHTML = '<option value="">Select Customer</option>' + 
      this.data.map(c => 
        `<option value="${c.id}">${c.name} (${c.state} - ${c.state_code})</option>`
      ).join('');
  },
  
  // ... rest of your existing functions (showImportDialog, importCSV, clearAll, etc.)
  
  showImportDialog() {
    document.getElementById('customer-import-dialog').style.display = 'block';
    document.getElementById('csv-file-input').value = '';
    document.getElementById('import-progress').style.display = 'none';
  },
  
  hideImportDialog() {
    document.getElementById('customer-import-dialog').style.display = 'none';
    document.getElementById('csv-file-input').value = '';
  },
  
  parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const customers = [];
    const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
      
      if (cleanValues.length >= 1) {
        customers.push({
          name: cleanValues[0] || '',
          gstin: cleanValues[1] || '',
          state: cleanValues[2] || 'Gujarat',
          state_code: cleanValues[3] || '24',
          address: cleanValues[4] || '',
          mobile: cleanValues[5] || '',
          email: cleanValues[6] || ''
        });
      }
    }
    
    return customers;
  },
  
  async importCSV() {
    const fileInput = document.getElementById('csv-file-input');
    const clearFirst = document.getElementById('clear-before-import').checked;
    
    if (!fileInput.files.length) {
      App.showMessage('Please select a CSV file', 'error');
      return;
    }
    
    const file = fileInput.files[0];
    
    document.getElementById('import-progress').style.display = 'block';
    document.getElementById('import-status').textContent = 'Reading file...';
    document.getElementById('import-progress-bar').style.width = '30%';
    
    try {
      const text = await file.text();
      const customers = this.parseCSV(text);
      
      if (customers.length === 0) {
        App.showMessage('No valid customer data found in CSV', 'error');
        document.getElementById('import-progress').style.display = 'none';
        return;
      }
      
      document.getElementById('import-status').textContent = `Importing ${customers.length} customers...`;
      document.getElementById('import-progress-bar').style.width = '60%';
      
      const result = await App.post('/customers/bulk', {
        customers: customers,
        clearFirst: clearFirst
      });
      
      document.getElementById('import-progress-bar').style.width = '100%';
      document.getElementById('import-status').textContent = `✅ Success! Imported ${result.inserted} customers`;
      
      if (result.errors > 0) {
        document.getElementById('import-status').textContent += ` (${result.errors} errors)`;
      }
      
      App.showMessage(`✅ Imported ${result.inserted} customers successfully!`, 'success');
      
      setTimeout(() => {
        this.hideImportDialog();
        this.loadAll();
      }, 2000);
      
    } catch (error) {
      console.error('Import error:', error);
      App.showMessage('Failed to import CSV: ' + error.message, 'error');
      document.getElementById('import-progress').style.display = 'none';
    }
  },
  
  async clearAll() {
    if (!confirm('⚠️ Delete ALL customers? This cannot be undone!')) return;
    if (!confirm('Are you ABSOLUTELY sure? This will delete all customer data!')) return;
    
    try {
      const result = await App.delete('/customers/clear-all');
      App.showMessage(`✅ Cleared ${result.deleted} customers`, 'success');
      this.loadAll();
    } catch (error) {
      console.error('Clear error:', error);
      App.showMessage('Failed to clear customers', 'error');
    }
  }
};


