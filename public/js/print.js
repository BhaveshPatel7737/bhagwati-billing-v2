// Company Configuration
const COMPANY_INFO = {
  name: "BHAGWATI WOOD PROCESS",
  address: "Survey No. 728, Tintoda Road, At Bhoyan Rathod, Gandhinagar,Gujarat, 382422.",
  gstin: "24AOAPP7767B1ZZ",
  state: "Gujarat",
  state_code: "24",
  phone: "+91 9427543225",
  email: "bwp9675@gmail.com",
  bank: {
    name: "Indian Overseas Bank",
    account: "033733000000036 (C.A.)",
    ifsc: "IOBA0000337",
    branch: "Gandhinagar"
  },
  logo: "logo.png" // Place your logo in public/logo.png
};

// Main print function
// Main print function - DOWNLOAD AS PDF
async function printInvoice(invoiceId) {
  try {
    App.showMessage('Generating PDF...', 'info');
    
    const response = await fetch(`${API_BASE}/invoices/${invoiceId}`);
    const data = await response.json();
    
    // Create invisible iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Write invoice HTML to iframe
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(generateInvoiceHTML(data.invoice, data.lines || []));
    iframeDoc.close();
    
    // Wait for content to load
    iframe.onload = function() {
      setTimeout(() => {
        try {
          // Trigger print dialog (user can save as PDF)
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          App.showMessage('✅ Print dialog opened - Select "Save as PDF"', 'success');
          
          // Clean up after printing
          iframe.contentWindow.onafterprint = function() {
            document.body.removeChild(iframe);
          };
          
          // Fallback cleanup after 1 second
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
          
        } catch (error) {
          console.error('Print error:', error);
          App.showMessage('Print failed - please try again', 'error');
          document.body.removeChild(iframe);
        }
      }, 500);
    };
    
  } catch (error) {
    console.error('Print error:', error);
    App.showMessage('Failed to generate invoice', 'error');
  }
}


// Number to words converter (Indian system)
function numberToWordsIndian(num) {
  if (!num || num === 0) return "Zero Rupees Only";
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  }
  
  function convertToWords(n) {
    if (n === 0) return 'Zero';
    
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const hundred = n % 1000;
    
    let result = '';
    if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
    if (hundred > 0) result += convertLessThanThousand(hundred);
    
    return result.trim();
  }
  
  const amount = Math.round(num);
  const paise = Math.round((num - amount) * 100);
  
  let words = 'Rupees ' + convertToWords(amount);
  if (paise > 0) words += ' and ' + convertToWords(paise) + ' Paise';
  words += ' Only';
  
  return words;
}

// Generate complete invoice HTML
function generateInvoiceHTML(invoice, lines) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.series}/${invoice.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #000;
      background: #fff;
      padding: 15px;
    }
    
    .invoice-container {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      display: flex;
      flex-direction: column;
    }
    
    /* ========== HEADER (25%) ========== */
    .invoice-header {
      border: 3px solid #000;
      padding: 0;
      background: #f9f9f9;
      margin-bottom: 5px;
    }
    
    /* Row 1: Logo + Company Info + Copy Type */
    .header-row-1 {
      display: grid;
      grid-template-columns: 120px 1fr 120px;
      gap: 10px;
      padding: 0px 10px;
      align-items: center;
      border-bottom: 2px solid #000;
      background: white;
    }
    
    .logo-section {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .logo-section img {
      max-width: 150px;
      max-height: 120px;
      object-fit: contain;
    }
    
    .company-section {
      text-align: center;
      padding: 0 10px;
      border-left: 2px solid #ddd;
      border-right: 2px solid #ddd;
    }
    
    .company-name {
      font-size: 22px;
      font-weight: 900;
      color: #1a472a;
      margin-bottom: 2px;
      letter-spacing: 1px;
    }
    
    .company-subtitle {
      font-size: 16px;
      color: #c4a574;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .company-details {
      font-size: 16px;
      color: #333;
      line-height: 1.4;
    }
    
    .copy-type {
      text-align: center;
      font-weight: bold;
      font-size: 16px;
      background: #1a472a;
      color: white;
      padding: 8px;
      border-radius: 4px;
    }
    
    /* Row 2: Invoice Title */
    .header-row-2 {
      text-align: center;
      padding: 5px;
      border-bottom: 2px solid #000;
      background: #fafafa;
    }
    
    .invoice-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #000;
    }
    
    /* Row 3: Buyer + Invoice Details */
    .header-row-3 {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 0;
    }
    
    .buyer-box, .invoice-box {
      font-size: 16px;
      line-height: 1.5;
    }
    
    .buyer-box {
      border-right: 2px solid #000;
    }
    
    .box-title {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 6px;
      text-decoration: underline;
      color: #1a472a;
    }
    
    /* ========== MAIN SECTION (50%) ========== */
    .invoice-main {
      border: 3px solid #000;
      border-top: none;
      display: flex;
      flex-direction: column;
    }
    
    /* Items Table */
    .items-section {
      flex: 1;
      overflow: auto;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
    }
    
    .items-table thead {
      background: #1a472a;
      color: white;
      position: sticky;
      top: 0;
    }
    
    .items-table th {
      padding: 8px 5px;
      text-align: center;
      font-weight: bold;
      border-right: 1px solid #fff;
    }
    
    .items-table td {
      padding: 8px 5px;
      border-bottom: 1px solid #ddd;
      border-right: 1px solid #ddd;
    }
    
    .items-table td.desc {
      text-align: left;
      font-weight: 500;
    }
    
    .items-table tr:nth-child(even) {
      background: #f8f8f8;
    }
    
    /* Bank + Tax Section */
    .bottom-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      border-top: 2px solid #000;
    }
    
    .bank-section {
      border-right: 2px solid #000;
      font-size: 16px;
      line-height: 1.6;
      background: #fafafa;
    }
    
    .bank-title {
      font-weight: bold;
      margin-bottom: 6px;
      color: #1a472a;
      font-size: 18px;
    }
    
    .tax-section {
    }
    
    .tax-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
    }
    
    .tax-table th {
      text-align: left;
      padding: 6px 8px;
      background: #f0f0f0;
      color: #000000;
      font-weight: bold;
    }
    
    .tax-table td {
      text-align: right;
      padding: 6px 8px;
      font-weight: 600;
    }
    
    .tax-table tr {
      border-bottom: 1px solid #ddd;
    }
    
    .tax-total {
      background: #e8f4f8;
      font-weight: bold;
    }
    
    .grand-total {
      background: #1a472a;
      color: white;
      font-size: 18px;
      font-weight: bold;
    }
    
    .grand-total td {
      color: white;
    }
    
    /* ========== FOOTER (25%) ========== */
    .invoice-footer {
      border: 3px solid #000;
      border-top: none;
      display: grid;
      grid-template-columns: 2fr 1fr;
    }
    
    .terms-section {
      padding: 5px;
      border-right: 2px solid #000;
      font-size: 13px;
      line-height: 1.6;
      background: #fafafa;
    }
    
    .terms-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #1a472a;
      font-size: 16px;
    }
    
    .signature-section {
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
    }
    
    .signature-line {
      margin-top: 50px;
      border-top: 2px solid #000;
      width: 150px;
      font-weight: bold;
      font-size: 12px;
      color: #1a472a;
    }
    
    /* ========== PRINT STYLES ========== */
    @media print {
      body { padding: 0; margin: 0; }
      .invoice-container { box-shadow: none; }
    }
    
    @page {
      size: A4;
      margin: 5mm;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    
    <!-- HEADER -->
    <div class="invoice-header">
      <!-- Row 1: Logo + Company + Copy Type -->
      <div class="header-row-1">
        <div class="logo-section">
          <img src="${COMPANY_INFO.logo}" alt="Company Logo" onerror="this.style.display='none'">
        </div>
        <div class="company-section">
          <div class="company-name">${COMPANY_INFO.name}</div>
          <div class="company-subtitle">🌿 Premium Plywood Supplier 🌿</div>
          <div class="company-details">
            ${COMPANY_INFO.address}<br>
            GSTIN: ${COMPANY_INFO.gstin} | State: ${COMPANY_INFO.state} (${COMPANY_INFO.state_code})<br>
            📞 ${COMPANY_INFO.phone} | 📧 ${COMPANY_INFO.email}
          </div>
        </div>
        <div class="copy-type">
          ORIGINAL /<br>DUPLICATE
        </div>
      </div>
      
      <!-- Row 2: Invoice Title -->
      <div class="header-row-2">
        <div class="invoice-title">
          ${invoice.type === 'TAX_INVOICE' ? 'GST TAX INVOICE' : 'BILL OF SUPPLY'}
        </div>
      </div>
      
      <!-- Row 3: Buyer + Invoice Details -->
      <div class="header-row-3">
        <div class="buyer-box">
          <div class="box-title">📋 BILL TO:</div>
          <strong>${invoice.customer_name || 'N/A'}</strong><br>
          ${invoice.customer_address || 'Address not provided'}<br>
          <strong>GSTIN:</strong> ${invoice.customer_gstin || 'Not Registered'}<br>
          <strong>State:</strong> ${invoice.customer_state || 'N/A'} (${invoice.customer_state_code || '-'})
        </div>
        <div class="invoice-box">
          <div class="box-title">📄 INVOICE DETAILS:</div>
          <strong>Invoice No:</strong> ${invoice.series}/${invoice.number}<br>
          <strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN')}<br>
          <strong>Truck No:</strong> ${invoice.truck_no || 'N/A'}<br>
          <strong>Payment:</strong> ${invoice.cash_credit || 'Credit'}
        </div>
      </div>
    </div>
    
    <!-- MAIN SECTION -->
    <div class="invoice-main">
      <!-- Items Table -->
      <div class="items-section">
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 8%">S.No</th>
              <th style="width: 10%">HSN</th>
              <th style="width: 38%">DESCRIPTION</th>
              <th style="width: 8%">QTY</th>
              <th style="width: 10%">UNIT</th>
              <th style="width: 12%">RATE (₹)</th>
              <th style="width: 14%">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map((line, index) => `
              <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td style="text-align: center;">${line.hsn_code || '-'}</td>
                <td class="desc"><strong>${line.description || '-'}</strong></td>
                <td style="text-align: center;">${line.qty || 0}</td>
                <td style="text-align: center;">${line.unit || '-'}</td>
                <td style="text-align: right;">${Number(line.rate || 0).toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold;">${Number(line.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
            ${lines.length < 6 ? '<tr style="height: 40px;"><td colspan="7"></td></tr>'.repeat(6 - lines.length) : ''}
          </tbody>
        </table>
      </div>
      
      <!-- Bank + Tax Section -->
      <div class="bottom-section">
        <div class="bank-section">
          <div class="bank-title">🏦 BANK DETAILS</div>
          <strong>${COMPANY_INFO.bank.name}</strong><br>
          A/c No: ${COMPANY_INFO.bank.account}<br>
          IFSC: ${COMPANY_INFO.bank.ifsc}<br>
          Branch: ${COMPANY_INFO.bank.branch}<br>
          <div style="border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px;">
            <strong>Amount in Words:</strong><br>
            <span style="font-style: italic;">
              ${numberToWordsIndian(invoice.grand_total || 0)}
            </span>
          </div>
        </div>
        <div class="tax-section">
          <table class="tax-table">
            <tr>
              <th>Taxable Value:</th>
              <td>₹${Number(invoice.taxable_value || 0).toFixed(2)}</td>
            </tr>
            ${invoice.cgst_amount > 0 ? `
              <tr>
                <th>CGST @${((invoice.cgst_amount / (invoice.taxable_value || 1)) * 100).toFixed(1)}%:</th>
                <td>₹${Number(invoice.cgst_amount).toFixed(2)}</td>
              </tr>
            ` : ''}
            ${invoice.sgst_amount > 0 ? `
              <tr>
                <th>SGST @${((invoice.sgst_amount / (invoice.taxable_value || 1)) * 100).toFixed(1)}%:</th>
                <td>₹${Number(invoice.sgst_amount).toFixed(2)}</td>
              </tr>
            ` : ''}
            ${invoice.igst_amount > 0 ? `
              <tr>
                <th>IGST @${((invoice.igst_amount / (invoice.taxable_value || 1)) * 100).toFixed(1)}%:</th>
                <td>₹${Number(invoice.igst_amount).toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="tax-total">
              <th>Total Tax:</th>
              <td>₹${Number((invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0)).toFixed(2)}</td>
            </tr>
            ${invoice.round_off != 0 ? `
              <tr>
                <th>Round Off:</th>
                <td>${invoice.round_off > 0 ? '+' : ''}₹${Number(invoice.round_off).toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="grand-total">
              <th>GRAND TOTAL:</th>
              <td>₹${Number(invoice.grand_total || 0).toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
    
    <!-- FOOTER -->
    <div class="invoice-footer">
      <div class="terms-section">
        <div class="terms-title">📋 TERMS & CONDITIONS</div>
        <div>
          1. Payment due within 30 days from invoice date.<br>
          2. Interest @18% p.a. will be charged on overdue amounts.<br>
          3. Goods once sold will not be taken back unless otherwise specified.<br>
          4. We are not responsible for shortage damage in transit after delivery.<br>
          5. Subject to Gandhinagar jurisdiction only<br>
          6. E-way bill mandatory as per GST rules<br>
        </div>
      </div>
      <div class="signature-section">
        <div style="font-weight: bold; color: #1a472a; font-size: 13px;">
          For ${COMPANY_INFO.name}
        </div>
        <div class="signature-line">
          Authorised Signatory<br>
          <small style="font-size: 8px;">(Seal & Signature)</small>
        </div>
      </div>
    </div>
    
  </div>
  
 
</body>
</html>
  `;
}
// Print Envelope - COMP-10 Size (9.5" × 4.125")
async function printEnvelope(invoiceId) {
  try {
    const response = await fetch(`${API_BASE}/invoices/${invoiceId}`);
    const data = await response.json();
    
    // Create invisible iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    // Write envelope HTML to iframe
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(generateEnvelopeHTML(data.invoice));
    iframeDoc.close();
    
    // Wait for content to load and print
    iframe.onload = function() {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          App.showMessage('✅ Envelope print dialog opened', 'success');
          
          // Cleanup after printing
          iframe.contentWindow.onafterprint = function() {
            document.body.removeChild(iframe);
          };
          
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
          
        } catch (error) {
          console.error('Print error:', error);
          App.showMessage('Print failed - please try again', 'error');
          document.body.removeChild(iframe);
        }
      }, 500);
    };
    
  } catch (error) {
    console.error('Envelope print error:', error);
    App.showMessage('Failed to generate envelope', 'error');
  }
}

// Generate Envelope HTML - COMP-10 Format
function generateEnvelopeHTML(invoice) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Envelope - ${invoice.customer_name}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body {
      font-family: 'Arial', sans-serif;
      background: white;
      padding: 0;
      margin: 0;
    }
    
    /* COMP-10 Envelope Size: 9.5" × 4.125" */
    .envelope-container {
      width: 9.5in;
      height: 4.125in;
      position: relative;
      background: white;
      padding: 0;
      margin: 0 auto;
    }
    
    /* Return Address (Top Left) - Company Logo */
    .return-address {
      position: absolute;
      top: 1px;
      left: 1px;
      width: 1.5in;
    }
    
    .return-logo {
      max-width: 200px;
      max-height: 180px;
      display: block;
    }
    
    .return-company {
      margin-top: 8px;
      font-size: 11px;
      font-weight: bold;
      color: #1a472a;
      line-height: 1.3;
    }
    
    /* Recipient Address (Center-Right) */
    .recipient-address {
      position: absolute;
      top: 1.5in;
      left: 4.5in;
      width: 4.5in;
      padding: 15px;
      background: white;
    }
    
    .recipient-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      font-weight: bold;
    }
    
    .recipient-name {
      font-size: 18px;
      font-weight: bold;
      color: #000;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    
    .recipient-details {
      font-size: 14px;
      color: #333;
      line-height: 1.6;
    }
    
    .recipient-mobile {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #1a472a;
    }
    
    /* Print Styles */
    @media print {
      body { 
        margin: 0; 
        padding: 0;
        background: white;
      }
      
      .envelope-container { 
        box-shadow: none;
        page-break-after: always;
      }
    }
    
    @page {
      size: 9.5in 4.125in landscape;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="envelope-container">
    
    <!-- Return Address (Company Logo) -->
    <div class="return-address">
      <img src="${COMPANY_INFO.logo}" alt="Company Logo" class="return-logo" onerror="this.style.display='none'">
      
    </div>
    
    <!-- Recipient Address -->
    <div class="recipient-address">
      <div class="recipient-label">To:</div>
      <div class="recipient-name">${invoice.customer_name || 'Customer'}</div>
      <div class="recipient-details">
        ${invoice.customer_address || 'Address not available'}
      </div>
      ${invoice.customer_mobile ? `
        <div class="recipient-mobile">
          📞 ${invoice.customer_mobile}
        </div>
      ` : ''}
    </div>
    
  </div>
</body>
</html>
  `;
}

