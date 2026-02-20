const db = require('../database/db');

class HsnController {
  static getAll(req, res) {
    db.all('SELECT * FROM hsn ORDER BY hsn_code', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }

  static create(req, res) {
    const { hsn_code, gst_rate_percent, exempt_for_bos } = req.body;

    if (!hsn_code) {
      return res.status(400).json({ error: 'HSN code required' });
    }

    db.run(
      `INSERT INTO hsn (hsn_code, gst_rate_percent, exempt_for_bos)
       VALUES (?, ?, ?)`,
      [hsn_code, gst_rate_percent || 0, exempt_for_bos ? 1 : 0],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'HSN created' });
      }
    );
  }

  static delete(req, res) {
    db.run('DELETE FROM hsn WHERE id = ?', [req.params.id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    });
  }
}

module.exports = HsnController;
