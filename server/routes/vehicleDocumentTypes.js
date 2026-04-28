const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET all document types for this company
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT * FROM VehicleDocumentTypes WHERE CompanyId=@cid ORDER BY IsSystem DESC, Name');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new type (admin only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, emoji, defaultValidityDays } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('name',  sql.NVarChar, name.trim())
      .input('emoji', sql.NVarChar, emoji || '📄')
      .input('days',  sql.Int,      defaultValidityDays || 365)
      .input('cid',   sql.Int,      cid)
      .query(`INSERT INTO VehicleDocumentTypes (Name, Emoji, DefaultValidityDays, IsSystem, CompanyId)
                OUTPUT INSERTED.*
              VALUES (@name, @emoji, @days, 0, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update type (admin only; system types also editable for validity days / emoji)
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, emoji, defaultValidityDays } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',    sql.Int,      req.params.id)
      .input('name',  sql.NVarChar, name.trim())
      .input('emoji', sql.NVarChar, emoji || '📄')
      .input('days',  sql.Int,      defaultValidityDays || 365)
      .input('cid',   sql.Int,      cid)
      .query(`UPDATE VehicleDocumentTypes
                SET Name=@name, Emoji=@emoji, DefaultValidityDays=@days
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
    const pool    = await getPool();
    const typeRec = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT IsSystem FROM VehicleDocumentTypes WHERE Id=@id AND CompanyId=@cid');
    if (!typeRec.recordset.length) return res.status(404).json({ error: 'Not found' });
    if (typeRec.recordset[0].IsSystem) return res.status(400).json({ error: 'Cannot delete system document types' });

    const used = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT COUNT(*) AS cnt FROM VehicleDocuments WHERE TypeId=@id AND CompanyId=@cid');
    if (used.recordset[0].cnt > 0)
      return res.status(400).json({ error: 'Cannot delete: document type has existing records. Remove the records first.' });

    await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM VehicleDocumentTypes WHERE Id=@id AND CompanyId=@cid');
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
