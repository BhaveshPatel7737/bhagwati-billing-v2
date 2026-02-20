const Invoice = {
  lineCounter: 0,
  currentType: 'TAX_INVOICE',
  editingId: null,
  
  // Switch between Tax Invoice and Bill of Supply
  switchInvoiceType(type) {
    this.currentType = type;
    
    // Update active tab button
    document.querySelectorAll('.invoice-subtab').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      }
    });
    
    // Show/hide appropriate table
    if (type === 'TAX_INVOICE') {
      document.getElementById('tax-invoices-container').style.display = 'block';
      document.getElementById('bill-of-supply-container').style.display = 'none';
    } else {
      document.getElementById('tax-invoices-container').style.display = 'none';
      document.getElementById('bill-of-supply-container').style.display = 'block';
    }
    
    // Load invoices for this type
    this.loadByType(type);
  },
  
  // Load invoices by type
  async loadByType(type) {
    try {
      const invoices = await App.get(`/invoices/type/${type}`);
      this.renderByType(type, invoices);
      console.log(`✅ Loaded ${invoices.length} ${type} invoices`);
    } catch (error) {
      console.error('Error loading invoices:', error);
      App.showMessage('Failed to load invoices', 'error');
    }
  },
  
  // Render invoices by type
  renderByType(type, invoices) {
    const tbodyId = type === 'TAX_INVOICE' ? 'tax-invoices-tbody' : 'bill-of-supply-tbody';
    const tbody = document.getElementById(tbodyId);
    
    if (invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">No ${type === 'TAX_INVOICE' ? 'tax invoices' : 'bills of supply'} yet.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = invoices.map(inv => `
      <tr>
        <td><strong>${inv.id}</strong></td>
        <td><strong>${inv.series}/${inv.number}</strong></td>
        <td>${new Date(inv.date).toLocaleDateString('en-IN')}</td>
        <td>${inv.customer_name || 'N/A'}</td>
        <td>${inv.truck_no || '-'}</td>
        <td style="color: var(--success); font-weight: bold;">
          ₹${Number(inv.grand_total).toLocaleString('en-IN', {minimumFractionDigits: 2})}
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="Invoice.editInvoice(${inv.id})" style="margin-right: 5px;">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-warning" onclick="printInvoice(${inv.id})" style="margin-right: 5px;">
            🖨️ Print
          </button>
          <button class="btn btn-sm btn-info" onclick="printEnvelope(${inv.id})" style="margin-right: 5px;">
            📨 Envelope
          </button>
          <button class="btn btn-sm btn-danger" onclick="Invoice.deleteInvoice(${inv.id})">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  // Load all invoices (both types)
  async loadList() {
    await this.loadByType(this.currentType);
  },
  
  // Edit invoice
  async editInvoice(id) {
    try {
      App.showMessage('Loading invoice...', 'info');
      
      const response = await App.get(`/invoices/${id}/edit`);
      const { invoice, lines } = response;
      
      // Switch to create invoice tab
      App.switchTab('invoices-create');
      
      // Set editing mode
      this.editingId = id;
      
      // Update form title
      document.querySelector('#tab-invoices-create .section-header h2').textContent = `✏️ Edit Invoice #${invoice.id}`;
      
      // Fill form with invoice data
      document.getElementById('inv-type').value = invoice.type;
      document.getElementById('inv-series').value = invoice.series;
      document.getElementById('inv-number').value = invoice.number;
      document.getElementById('inv-date').value = invoice.date;
      document.getElementById('inv-customer').value = invoice.customer_id;
      document.getElementById('inv-truck').value = invoice.truck_no || '';
      document.getElementById('inv-cash-credit').value = invoice.cash_credit || 'Credit';
      
      // Clear existing lines
      document.getElementById('invoice-lines-container').innerHTML = '';
      this.lineCounter = 0;
      
      // Add lines from invoice
      lines.forEach(line => {
        this.addLine();
        const lineDiv = document.querySelector(`[data-line-id="${this.lineCounter}"]`);
        lineDiv.querySelector('.line-hsn').value = line.hsn_code || '';
        lineDiv.querySelector('.line-desc').value = line.description || '';
        lineDiv.querySelector('.line-qty').value = line.qty || 0;
        lineDiv.querySelector('.line-unit').value = line.unit || '';
        lineDiv.querySelector('.line-rate').value = line.rate || 0;
      });
      
      this.calculateTotals();
      
      // Scroll to form
      setTimeout(() => {
        document.getElementById('tab-invoices-create').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      App.showMessage('✅ Invoice loaded for editing', 'success');

      document.getElementById('cancel-edit-btn').style.display = 'inline-block';
      
    } catch (error) {
      console.error('Edit invoice error:', error);
      App.showMessage('Failed to load invoice for editing', 'error');
    }
  },
  
  // Delete invoice
  async deleteInvoice(id) {
    if (!confirm('⚠️ Delete this invoice? This action cannot be undone!')) return;
    
    try {
      await App.delete(`/invoices/${id}`);
      App.showMessage('✅ Invoice deleted successfully', 'success');
      this.loadList();
    } catch (error) {
      console.error('Delete invoice error:', error);
      App.showMessage('Failed to delete invoice', 'error');
    }
  },
  
  // Cancel editing
  cancelEdit() {
    this.editingId = null;
    document.querySelector('#tab-invoices-create .section-header h2').textContent = '📄 Create New Invoice';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    this.resetForm();
  },
  
  // Add invoice line
  addLine() {
    this.lineCounter++;
    const container = document.getElementById('invoice-lines-container');
    
    const lineDiv = document.createElement('div');
    lineDiv.className = 'invoice-line';
    lineDiv.dataset.lineId = this.lineCounter;
    lineDiv.innerHTML = `
      <div class="form-group">
        <label>HSN</label>
        <input type="text" class="line-hsn" placeholder="4401">
      </div>
      <div class="form-group">
        <label>Description</label>
        <input type="text" class="line-desc" placeholder="Plywood 8mm" required>
      </div>
      <div class="form-group">
        <label>Qty</label>
        <input type="number" class="line-qty" placeholder="0" step="0.01" required>
      </div>
      <div class="form-group">
        <label>Unit</label>
        <input type="text" class="line-unit" placeholder="Sheets" required>
      </div>
      <div class="form-group">
        <label>Rate (₹)</label>
        <input type="number" class="line-rate" placeholder="0.00" step="0.01" required>
      </div>
      <div class="form-group">
        <label>Amount</label>
        <div class="line-amount">₹0.00</div>
      </div>
      <div class="form-group">
        <label>&nbsp;</label>
        <button type="button" class="btn btn-sm btn-danger" onclick="Invoice.removeLine(${this.lineCounter})">
          🗑️
        </button>
      </div>
    `;
    
    container.appendChild(lineDiv);
    
    // Add event listeners for calculation
    const inputs = lineDiv.querySelectorAll('.line-qty, .line-rate');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.calculateTotals());
    });
  },
  
  // Remove invoice line
  removeLine(lineId) {
    const line = document.querySelector(`[data-line-id="${lineId}"]`);
    if (line) {
      line.remove();
      this.calculateTotals();
    }
  },
  
  // Calculate invoice totals
  calculateTotals() {
    let taxableValue = 0;
    
    // Calculate each line
    document.querySelectorAll('.invoice-line').forEach(line => {
      const qty = parseFloat(line.querySelector('.line-qty').value) || 0;
      const rate = parseFloat(line.querySelector('.line-rate').value) || 0;
      const amount = qty * rate;
      
      line.querySelector('.line-amount').textContent = `₹${amount.toFixed(2)}`;
      taxableValue += amount;
    });
    
    // Update totals (simplified - actual tax calculation happens on server)
    document.getElementById('total-taxable').textContent = `₹${taxableValue.toFixed(2)}`;
    document.getElementById('total-cgst').textContent = '₹0.00';
    document.getElementById('total-sgst').textContent = '₹0.00';
    document.getElementById('total-igst').textContent = '₹0.00';
    document.getElementById('total-grand').textContent = `₹${taxableValue.toFixed(2)}`;
    document.getElementById('total-words').textContent = this.numberToWords(taxableValue);
  },
  
  // Simple number to words
  numberToWords(num) {
    if (num === 0) return 'Zero Rupees Only';
    return `Rupees ${Math.round(num)} Only`;
  },
  
  // Suggest next invoice number
  async suggestNextNumber() {
    const series = document.getElementById('inv-series').value;
    try {
      const result = await App.get(`/invoices/next/${series}`);
      document.getElementById('next-number-hint').textContent = `Next: ${result.next_number}`;
    } catch (error) {
      console.error('Error getting next number:', error);
    }
  },
  
  // Create or Update invoice
  async create() {
    // Get form data
    const type = document.getElementById('inv-type').value;
    const series = document.getElementById('inv-series').value;
    const number = document.getElementById('inv-number').value || null;
    const date = document.getElementById('inv-date').value;
    const customer_id = parseInt(document.getElementById('inv-customer').value);
    const truck_no = document.getElementById('inv-truck').value;
    const cash_credit = document.getElementById('inv-cash-credit').value;
    
    // Validate
    if (!customer_id) {
      App.showMessage('Please select a customer', 'error');
      return;
    }
    
    // Get lines
    const lines = [];
    document.querySelectorAll('.invoice-line').forEach(line => {
      const hsn_code = line.querySelector('.line-hsn').value.trim();
      const description = line.querySelector('.line-desc').value.trim();
      const qty = parseFloat(line.querySelector('.line-qty').value) || 0;
      const unit = line.querySelector('.line-unit').value.trim();
      const rate = parseFloat(line.querySelector('.line-rate').value) || 0;
      
      if (qty > 0 && rate > 0 && description) {
        lines.push({ hsn_code, description, qty, unit, rate });
      }
    });
    
    if (lines.length === 0) {
      App.showMessage('Please add at least one item', 'error');
      return;
    }
    
    try {
      let result;
      
      if (this.editingId) {
        // UPDATE existing invoice
        result = await App.put(`/invoices/${this.editingId}`, {
          type, series, number, date, customer_id, truck_no, cash_credit, lines
        });
        App.showMessage(`✅ Invoice ${result.series}/${result.number} updated! Total: ₹${result.grand_total}`, 'success');
      } else {
        // CREATE new invoice
        result = await App.post('/invoices', {
          type, series, number, date, customer_id, truck_no, cash_credit, lines
        });
        App.showMessage(`✅ Invoice ${result.series}/${result.number} created! Total: ₹${result.grand_total}`, 'success');
      }
      
      // Reset form
      this.resetForm();
      this.editingId = null;
      document.querySelector('#tab-invoices-create .section-header h2').textContent = '📄 Create New Invoice';
      
      // Switch to invoices list
      App.switchTab('invoices-list');
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      App.showMessage('Failed to save invoice', 'error');
    }
  },
  
  // Reset invoice form
  resetForm() {
    document.getElementById('invoice-form').reset();
    document.getElementById('invoice-lines-container').innerHTML = '';
    this.lineCounter = 0;
    this.addLine();
    this.calculateTotals();
    App.setCurrentDate();

    document.getElementById('cancel-edit-btn').style.display = 'none';
  }
};
