const db = require('../database/db');  // Now Supabase!

class CustomerController {
  // Get all customers - SORTED BY ID DESC
  static async getAll(req, res) {
    try {
      const { data, error } = await db
        .from('customers')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get single customer
  static async getById(req, res) {
  try {
    const { data, error } = await db
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();  // ✅ FIX: maybeSingle() not single()
    
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Customer not found' });
    res.json(data);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: error.message });
  }
}


  // Create customer
  static async create(req, res) {
    const { name, gstin, state, state_code, address, mobile, email } = req.body;

    if (!name || !state || !state_code) {
      return res.status(400).json({ error: 'Name, state, and state_code required' });
    }

    try {
      const { data, error } = await db
        .from('customers')
        .insert([{ 
          name, gstin, state, state_code, 
          address: address || '', 
          mobile: mobile || '', 
          email: email || '' 
        }])
        .select('id')
        .single();
      
      if (error) throw error;
      console.log(`✅ Customer created: ID ${data.id}`);
      res.json({ id: data.id, message: 'Customer created' });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update customer
  static async update(req, res) {
    const { name, gstin, state, state_code, address, mobile, email } = req.body;

    try {
      const { data, error } = await db
        .from('customers')
        .update({ 
          name, gstin, state, state_code, 
          address: address || '', 
          mobile: mobile || '', 
          email: email || '' 
        })
        .eq('id', req.params.id)
        .select()
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return res.status(404).json({ error: 'Customer not found' });
      
      console.log(`✅ Customer updated: ID ${req.params.id}`);
      res.json({ updated: 1 });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete customer
  static async delete(req, res) {
    const customerId = req.params.id;
    
    console.log(`🗑️ Attempting to delete customer ID: ${customerId}`);
    
    try {
      const { data, error } = await db
        .from('customers')
        .delete()
        .eq('id', customerId)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      console.log(`✅ Customer deleted: ID ${customerId}`);
      res.json({ deleted: data.length, message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = CustomerController;

