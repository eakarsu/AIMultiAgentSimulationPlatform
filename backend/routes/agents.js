const router = require('express').Router();
const auth = require('../middleware/auth');
const axios = require('axios');
router.use(auth);

const ai = async (prompt) => {
  const r = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
    messages: [{ role: 'user', content: prompt }]
  }, { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } });
  const c = r.data.choices[0].message.content;
  try { return JSON.parse(c); } catch { return { analysis: c }; }
};

router.post('/design-simulation', async (req, res) => {
  try {
    const { scenario, agent_count, goal } = req.body;
    const result = await ai(`Design a multi-agent simulation for: "${scenario}". Number of agents: ${agent_count || 4}. Goal: ${goal || 'optimize outcomes'}. Return JSON with: simulation_name, description, agent_designs (array with name, role, strategy, personality, goals), rules, win_conditions, expected_dynamics, round_structure.`);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/predict-outcome', async (req, res) => {
  try {
    const { simulation_type, agents, current_scores, rounds_remaining } = req.body;
    const result = await ai(`Predict the outcome of this simulation. Type: ${simulation_type}. Agents: ${JSON.stringify(agents)}. Current scores: ${JSON.stringify(current_scores)}. Rounds remaining: ${rounds_remaining}. Return JSON with: predicted_winner, confidence_percentage, reasoning, key_factors, possible_upsets, strategy_recommendations (per agent).`);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze-strategies', async (req, res) => {
  try {
    const { strategies, game_type, history } = req.body;
    const result = await ai(`Analyze these agent strategies in a ${game_type || 'competitive'} simulation. Strategies: ${JSON.stringify(strategies)}. History: ${history || 'No history available'}. Return JSON with: strategy_rankings (array with name, effectiveness_score, strengths, weaknesses), optimal_counter_strategies, nash_equilibrium, evolutionary_stable_strategies, recommendations.`);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
