const router = require('express').Router();
const auth = require('../middleware/auth');
const { getRateLimiter } = require('../middleware/rateLimiter');
const axios = require('axios');
const pool = require('../models/db');

router.use(auth);
const aiLimiter = getRateLimiter(30, 60 * 1000);

// ---------- helpers ----------

const MODEL = 'anthropic/claude-3-5-sonnet-20241022';

async function callAI(prompt) {
  const r = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return r.data.choices[0].message.content;
}

function parseAIJson(raw) {
  // Strategy 1: direct JSON parse
  try {
    return JSON.parse(raw);
  } catch {}

  // Strategy 2: extract first JSON block
  const blockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blockMatch) {
    try {
      return JSON.parse(blockMatch[1].trim());
    } catch {}
  }

  // Strategy 3: find outermost { } or [ ]
  const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[1]);
    } catch {}
  }

  // Fallback: return as raw text
  return { raw_output: raw };
}

async function saveAiAnalysis(type, request_data, result) {
  try {
    await pool.query(
      `INSERT INTO ai_analyses (type, request_data, result) VALUES ($1, $2, $3)`,
      [type, JSON.stringify(request_data), JSON.stringify(result)]
    );
  } catch (e) {
    console.error('Failed to save AI analysis:', e.message);
  }
}

// ---------- routes ----------

router.post('/design-simulation', aiLimiter, async (req, res) => {
  try {
    const { scenario, agent_count, goal } = req.body;
    const prompt = `Design a multi-agent simulation for: "${scenario}". Number of agents: ${agent_count || 4}. Goal: ${goal || 'optimize outcomes'}.

Return JSON only (no markdown): { "name": string, "description": string, "num_agents": number, "agent_roles": [{"name": string, "role": string, "strategy": string, "starting_resources": string}], "world_rules": [string], "scoring_criteria": string, "expected_outcomes": [string] }`;

    const raw = await callAI(prompt);
    const result = parseAIJson(raw);
    await saveAiAnalysis('design-simulation', { scenario, agent_count, goal }, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/predict-outcome', aiLimiter, async (req, res) => {
  try {
    const { simulation_type, agents, current_scores, rounds_remaining } = req.body;
    const prompt = `Predict the outcome of this simulation. Type: ${simulation_type}. Agents: ${JSON.stringify(agents)}. Current scores: ${JSON.stringify(current_scores)}. Rounds remaining: ${rounds_remaining}.

Return JSON only (no markdown): { "predicted_winner": string, "confidence": number, "key_turning_points": [string], "risk_factors": [string], "alternative_scenarios": [string] }`;

    const raw = await callAI(prompt);
    const result = parseAIJson(raw);
    await saveAiAnalysis('predict-outcome', { simulation_type, agents, current_scores, rounds_remaining }, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/analyze-strategies', aiLimiter, async (req, res) => {
  try {
    const { strategies, game_type, history } = req.body;
    const prompt = `Analyze these agent strategies in a ${game_type || 'competitive'} simulation. Strategies: ${JSON.stringify(strategies)}. History: ${history || 'No history available'}.

Return JSON only (no markdown): { "strategy_rankings": [{"name": string, "effectiveness_score": number, "strengths": [string], "weaknesses": [string]}], "optimal_counter_strategies": [string], "nash_equilibrium": string, "evolutionary_stable_strategies": [string], "recommendations": [string] }`;

    const raw = await callAI(prompt);
    const result = parseAIJson(raw);
    await saveAiAnalysis('analyze-strategies', { strategies, game_type, history }, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
