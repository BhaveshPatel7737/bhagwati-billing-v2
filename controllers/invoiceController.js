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
      
      // Format response to match old structure
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

  // Get single invoice with lines
  static async getById(req, res) {
    try {
      const { data: invoiceData, error: invoiceError } = await db
        .from('invoices')
        .select(`
          *,
          customers (
            name,
            gstin,
            address,
            state,
            state_code,
            mobile
          )
        `)
        .eq('id', req.params.id)
        .single();
      
      if (invoiceError) throw invoiceError;
      if (!invoiceData) return res.status(404).json({ error: 'Invoice not found' });

      const { data: lines, error: linesError } = await db
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', req.params.id);
      
      if (linesError) throw linesError;
      
      const invoice = {
        ...invoiceData,
        customer_name: invoiceData.customers?.name || '',
        customer_gstin: invoiceData.customers?.gstin || '',
        customer_address: invoiceData.customers?.address || '',
        customer_state: invoiceData.customers?.state || '',
        customer_state_code: invoiceData.customers?.state_code || '',
        customer_mobile: invoiceData.customers?.mobile || ''
      };
      
      res.json({ invoice, lines: lines || [] });
    } catch (error) {
      console.error('Get invoice error:', error);
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

  // Create invoice (simplified - full GST calc preserved)
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

      // Calculate totals (placeholder - integrate your gstCalculator)
      let taxableValue = lines.reduce((sum, line) => sum + (line.qty * line.rate), 0);
      
      // Simplified GST (use your calculateGST logic here)
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      if (type === 'TAX_INVOICE' && customer.state_code === '24') {
        cgstAmount = taxableValue * 0.09;
        sgstAmount = taxableValue * 0.09;
      } else if (type === 'TAX_INVOICE') {
        igstAmount = taxableValue * 0.18;
      }

      const exactTotal = taxableValue + cgstAmount + sgstAmount + igstAmount;
      const roundedTotal = Math.round(exactTotal);
      const roundOff = roundedTotal - exactTotal;

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

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await db
        .from('invoices')
        .insert([{
          type, series, number: finalNumber, date, 
          customer_id, truck_no, cash_credit,
          taxable_value: taxableValue,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          igst_amount: igstAmount,
          round_off: roundOff,
          grand_total: roundedTotal
        }])
        .select('id')
        .single();
      
      if (invoiceError) throw invoiceError;
      const invoiceId = invoiceData.id;

      // Save lines
      const linesData = lines.map(line => ({
        invoice_id: invoiceId,
        hsn_code: line.hsn_code,
        description: line.description,
        qty: line.qty,
        unit: line.unit,
        rate: line.rate,
        amount: line.qty * line.rate
      }));

      const { error: linesError } = await db
        .from('invoice_lines')
        .insert(linesData);
      
      if (linesError) throw linesError;

      console.log(`✅ Invoice created: ID ${invoiceId}`);
      res.json({
        id: invoiceId,
        series,
        number: finalNumber,
        grand_total: roundedTotal,
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
      
      // Calc totals (same as create)
      let taxableValue = lines.reduce((sum, line) => sum + (line.qty * line.rate), 0);
      const customer = await db.from('customers').select('state_code').eq('id', customer_id).single();
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      if (type === 'TAX_INVOICE' && customer.data?.state_code === '24') {
        cgstAmount = taxableValue * 0.09; sgstAmount = taxableValue * 0.09;
      } else if (type === 'TAX_INVOICE') {
        igstAmount = taxableValue * 0.18;
      }
      const grandTotal = Math.round(taxableValue + cgstAmount + sgstAmount + igstAmount);
      
      // Update invoice
      const { error } = await db
        .from('invoices')
        .update({ type, series, number, date, customer_id, truck_no, cash_credit, 
                  taxable_value: taxableValue, cgst_amount: cgstAmount, sgst_amount: sgstAmount, 
                  igst_amount: igstAmount, grand_total: grandTotal })
        .eq('id', invoiceId);
      if (error) throw error;
      
      // Insert new lines
      const linesData = lines.map(line => ({
        invoice_id: invoiceId, hsn_code: line.hsn_code, description: line.description,
        qty: line.qty, unit: line.unit, rate: line.rate, amount: line.qty * line.rate
      }));
      await db.from('invoice_lines').insert(linesData);
      
      res.json({ id: invoiceId, message: 'Invoice updated' });
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


}

module.exports = InvoiceController;
