CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255), created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS simulations (
  id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, type VARCHAR(50) DEFAULT 'market',
  status VARCHAR(20) DEFAULT 'draft', agent_count INTEGER DEFAULT 2, rounds INTEGER DEFAULT 10,
  current_round INTEGER DEFAULT 0, config JSONB DEFAULT '{}', results JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY, simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, role VARCHAR(100), strategy TEXT, personality TEXT,
  score DECIMAL(10,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'idle',
  memory JSONB DEFAULT '[]', actions_taken INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY, simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL, status VARCHAR(20) DEFAULT 'pending',
  events JSONB DEFAULT '[]', outcomes JSONB DEFAULT '{}',
  started_at TIMESTAMP, completed_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS interactions (
  id SERIAL PRIMARY KEY, simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
  round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
  agent_from INTEGER REFERENCES agents(id), agent_to INTEGER REFERENCES agents(id),
  type VARCHAR(50), content TEXT, result TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim_logs (
  id SERIAL PRIMARY KEY, simulation_id INTEGER REFERENCES simulations(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES agents(id), level VARCHAR(20) DEFAULT 'info',
  message TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT NOW()
);
