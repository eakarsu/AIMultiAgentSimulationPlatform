const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  const { simulation_id } = req.query;
  const q = simulation_id ? 'SELECT i.*, af.name as from_name, at2.name as to_name FROM interactions i LEFT JOIN agents af ON i.agent_from=af.id LEFT JOIN agents at2 ON i.agent_to=at2.id WHERE i.simulation_id=$1 ORDER BY i.created_at DESC' :
    'SELECT i.*, af.name as from_name, at2.name as to_name FROM interactions i LEFT JOIN agents af ON i.agent_from=af.id LEFT JOIN agents at2 ON i.agent_to=at2.id ORDER BY i.created_at DESC LIMIT 100';
  const r = await pool.query(q, simulation_id ? [simulation_id] : []);
  res.json(r.rows);
});
module.exports = router;
