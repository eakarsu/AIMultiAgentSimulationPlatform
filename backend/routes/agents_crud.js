const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  const { simulation_id } = req.query;
  const q = simulation_id ? 'SELECT a.*, s.name as simulation_name FROM agents a LEFT JOIN simulations s ON a.simulation_id=s.id WHERE a.simulation_id=$1 ORDER BY a.score DESC' :
    'SELECT a.*, s.name as simulation_name FROM agents a LEFT JOIN simulations s ON a.simulation_id=s.id ORDER BY a.score DESC';
  const r = await pool.query(q, simulation_id ? [simulation_id] : []);
  res.json(r.rows);
});
router.post('/', async (req, res) => {
  const { simulation_id, name, role, strategy, personality } = req.body;
  const r = await pool.query('INSERT INTO agents (simulation_id,name,role,strategy,personality) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [simulation_id, name, role, strategy, personality]);
  res.json(r.rows[0]);
});
router.put('/:id', async (req, res) => {
  const { name, role, strategy, personality, status } = req.body;
  const r = await pool.query('UPDATE agents SET name=$1,role=$2,strategy=$3,personality=$4,status=$5 WHERE id=$6 RETURNING *',
    [name, role, strategy, personality, status, req.params.id]);
  res.json(r.rows[0]);
});
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM agents WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
module.exports = router;
