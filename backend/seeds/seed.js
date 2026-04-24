const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`INSERT INTO users (email, password, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, ['admin@example.com', hash, 'Admin']);

  const sims = [
    { name: 'Stock Market Battle', desc: 'Bull vs Bear agents competing in simulated stock market', type: 'market', agent_count: 4, rounds: 20, status: 'completed' },
    { name: 'Price War Simulation', desc: 'Companies competing on pricing strategies', type: 'market', agent_count: 3, rounds: 15, status: 'completed' },
    { name: 'Diplomatic Negotiation', desc: 'Nations negotiating trade agreements', type: 'negotiation', agent_count: 5, rounds: 10, status: 'running' },
    { name: 'Resource Allocation Game', desc: 'Agents competing for limited resources', type: 'game_theory', agent_count: 4, rounds: 12, status: 'completed' },
    { name: 'Evolutionary Arms Race', desc: 'Predator-prey evolutionary dynamics', type: 'evolution', agent_count: 6, rounds: 50, status: 'completed' },
    { name: 'Auction House', desc: 'Multiple bidders with different valuation strategies', type: 'market', agent_count: 5, rounds: 8, status: 'draft' },
    { name: 'Prisoner Dilemma Tournament', desc: 'Classic game theory tournament with evolving strategies', type: 'game_theory', agent_count: 8, rounds: 100, status: 'completed' },
    { name: 'Supply Chain Negotiation', desc: 'Manufacturer, distributor, retailer negotiation', type: 'negotiation', agent_count: 3, rounds: 15, status: 'running' },
    { name: 'Ecosystem Simulation', desc: 'Herbivores, carnivores, and plants in ecosystem', type: 'evolution', agent_count: 10, rounds: 200, status: 'completed' },
    { name: 'Election Campaign', desc: 'Political candidates competing for voter support', type: 'competition', agent_count: 4, rounds: 30, status: 'draft' },
    { name: 'Cybersecurity War Game', desc: 'Red team vs Blue team cyber attack simulation', type: 'war_game', agent_count: 2, rounds: 20, status: 'completed' },
    { name: 'Market Maker Simulation', desc: 'Competing market makers setting bid-ask spreads', type: 'market', agent_count: 3, rounds: 50, status: 'running' },
    { name: 'Treaty Negotiation', desc: 'Multi-party environmental treaty negotiation', type: 'negotiation', agent_count: 6, rounds: 8, status: 'draft' },
    { name: 'Genetic Algorithm Race', desc: 'Agents evolving strategies through genetic algorithms', type: 'evolution', agent_count: 20, rounds: 500, status: 'completed' },
    { name: 'Corporate Takeover', desc: 'Hostile takeover with defender and attacker strategies', type: 'war_game', agent_count: 2, rounds: 10, status: 'completed' },
    { name: 'Traffic Flow Optimization', desc: 'Vehicles negotiating routes to minimize congestion', type: 'competition', agent_count: 50, rounds: 100, status: 'completed' },
  ];

  for (let i = 0; i < sims.length; i++) {
    const s = sims[i];
    const r = await pool.query(`INSERT INTO simulations (name, description, type, status, agent_count, rounds, current_round) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [s.name, s.desc, s.type, s.status, s.agent_count, s.rounds, s.status === 'completed' ? s.rounds : Math.floor(s.rounds * 0.4)]);
    const simId = r.rows[0].id;

    const roles = ['buyer', 'seller', 'negotiator', 'observer', 'aggressor', 'defender', 'strategist', 'opportunist'];
    const strategies = ['aggressive', 'conservative', 'tit-for-tat', 'random', 'adaptive', 'cooperative', 'exploitative', 'balanced'];
    const personalities = ['bold', 'cautious', 'analytical', 'emotional', 'patient', 'impulsive'];

    for (let j = 0; j < Math.min(s.agent_count, 6); j++) {
      await pool.query(`INSERT INTO agents (simulation_id, name, role, strategy, personality, score, status, actions_taken) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [simId, `Agent-${String.fromCharCode(65 + j)}`, roles[j % roles.length], strategies[j % strategies.length], personalities[j % personalities.length],
          Math.round(Math.random() * 1000) / 10, s.status === 'running' ? 'active' : s.status === 'completed' ? 'finished' : 'idle', Math.floor(Math.random() * 50)]);
    }

    for (let r = 1; r <= Math.min(3, s.rounds); r++) {
      await pool.query(`INSERT INTO rounds (simulation_id, round_number, status, events, outcomes, started_at, completed_at) VALUES ($1,$2,$3,$4,$5,NOW() - interval '${r} hours',NOW() - interval '${r-1} hours')`,
        [simId, r, 'completed', JSON.stringify([{ type: 'action', agent: `Agent-A`, detail: `Made move in round ${r}` }]),
          JSON.stringify({ winner: `Agent-${String.fromCharCode(65 + (r % 3))}`, score_change: Math.round(Math.random() * 20 - 5) })]);
    }

    await pool.query(`INSERT INTO sim_logs (simulation_id, level, message) VALUES ($1,$2,$3)`, [simId, 'info', `Simulation "${s.name}" initialized with ${s.agent_count} agents`]);
    await pool.query(`INSERT INTO sim_logs (simulation_id, level, message) VALUES ($1,$2,$3)`, [simId, i % 3 === 0 ? 'warning' : 'info', `Round processing ${s.status === 'completed' ? 'completed' : 'in progress'}`]);
  }

  console.log('✅ Seed complete');
  process.exit(0);
}
seed().catch(e => { console.error(e); process.exit(1); });
