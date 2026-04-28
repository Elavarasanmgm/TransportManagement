require('dotenv').config();
const express  = require('express');
const cors     = require('cors');

const app = express();
const migrationState = {
  ready: false,
  error: null,
};

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // When no explicit allowlist is configured, accept the caller's origin.
    if (!origin) return callback(null, true);
    if (!allowedOrigins) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // raised for base64 logo uploads

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/vehicle-types', require('./routes/vehicleTypes'));
app.use('/api/vehicles',      require('./routes/vehicles'));
app.use('/api/rentals',       require('./routes/rentals'));
app.use('/api/expenses',      require('./routes/expenses'));
app.use('/api/drivers',       require('./routes/drivers'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/vehicle-document-types', require('./routes/vehicleDocumentTypes'));
app.use('/api/vehicle-documents',      require('./routes/vehicleDocuments'));
app.use('/api/maintenance-types',      require('./routes/maintenanceTypes'));
app.use('/api/maintenance',            require('./routes/maintenance'));

// Health check
app.get('/api/health', (req, res) => {
  const payload = {
    status: migrationState.error ? 'degraded' : 'ok',
    migrationReady: migrationState.ready,
    migrationError: migrationState.error,
  };
  if (migrationState.error) return res.status(503).json(payload);
  return res.json(payload);
});

async function runMigration() {
  const migrate = require('./migrate');
  try {
    await migrate();
    migrationState.ready = true;
    migrationState.error = null;
  } catch (err) {
    migrationState.ready = false;
    migrationState.error = err.message;
    console.error('Migration failed:', err.message);
  }
}

if (require.main === module) {
  // Traditional server mode (local development)
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Transport API running on port ${PORT}`));
  runMigration();
} else {
  // Serverless mode (Vercel) — run migration as a non-blocking side effect
  runMigration();
}

module.exports = app;
