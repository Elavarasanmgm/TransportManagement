const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const DOC_COLS = `Id, VehicleId, VehicleName, TypeId, TypeName, DocNo, IssueDate, ExpiryDate, Notes, FileName, FileType, CompanyId, UpdatedAt`;

// GET documents (optional ?vehicleId=X filter); drivers see only their vehicle
// FileData is intentionally excluded from list queries for performance
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  const { vehicleId } = req.query;
  try {
    const pool  = await getPool();
    const dbReq = pool.request().input('cid', sql.Int, cid);
    let query;

    if (vehicleId) {
      dbReq.input('vid', sql.Int, vehicleId);
      query = `SELECT ${DOC_COLS} FROM VehicleDocuments WHERE CompanyId=@cid AND VehicleId=@vid ORDER BY TypeName`;
    } else if (req.user.role === 'driver' && req.user.driverId) {
      dbReq.input('driverId', sql.Int, req.user.driverId);
      query = `SELECT ${DOC_COLS.split(', ').map(c => `vd.${c.trim()}`).join(', ')}
               FROM VehicleDocuments vd
               INNER JOIN Drivers d ON d.VehicleId = vd.VehicleId AND d.CompanyId = vd.CompanyId
               WHERE vd.CompanyId=@cid AND d.Id=@driverId
               ORDER BY vd.TypeName`;
    } else {
      query = `SELECT ${DOC_COLS} FROM VehicleDocuments WHERE CompanyId=@cid ORDER BY VehicleName, TypeName`;
    }
    const result = await dbReq.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET file attachment for a single document
router.get('/:id/file', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT FileName, FileType, FileData FROM VehicleDocuments WHERE Id=@id AND CompanyId=@cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    const row = result.recordset[0];
    if (!row.FileData) return res.status(404).json({ error: 'No file attached' });
    res.json({ fileName: row.FileName, fileType: row.FileType, fileData: row.FileData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upsert document (one record per vehicle × type)
router.post('/', async (req, res) => {
  const { vehicleId, vehicleName, typeId, typeName, docNo, issueDate, expiryDate, notes,
          fileName, fileType, fileData } = req.body;
  if (!vehicleId || !typeId) return res.status(400).json({ error: 'vehicleId and typeId are required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();

    // Drivers can only update their own vehicle's documents
    if (req.user.role === 'driver' && req.user.driverId) {
      const ok = await pool.request()
        .input('driverId', sql.Int, req.user.driverId)
        .input('vid',      sql.Int, vehicleId)
        .input('cid',      sql.Int, cid)
        .query('SELECT Id FROM Drivers WHERE Id=@driverId AND VehicleId=@vid AND CompanyId=@cid');
      if (!ok.recordset.length) return res.status(403).json({ error: 'You can only update your own vehicle' });
    }

    // fileData !== null  → new file uploaded  → update all file columns
    // fileData === null AND fileName === '' → user removed file → set file columns to NULL
    // fileData === null AND fileName !== '' → no change       → COALESCE (keep existing)
    const result = await pool.request()
      .input('vehicleId',   sql.Int,           vehicleId)
      .input('vehicleName', sql.NVarChar,       vehicleName || '')
      .input('typeId',      sql.Int,            typeId)
      .input('typeName',    sql.NVarChar,       typeName || '')
      .input('docNo',       sql.NVarChar,       docNo || '')
      .input('issueDate',   sql.Date,           issueDate  || null)
      .input('expiryDate',  sql.Date,           expiryDate || null)
      .input('notes',       sql.NVarChar,       notes || '')
      .input('fileName',    sql.NVarChar(260),  fileName  || null)
      .input('fileType',    sql.NVarChar(100),  fileType  || null)
      .input('fileData',    sql.NVarChar(sql.MAX), fileData || null)
      .input('cid',         sql.Int,            cid)
      .query(`
        MERGE VehicleDocuments AS target
        USING (SELECT @vehicleId AS VehicleId, @typeId AS TypeId, @cid AS CompanyId) AS src
          ON  target.VehicleId = src.VehicleId
          AND target.TypeId    = src.TypeId
          AND target.CompanyId = src.CompanyId
        WHEN MATCHED THEN
          UPDATE SET VehicleName=@vehicleName, TypeName=@typeName, DocNo=@docNo,
                     IssueDate=@issueDate, ExpiryDate=@expiryDate, Notes=@notes,
                     FileName = CASE WHEN @fileData IS NOT NULL THEN @fileName
                                     WHEN @fileName IS NULL    THEN NULL
                                     ELSE target.FileName END,
                     FileType = CASE WHEN @fileData IS NOT NULL THEN @fileType
                                     WHEN @fileName IS NULL    THEN NULL
                                     ELSE target.FileType END,
                     FileData = CASE WHEN @fileData IS NOT NULL THEN @fileData
                                     WHEN @fileName IS NULL    THEN NULL
                                     ELSE target.FileData END,
                     UpdatedAt=GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (VehicleId, VehicleName, TypeId, TypeName, DocNo, IssueDate, ExpiryDate, Notes,
                  FileName, FileType, FileData, CompanyId)
          VALUES (@vehicleId, @vehicleName, @typeId, @typeName, @docNo, @issueDate, @expiryDate, @notes,
                  @fileName, @fileType, @fileData, @cid)
        OUTPUT INSERTED.Id, INSERTED.VehicleId, INSERTED.VehicleName, INSERTED.TypeId, INSERTED.TypeName,
               INSERTED.DocNo, INSERTED.IssueDate, INSERTED.ExpiryDate, INSERTED.Notes,
               INSERTED.FileName, INSERTED.FileType, INSERTED.CompanyId, INSERTED.UpdatedAt;
      `);
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE document record (admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM VehicleDocuments OUTPUT DELETED.Id WHERE Id=@id AND CompanyId=@cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
