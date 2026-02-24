const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const HsnController = {
  async getAll(req, res) {
    try {
      const { data, error } = await supabase.from('hsn').select('*');
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error('Get HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { hsncode, description, gstratepercent = 18 } = req.body;
      if (!hsncode || !description) return res.status(400).json({ error: 'HSN code and description required' });
      const { data, error } = await supabase.from('hsn').insert([{ hsncode, description, gstratepercent }]).select();
      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      console.error('Create HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('hsn').delete().eq('id', id);
      if (error) throw error;
      res.json({ message: 'HSN deleted' });
    } catch (error) {
      console.error('Delete HSN error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = HsnController;
