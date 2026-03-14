const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET dashboard summary stats
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  try {
    const pool = await getPool();

    const [vehicles, rentals, expenses, drivers, customers, activeRentals, attendance] =
      await Promise.all([
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT COUNT(*) AS total FROM Vehicles WHERE CompanyId = @cid`),
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT COUNT(*) AS total, ISNULL(SUM(TotalAmount),0) AS revenue FROM Rentals WHERE CompanyId = @cid`),
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT ISNULL(SUM(Amount),0) AS totalExpenses FROM Expenses WHERE CompanyId = @cid`),
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT COUNT(*) AS total FROM Drivers WHERE CompanyId = @cid`),
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT COUNT(*) AS total FROM Customers WHERE CompanyId = @cid`),
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT COUNT(*) AS total FROM Rentals WHERE Status='active' AND CompanyId = @cid`),
        pool.request().input('cid', sql.Int, cid)
          .query(`SELECT TOP 5 a.DriverName, a.AttDate, a.Status
                  FROM Attendance a
                  WHERE a.CompanyId = @cid
                  ORDER BY a.AttDate DESC`),
      ]);

    const revenue       = rentals.recordset[0].revenue;
    const totalExpenses = expenses.recordset[0].totalExpenses;

    res.json({
      totalVehicles:    vehicles.recordset[0].total,
      totalRentals:     rentals.recordset[0].total,
      totalRevenue:     revenue,
      totalExpenses:    totalExpenses,
      netProfit:        revenue - totalExpenses,
      totalDrivers:     drivers.recordset[0].total,
      totalCustomers:   customers.recordset[0].total,
      activeRentals:    activeRentals.recordset[0].total,
      recentAttendance: attendance.recordset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
