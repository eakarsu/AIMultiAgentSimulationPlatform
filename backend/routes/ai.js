const router = require('express').Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const pool = require('../models/db');

router.use(auth);

const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

function parseAIJson(raw) {
  try { return JSON.parse(raw); } catch {}
  const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) { try { return JSON.parse(blockMatch[1].trim()); } catch {} }
  const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) { try { return JSON.parse(objMatch[1]); } catch {} }
  return { summary: raw };
}

class AIKeyMissingError extends Error {
  constructor() { super('AI not configured. Set OPENROUTER_API_KEY.'); this.code = 'AI_KEY_MISSING'; }
}

async function callAI(systemPrompt, userPrompt, maxTokens = 800) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new AIKeyMissingError();
  }
  const r = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return r.data?.choices?.[0]?.message?.content || '';
}

function aiErr(res, e) {
  if (e && e.code === 'AI_KEY_MISSING') return res.status(503).json({ error: e.message });
  return res.status(500).json({ error: e.message });
}

async function logAnalysis(type, request, result) {
  try {
    await pool.query(
      'INSERT INTO ai_analyses (type, request_data, result) VALUES ($1, $2, $3)',
      [type, JSON.stringify(request), JSON.stringify(result)]
    );
  } catch (e) { /* swallow logging errors */ }
}

// POST /api/ai/agent-behavior-generator
// Body: { role, scenario, traits, goals }
router.post('/agent-behavior-generator', async (req, res) => {
  try {
    const { role, scenario, traits, goals } = req.body || {};
    const systemPrompt = 'You are an expert in agent-based modeling and multi-agent simulations. Generate realistic agent behaviors and decision policies.';
    const userPrompt = `Generate a behavior profile for an agent.
Role: ${role || 'generic'}
Scenario: ${scenario || 'general market'}
Traits: ${JSON.stringify(traits || {})}
Goals: ${JSON.stringify(goals || [])}

Return JSON only: { "behavior_summary": string, "decision_rules": [string], "interaction_style": string, "risk_tolerance": "low"|"medium"|"high", "example_actions": [string] }`;
    const raw = await callAI(systemPrompt, userPrompt, 600);
    const parsed = parseAIJson(raw);
    await logAnalysis('agent-behavior-generator', req.body, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// POST /api/ai/interaction-analyzer
// Body: { simulation_id } or { interactions: [...] }
router.post('/interaction-analyzer', async (req, res) => {
  try {
    let interactions = req.body?.interactions;
    if (!interactions && req.body?.simulation_id) {
      const r = await pool.query(
        'SELECT id, agent_from, type, content, result FROM interactions WHERE simulation_id=$1 ORDER BY id ASC LIMIT 200',
        [req.body.simulation_id]
      );
      interactions = r.rows;
    }
    if (!interactions || interactions.length === 0) {
      return res.status(400).json({ error: 'No interactions provided or found' });
    }
    const systemPrompt = 'You analyze multi-agent interaction logs and extract patterns, dynamics, and emergent behaviors.';
    const userPrompt = `Analyze the following interaction log and produce insights.
Interactions (truncated): ${JSON.stringify(interactions.slice(0, 80))}

Return JSON only: { "summary": string, "dominant_patterns": [string], "cooperation_score": number, "conflict_score": number, "key_agents": [string], "emergent_behaviors": [string], "recommendations": [string] }`;
    const raw = await callAI(systemPrompt, userPrompt, 900);
    const parsed = parseAIJson(raw);
    await logAnalysis('interaction-analyzer', { count: interactions.length, simulation_id: req.body?.simulation_id }, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// POST /api/ai/simulation-insights
// Body: { simulation_id }
router.post('/simulation-insights', async (req, res) => {
  try {
    const { simulation_id } = req.body || {};
    if (!simulation_id) return res.status(400).json({ error: 'simulation_id required' });
    const sim = await pool.query('SELECT * FROM simulations WHERE id=$1', [simulation_id]);
    if (!sim.rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    const agents = await pool.query('SELECT id, name, role, score, actions_taken FROM agents WHERE simulation_id=$1', [simulation_id]);
    const rounds = await pool.query('SELECT round_number, status FROM rounds WHERE simulation_id=$1 ORDER BY round_number', [simulation_id]);

    const systemPrompt = 'You interpret simulation results, identify outcomes, winners/losers, and provide actionable next-step recommendations.';
    const userPrompt = `Interpret this simulation run.
Simulation: ${JSON.stringify({ name: sim.rows[0].name, type: sim.rows[0].type, status: sim.rows[0].status, results: sim.rows[0].results })}
Agents: ${JSON.stringify(agents.rows)}
Rounds completed: ${rounds.rows.length}

Return JSON only: { "headline": string, "winner": string|null, "key_findings": [string], "agent_performance": object, "scenario_assessment": string, "next_experiments": [string] }`;
    const raw = await callAI(systemPrompt, userPrompt, 900);
    const parsed = parseAIJson(raw);
    await logAnalysis('simulation-insights', { simulation_id }, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// GET /api/ai/history
router.get('/history', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, type, created_at FROM ai_analyses ORDER BY created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/ai/scenario-template-generator
// Body: { domain, agent_count, objective, constraints }
router.post('/scenario-template-generator', async (req, res) => {
  try {
    const { domain, agent_count, objective, constraints } = req.body || {};
    const systemPrompt = 'You design multi-agent simulation scenarios. Produce reusable templates with clear roles and rules.';
    const userPrompt = `Generate a scenario template.
Domain: ${domain || 'generic market'}
Agent count: ${agent_count || 5}
Objective: ${objective || 'reach equilibrium'}
Constraints: ${JSON.stringify(constraints || {})}

Return JSON only: { "name": string, "description": string, "agent_roles": [{"role": string, "count": number, "behavior_hint": string}], "rules": [string], "metrics_to_track": [string], "termination_conditions": [string], "default_parameters": object }`;
    const raw = await callAI(systemPrompt, userPrompt, 800);
    const parsed = parseAIJson(raw);
    await logAnalysis('scenario-template-generator', req.body, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// POST /api/ai/negotiation-strategy
// Body: { agent_role, opponent_profile, goals, current_offer, history }
router.post('/negotiation-strategy', async (req, res) => {
  try {
    const { agent_role, opponent_profile, goals, current_offer, history } = req.body || {};
    const systemPrompt = 'You are an expert negotiation strategist for multi-agent systems. Provide game-theoretically informed strategies.';
    const userPrompt = `Suggest a negotiation strategy.
Agent role: ${agent_role || 'buyer'}
Opponent profile: ${JSON.stringify(opponent_profile || {})}
Our goals: ${JSON.stringify(goals || [])}
Current offer on table: ${JSON.stringify(current_offer || {})}
Negotiation history: ${JSON.stringify((history || []).slice(0, 30))}

Return JSON only: { "recommended_move": string, "rationale": string, "expected_opponent_reaction": string, "fallback_options": [string], "walk_away_threshold": string, "estimated_success_probability": number }`;
    const raw = await callAI(systemPrompt, userPrompt, 700);
    const parsed = parseAIJson(raw);
    await logAnalysis('negotiation-strategy', req.body, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// POST /api/ai/parameter-tuning-suggestor
// Body: { simulation_id } or { current_params, observed_outcomes, target }
router.post('/parameter-tuning-suggestor', async (req, res) => {
  try {
    let { current_params, observed_outcomes, target } = req.body || {};
    const { simulation_id } = req.body || {};
    if (simulation_id) {
      const sim = await pool.query('SELECT * FROM simulations WHERE id=$1', [simulation_id]);
      if (sim.rows[0]) {
        current_params = current_params || sim.rows[0].config || {};
        observed_outcomes = observed_outcomes || sim.rows[0].results || {};
      }
    }
    const systemPrompt = 'You are a simulation tuning expert. Suggest parameter changes to reach desired outcomes, with reasoning grounded in simulation dynamics.';
    const userPrompt = `Suggest parameter adjustments.
Current parameters: ${JSON.stringify(current_params || {})}
Observed outcomes: ${JSON.stringify(observed_outcomes || {})}
Target: ${target || 'higher cooperation, faster convergence'}

Return JSON only: { "suggested_changes": [{"param": string, "current": any, "suggested": any, "rationale": string}], "expected_impact": string, "side_effects": [string], "next_experiment": string }`;
    const raw = await callAI(systemPrompt, userPrompt, 700);
    const parsed = parseAIJson(raw);
    await logAnalysis('parameter-tuning-suggestor', { simulation_id, target }, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// POST /api/ai/replay-narrator
// Body: { simulation_id, style? }
router.post('/replay-narrator', async (req, res) => {
  try {
    const { simulation_id, style } = req.body || {};
    if (!simulation_id) return res.status(400).json({ error: 'simulation_id required' });
    const sim = await pool.query('SELECT * FROM simulations WHERE id=$1', [simulation_id]);
    if (!sim.rows[0]) return res.status(404).json({ error: 'Simulation not found' });
    const rounds = await pool.query('SELECT round_number, status, events, outcomes FROM rounds WHERE simulation_id=$1 ORDER BY round_number', [simulation_id]);
    const interactions = await pool.query('SELECT round_id, agent_from, type, content, result FROM interactions WHERE simulation_id=$1 ORDER BY id ASC LIMIT 120', [simulation_id]);

    const systemPrompt = 'You narrate multi-agent simulation replays. Tell an engaging, accurate story of what happened across rounds.';
    const userPrompt = `Narrate this simulation replay.
Simulation: ${JSON.stringify({ name: sim.rows[0].name, type: sim.rows[0].type })}
Rounds: ${JSON.stringify(rounds.rows.slice(0, 30))}
Interactions (truncated): ${JSON.stringify(interactions.rows.slice(0, 60))}
Style: ${style || 'concise journalistic'}

Return JSON only: { "headline": string, "narrative": string, "round_highlights": [{"round": number, "summary": string}], "turning_points": [string], "ending": string }`;
    const raw = await callAI(systemPrompt, userPrompt, 1000);
    const parsed = parseAIJson(raw);
    await logAnalysis('replay-narrator', { simulation_id, style }, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

// POST /api/ai/vertical-scenario-presets
// Body: { vertical } - one of supply_chain, market, disease, traffic, custom
router.post('/vertical-scenario-presets', async (req, res) => {
  try {
    const { vertical, notes } = req.body || {};
    const systemPrompt = 'You are a domain expert across supply chain, financial markets, epidemiology, and traffic systems. Produce ready-to-run multi-agent simulation presets.';
    const userPrompt = `Produce a preset for the requested vertical.
Vertical: ${vertical || 'market'}
Additional notes: ${notes || 'none'}

Return JSON only: { "vertical": string, "preset_name": string, "description": string, "agent_archetypes": [{"name": string, "count": number, "behavior": string}], "global_parameters": object, "key_metrics": [string], "scenario_events": [string], "starter_questions": [string] }`;
    const raw = await callAI(systemPrompt, userPrompt, 800);
    const parsed = parseAIJson(raw);
    await logAnalysis('vertical-scenario-presets', req.body, parsed);
    res.json(parsed);
  } catch (e) { aiErr(res, e); }
});

module.exports = router;
