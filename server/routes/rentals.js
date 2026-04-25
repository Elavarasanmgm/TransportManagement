const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// Recalculate and persist TotalRentals + TotalAmount for a customer
async function syncCustomerStats(pool, customerName, companyId) {
  await pool.request()
    .input('customer', sql.NVarChar, customerName)
    .input('cid',      sql.Int,      companyId)
    .query(`UPDATE Customers SET
              TotalRentals = (SELECT COUNT(*)              FROM Rentals WHERE Customer = @customer AND CompanyId = @cid),
              TotalAmount  = (SELECT ISNULL(SUM(TotalAmount),0) FROM Rentals WHERE Customer = @customer AND CompanyId = @cid)
            WHERE Name = @customer AND CompanyId = @cid`);
} 

// Auto-sync vehicle availability status based on active rental count
async function syncVehicleStatus(pool, vehicleId, companyId) {
  if (!vehicleId) return;
  const chk = await pool.request()
    .input('vid', sql.Int, vehicleId)
    .input('cid', sql.Int, companyId)
    .query(`SELECT COUNT(*) AS cnt FROM Rentals
            WHERE VehicleId=@vid AND CompanyId=@cid AND Status='active'`);
  const newStatus = chk.recordset[0].cnt > 0 ? 'on-rent' : 'available';
  await pool.request()
    .input('vid', sql.Int, vehicleId)
    .input('cid', sql.Int, companyId)
    .input('st',  sql.NVarChar, newStatus)
    .query(`UPDATE Vehicles SET Status=@st
            WHERE Id=@vid AND CompanyId=@cid AND Status <> 'maintenance'`);
}

// GET all rentals (customer role sees only their own rentals)
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    let query;
    const dbReq = pool.request().input('cid', sql.Int, cid);
    if (req.user.role === 'customer' && req.user.customerId) {
      dbReq.input('customerId', sql.Int, req.user.customerId);
      query = `SELECT * FROM Rentals WHERE CompanyId = @cid
               AND Customer = (SELECT Name FROM Customers WHERE Id = @customerId AND CompanyId = @cid)
               ORDER BY Id DESC`;
    } else {
      query = 'SELECT * FROM Rentals WHERE CompanyId = @cid ORDER BY Id DESC';
    }
    const result = await dbReq.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create rental
router.post('/', async (req, res) => {
  if (req.user.role === 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { vehicleId, vehicleName, customer, phone, startDate, endDate, days, dailyRate, hourlyRate, hours, rateType, totalAmount, discount, advancePaid, balance, purpose, status } = req.body;
  const cid = req.user.companyId;
  try {
    const pool = await getPool();

    // ── Double-booking check ─────────────────────────────────────────────────
    if (vehicleId && (status || 'active') === 'active') {
      const overlap = await pool.request()
        .input('vid',   sql.Int,  vehicleId)
        .input('start', sql.Date, startDate)
        .input('end',   sql.Date, endDate)
        .input('cid',   sql.Int,  cid)
        .query(`SELECT Id FROM Rentals
                WHERE VehicleId=@vid AND CompanyId=@cid AND Status='active'
                  AND StartDate <= @end AND EndDate >= @start`);
      if (overlap.recordset.length > 0) {
        return res.status(409).json({ error: 'Vehicle is already booked for the selected dates.' });
      }
    }

    // ── Generate ContractNo: RNT-<year>-<seq> ───────────────────────────────
    const seqRes = await pool.request()
      .input('cid', sql.Int, cid)
      .query('SELECT COUNT(*)+1 AS next FROM Rentals WHERE CompanyId=@cid');
    const contractNo = `RNT-${new Date().getFullYear()}-${String(seqRes.recordset[0].next).padStart(4, '0')}`;

    const result = await pool.request()
      .input('vehicleId',   sql.Int,      vehicleId || null)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('customer',    sql.NVarChar, customer)
      .input('phone',       sql.NVarChar, phone || '')
      .input('startDate',   sql.Date,     startDate)
      .input('endDate',     sql.Date,     endDate)
      .input('days',        sql.Int,      days || 1)
      .input('dailyRate',   sql.Decimal,  dailyRate || 0)
      .input('hourlyRate',  sql.Decimal,  hourlyRate || 0)
      .input('hours',       sql.Int,      hours || 0)
      .input('rateType',    sql.NVarChar, rateType || 'daily')
      .input('totalAmount', sql.Decimal,  totalAmount || 0)
      .input('discount',    sql.Decimal,  discount || 0)
      .input('advancePaid', sql.Decimal,  advancePaid || 0)
      .input('balance',     sql.Decimal,  balance || 0)
      .input('purpose',     sql.NVarChar, purpose || '')
      .input('status',      sql.NVarChar, status || 'active')
      .input('contractNo',  sql.NVarChar, contractNo)
      .input('cid',         sql.Int,      cid)
      .query(`INSERT INTO Rentals
                (VehicleId, VehicleName, Customer, Phone, StartDate, EndDate, Days,
                 DailyRate, HourlyRate, Hours, RateType, TotalAmount, Discount,
                 AdvancePaid, Balance, Purpose, Status, ContractNo, CompanyId)
                OUTPUT INSERTED.*
              VALUES
                (@vehicleId, @vehicleName, @customer, @phone, @startDate, @endDate, @days,
                 @dailyRate, @hourlyRate, @hours, @rateType, @totalAmount, @discount,
                 @advancePaid, @balance, @purpose, @status, @contractNo, @cid)`);
    res.status(201).json(result.recordset[0]);
    // fire-and-forget async sync
    syncCustomerStats(pool, customer, cid).catch(() => {});
    syncVehicleStatus(pool, vehicleId, cid).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update rental
router.put('/:id', async (req, res) => {
  if (req.user.role === 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { vehicleId, vehicleName, customer, phone, startDate, endDate, days, dailyRate, hourlyRate, hours, rateType, totalAmount, discount, advancePaid, balance, purpose, status } = req.body;
  const cid = req.user.companyId;
  try {
    const pool   = await getPool();
    // fetch old customer name in case it changed
    const oldRec = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT Customer FROM Rentals WHERE Id = @id AND CompanyId = @cid');
    const oldCustomer = oldRec.recordset[0]?.Customer;
    const result = await pool.request()
      .input('id',          sql.Int,      req.params.id)
      .input('vehicleId',   sql.Int,      vehicleId || null)
      .input('vehicleName', sql.NVarChar, vehicleName || '')
      .input('customer',    sql.NVarChar, customer)
      .input('phone',       sql.NVarChar, phone || '')
      .input('startDate',   sql.Date,     startDate)
      .input('endDate',     sql.Date,     endDate)
      .input('days',        sql.Int,      days || 1)
      .input('dailyRate',   sql.Decimal,  dailyRate || 0)
      .input('hourlyRate',  sql.Decimal,  hourlyRate || 0)
      .input('hours',       sql.Int,      hours || 0)
      .input('rateType',    sql.NVarChar, rateType || 'daily')
      .input('totalAmount', sql.Decimal,  totalAmount || 0)
      .input('discount',    sql.Decimal,  discount || 0)
      .input('advancePaid', sql.Decimal,  advancePaid || 0)
      .input('balance',     sql.Decimal,  balance || 0)
      .input('purpose',     sql.NVarChar, purpose || '')
      .input('status',      sql.NVarChar, status || 'active')
      .input('cid',         sql.Int,      cid)
      .query(`UPDATE Rentals SET
                VehicleId=@vehicleId, VehicleName=@vehicleName, Customer=@customer,
                Phone=@phone, StartDate=@startDate, EndDate=@endDate, Days=@days,
                DailyRate=@dailyRate, HourlyRate=@hourlyRate, Hours=@hours, RateType=@rateType,
                TotalAmount=@totalAmount, Discount=@discount, AdvancePaid=@advancePaid,
                Balance=@balance, Purpose=@purpose, Status=@status
              OUTPUT INSERTED.*
              WHERE Id=@id AND CompanyId=@cid`);
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.recordset[0]);
    // sync new customer totals; if name changed also sync old customer
    syncCustomerStats(pool, customer, cid).catch(() => {});
    if (oldCustomer && oldCustomer !== customer) syncCustomerStats(pool, oldCustomer, cid).catch(() => {});
    syncVehicleStatus(pool, vehicleId, cid).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE rental
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    // fetch customer name and vehicleId before deleting so we can sync after
    const oldRec = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT Customer, VehicleId FROM Rentals WHERE Id = @id AND CompanyId = @cid');
    const oldCustomer  = oldRec.recordset[0]?.Customer;
    const oldVehicleId = oldRec.recordset[0]?.VehicleId;
    const result = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Rentals OUTPUT DELETED.Id WHERE Id = @id AND CompanyId = @cid');
    if (!result.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
    if (oldCustomer)  syncCustomerStats(pool, oldCustomer, cid).catch(() => {});
    if (oldVehicleId) syncVehicleStatus(pool, oldVehicleId, cid).catch(() => {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
