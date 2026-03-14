const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET /api/vehicle-types
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM VehicleTypes WHERE CompanyId = @cid ORDER BY OrderNo, Name');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vehicle-types
router.post('/', async (req, res) => {
  const { name, emoji } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: 'name is required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();

    // Check duplicate within this company
    const dup = await pool.request()
      .input('name', sql.NVarChar, name.trim())
      .input('cid',  sql.Int,      cid)
      .query('SELECT Id FROM VehicleTypes WHERE LOWER(Name) = LOWER(@name) AND CompanyId = @cid');
    if (dup.recordset.length)
      return res.status(409).json({ error: 'Vehicle type already exists' });

    const maxResult = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT ISNULL(MAX(OrderNo), 0) AS maxOrd FROM VehicleTypes WHERE CompanyId = @cid');
    const nextOrd = maxResult.recordset[0].maxOrd + 1;

    const result = await pool.request()
      .input('name',  sql.NVarChar, name.trim())
      .input('emoji', sql.NVarChar, (emoji || '🚛').trim())
      .input('ord',   sql.Int,      nextOrd)
      .input('cid',   sql.Int,      cid)
      .query(`INSERT INTO VehicleTypes (Name, Emoji, OrderNo, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@name, @emoji, @ord, @cid)`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/vehicle-types/:id
router.delete('/:id', async (req, res) => {
  const id  = parseInt(req.params.id, 10);
  const cid = req.user.companyId;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const pool = await getPool();

    const typeRow = await pool.request()
      .input('id',  sql.Int, id)
      .input('cid', sql.Int, cid)
      .query('SELECT Name FROM VehicleTypes WHERE Id = @id AND CompanyId = @cid');
    if (!typeRow.recordset.length)
      return res.status(404).json({ error: 'Vehicle type not found' });

    const typeName = typeRow.recordset[0].Name;
    const inUse = await pool.request()
      .input('type', sql.NVarChar, typeName)
      .input('cid',  sql.Int,      cid)
      .query('SELECT TOP 1 Id FROM Vehicles WHERE Type = @type AND CompanyId = @cid');
    if (inUse.recordset.length)
      return res.status(409).json({ error: `Cannot delete "${typeName}" — it is used by existing vehicles` });

    await pool.request()
      .input('id',  sql.Int, id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM VehicleTypes WHERE Id = @id AND CompanyId = @cid');

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
