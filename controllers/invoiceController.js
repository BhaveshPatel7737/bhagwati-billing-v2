const db = require('../database/db');
const { calculateGST } = require('../utils/gstCalculator');

class InvoiceController {
  // Get all invoices with customer details
  static getAll(req, res) {
    const query = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.gstin as customer_gstin,
        c.address as customer_address,
        c.state as customer_state,
        c.state_code as customer_state_code
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.id DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }

  // Get single invoice with lines
  static getById(req, res) {
    const query = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.gstin as customer_gstin,
        c.address as customer_address,
        c.state as customer_state,
        c.state_code as customer_state_code,
        c.mobile as customer_mobile
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `;

    db.get(query, [req.params.id], (err, invoice) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      db.all('SELECT * FROM invoice_lines WHERE invoice_id = ?', [req.params.id], (err, lines) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ invoice, lines: lines || [] });
      });
    });
  }

  // Get next invoice number
  static getNextNumber(req, res) {
    const series = req.params.series;
    db.get(
      'SELECT MAX(number) as max_num FROM invoices WHERE series = ?',
      [series],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ next_number: (row?.max_num || 0) + 1 });
      }
    );
  }

  // Create invoice
  static create(req, res) {
    const { type, series, number, date, customer_id, truck_no, cash_credit, lines } = req.body;

    if (!lines || lines.length === 0) {
      return res.status(400).json({ error: 'No lines provided' });
    }

    // Get customer
    db.get('SELECT * FROM customers WHERE id = ?', [customer_id], (err, customer) => {
      if (err || !customer) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // Calculate GST
      if (type === 'TAX_INVOICE') {
        calculateGST(lines, customer.state_code, (err, gstData) => {
          if (err) return res.status(500).json({ error: err.message });
          saveInvoice(gstData);
        });
      } else {
        // Bill of Supply
        saveInvoice({
          taxableValue: lines.reduce((sum, line) => sum + (line.qty * line.rate), 0),
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0
        });
      }

      function saveInvoice(gstData) {
        const { taxableValue, cgstAmount, sgstAmount, igstAmount } = gstData;
        const exactTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
        const roundedTotal = Math.round(exactTotal);
        const roundOff = roundedTotal - exactTotal;

        // Get next number if not provided
        const getNumberAndSave = (finalNumber) => {
          db.run(
            `INSERT INTO invoices 
             (type, series, number, date, customer_id, truck_no, cash_credit, 
              taxable_value, cgst_amount, sgst_amount, igst_amount, round_off, grand_total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, series, finalNumber, date, customer_id, truck_no, cash_credit,
             taxableValue, cgstAmount, sgstAmount, igstAmount, roundOff, roundedTotal],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });

              const invoiceId = this.lastID;

              // Save lines
              const stmt = db.prepare(
                `INSERT INTO invoice_lines (invoice_id, hsn_code, description, qty, unit, rate, amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
              );

              lines.forEach(line => {
                const amount = (line.qty || 0) * (line.rate || 0);
                stmt.run(invoiceId, line.hsn_code, line.description, line.qty, line.unit, line.rate, amount);
              });

              stmt.finalize();

              res.json({
                id: invoiceId,
                series,
                number: finalNumber,
                grand_total: roundedTotal,
                message: 'Invoice created'
              });
            }
          );
        };

        if (number) {
          getNumberAndSave(number);
        } else {
          db.get('SELECT MAX(number) as max_num FROM invoices WHERE series = ?', [series], (err, row) => {
            const nextNumber = (row?.max_num || 0) + 1;
            getNumberAndSave(nextNumber);
          });
        }
      }
    });
  }
}

module.exports = InvoiceController;
