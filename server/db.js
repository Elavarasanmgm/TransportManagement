const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'TransportManagement',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    trustServerCertificate: true,
    encrypt: false,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to TransportManagement on DESKTOP-ASUHSNB (Windows Auth: DESKTOP-ASUHSNB\\HP)');
    return pool;
  } catch (err) {
    const msg = err.originalError?.message || err.message || String(err);
    console.error('❌ DB Connection failed:', msg);
    throw new Error(msg);
  }
}

module.exports = { getPool, sql };
