const db = require('../database/db');  // Now Supabase!

class HsnController {
  static async getAll(req, res) {
    try {
      const { data, error } = await db
        .from('hsn')
        .select('*')
        .order('code', { ascending: true });  // hsn_code → code
      
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error('Get HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req, res) {
    const { hsn_code, gst_rate_percent, exempt_for_bos } = req.body;

    if (!hsn_code) {
      return res.status(400).json({ error: 'HSN code required' });
    }

    try {
      const { data, error } = await db
        .from('hsn')
        .insert([{
          code: hsn_code,  // hsn_code → code
          gst_rate: gst_rate_percent || 0,
          exempt_for_bos: exempt_for_bos ? true : false
        }])
        .select('id')
        .single();
      
      if (error) throw error;
      console.log(`✅ HSN created: ${hsn_code}`);
      res.json({ id: data.id, message: 'HSN created' });
    } catch (error) {
      console.error('Create HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { data, error } = await db
        .from('hsn')
        .delete()
        .eq('id', req.params.id)
        .select();
      
      if (error) throw error;
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'HSN not found' });
      }
      
      console.log(`✅ HSN deleted: ID ${req.params.id}`);
      res.json({ deleted: data.length });
    } catch (error) {
      console.error('Delete HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = HsnController;
