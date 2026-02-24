const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.getAll = async (req, res) => {
  const { data, error } = await supabase.from('hsn').select('*').order('hsncode');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
};

exports.create = async (req, res) => {
  try {
    const { hsncode, description, gstratepercent = 18 } = req.body;
    if (!hsncode || !description) return res.status(400).json({ error: 'HSN code & description required' });
    const { data, error } = await supabase
      .from('hsn')
      .insert([{ hsncode, description, gstratepercent }])
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('hsn').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'HSN deleted' });
};
