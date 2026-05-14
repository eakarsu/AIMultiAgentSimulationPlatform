const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { simulation_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;

    let countQ, dataQ, params;
    if (simulation_id) {
      countQ = 'SELECT COUNT(*) FROM interactions WHERE simulation_id=$1';
      dataQ = `SELECT i.*, af.name as from_name, at2.name as to_name
               FROM interactions i
               LEFT JOIN agents af ON i.agent_from=af.id
               LEFT JOIN agents at2 ON i.agent_to=at2.id
               WHERE i.simulation_id=$1
               ORDER BY i.created_at DESC LIMIT $2 OFFSET $3`;
      params = [simulation_id];
    } else {
      countQ = 'SELECT COUNT(*) FROM interactions';
      dataQ = `SELECT i.*, af.name as from_name, at2.name as to_name
               FROM interactions i
               LEFT JOIN agents af ON i.agent_from=af.id
               LEFT JOIN agents at2 ON i.agent_to=at2.id
               ORDER BY i.created_at DESC LIMIT $1 OFFSET $2`;
      params = [];
    }

    const total = await pool.query(countQ, params);
    const r = await pool.query(dataQ, simulation_id ? [...params, limit, offset] : [limit, offset]);

    res.json({
      data: r.rows,
      page,
      limit,
      total: parseInt(total.rows[0].count),
      totalPages: Math.ceil(parseInt(total.rows[0].count) / limit),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
