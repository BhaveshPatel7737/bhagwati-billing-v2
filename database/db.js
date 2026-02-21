const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lbthofzpyybmwwfekkkr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidGhvZnpweXlibXd3ZmVra2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjY0MzQsImV4cCI6MjA4NzI0MjQzNH0.T8SMt7yeBGsWARPhguH91fHMGbN3QgMYmJ1KQRQX_WE';  // Your anon key

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
