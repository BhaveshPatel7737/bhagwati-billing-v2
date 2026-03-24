const db = require('../database/db');
const { calculateGST } = require('../utils/gstCalculator');

class InvoiceController {
  // Get all invoices with customer details
  static async getAll(req, res) {
    try {
      const { data, error } = await db
        .from('invoices')
        .select(`
          *,
          customers (
            name,
            gstin,
            address,
            state,
            state_code
          )
        `)
        .order('id', { ascending: false });
      
      if (error) throw error;
      
      const rows = data.map(invoice => ({
        ...invoice,
        customer_name: invoice.customers?.name || '',
        customer_gstin: invoice.customers?.gstin || '',
        customer_address: invoice.customers?.address || '',
        customer_state: invoice.customers?.state || '',
        customer_state_code: invoice.customers?.state_code || ''
      }));
      
      res.json(rows || []);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get invoices by type
  static async getByType(req, res) {
    try {
      const { data, error } = await db
        .from('invoices')
        .select(`*, customers(name, gstin, address, state, state_code)`)
        .eq('type', req.params.type)
        .order('id', { ascending: false });
      if (error) throw error;
      const rows = (data || []).map(inv => ({
        ...inv,
        customer_name: inv.customers?.name || ''
      }));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get next invoice number
  static async getNextNumber(req, res) {
    try {
      const { data, error } = await db
        .from('invoices')
        .select('number')
        .eq('series', req.params.series)
        .order('number', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      const maxNum = data?.[0]?.number || 0;
      res.json({ next_number: Number(maxNum) + 1 });
    } catch (error) {
      console.error('Get next number error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ HELPER: Calculate GST per line using HSN rate from DB
  // Table: 'hsn', Columns: hsn_code, gst_rate_percent, exempt_for_bos
  static async calcTotalsFromLines(lines, customer, type) {
    // Collect unique HSN codes from lines
    const hsnCodes = [...new Set(lines.map(l => l.hsn_code).filter(Boolean))];
    
    let hsnMap = {};
    if (hsnCodes.length > 0) {
      const { data: hsnRows, error: hsnError } = await db
        .from('hsn')                          // ✅ correct table name
        .select('hsn_code, gst_rate_percent, exempt_for_bos')  // ✅ correct columns
        .in('hsn_code', hsnCodes);            // ✅ correct column
      
      if (hsnError) {
        console.error('HSN lookup error:', hsnError.message);
      }

      (hsnRows || []).forEach(h => {
        hsnMap[h.hsn_code] = {
          rate: parseFloat(h.gst_rate_percent) || 0,  // ✅ correct column
          exempt: h.exempt_for_bos || false            // ✅ correct column
        };
      });
    }

    const isIntraState = customer.state_code === '24'; // Gujarat = intra-state
    const isTaxInvoice = type === 'TAX_INVOICE';

    let taxableValue = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const processedLines = lines.map(line => {
      const lineAmount = (parseFloat(line.qty) || 0) * (parseFloat(line.rate) || 0);
      taxableValue += lineAmount;

      const hsnInfo = hsnMap[line.hsn_code] || { rate: 0, exempt: false };
      const gstRate = hsnInfo.rate;   // e.g. 5, 12, 18
      const isExempt = hsnInfo.exempt;

      let lineCgst = 0, lineSgst = 0, lineIgst = 0;

      if (isTaxInvoice && !isExempt && gstRate > 0) {
        if (isIntraState) {
          // Intra-state Gujarat: CGST + SGST (each = gstRate/2)
          lineCgst = lineAmount * (gstRate / 2) / 100;
          lineSgst = lineAmount * (gstRate / 2) / 100;
        } else {
          // Inter-state: IGST = full gstRate
          lineIgst = lineAmount * gstRate / 100;
        }
      }

      cgstAmount += lineCgst;
      sgstAmount += lineSgst;
      igstAmount += lineIgst;

      return {
        ...line,
        amount: lineAmount,
        gst_rate: gstRate,
        cgst: lineCgst,
        sgst: lineSgst,
        igst: lineIgst
      };
    });

    const exactTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
    const roundedTotal = Math.round(exactTotal);
    const roundOff = parseFloat((roundedTotal - exactTotal).toFixed(2));

    return {
      processedLines,
      taxableValue: parseFloat(taxableValue.toFixed(2)),
      cgstAmount: parseFloat(cgstAmount.toFixed(2)),
      sgstAmount: parseFloat(sgstAmount.toFixed(2)),
      igstAmount: parseFloat(igstAmount.toFixed(2)),
      roundOff,
      grandTotal: roundedTotal
    };
  }

  // Create invoice
  static async create(req, res) {
    const { type, series, number, date, customer_id, truck_no, cash_credit, lines } = req.body;

    if (!lines || lines.length === 0) {
      return res.status(400).json({ error: 'No lines provided' });
    }

    try {
      // Get customer
      const { data: customer, error: customerError } = await db
        .from('customers')
        .select('*')
        .eq('id', customer_id)
        .single();
      
      if (customerError || !customer) {
        return res.status(400).json({ error: 'Customer not found' });
      }

      // ✅ Calculate GST using correct HSN rates from DB
      const totals = await InvoiceController.calcTotalsFromLines(lines, customer, type);

      // Use provided number or generate next
      let finalNumber = number;
      if (!finalNumber) {
        const { data: maxRow } = await db
          .from('invoices')
          .select('number')
          .eq('series', series)
          .order('number', { ascending: false })
          .limit(1);
        
        finalNumber = (Number(maxRow?.[0]?.number) || 0) + 1;
      }

      // Create invoice record
      const { data: invoiceData, error: invoiceError } = await db
        .from('invoices')
        .insert([{
          type, series, number: finalNumber, date, 
          customer_id, truck_no, cash_credit,
          taxable_value: totals.taxableValue,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          igst_amount: totals.igstAmount,
          round_off: totals.roundOff,
          grand_total: totals.grandTotal
        }])
        .select('id')
        .single();
      
      if (invoiceError) throw invoiceError;
      const invoiceId = invoiceData.id;

      // Save invoice lines
      const linesData = totals.processedLines.map(line => ({
        invoice_id: invoiceId,
        hsn_code: line.hsn_code,
        description: line.description,
        qty: line.qty,
        unit: line.unit,
        rate: line.rate,
        amount: line.amount
      }));

      const { error: linesError } = await db
        .from('invoice_lines')
        .insert(linesData);
      
      if (linesError) throw linesError;

      console.log(`✅ Invoice created: ID ${invoiceId}, GST calculated from HSN rates`);
      res.json({
        id: invoiceId,
        series,
        number: finalNumber,
        grand_total: totals.grandTotal,
        taxable_value: totals.taxableValue,
        cgst_amount: totals.cgstAmount,
        sgst_amount: totals.sgstAmount,
        igst_amount: totals.igstAmount,
        message: 'Invoice created'
      });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update invoice
  static async update(req, res) {
    const invoiceId = req.params.id;
    const { type, series, number, date, customer_id, truck_no, cash_credit, lines } = req.body;
    try {
      // Delete old lines
      await db.from('invoice_lines').delete().eq('invoice_id', invoiceId);

      // Get customer
      const { data: customer } = await db
        .from('customers')
        .select('*')
        .eq('id', customer_id)
        .single();

      // ✅ Calculate GST using correct HSN rates from DB
      const totals = await InvoiceController.calcTotalsFromLines(lines, customer, type);

      // Update invoice record
      const { error } = await db
        .from('invoices')
        .update({
          type, series, number, date, customer_id, truck_no, cash_credit,
          taxable_value: totals.taxableValue,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          igst_amount: totals.igstAmount,
          round_off: totals.roundOff,
          grand_total: totals.grandTotal
        })
        .eq('id', invoiceId);
      if (error) throw error;

      // Insert updated lines
      const linesData = totals.processedLines.map(line => ({
        invoice_id: invoiceId,
        hsn_code: line.hsn_code,
        description: line.description,
        qty: line.qty,
        unit: line.unit,
        rate: line.rate,
        amount: line.amount
      }));
      await db.from('invoice_lines').insert(linesData);

      res.json({
        id: invoiceId,
        series,
        number,
        grand_total: totals.grandTotal,
        message: 'Invoice updated'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete invoice
  static async delete(req, res) {
    try {
      await db.from('invoice_lines').delete().eq('invoice_id', req.params.id);
      const { error } = await db.from('invoices').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ message: 'Invoice deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get single invoice for edit
  static async getById(req, res) {
    try {
      const { data: invoice, error: invError } = await db
        .from('invoices')
        .select('*, customers(name, gstin, address, state, state_code, mobile)')
        .eq('id', req.params.id)
        .single();
      if (invError || !invoice) return res.status(404).json({ error: 'Invoice not found' });
      
      const { data: lines, error: lineError } = await db
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', req.params.id);
      if (lineError) throw lineError;
      
      res.json({ 
        invoice: {
          ...invoice,
          customer_name: invoice.customers?.name || '',
          customer_gstin: invoice.customers?.gstin || '',
          customer_address: invoice.customers?.address || '',
          customer_state: invoice.customers?.state || '',
          customer_state_code: invoice.customers?.state_code || '',
          customer_mobile: invoice.customers?.mobile || ''
        },
        lines 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = InvoiceController;
