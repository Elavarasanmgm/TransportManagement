const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET all drivers (driver role sees only their own record)
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    let query;
    const dbReq = pool.request().input('cid', sql.Int, cid);
    if (req.user.role === 'driver' && req.user.driverId) {
      dbReq.input('driverId', sql.Int, req.user.driverId);
      query = 'SELECT * FROM Drivers WHERE CompanyId = @cid AND Id = @driverId';
    } else {
      query = 'SELECT * FROM Drivers WHERE CompanyId = @cid ORDER BY Id';
    }
    const result = await dbReq.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create driver
router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, phone, licenseNo, licenseType, vehicleId, vehicleName, joinDate, salary, advance, status } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('name',        sql.NVarChar, name)
      .input('phone',       sql.NVarChar, phone)
      .input('licenseNo',   sql.NVarChar, licenseNo || '')
      .input('licenseType', sql.NVarChar, licenseType || 'LMV')
      .input('vehicleId',   sql.Int,      vehicleId || null)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('joinDate',    sql.Date,     joinDate || null)
      .input('salary',      sql.Decimal,  salary || 0)
      .input('advance',     sql.Decimal,  advance || 0)
      .input('status',      sql.NVarChar, status || 'active')
      .input('cid',         sql.Int,      cid)
      .query(`INSERT INTO Drivers (Name, Phone, LicenseNo, LicenseType, VehicleId, VehicleName, JoinDate, Salary, Advance, Status, CompanyId)
              OUTPUT INSERTED.*
              VALUES (@name, @phone, @licenseNo, @licenseType, @vehicleId, @vehicleName, @joinDate, @salary, @advance, @status, @cid)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update driver
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const { name, phone, licenseNo, licenseType, vehicleId, vehicleName, joinDate, salary, advance, status } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    const result = await pool.request()
      .input('id',          sql.Int,      req.params.id)
      .input('name',        sql.NVarChar, name)
      .input('phone',       sql.NVarChar, phone)
      .input('licenseNo',   sql.NVarChar, licenseNo || '')
      .input('licenseType', sql.NVarChar, licenseType || 'LMV')
      .input('vehicleId',   sql.Int,      vehicleId || null)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('joinDate',    sql.Date,     joinDate || null)
      .input('salary',      sql.Decimal,  salary || 0)
      .input('advance',     sql.Decimal,  advance || 0)
      .input('status',      sql.NVarChar, status || 'active')
      .input('cid',         sql.Int,      cid)
      .query(`UPDATE Drivers SET
                Name=@name, Phone=@phone, LicenseNo=@licenseNo, LicenseType=@licenseType,
                VehicleId=@vehicleId, VehicleName=@vehicleName, JoinDate=@joinDate,
                Salary=@salary, Advance=@advance, Status=@status
              OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE driver
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Drivers OUTPUT DELETED.Id WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
