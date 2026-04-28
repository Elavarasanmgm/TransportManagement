const sql = require('mssql');
require('dotenv').config();

const domain   = process.env.DB_DOMAIN   || '';
const user     = process.env.DB_USER     || '';
const password = process.env.DB_PASSWORD || '';

const dbConfig = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_DATABASE || 'TransportManagement',
  // Use NTLM when a domain is provided, otherwise plain SQL auth
  ...(domain ? {
    authentication: {
      type: 'ntlm',
      options: { domain, userName: user, password },
    },
  } : { user, password }),
  options: {
    instanceName:           process.env.DB_INSTANCE   || undefined,
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    encrypt:                process.env.DB_ENCRYPT    === 'true',
    enableArithAbort:       true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

if (!dbConfig.options.instanceName) delete dbConfig.options.instanceName;

let pool = null;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log(`✅ Connected to ${dbConfig.database} at ${dbConfig.server}:${dbConfig.port}`);
    return pool;
  } catch (err) {
    const msg = err.originalError?.message || err.message || String(err);
    console.error('❌ DB Connection failed:', msg);
    const dbError = new Error('Database is unavailable. Please try again shortly.');
    dbError.cause = err;
    dbError.code = 'DB_UNAVAILABLE';
    dbError.status = 503;
    throw dbError;
  }
}

module.exports = { getPool, sql };
