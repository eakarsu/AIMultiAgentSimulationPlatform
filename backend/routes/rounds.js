const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { simulation_id } = req.query;
    const q = simulation_id ? 'SELECT r.*, s.name as simulation_name FROM rounds r LEFT JOIN simulations s ON r.simulation_id=s.id WHERE r.simulation_id=$1 ORDER BY r.round_number' :
      'SELECT r.*, s.name as simulation_name FROM rounds r LEFT JOIN simulations s ON r.simulation_id=s.id ORDER BY r.id DESC LIMIT 100';
    const r = await pool.query(q, simulation_id ? [simulation_id] : []);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM rounds WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
