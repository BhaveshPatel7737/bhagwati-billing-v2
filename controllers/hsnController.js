const db = require('../database/db');  // Your Supabase client

class HsnController {
  static async getAll(req, res) {
    try {
      const { data, error } = await db
        .from('hsn')
        .select('*')
        .order('hsn_code');
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
        .insert({ hsn_code, gst_rate_percent: gst_rate_percent || 0, exempt_for_bos: exempt_for_bos ? true : false })
        .select('id')
        .single();
      if (error) throw error;
      console.log(`✅ HSN created ID: ${data.id}`);
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
      res.json({ deleted: data?.length || 0 });
    } catch (error) {
      console.error('Delete HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = HsnController;
