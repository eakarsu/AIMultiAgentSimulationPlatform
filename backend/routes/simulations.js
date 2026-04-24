const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  const r = await pool.query('SELECT * FROM simulations ORDER BY created_at DESC');
  res.json(r.rows);
});
router.get('/:id', async (req, res) => {
  const r = await pool.query('SELECT * FROM simulations WHERE id=$1', [req.params.id]);
  res.json(r.rows[0] || {});
});
router.post('/', async (req, res) => {
  const { name, description, type, agent_count, rounds, config } = req.body;
  const r = await pool.query('INSERT INTO simulations (name,description,type,agent_count,rounds,config) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [name, description, type || 'market', agent_count || 2, rounds || 10, JSON.stringify(config || {})]);
  res.json(r.rows[0]);
});
router.put('/:id', async (req, res) => {
  const { name, description, type, status, agent_count, rounds } = req.body;
  const r = await pool.query('UPDATE simulations SET name=$1,description=$2,type=$3,status=$4,agent_count=$5,rounds=$6,updated_at=NOW() WHERE id=$7 RETURNING *',
    [name, description, type, status, agent_count, rounds, req.params.id]);
  res.json(r.rows[0]);
});
router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM simulations WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
module.exports = router;
