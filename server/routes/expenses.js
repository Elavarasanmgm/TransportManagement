const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET all expenses
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM Expenses WHERE CompanyId = @cid ORDER BY ExpenseDate DESC');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create expense  (admin only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { vehicleId, vehicleName, category, amount, date, description, paidBy } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('vehicleId',   sql.Int,      vehicleId || null)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('category',    sql.NVarChar, category)
      .input('amount',      sql.Decimal,  amount)
      .input('date',        sql.Date,     date)
      .input('description', sql.NVarChar, description || '')
      .input('paidBy',      sql.NVarChar, paidBy || 'Cash')
      .input('cid',         sql.Int,      cid)
      .query(`INSERT INTO Expenses (VehicleId, VehicleName, Category, Amount, ExpenseDate, Description, PaidBy, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@vehicleId, @vehicleName, @category, @amount, @date, @description, @paidBy, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update expense  (admin only)
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { vehicleId, vehicleName, category, amount, date, description, paidBy } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',          sql.Int,      req.params.id)
      .input('vehicleId',   sql.Int,      vehicleId || null)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('category',    sql.NVarChar, category)
      .input('amount',      sql.Decimal,  amount)
      .input('date',        sql.Date,     date)
      .input('description', sql.NVarChar, description || '')
      .input('paidBy',      sql.NVarChar, paidBy || 'Cash')
      .input('cid',         sql.Int,      cid)
      .query(`UPDATE Expenses SET
                VehicleId=@vehicleId, VehicleName=@vehicleName, Category=@category,
                Amount=@amount, ExpenseDate=@date, Description=@description, PaidBy=@paidBy
              OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE expense  (admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Expenses OUTPUT DELETED.Id WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
