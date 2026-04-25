const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

// GET /api/payments?rentalId=X
router.get('/', async (req, res) => {
  const cid = req.user.companyId;
  const { rentalId } = req.query;
  try {
    const pool  = await getPool();
    const dbReq = pool.request().input('cid', sql.Int, cid);
    let query;
    if (rentalId) {
      dbReq.input('rid', sql.Int, rentalId);
      query = 'SELECT * FROM Payments WHERE CompanyId=@cid AND RentalId=@rid ORDER BY PaidOn DESC';
    } else {
      query = 'SELECT * FROM Payments WHERE CompanyId=@cid ORDER BY PaidOn DESC';
    }
    const result = await dbReq.query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  if (req.user.role === 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { rentalId, amount, paidOn, method, note } = req.body;
  if (!rentalId || !amount || !paidOn)
    return res.status(400).json({ error: 'rentalId, amount and paidOn are required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    // Verify rental belongs to this company
    const rental = await pool.request()
      .input('rid', sql.Int, rentalId)
      .input('cid', sql.Int, cid)
      .query('SELECT Id, TotalAmount FROM Rentals WHERE Id=@rid AND CompanyId=@cid');
    if (!rental.recordset.length) return res.status(404).json({ error: 'Rental not found' });

    const result = await pool.request()
      .input('rentalId', sql.Int,      rentalId)
      .input('amount',   sql.Decimal,  amount)
      .input('paidOn',   sql.Date,     paidOn)
      .input('method',   sql.NVarChar, method || 'Cash')
      .input('note',     sql.NVarChar, note   || '')
      .input('cid',      sql.Int,      cid)
      .query(`INSERT INTO Payments (RentalId, Amount, PaidOn, Method, Note, CompanyId)
                OUTPUT INSERTED.*
              VALUES (@rentalId, @amount, @paidOn, @method, @note, @cid)`);

    // Recalculate AdvancePaid and Balance on the rental
    await pool.request()
      .input('rid', sql.Int, rentalId)
      .input('cid', sql.Int, cid)
      .query(`UPDATE Rentals SET
                AdvancePaid = (SELECT ISNULL(SUM(Amount),0) FROM Payments WHERE RentalId=@rid),
                Balance     = TotalAmount - (SELECT ISNULL(SUM(Amount),0) FROM Payments WHERE RentalId=@rid)
              WHERE Id=@rid AND CompanyId=@cid`);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id  (admin only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const cid = req.user.companyId;
  try {
    const pool = await getPool();
    const pay = await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('SELECT RentalId FROM Payments WHERE Id=@id AND CompanyId=@cid');
    if (!pay.recordset.length) return res.status(404).json({ error: 'Payment not found' });
    const rentalId = pay.recordset[0].RentalId;

    await pool.request()
      .input('id',  sql.Int, req.params.id)
      .input('cid', sql.Int, cid)
      .query('DELETE FROM Payments WHERE Id=@id AND CompanyId=@cid');

    // Recalculate rental balances after deletion
    await pool.request()
      .input('rid', sql.Int, rentalId)
      .input('cid', sql.Int, cid)
      .query(`UPDATE Rentals SET
                AdvancePaid = (SELECT ISNULL(SUM(Amount),0) FROM Payments WHERE RentalId=@rid),
                Balance     = TotalAmount - (SELECT ISNULL(SUM(Amount),0) FROM Payments WHERE RentalId=@rid)
              WHERE Id=@rid AND CompanyId=@cid`);

    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
