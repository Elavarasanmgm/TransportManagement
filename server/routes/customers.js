const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET all customers (customer role sees only their own record)
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    let query;
    const dbReq = pool.request().input('cid', sql.Int, cid);
    if (req.user.role === 'customer' && req.user.customerId) {
      dbReq.input('customerId', sql.Int, req.user.customerId);
      query = 'SELECT * FROM Customers WHERE CompanyId = @cid AND Id = @customerId';
    } else {
      query = 'SELECT * FROM Customers WHERE CompanyId = @cid ORDER BY Id';
    }
    const result = await dbReq.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM Customers WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, contact, phone, email, address, totalRentals, totalAmount, status } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('name',         sql.NVarChar, name)
      .input('contact',      sql.NVarChar, contact      || '')
      .input('phone',        sql.NVarChar, phone        || '')
      .input('email',        sql.NVarChar, email        || '')
      .input('address',      sql.NVarChar, address      || '')
      .input('totalRentals', sql.Int,      totalRentals || 0)
      .input('totalAmount',  sql.Decimal,  totalAmount  || 0)
      .input('status',       sql.NVarChar, status       || 'active')
      .input('cid',          sql.Int,      cid)
      .query(`INSERT INTO Customers (Name, Contact, Phone, Email, Address, TotalRentals, TotalAmount, Status, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@name, @contact, @phone, @email, @address, @totalRentals, @totalAmount, @status, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, contact, phone, email, address, totalRentals, totalAmount, status } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',           sql.Int,      req.params.id)
      .input('name',         sql.NVarChar, name)
      .input('contact',      sql.NVarChar, contact      || '')
      .input('phone',        sql.NVarChar, phone        || '')
      .input('email',        sql.NVarChar, email        || '')
      .input('address',      sql.NVarChar, address      || '')
      .input('totalRentals', sql.Int,      totalRentals || 0)
      .input('totalAmount',  sql.Decimal,  totalAmount  || 0)
      .input('status',       sql.NVarChar, status       || 'active')
      .input('cid',          sql.Int,      cid)
      .query(`UPDATE Customers SET
                Name=@name, Contact=@contact, Phone=@phone, Email=@email,
                Address=@address, TotalRentals=@totalRentals,
                TotalAmount=@totalAmount, Status=@status
              OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Customers OUTPUT DELETED.Id WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
