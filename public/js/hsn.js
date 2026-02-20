const HSN = {
  data: [],
  
  // Show add form
  showAddForm() {
    document.getElementById('hsn-form-container').style.display = 'block';
    document.getElementById('hsn-form').reset();
  },
  
  // Hide form
  hideForm() {
    document.getElementById('hsn-form-container').style.display = 'none';
    document.getElementById('hsn-form').reset();
  },
  
  // Load all HSN codes
  async loadAll() {
    try {
      this.data = await App.get('/hsn');
      this.render();
      console.log(`✅ Loaded ${this.data.length} HSN codes`);
    } catch (error) {
      console.error('Error loading HSN:', error);
      App.showMessage('Failed to load HSN codes', 'error');
    }
  },
  
  // Render HSN table
  render() {
    const tbody = document.getElementById('hsn-tbody');
    
    if (this.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">No HSN codes yet. Add your first HSN!</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.data.map(h => `
      <tr>
        <td><strong>${h.hsn_code}</strong></td>
        <td>${h.gst_rate_percent}%</td>
        <td style="color: ${h.exempt_for_bos ? '#28a745' : '#ffc107'}">
          ${h.exempt_for_bos ? '✅ Exempt' : '💰 Taxable'}
        </td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="HSN.delete(${h.id})">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `).join('');
  },
  
  // Save HSN
  async save() {
    const data = {
      hsn_code: document.getElementById('hsn-code').value.trim(),
      gst_rate_percent: parseFloat(document.getElementById('hsn-rate').value) || 0,
      exempt_for_bos: document.getElementById('hsn-exempt').value === 'true'
    };
    
    if (!data.hsn_code) {
      App.showMessage('HSN code is required', 'error');
      return;
    }
    
    try {
      await App.post('/hsn', data);
      App.showMessage('✅ HSN code added successfully!', 'success');
      this.hideForm();
      this.loadAll();
    } catch (error) {
      console.error('Error saving HSN:', error);
      App.showMessage('Failed to save HSN code', 'error');
    }
  },
  
  // Delete HSN
  async delete(id) {
    if (!confirm('Delete this HSN code?')) return;
    
    try {
      await App.delete(`/hsn/${id}`);
      App.showMessage('✅ HSN deleted', 'success');
      this.loadAll();
    } catch (error) {
      console.error('Error deleting HSN:', error);
      App.showMessage('Failed to delete HSN', 'error');
    }
  }
};
