'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const authenticate = require('../middleware/auth');
const router = express.Router();

function sign(user) {
  return jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_TTL || '1h',
    issuer: 'multi-agent-simulation-platform',
  });
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await pool.query(
      `SELECT u.id,u.email,u.password,u.name,m.tenant_id,m.role
       FROM users u LEFT JOIN tenant_memberships m ON m.user_id=u.id AND m.active=TRUE
       WHERE LOWER(u.email)=LOWER($1) LIMIT 1`, [email]
    );
    const row = result.rows[0];
    if (!row || !await bcrypt.compare(password, row.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const user = { id: row.id, email: row.email, name: row.name, tenantId: row.tenant_id || null, role: row.role || 'unassigned' };
    res.json({ token: sign(user), user });
  } catch (_) { res.status(500).json({ error: 'Login failed' }); }
});

router.post('/register', async (req, res) => {
  try {
    if (process.env.ALLOW_SELF_REGISTRATION !== 'true') return res.status(403).json({ error: 'Self-registration is disabled' });
    const { email, password, name } = req.body || {};
    if (!email || !name || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'email, name, and a 12-character password are required' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (email,password,name) VALUES ($1,$2,$3) RETURNING id,email,name', [email,hashed,name]
    );
    res.status(201).json({ user: { ...result.rows[0], tenantId: null, role: 'unassigned' }, tokenIssued: false });
  } catch (error) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Account already exists' : 'Registration failed' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id,u.email,u.name,m.tenant_id,m.role
       FROM users u LEFT JOIN tenant_memberships m ON m.user_id=u.id AND m.active=TRUE
       WHERE u.id=$1 LIMIT 1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];
    return res.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        tenantId: row.tenant_id || null,
        role: row.role || 'unassigned',
      },
    });
  } catch (_) {
    return res.status(500).json({ error: 'Identity lookup failed' });
  }
});

module.exports = router;
