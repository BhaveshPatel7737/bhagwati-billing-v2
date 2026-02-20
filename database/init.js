const db = require('./db');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Split and execute each SQL statement
const statements = schema.split(';').filter(stmt => stmt.trim());

db.serialize(() => {
  statements.forEach(stmt => {
    if (stmt.trim()) {
      db.run(stmt, (err) => {
        if (err) {
          console.error('Schema error:', err);
        }
      });
    }
  });
  
  console.log('✅ Database schema initialized');
  db.close();
});
