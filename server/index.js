require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const migrate  = require('./migrate');

const app = express();

app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));
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

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

migrate()
  .then(() => app.listen(PORT, () => console.log(`Transport API running on port ${PORT}`)))
  .catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
