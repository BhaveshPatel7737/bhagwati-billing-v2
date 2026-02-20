const db = require('../database/db');

const COMPANY_STATE_CODE = '24'; // Gujarat

function calculateGST(lines, customerStateCode, callback) {
  if (!lines || lines.length === 0) {
    return callback(new Error('No lines provided'));
  }

  const isSameState = customerStateCode === COMPANY_STATE_CODE;
  let taxableValue = 0;

  // Calculate line totals
  lines.forEach(line => {
    line.amount = (line.qty || 0) * (line.rate || 0);
    taxableValue += line.amount;
  });

  // Get GST rate from first HSN
  const firstHsn = lines[0].hsn_code;
  
  db.get('SELECT gst_rate_percent FROM hsn WHERE hsn_code = ?', [firstHsn], (err, hsn) => {
    if (err) return callback(err);

    const gstRate = hsn ? hsn.gst_rate_percent : 0;
    const totalTax = taxableValue * (gstRate / 100);

    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

    if (isSameState) {
      cgstAmount = totalTax / 2;
      sgstAmount = totalTax / 2;
    } else {
      igstAmount = totalTax;
    }

    callback(null, {
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount,
      gstRate
    });
  });
}

module.exports = { calculateGST, COMPANY_STATE_CODE };
