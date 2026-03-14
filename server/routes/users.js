const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

// All routes require auth + admin role
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
});

// GET /api/users  — list users in same company
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT Id, Username, FullName, Role, DriverId, CustomerId, CreatedAt FROM Users WHERE CompanyId = @cid ORDER BY Id');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users  — create new user
router.post('/', async (req, res) => {
  const { username, password, fullName, role, driverId, customerId } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required' });

  const validRoles = ['admin', 'driver', 'customer'];
  const safeRole = validRoles.includes(role) ? role : 'admin';

  try {
    const pool = await getPool();

    const dup = await pool.request()
      .input('username', sql.NVarChar, username.trim())
      .query('SELECT Id FROM Users WHERE LOWER(Username) = LOWER(@username)');
    if (dup.recordset.length)
      return res.status(409).json({ error: 'Username already exists' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.request()
      .input('username',   sql.NVarChar, username.trim())
      .input('hash',       sql.NVarChar, hash)
      .input('fullName',   sql.NVarChar, (fullName || '').trim())
      .input('role',       sql.NVarChar, safeRole)
      .input('driverId',   sql.Int,      driverId   || null)
      .input('customerId', sql.Int,      customerId || null)
      .input('cid',        sql.Int,      req.user.companyId)
      .query(`INSERT INTO Users (Username, PasswordHash, FullName, Role, DriverId, CustomerId, CompanyId)
              OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.FullName, INSERTED.Role, INSERTED.DriverId, INSERTED.CustomerId, INSERTED.CreatedAt
              VALUES (@username, @hash, @fullName, @role, @driverId, @customerId, @cid)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id  — update user (optionally change password)
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const { fullName, role, password, driverId, customerId } = req.body;
  const validRoles = ['admin', 'driver', 'customer'];
  const safeRole = validRoles.includes(role) ? role : 'admin';
  try {
    const pool = await getPool();

    // Verify exists within same company
    const existing = await pool.request()
      .input('id',  sql.Int, id)
      .input('cid', sql.Int, req.user.companyId)
      .query('SELECT Id, Username FROM Users WHERE Id = @id AND CompanyId = @cid');
    if (!existing.recordset.length)
      return res.status(404).json({ error: 'User not found' });

    if (password) {
      if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const hash = await bcrypt.hash(password, 10);
      await pool.request()
        .input('id',         sql.Int,      id)
        .input('fullName',   sql.NVarChar, (fullName || '').trim())
        .input('role',       sql.NVarChar, safeRole)
        .input('driverId',   sql.Int,      driverId   || null)
        .input('customerId', sql.Int,      customerId || null)
        .input('hash',       sql.NVarChar, hash)
        .query(`UPDATE Users SET FullName=@fullName, Role=@role, DriverId=@driverId, CustomerId=@customerId, PasswordHash=@hash WHERE Id=@id`);
    } else {
      await pool.request()
        .input('id',         sql.Int,      id)
        .input('fullName',   sql.NVarChar, (fullName || '').trim())
        .input('role',       sql.NVarChar, safeRole)
        .input('driverId',   sql.Int,      driverId   || null)
        .input('customerId', sql.Int,      customerId || null)
        .query(`UPDATE Users SET FullName=@fullName, Role=@role, DriverId=@driverId, CustomerId=@customerId WHERE Id=@id`);
    }

    const updated = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT Id, Username, FullName, Role, DriverId, CustomerId, CreatedAt FROM Users WHERE Id = @id');
    res.json(updated.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  // Prevent self-deletion
  if (req.user.id === id)
    return res.status(403).json({ error: 'You cannot delete your own account' });

  try {
    const pool = await getPool();
    const existing = await pool.request()
      .input('id',  sql.Int, id)
      .input('cid', sql.Int, req.user.companyId)
      .query('SELECT Id FROM Users WHERE Id = @id AND CompanyId = @cid');
    if (!existing.recordset.length)
      return res.status(404).json({ error: 'User not found' });

    await pool.request()
      .input('id',  sql.Int, id)
      .input('cid', sql.Int, req.user.companyId)
      .query('DELETE FROM Users WHERE Id = @id AND CompanyId = @cid');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
