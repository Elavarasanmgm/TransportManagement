const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET maintenance records; accepts ?vehicleId=X and/or ?typeId=Y
// Drivers see only their own vehicle's records
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  const { vehicleId, typeId } = req.query;
  try {
    const pool  = await getPool();
    const dbReq = pool.request().input('cid', sql.Int, cid);
    let where   = 'WHERE mr.CompanyId=@cid';

    if (vehicleId) {
      dbReq.input('vid', sql.Int, vehicleId);
      where += ' AND mr.VehicleId=@vid';
    } else if (req.user.role === 'driver' && req.user.driverId) {
      dbReq.input('driverId', sql.Int, req.user.driverId);
      where += ` AND mr.VehicleId = (
        SELECT TOP 1 VehicleId FROM Drivers WHERE Id=@driverId AND CompanyId=@cid)`;
    }

    if (typeId) {
      dbReq.input('tid', sql.Int, typeId);
      where += ' AND mr.TypeId=@tid';
    }

    const result = await dbReq.query(
      `SELECT mr.* FROM MaintenanceRecords mr ${where} ORDER BY mr.ServiceDate DESC`
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create maintenance record (admin + driver, driver checks own vehicle)
router.post('/', async (req, res) => {
  const {
    vehicleId, vehicleName, typeId, typeName,
    serviceDate, kmAtService, nextDueDate, nextDueKm,
    cost, doneBy, notes,
  } = req.body;
  if (!vehicleId || !typeId || !serviceDate)
    return res.status(400).json({ error: 'vehicleId, typeId and serviceDate are required' });
  const cid = req.user.companyId;

  try {
    const pool = await getPool();

    if (req.user.role === 'driver' && req.user.driverId) {
      const ok = await pool.request()
        .input('driverId', sql.Int, req.user.driverId)
        .input('vid',      sql.Int, vehicleId)
        .input('cid',      sql.Int, cid)
        .query('SELECT Id FROM Drivers WHERE Id=@driverId AND VehicleId=@vid AND CompanyId=@cid');
      if (!ok.recordset.length)
        return res.status(403).json({ error: 'You can only add records for your own vehicle' });
    }

    const result = await pool.request()
      .input('vehicleId',   sql.Int,      vehicleId)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('typeId',      sql.Int,      typeId)
      .input('typeName',    sql.NVarChar, typeName || '')
      .input('serviceDate', sql.Date,     serviceDate)
      .input('kmAtService', sql.Int,      kmAtService  || null)
      .input('nextDueDate', sql.Date,     nextDueDate  || null)
      .input('nextDueKm',   sql.Int,      nextDueKm    || null)
      .input('cost',        sql.Decimal,  cost         || 0)
      .input('doneBy',      sql.NVarChar, doneBy || '')
      .input('notes',       sql.NVarChar, notes  || '')
      .input('cid',         sql.Int,      cid)
      .query(`INSERT INTO MaintenanceRecords
                (VehicleId, VehicleName, TypeId, TypeName, ServiceDate, KmAtService,
                 NextDueDate, NextDueKm, Cost, DoneBy, Notes, CompanyId)
                OUTPUT INSERTED.*
              VALUES
                (@vehicleId, @vehicleName, @typeId, @typeName, @serviceDate, @kmAtService,
                 @nextDueDate, @nextDueKm, @cost, @doneBy, @notes, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update maintenance record (admin + driver, driver checks own vehicle)
router.put('/:id', async (req, res) => {
  const {
    vehicleId, vehicleName, typeId, typeName,
    serviceDate, kmAtService, nextDueDate, nextDueKm,
    cost, doneBy, notes,
  } = req.body;
  const cid = req.user.companyId;

  try {
    const pool = await getPool();

    if (req.user.role === 'driver' && req.user.driverId) {
      const rec = await pool.request()
        .input('id',  sql.Int, req.params.id)
        .input('cid', sql.Int, cid)
        .query('SELECT VehicleId FROM MaintenanceRecords WHERE Id=@id AND CompanyId=@cid');
      if (!rec.recordset.length) return res.status(404).json({ error: 'Not found' });

      const ok = await pool.request()
        .input('driverId', sql.Int, req.user.driverId)
        .input('vid',      sql.Int, rec.recordset[0].VehicleId)
        .input('cid',      sql.Int, cid)
        .query('SELECT Id FROM Drivers WHERE Id=@driverId AND VehicleId=@vid AND CompanyId=@cid');
      if (!ok.recordset.length)
        return res.status(403).json({ error: 'You can only edit records for your own vehicle' });
    }

    const result = await pool.request()
      .input('id',          sql.Int,      req.params.id)
      .input('vehicleId',   sql.Int,      vehicleId)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('typeId',      sql.Int,      typeId)
      .input('typeName',    sql.NVarChar, typeName || '')
      .input('serviceDate', sql.Date,     serviceDate)
      .input('kmAtService', sql.Int,      kmAtService  || null)
      .input('nextDueDate', sql.Date,     nextDueDate  || null)
      .input('nextDueKm',   sql.Int,      nextDueKm    || null)
      .input('cost',        sql.Decimal,  cost         || 0)
      .input('doneBy',      sql.NVarChar, doneBy || '')
      .input('notes',       sql.NVarChar, notes  || '')
      .input('cid',         sql.Int,      cid)
      .query(`UPDATE MaintenanceRecords
                SET VehicleId=@vehicleId, VehicleName=@vehicleName,
                    TypeId=@typeId, TypeName=@typeName,
                    ServiceDate=@serviceDate, KmAtService=@kmAtService,
                    NextDueDate=@nextDueDate, NextDueKm=@nextDueKm,
                    Cost=@cost, DoneBy=@doneBy, Notes=@notes
                OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE record (admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM MaintenanceRecords OUTPUT DELETED.Id WHERE Id=@id AND CompanyId=@cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
