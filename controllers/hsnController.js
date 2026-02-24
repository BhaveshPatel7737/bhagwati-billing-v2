const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.getAll = async (req, res) => {
  try {
    console.log('GET /api/hsn - Fetching HSN...');
    const { data, error } = await supabase.from('hsn').select('*');
    console.log('HSN data:', data?.length || 0);
    if (error) {
      console.error('HSN getAll error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  } catch (err) {
    console.error('HSN getAll crash:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    console.log('POST /api/hsn body:', req.body);
    const body = req.body || {};
    if (!body.hsncode) {
      console.log('Missing hsncode');
      return res.status(400).json({ error: 'hsncode required' });
    }
    const { data, error } = await supabase.from('hsn').insert([body]).select();
    if (error) {
      console.error('HSN create error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json(data[0]);
  } catch (err) {
    console.error('HSN create crash:', err);
    res.status(500).json({ error: err.message });
  }
};
