'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters');
}

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('origin not allowed'));
  },
}));
app.use(express.json({ limit: '2mb' }));

const auth = require('./middleware/auth');
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'multi-agent-simulation-platform' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/governed-runs', require('./routes/governedRuns')(auth));

// Generated simulation, agent, AI, streaming, and gap routes are intentionally
// not mounted. They execute provider/tool behavior without the governed boundary.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

const port = Number(process.env.PORT || 3012);
app.listen(port, () => console.log(`Governed simulation API listening on ${port}`));
