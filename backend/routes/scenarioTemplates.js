// Apply pass 5 — scenario templates CRUD (additive). Backed by
// scenario_templates table (CREATE TABLE IF NOT EXISTS in server.js).
const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, user_id, name, domain, description, config, is_public, created_at, updated_at
       FROM scenario_templates
       WHERE user_id = $1 OR is_public = TRUE
       ORDER BY created_at DESC LIMIT 200`,
      [req.user?.id || 0]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM scenario_templates WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, domain, description, config, is_public } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const r = await pool.query(
      `INSERT INTO scenario_templates (user_id, name, domain, description, config, is_public)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
      [req.user?.id || null, name, domain || null, description || null, JSON.stringify(config || {}), !!is_public]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, domain, description, config, is_public } = req.body || {};
    const r = await pool.query(
      `UPDATE scenario_templates
       SET name=COALESCE($2,name),
           domain=COALESCE($3,domain),
           description=COALESCE($4,description),
           config=COALESCE($5::jsonb,config),
           is_public=COALESCE($6,is_public),
           updated_at=NOW()
       WHERE id=$1 AND (user_id=$7 OR $7 IS NULL)
       RETURNING *`,
      [req.params.id, name || null, domain || null, description || null,
       config ? JSON.stringify(config) : null, typeof is_public === 'boolean' ? is_public : null, req.user?.id || null]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found or forbidden' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query(
      'DELETE FROM scenario_templates WHERE id=$1 AND (user_id=$2 OR $2 IS NULL) RETURNING id',
      [req.params.id, req.user?.id || null]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found or forbidden' });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
