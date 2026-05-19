const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: function(origin, cb) {
    const allowed = [process.env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:3013'].filter(Boolean);
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(null, true); // permissive in dev
  },
  credentials: true,
}));
app.use(express.json());

const pool = require('./models/db');

// Ensure schema additions exist
pool.query(`
  ALTER TABLE simulations ADD COLUMN IF NOT EXISTS user_id INTEGER;
  CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100),
    request_data JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
  );
  -- Apply pass 5: scenario templates (additive)
  CREATE TABLE IF NOT EXISTS scenario_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(64),
    description TEXT,
    config JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  -- Apply pass 5: agent positions for visualization (in-memory-style schema; optional rows only)
  CREATE TABLE IF NOT EXISTS agent_positions (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER,
    round_id INTEGER,
    agent_id INTEGER,
    x DOUBLE PRECISION DEFAULT 0,
    y DOUBLE PRECISION DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
  );
`).catch(e => console.error('Schema migration error:', e.message));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/simulations', require('./routes/simulations'));
app.use('/api/agents-crud', require('./routes/agents_crud'));
app.use('/api/rounds', require('./routes/rounds'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/ai', require('./routes/ai'));
// Apply pass 5 — backlog
app.use('/api/scenario-templates', require('./routes/scenarioTemplates'));
app.use('/api', require('./routes/exports'));

const auth = require('./middleware/auth');
app.get('/api/stats', auth, async (req, res) => {
  try {
    const [sims, agents, rounds, running] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM simulations'),
      pool.query('SELECT COUNT(*) FROM agents'),
      pool.query('SELECT COUNT(*) FROM rounds'),
      pool.query("SELECT COUNT(*) FROM simulations WHERE status='running'"),
    ]);
    res.json({
      simulations: parseInt(sims.rows[0].count),
      agents: parseInt(agents.rows[0].count),
      rounds: parseInt(rounds.rows[0].count),
      running: parseInt(running.rows[0].count),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/sim-orchestrator-agent', require('./routes/sim-orchestrator-agent'));
app.use('/api/behavior-steering-stream', require('./routes/behavior-steering-stream'));
app.use('/api/negotiation-agent', require('./routes/negotiation-agent'));
app.use('/api/scenario-benchmarking', require('./routes/scenario-benchmarking'));
app.use('/api/vertical-pack', require('./routes/vertical-pack'));

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_ai_policy_search_agent = require('./routes/gap-ai-policy-search-agent'); app.use('/api/gap-ai-policy-search-agent', _gap_ai_policy_search_agent); } catch(e) { console.error('gap mount fail ai-policy-search-agent:', e.message); }
try { const _gap_ai_equilibrium_detector = require('./routes/gap-ai-equilibrium-detector'); app.use('/api/gap-ai-equilibrium-detector', _gap_ai_equilibrium_detector); } catch(e) { console.error('gap mount fail ai-equilibrium-detector:', e.message); }
try { const _gap_ai_scenario_coverage_analyzer = require('./routes/gap-ai-scenario-coverage-analyzer'); app.use('/api/gap-ai-scenario-coverage-analyzer', _gap_ai_scenario_coverage_analyzer); } catch(e) { console.error('gap mount fail ai-scenario-coverage-analyzer:', e.message); }
try { const _gap_real_time = require('./routes/gap-real-time'); app.use('/api/gap-real-time', _gap_real_time); } catch(e) { console.error('gap mount fail real-time:', e.message); }
try { const _gap_parameter = require('./routes/gap-parameter'); app.use('/api/gap-parameter', _gap_parameter); } catch(e) { console.error('gap mount fail parameter:', e.message); }
try { const _gap_replay = require('./routes/gap-replay'); app.use('/api/gap-replay', _gap_replay); } catch(e) { console.error('gap mount fail replay:', e.message); }
try { const _gap_websocket = require('./routes/gap-websocket'); app.use('/api/gap-websocket', _gap_websocket); } catch(e) { console.error('gap mount fail websocket:', e.message); }
try { const _gap_public = require('./routes/gap-public'); app.use('/api/gap-public', _gap_public); } catch(e) { console.error('gap mount fail public:', e.message); }
try { const _gap_notifications = require('./routes/gap-notifications'); app.use('/api/gap-notifications', _gap_notifications); } catch(e) { console.error('gap mount fail notifications:', e.message); }
// === End Batch 05 Mounts ===

// Custom views (mounted BEFORE 404 fallback)
try { app.use('/api/custom-views', require('./routes/customViews')); } catch(e) { console.error('custom-views mount fail:', e.message); }

// 404 fallback for unknown /api routes (must remain last)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
