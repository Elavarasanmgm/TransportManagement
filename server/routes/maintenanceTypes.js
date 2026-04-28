const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET all maintenance types for this company
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM MaintenanceTypes WHERE CompanyId=@cid ORDER BY IsSystem DESC, Name');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create type (admin only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, emoji, defaultKmInterval, defaultDaysInterval } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('name',  sql.NVarChar, name.trim())
      .input('emoji', sql.NVarChar, emoji || '🔧')
      .input('km',    sql.Int,      defaultKmInterval   || null)
      .input('days',  sql.Int,      defaultDaysInterval || null)
      .input('cid',   sql.Int,      cid)
      .query(`INSERT INTO MaintenanceTypes (Name, Emoji, DefaultKmInterval, DefaultDaysInterval, IsSystem, CompanyId)
                OUTPUT INSERTED.*
              VALUES (@name, @emoji, @km, @days, 0, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update type (admin only; all fields including system types)
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, emoji, defaultKmInterval, defaultDaysInterval } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',    sql.Int,      req.params.id)
      .input('name',  sql.NVarChar, name.trim())
      .input('emoji', sql.NVarChar, emoji || '🔧')
      .input('km',    sql.Int,      defaultKmInterval   || null)
      .input('days',  sql.Int,      defaultDaysInterval || null)
      .input('cid',   sql.Int,      cid)
      .query(`UPDATE MaintenanceTypes
                SET Name=@name, Emoji=@emoji, DefaultKmInterval=@km, DefaultDaysInterval=@days
                OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE type (admin only; block system types and types with records)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();

    const typeRec = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT IsSystem FROM MaintenanceTypes WHERE Id=@id AND CompanyId=@cid');
    if (!typeRec.recordset.length) return res.status(404).json({ error: 'Not found' });
    if (typeRec.recordset[0].IsSystem)
      return res.status(400).json({ error: 'Cannot delete system maintenance types. Edit them instead.' });

    const used = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT COUNT(*) AS cnt FROM MaintenanceRecords WHERE TypeId=@id AND CompanyId=@cid');
    if (used.recordset[0].cnt > 0)
      return res.status(400).json({ error: 'Cannot delete: type has existing maintenance records.' });

    await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM MaintenanceTypes WHERE Id=@id AND CompanyId=@cid');
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
