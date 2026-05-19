const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
const orchestrator = require('../agents/orchestratorAgent');

router.use(auth);

// GET /api/simulations  (with pagination + user filter)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const total = await pool.query(
      'SELECT COUNT(*) FROM simulations WHERE user_id IS NULL OR user_id=$1',
      [userId]
    );
    const r = await pool.query(
      'SELECT * FROM simulations WHERE user_id IS NULL OR user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    res.json({
      data: r.rows,
      page,
      limit,
      total: parseInt(total.rows[0].count),
      totalPages: Math.ceil(parseInt(total.rows[0].count) / limit),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM simulations WHERE id=$1', [req.params.id]);
    res.json(r.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, type, agent_count, rounds, config } = req.body;
    const userId = req.user.id;
    const r = await pool.query(
      'INSERT INTO simulations (name,description,type,agent_count,rounds,config,user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, description, type || 'market', agent_count || 2, rounds || 10, JSON.stringify(config || {}), userId]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, type, status, agent_count, rounds } = req.body;
    const r = await pool.query(
      'UPDATE simulations SET name=$1,description=$2,type=$3,status=$4,agent_count=$5,rounds=$6,updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, description, type, status, agent_count, rounds, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM simulations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/simulations/:id/run  — execute real simulation
router.post('/:id/run', async (req, res) => {
  const simId = parseInt(req.params.id);
  try {
    // Load simulation
    const simResult = await pool.query('SELECT * FROM simulations WHERE id=$1', [simId]);
    if (!simResult.rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    const simulation = simResult.rows[0];

    // Load agents
    const agentsResult = await pool.query('SELECT * FROM agents WHERE simulation_id=$1', [simId]);
    const agents = agentsResult.rows;
    if (agents.length === 0) return res.status(400).json({ error: 'No agents found for this simulation' });

    // Set running
    await pool.query("UPDATE simulations SET status='running', updated_at=NOW() WHERE id=$1", [simId]);

    let worldState = {
      round: 0,
      simulation_type: simulation.type,
      agents: agents.map(a => ({ id: a.id, name: a.name, score: a.score || 0 })),
      events: [],
    };

    const maxRounds = Math.min(5, simulation.rounds || 5);
    let roundsCompleted = 0;

    for (let i = 0; i < maxRounds; i++) {
      // Create round record
      const roundRow = await pool.query(
        "INSERT INTO rounds (simulation_id, round_number, status, started_at) VALUES ($1,$2,'running',NOW()) RETURNING *",
        [simId, i + 1]
      );
      const roundId = roundRow.rows[0].id;

      // Run tick
      const { interactions, newWorldState } = await orchestrator.runTick(simulation, agents, worldState);
      worldState = newWorldState;

      // Persist interactions
      for (const interaction of interactions) {
        await pool.query(
          'INSERT INTO interactions (simulation_id, round_id, agent_from, type, content, result) VALUES ($1,$2,$3,$4,$5,$6)',
          [simId, roundId, interaction.agent_from, 'action', interaction.action, interaction.reasoning]
        );
        // Update agent scores
        if (interaction.resource_change) {
          await pool.query(
            'UPDATE agents SET score = score + $1, actions_taken = actions_taken + 1 WHERE id=$2',
            [interaction.resource_change, interaction.agent_from]
          );
        }
      }

      // Write sim log
      await pool.query(
        "INSERT INTO sim_logs (simulation_id, level, message, metadata) VALUES ($1,'info',$2,$3)",
        [simId, `Round ${i + 1} completed`, JSON.stringify({ interactions: interactions.length, worldState })]
      );

      // Complete round
      await pool.query(
        "UPDATE rounds SET status='completed', events=$1, outcomes=$2, completed_at=NOW() WHERE id=$3",
        [JSON.stringify(worldState.events), JSON.stringify(worldState.agent_actions || []), roundId]
      );

      roundsCompleted++;
    }

    // Determine winner
    const finalAgents = await pool.query('SELECT * FROM agents WHERE simulation_id=$1 ORDER BY score DESC', [simId]);
    const winner = finalAgents.rows[0] || null;

    // Complete simulation
    await pool.query(
      "UPDATE simulations SET status='completed', current_round=$1, results=$2, updated_at=NOW() WHERE id=$3",
      [roundsCompleted, JSON.stringify({ winner: winner?.name, final_state: worldState }), simId]
    );

    res.json({ rounds_completed: roundsCompleted, final_state: worldState, winner: winner?.name });
  } catch (e) {
    console.error('[run simulation]', e);
    await pool.query("UPDATE simulations SET status='failed', updated_at=NOW() WHERE id=$1", [simId]).catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

// GET /api/simulations/:id/stream  — SSE live telemetry
router.get('/:id/stream', async (req, res) => {
  const simId = parseInt(req.params.id);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const simResult = await pool.query('SELECT * FROM simulations WHERE id=$1', [simId]);
    if (!simResult.rows[0]) { send('error', { error: 'Simulation not found' }); return res.end(); }
    const simulation = simResult.rows[0];

    const agentsResult = await pool.query('SELECT * FROM agents WHERE simulation_id=$1', [simId]);
    const agents = agentsResult.rows;
    if (agents.length === 0) { send('error', { error: 'No agents found' }); return res.end(); }

    await pool.query("UPDATE simulations SET status='running', updated_at=NOW() WHERE id=$1", [simId]);
    send('start', { simulation_id: simId, agents: agents.map(a => a.name), max_rounds: Math.min(5, simulation.rounds) });

    let worldState = {
      round: 0,
      simulation_type: simulation.type,
      agents: agents.map(a => ({ id: a.id, name: a.name, score: a.score || 0 })),
      events: [],
    };

    const maxRounds = Math.min(5, simulation.rounds || 5);
    let roundsCompleted = 0;

    for (let i = 0; i < maxRounds; i++) {
      send('round_start', { round: i + 1 });

      const roundRow = await pool.query(
        "INSERT INTO rounds (simulation_id, round_number, status, started_at) VALUES ($1,$2,'running',NOW()) RETURNING *",
        [simId, i + 1]
      );
      const roundId = roundRow.rows[0].id;

      const { interactions, newWorldState } = await orchestrator.runTick(simulation, agents, worldState);
      worldState = newWorldState;

      for (const interaction of interactions) {
        await pool.query(
          'INSERT INTO interactions (simulation_id, round_id, agent_from, type, content, result) VALUES ($1,$2,$3,$4,$5,$6)',
          [simId, roundId, interaction.agent_from, 'action', interaction.action, interaction.reasoning]
        );
        if (interaction.resource_change) {
          await pool.query(
            'UPDATE agents SET score = score + $1, actions_taken = actions_taken + 1 WHERE id=$2',
            [interaction.resource_change, interaction.agent_from]
          );
        }
      }

      await pool.query(
        "UPDATE rounds SET status='completed', events=$1, outcomes=$2, completed_at=NOW() WHERE id=$3",
        [JSON.stringify(worldState.events), JSON.stringify(worldState.agent_actions || []), roundId]
      );

      send('round_complete', { round: i + 1, interactions, world_state: worldState });
      roundsCompleted++;
    }

    const finalAgents = await pool.query('SELECT * FROM agents WHERE simulation_id=$1 ORDER BY score DESC', [simId]);
    const winner = finalAgents.rows[0] || null;

    await pool.query(
      "UPDATE simulations SET status='completed', current_round=$1, results=$2, updated_at=NOW() WHERE id=$3",
      [roundsCompleted, JSON.stringify({ winner: winner?.name, final_state: worldState }), simId]
    );

    send('complete', { rounds_completed: roundsCompleted, winner: winner?.name, final_agents: finalAgents.rows });
  } catch (e) {
    send('error', { error: e.message });
    await pool.query("UPDATE simulations SET status='failed', updated_at=NOW() WHERE id=$1", [simId]).catch(() => {});
  } finally {
    res.end();
  }
});

module.exports = router;
