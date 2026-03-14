const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET attendance (driver role sees only their own; optionally filter by date)
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool  = await getPool();
    const isDriverRole = req.user.role === 'driver' && req.user.driverId;
    let query;
    const dbReq = pool.request().input('cid', sql.Int, cid);

    if (req.query.date) dbReq.input('date', sql.Date, req.query.date);
    if (isDriverRole)   dbReq.input('driverId', sql.Int, req.user.driverId);

    if (req.query.date && isDriverRole) {
      query = 'SELECT * FROM Attendance WHERE AttDate = @date AND CompanyId = @cid AND DriverId = @driverId ORDER BY DriverId';
    } else if (req.query.date) {
      query = 'SELECT * FROM Attendance WHERE AttDate = @date AND CompanyId = @cid ORDER BY DriverId';
    } else if (isDriverRole) {
      query = 'SELECT * FROM Attendance WHERE CompanyId = @cid AND DriverId = @driverId ORDER BY AttDate DESC';
    } else {
      query = 'SELECT * FROM Attendance WHERE CompanyId = @cid ORDER BY AttDate DESC, DriverId';
    }

    const result = await dbReq.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create attendance (upsert: update if same driver+date already exists)
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { driverId, driverName, date, status, inTime, outTime, overtime, notes } = req.body;
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    // check for existing record for same driver+date
    const existing = await pool.request()
      .input('driverId', sql.Int,  driverId)
      .input('date',     sql.Date, date)
      .input('cid',      sql.Int,  cid)
      .query('SELECT Id FROM Attendance WHERE DriverId = @driverId AND AttDate = @date AND CompanyId = @cid');
    if (existing.recordset.length) {
      // update the existing record
      const upd = await pool.request()
        .input('id',         sql.Int,      existing.recordset[0].Id)
        .input('driverName', sql.NVarChar, driverName || '')
        .input('status',     sql.NVarChar, status || 'present')
        .input('inTime',     sql.NVarChar, inTime || '')
        .input('outTime',    sql.NVarChar, outTime || '')
        .input('overtime',   sql.Decimal,  overtime || 0)
        .input('notes',      sql.NVarChar, notes || '')
        .input('cid',        sql.Int,      cid)
        .query(`UPDATE Attendance SET DriverName=@driverName, Status=@status,
                  InTime=@inTime, OutTime=@outTime, Overtime=@overtime, Notes=@notes
                OUTPUT INSERTED.* WHERE Id=@id AND CompanyId=@cid`);
      return res.status(200).json(upd.recordset[0]);
    }
    const result = await pool.request()
      .input('driverId',   sql.Int,      driverId)
      .input('driverName', sql.NVarChar, driverName || '')
      .input('date',       sql.Date,     date)
      .input('status',     sql.NVarChar, status || 'present')
      .input('inTime',     sql.NVarChar, inTime || '')
      .input('outTime',    sql.NVarChar, outTime || '')
      .input('overtime',   sql.Decimal,  overtime || 0)
      .input('notes',      sql.NVarChar, notes || '')
      .input('cid',        sql.Int,      cid)
      .query(`INSERT INTO Attendance (DriverId, DriverName, AttDate, Status, InTime, OutTime, Overtime, Notes, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@driverId, @driverName, @date, @status, @inTime, @outTime, @overtime, @notes, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update attendance
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { driverId, driverName, date, status, inTime, outTime, overtime, notes } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',         sql.Int,      req.params.id)
      .input('driverId',   sql.Int,      driverId)
      .input('driverName', sql.NVarChar, driverName || '')
      .input('date',       sql.Date,     date)
      .input('status',     sql.NVarChar, status || 'present')
      .input('inTime',     sql.NVarChar, inTime || '')
      .input('outTime',    sql.NVarChar, outTime || '')
      .input('overtime',   sql.Decimal,  overtime || 0)
      .input('notes',      sql.NVarChar, notes || '')
      .input('cid',        sql.Int,      cid)
      .query(`UPDATE Attendance SET
                DriverId=@driverId, DriverName=@driverName, AttDate=@date,
                Status=@status, InTime=@inTime, OutTime=@outTime,
                Overtime=@overtime, Notes=@notes
              OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE attendance
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Attendance OUTPUT DELETED.Id WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
