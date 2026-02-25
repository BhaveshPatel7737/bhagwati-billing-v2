// letterpad.js - enter sizes and print letterpad only (modal popup version)

const Letterpad = {
  rows: [],
  rowCounter: 0,

  open() {
    if (this.rows.length === 0) {
      this.rows = [];
      this.rowCounter = 0;
      this.addRow();
    }
    document.getElementById('letterpad-modal').style.display = 'flex';
  },

  close() {
    document.getElementById('letterpad-modal').style.display = 'none';
  },

  addRow() {
    this.rowCounter++;
    const id = this.rowCounter;

    this.rows.push({
      id,
      height_in: 0,
      width_in: 0,
      pcs: 0,
      sqm: 0
    });

    this.render();
  },

  removeRow(id) {
    this.rows = this.rows.filter(r => r.id !== id);
    this.render();
  },

  // 1 in² = 0.00064516 m²
  recalcRow(row) {
    const h = row.height_in || 0;
    const w = row.width_in || 0;
    const p = row.pcs || 0;
    const areaIn2 = h * w * p;
    row.sqm = areaIn2 * 0.00064516;
  },

  // Optimized input handler - update only the changed cell, no full re-render
handleInputChange(id, field, value) {
  const row = this.rows.find(r => r.id === id);
  if (!row) return;

  if (field === 'description') {
    row.description = value;
  } else {
    row[field] = parseFloat(value) || 0;
    if (field === 'height_in' || field === 'width_in' || field === 'pcs') {
      this.recalcRow(row);
    }
  }

  // Update ONLY this row's cells (no full table re-render)
  this.updateRowDOM(id);
  this.updateTotals(); // Only totals
},

// Update single row cells without re-rendering entire table
updateRowDOM(id) {
  const row = this.rows.find(r => r.id === id);
  if (!row) return;
  
  const tr = document.querySelector(`tr[data-lp-row-id="${id}"]`);
  if (!tr) return;
  
  // Update sqm cell only
  const sqmCell = tr.querySelector('.lp-sqm');
  if (sqmCell) {
    sqmCell.textContent = row.sqm ? row.sqm.toFixed(3) : '0.000';
  }
},

  render() {
    const tbody = document.getElementById('letterpad-tbody');
    if (!tbody) return;

    if (this.rows.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="empty">No sizes added yet. Click "Add Size".</td></tr>
      `;
      this.updateTotals();
      return;
    }

    tbody.innerHTML = this.rows.map((r) => `
      <tr data-lp-row-id="${r.id}">
        <td>
          <input type="number" step="0.01" class="lp-height" value="${r.height_in || ''}"
                 oninput="Letterpad.handleInputChange(${r.id}, 'height_in', this.value)"
                 style="width:100%; padding:4px; text-align:center;">
        </td>
        <td>
          <input type="number" step="0.01" class="lp-width" value="${r.width_in || ''}"
                 oninput="Letterpad.handleInputChange(${r.id}, 'width_in', this.value)"
                 style="width:100%; padding:4px; text-align:center;">
        </td>
        <td>
          <input type="number" step="1" class="lp-pcs" value="${r.pcs || ''}"
                 oninput="Letterpad.handleInputChange(${r.id}, 'pcs', this.value)"
                 style="width:100%; padding:4px; text-align:center;">
        </td>
        <td class="lp-sqm">${r.sqm ? r.sqm.toFixed(3) : '0.000'}</td>
        <td>
          <button type="button" class="btn btn-sm btn-danger" onclick="Letterpad.removeRow(${r.id})">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');

    this.updateTotals();
  },

  updateTotals() {
    let totalPcs = 0;
    let totalSqm = 0;
    this.rows.forEach(r => {
      totalPcs += r.pcs || 0;
      totalSqm += r.sqm || 0;
    });

    const totalPcsEl = document.getElementById('letterpad-total-pcs');
    const totalSqmEl = document.getElementById('letterpad-total-sqm');
    if (totalPcsEl) totalPcsEl.textContent = totalPcs;
    if (totalSqmEl) totalSqmEl.textContent = totalSqm.toFixed(3);
  },

  async printCurrent() {
    if (!this.rows.length) {
      App.showMessage('No sizes to print.', 'error');
      return;
    }

    // Get invoice details from current form
    const invoiceData = {
      series: document.getElementById('inv-series').value,
      number: document.getElementById('inv-number').value || '—',
      date: document.getElementById('inv-date').value,
      truck_no: document.getElementById('inv-truck').value
    };

    // Get selected customer
    const custId = parseInt(document.getElementById('inv-customer').value) || null;
    let customer = null;
    if (custId && Array.isArray(Customer.data)) {
      customer = Customer.data.find(c => c.id === custId) || null;
    }

    const customerInfo = {
      name: customer ? customer.name : '',
      address: customer ? (customer.address || '') : '',
      mobile: customer ? (customer.mobile || '') : '',
      gstin: customer ? (customer.gstin || '') : ''
    };

    // Build HTML and print via hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(this.generateLetterpadHTML(invoiceData, customerInfo, this.rows));
    iframeDoc.close();

    iframe.onload = function() {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          App.showMessage('✅ Letterpad print dialog opened', 'success');
          iframe.contentWindow.onafterprint = function() {
            document.body.removeChild(iframe);
          };
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } catch (e) {
          console.error('Letterpad print error:', e);
          App.showMessage('Failed to print letterpad', 'error');
          document.body.removeChild(iframe);
        }
      }, 500);
    };
  },

  generateLetterpadHTML(invoice, customer, rows) {
    let totalPcs = 0;
    let totalSqm = 0;
    rows.forEach(r => {
      totalPcs += r.pcs || 0;
      totalSqm += r.sqm || 0;
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Letterpad - ${invoice.series}/${invoice.number}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    
    @page { 
      size: A4 portrait; 
      margin: 5mm;  /* Tighter margins */
    }
    
    html, body {
      height: 100vh;
      overflow: hidden;  /* CRITICAL: Prevent page break */
    }
    
    body {
      display: flex;
      flex-direction: column;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: white;
      color: #000;
      padding: 5mm;  /* Match @page */
      height: 100vh;
    }
    
    .letterpad-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;  /* Allow flex shrink */
    }
    
    .lp-content {
      flex: 1;
      min-height: 0;
      overflow: hidden;  /* Clip table overflow */
    }
    
    /* Compact header */
    .lp-header {
      display: grid;
      grid-template-columns: 100px 1fr;  /* Smaller logo */
      gap: 8px;
      padding: 2px 8px;
      border-bottom: 1px solid #000;
    }
    
    .lp-logo img {
      max-width: 90px;  /* Smaller */
      max-height: 80px;
    }
    
    .lp-company-name {
      font-size: 18px;  /* Smaller */
      font-weight: 700;
      margin-bottom: 2px;
    }
    
    .lp-company-address {
      font-size: 10px;  /* Smaller */
      line-height: 1.2;
    }
    
    .lp-title {
      font-size: 16px;
      text-align: center;
      margin: 8px 0;  /* Less margin */
      font-weight: 700;
    }
    
    /* Tighter details */
    .lp-details {
      display: grid;
      grid-template-columns: 1fr 1fr;  /* Even split */
      margin: 8px 0;  /* Less margin */
      font-size: 11px;
    }
    
    .lp-section-title {
      font-size: 11px;
      margin-bottom: 4px;
    }
    
    .lp-field {
      font-size: 11px;
      margin-bottom: 2px;
      line-height: 1.3;
    }
    
    /* Compact table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;  /* Smaller */
      table-layout: fixed;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 3px 2px;  /* Much tighter */
      text-align: center;
      font-size: 11px;
    }
    
    /* Fixed footer - always visible */
    .lp-footer {
      flex-shrink: 0;
      padding-top: 8px;  /* Less space */
      margin-top: auto;
      font-size: 10px;
    }
    
    @media print {
      html, body {
        height: auto;
        overflow: visible;
      }
      body { padding: 5mm; }
    }
  </style>

</head>
<body>
  <div class="letterpad-container">
    <div class="lp-content">
      <!-- Header: Logo + Company -->
      <div class="lp-header">
        <div class="lp-logo">
          <img src="${COMPANY_INFO.logo}" alt="Logo" onerror="this.style.display='none'">
        </div>
        <div class="lp-company">
          <div class="lp-company-name">${COMPANY_INFO.name}</div>
          <div class="lp-company-address">
            ${COMPANY_INFO.address}<br>
            GSTIN: ${COMPANY_INFO.gstin} | ${COMPANY_INFO.state} (${COMPANY_INFO.state_code})
          </div>
        </div>
      </div>

      <div class="lp-title">LETTERPAD</div>

      <!-- Two column layout -->
      <div class="lp-details">
        
        <!-- LEFT: Buyer Details -->
        <div class="lp-left">
          <div class="lp-section-title">Buyer Details</div>
          <div class="lp-field"><strong>Name:</strong> ${customer.name || '—'}</div>
          <div class="lp-field"><strong>Address:</strong> ${customer.address || '—'}</div>
        </div>
        
        <!-- RIGHT: Invoice Details -->
        <div class="lp-right">
          <div class="lp-section-title">Invoice Details</div>
          <div class="lp-field"><strong>Invoice No:</strong> ${invoice.series || ''}/${invoice.number || ''}</div>
          <div class="lp-field"><strong>Date:</strong> ${invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN') : '—'}</div>
          <div class="lp-field"><strong>Vehicle No:</strong> ${invoice.truck_no || '—'}</div>
        </div>
        
      </div>

      <!-- Table: No Sr, No Description -->
      <table>
        <thead>
          <tr>
            <th>Height (in)</th>
            <th>Width (in)</th>
            <th>Pcs</th>
            <th>Sq. Meter</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.height_in || 0}</td>
              <td>${r.width_in || 0}</td>
              <td>${r.pcs || 0}</td>
              <td>${r.sqm ? r.sqm.toFixed(2) : '0.00'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="right-align">TOTAL</td>
            <td>${totalPcs}</td>
            <td>${totalSqm.toFixed(3)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="lp-footer">
      <div class="right-align">
        For ${COMPANY_INFO.name}<br><br><br>
        _____________________<br>
        Authorised Signatory
      </div>
    </div>
    
  </div>
</body>
</html>
    `;
  }
};
