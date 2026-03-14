const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET all vehicles
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM Vehicles WHERE CompanyId = @cid ORDER BY Id');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single vehicle
router.get('/:id', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM Vehicles WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create vehicle
router.post('/', async (req, res) => {
  const { name, type, regNo, model, year, status, driver, dailyRate, hourlyRate, emoji } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('name',        sql.NVarChar, name)
      .input('type',        sql.NVarChar, type)
      .input('regNo',       sql.NVarChar, regNo)
      .input('model',       sql.NVarChar, model || '')
      .input('year',        sql.Int,      year || null)
      .input('status',      sql.NVarChar, status || 'available')
      .input('driver',      sql.NVarChar, driver || '')
      .input('dailyRate',   sql.Decimal,  dailyRate || 0)
      .input('hourlyRate',  sql.Decimal,  hourlyRate || 0)
      .input('emoji',       sql.NVarChar, emoji || '🚛')
      .input('cid',         sql.Int,      cid)
      .query(`INSERT INTO Vehicles (Name, Type, RegNo, Model, Year, Status, Driver, DailyRate, HourlyRate, Emoji, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@name, @type, @regNo, @model, @year, @status, @driver, @dailyRate, @hourlyRate, @emoji, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update vehicle
router.put('/:id', async (req, res) => {
  const { name, type, regNo, model, year, status, driver, dailyRate, hourlyRate, emoji } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',          sql.Int,      req.params.id)
      .input('name',        sql.NVarChar, name)
      .input('type',        sql.NVarChar, type)
      .input('regNo',       sql.NVarChar, regNo)
      .input('model',       sql.NVarChar, model || '')
      .input('year',        sql.Int,      year || null)
      .input('status',      sql.NVarChar, status)
      .input('driver',      sql.NVarChar, driver || '')
      .input('dailyRate',   sql.Decimal,  dailyRate || 0)
      .input('hourlyRate',  sql.Decimal,  hourlyRate || 0)
      .input('emoji',       sql.NVarChar, emoji || '🚛')
      .input('cid',         sql.Int,      cid)
      .query(`UPDATE Vehicles SET
                Name=@name, Type=@type, RegNo=@regNo, Model=@model,
                Year=@year, Status=@status, Driver=@driver,
                DailyRate=@dailyRate, HourlyRate=@hourlyRate, Emoji=@emoji
              OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE vehicle
router.delete('/:id', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Vehicles OUTPUT DELETED.Id WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
