const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getPool, sql } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'transport_jwt_secret_change_me_in_production';
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET env var is not set. Using insecure default. Set it in Vercel environment variables.');
}

const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15-minute window
  max: 10,                    // max 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

const DEFAULT_VEHICLE_TYPES = [
  { name: 'Lorry',   emoji: '🚛', order: 1 },
  { name: 'JCB',     emoji: '🚜', order: 2 },
  { name: 'Tractor', emoji: '🚜', order: 3 },
  { name: 'Car',     emoji: '🚗', order: 4 },
];

function handleRouteError(res, err) {
  const status = err.status || (err.code === 'DB_UNAVAILABLE' ? 503 : 500);
  const error = status === 503
    ? 'Database is unavailable. Please try again shortly.'
    : (err.message || 'Internal server error');
  return res.status(status).json({ error });
}

// ── Auth middleware (export for other routes) ────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
}

// GET /api/auth/needs-setup  — returns true when no companies exist
router.get('/needs-setup', async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request().query('SELECT COUNT(*) AS cnt FROM CompanySettings');
    res.json({ needsSetup: result.recordset[0].cnt === 0 });
  } catch {
    res.json({ needsSetup: true });
  }
});

// POST /api/auth/signup  — register a new company + admin user
router.post('/signup', async (req, res) => {
  const { username, password, fullName, companyName, logo } = req.body;
  if (!username || !password || !companyName)
    return res.status(400).json({ error: 'username, password and companyName are required' });

  try {
    const pool = await getPool();

    // Check username uniqueness
    const dupCheck = await pool.request()
      .input('username', sql.NVarChar, username.trim())
      .query('SELECT Id FROM Users WHERE LOWER(Username) = LOWER(@username)');
    if (dupCheck.recordset.length)
      return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);

    // 1. Create company first — get its Id
    const csResult = await pool.request()
      .input('name', sql.NVarChar, companyName.trim())
      .input('logo', sql.NVarChar, logo || null)
      .query(`INSERT INTO CompanySettings (CompanyName, Logo) OUTPUT INSERTED.* VALUES (@name, @logo)`);
    const company = csResult.recordset[0];

    // 2. Create admin user linked to this company
    const userResult = await pool.request()
      .input('username',  sql.NVarChar, username.trim())
      .input('hash',      sql.NVarChar, hash)
      .input('fullName',  sql.NVarChar, (fullName || '').trim())
      .input('companyId', sql.Int,      company.Id)
      .query(`INSERT INTO Users (Username, PasswordHash, FullName, Role, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@username, @hash, @fullName, 'admin', @companyId)`);
    const user = userResult.recordset[0];

    // 3. Seed default vehicle types for this company
    for (const vt of DEFAULT_VEHICLE_TYPES) {
      await pool.request()
        .input('name',      sql.NVarChar, vt.name)
        .input('emoji',     sql.NVarChar, vt.emoji)
        .input('order',     sql.Int,      vt.order)
        .input('companyId', sql.Int,      company.Id)
        .query(`IF NOT EXISTS (SELECT Id FROM VehicleTypes WHERE LOWER(Name) = LOWER(@name) AND CompanyId = @companyId)
                INSERT INTO VehicleTypes (Name, Emoji, OrderNo, CompanyId) VALUES (@name, @emoji, @order, @companyId)`);
    }

    const token = jwt.sign(
      { id: user.Id, username: user.Username, role: user.Role, companyId: company.Id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user:    { id: user.Id, username: user.Username, fullName: user.FullName, role: user.Role },
      company: { name: company.CompanyName, logo: company.Logo },
    });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, remember } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password are required' });

  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username.trim())
      .query('SELECT * FROM Users WHERE Username = @username');

    if (!result.recordset.length)
      return res.status(401).json({ error: 'Invalid username or password' });

    const user  = result.recordset[0];
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.Id, username: user.Username, role: user.Role, companyId: user.CompanyId,
        driverId: user.DriverId || null, customerId: user.CustomerId || null },
      JWT_SECRET,
      { expiresIn: remember ? '30d' : '24h' }
    );

    const settingsResult = await pool.request()
      .input('cid', sql.Int, user.CompanyId)
      .query('SELECT TOP 1 * FROM CompanySettings WHERE Id = @cid');
    const s = settingsResult.recordset[0];

    res.json({
      token,
      user:    { id: user.Id, username: user.Username, fullName: user.FullName, role: user.Role,
                 driverId: user.DriverId || null, customerId: user.CustomerId || null },
      company: s ? { name: s.CompanyName, logo: s.Logo } : null,
    });
  } catch (err) {
    handleRouteError(res, err);
  }
});

// GET /api/auth/settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, req.user.companyId)
      .query('SELECT TOP 1 * FROM CompanySettings WHERE Id = @cid');
    res.json(result.recordset[0] || {});
  } catch (err) {
    handleRouteError(res, err);
  }
});

// PUT /api/auth/settings
router.put('/settings', authMiddleware, async (req, res) => {
  const { companyName, logo, address, phone, email, gstNo, bankName, bankAccount, ifsc } = req.body;
  if (!companyName) return res.status(400).json({ error: 'companyName is required' });
  try {
    const pool = await getPool();
    await pool.request()
      .input('name',        sql.NVarChar, companyName.trim())
      .input('logo',        sql.NVarChar, logo        || null)
      .input('address',     sql.NVarChar, address     || null)
      .input('phone',       sql.NVarChar, phone       || null)
      .input('email',       sql.NVarChar, email       || null)
      .input('gstNo',       sql.NVarChar, gstNo       || null)
      .input('bankName',    sql.NVarChar, bankName    || null)
      .input('bankAccount', sql.NVarChar, bankAccount || null)
      .input('ifsc',        sql.NVarChar, ifsc        || null)
      .input('cid',         sql.Int,      req.user.companyId)
      .query(`UPDATE CompanySettings
              SET CompanyName=@name, Logo=@logo,
                  Address=@address, Phone=@phone, Email=@email,
                  GSTNo=@gstNo, BankName=@bankName, BankAccount=@bankAccount, IFSC=@ifsc,
                  UpdatedAt=GETDATE()
              WHERE Id=@cid`);
    const updated = await pool.request()
      .input('cid', sql.Int, req.user.companyId)
      .query('SELECT TOP 1 * FROM CompanySettings WHERE Id = @cid');
    res.json(updated.recordset[0] || {});
  } catch (err) {
    handleRouteError(res, err);
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
