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
    html, body {
      height: 100%;
    }
    body {
      display: flex;
      flex-direction: column;
      min-height: 297mm;
      font-family: 'Segoe UI', Arial, sans-serif;
      background:white;
      color:#000;
      padding:15mm;
    }
    .letterpad-container {
      display: flex;
      flex-direction: column;
      min-height: calc(297mm - 10mm);
    }
      
    .lp-content {
      flex: 1;
    }
    /* Header with logo and company name */
    .lp-header {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px;
      padding: 0px 10px;
      align-items: center;
      border-bottom: 2px solid #000;
      background: white;
    }
    .lp-logo {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .lp-logo img{
      max-width: 150px;
      max-height: 120px;
      object-fit: contain;
    }

    .lp-company {
      text-align: center;
      padding: 0 10px;
      border-left: 2px solid #ddd;
    }
    .lp-company-name {
      font-size:22px;
      font-weight:800;
      color:#1a472a;
      margin-bottom:4px;
    }
    .lp-company-address {
      font-size:11px;
      line-height:1.4;
    }
    
    .lp-title {
      text-align:center;
      font-size:18px;
      font-weight:700;
      margin:15px 0;
      text-decoration:underline;
    }
    
    /* Two column layout: left = buyer, right = invoice details */
    .lp-details {
      display: grid;
      grid-template-columns: 2fr 1fr;
      margin-bottom:20px;
    }
    
    .lp-left {
      flex:1;
      padding:12px;
    }
    
    .lp-right {
      flex:1;
      padding:12px;
    }
    
    .lp-section-title {
      font-size:13px;
      font-weight:700;
      margin-bottom:8px;
      text-decoration:underline;
    }
    
    .lp-field {
      font-size:12px;
      margin-bottom:5px;
      line-height:1.5;
    }
    
    .lp-field strong {
      display:inline-block;
      min-width:80px;
    }
    
    /* Table - no Sr, no Description */
    table {
      width:100%;
      border-collapse:collapse;
      margin-top:15px;
      font-size:12px;
    }
    th, td {
      border:1px solid #000;
      padding:8px 6px;
      text-align:center;
    }
    tfoot td {
      font-weight:bold;
      background:#f0f0f0;
    }
    
    .lp-footer {
      margin-top:auto;
      padding-top:25px;
      font-size:11px;
      display:flex;
      justify-content:flex-end;
      align-items:flex-end;
    }
    .right-align {
      text-align:right;
    }
    
    @media print {
      body { 
        padding:10mm;
        min-height: 297mm; 
      }
      @page {
        size: A4 portrait;
        margin:10mm;
      }
      .letterpad-container {
        min-height: calc(297mm - 10mm);
      }
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
