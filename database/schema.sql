-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gstin TEXT,
  state TEXT NOT NULL,
  state_code TEXT NOT NULL,
  address TEXT,
  mobile TEXT,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- HSN master table
CREATE TABLE IF NOT EXISTS hsn (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hsn_code TEXT NOT NULL UNIQUE,
  gst_rate_percent REAL DEFAULT 0,
  exempt_for_bos INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  series TEXT NOT NULL,
  number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  truck_no TEXT,
  cash_credit TEXT DEFAULT 'Credit',
  taxable_value REAL DEFAULT 0,
  cgst_amount REAL DEFAULT 0,
  sgst_amount REAL DEFAULT 0,
  igst_amount REAL DEFAULT 0,
  round_off REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Invoice lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  hsn_code TEXT,
  description TEXT,
  qty REAL DEFAULT 0,
  unit TEXT,
  rate REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_series_number ON invoices(series, number);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin);

-- Invoices table with CASCADE DELETE
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  series TEXT NOT NULL,
  number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  truck_no TEXT,
  cash_credit TEXT DEFAULT 'Credit',
  taxable_value REAL DEFAULT 0,
  cgst_amount REAL DEFAULT 0,
  sgst_amount REAL DEFAULT 0,
  igst_amount REAL DEFAULT 0,
  round_off REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
