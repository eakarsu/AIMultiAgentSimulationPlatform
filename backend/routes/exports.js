// Apply pass 5 — simulation data export (CSV / JSON).
const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}

router.get('/simulations/:id/export', async (req, res) => {
  try {
    const id = req.params.id;
    const fmt = (req.query.format || 'json').toString().toLowerCase();
    const [sim, rounds, interactions] = await Promise.all([
      pool.query('SELECT * FROM simulations WHERE id=$1', [id]),
      pool.query('SELECT * FROM rounds WHERE simulation_id=$1 ORDER BY id', [id]),
      pool.query(`SELECT i.* FROM interactions i
                  JOIN rounds r ON r.id = i.round_id
                  WHERE r.simulation_id=$1 ORDER BY i.id`, [id]),
    ]);
    if (!sim.rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    const payload = { simulation: sim.rows[0], rounds: rounds.rows, interactions: interactions.rows };
    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="simulation-${id}.csv"`);
      const out = [
        '# simulation',
        toCsv([sim.rows[0]]),
        '',
        '# rounds',
        toCsv(rounds.rows),
        '',
        '# interactions',
        toCsv(interactions.rows),
      ].join('\n');
      return res.send(out);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="simulation-${id}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Replay re-stream — read-only JSON snapshot ordered by round/interaction.
router.get('/simulations/:id/replay', async (req, res) => {
  try {
    const id = req.params.id;
    const rounds = await pool.query('SELECT * FROM rounds WHERE simulation_id=$1 ORDER BY id', [id]);
    const interactions = await pool.query(
      `SELECT i.* FROM interactions i JOIN rounds r ON r.id=i.round_id
       WHERE r.simulation_id=$1 ORDER BY i.round_id, i.id`,
      [id]
    );
    res.json({ simulation_id: id, rounds: rounds.rows, interactions: interactions.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Agent positions for visualization.
router.get('/simulations/:id/positions', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await pool.query(
      `SELECT id, simulation_id, round_id, agent_id, x, y, metadata, created_at
       FROM agent_positions WHERE simulation_id=$1 ORDER BY round_id, id`, [id]
    );
    res.json({ simulation_id: id, positions: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/simulations/:id/positions', async (req, res) => {
  try {
    const id = req.params.id;
    const { positions } = req.body || {};
    if (!Array.isArray(positions)) return res.status(400).json({ error: 'positions[] required' });
    const inserted = [];
    for (const p of positions.slice(0, 1000)) {
      const r = await pool.query(
        `INSERT INTO agent_positions (simulation_id, round_id, agent_id, x, y, metadata)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id`,
        [id, p.round_id || null, p.agent_id || null, +p.x || 0, +p.y || 0, JSON.stringify(p.metadata || {})]
      );
      inserted.push(r.rows[0].id);
    }
    res.status(201).json({ inserted_count: inserted.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
