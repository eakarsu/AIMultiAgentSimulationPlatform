const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const app = express();
app.use(cors()); app.use(express.json());
const pool = require('./models/db');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/simulations', require('./routes/simulations'));
app.use('/api/agents-crud', require('./routes/agents_crud'));
app.use('/api/rounds', require('./routes/rounds'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/agents', require('./routes/agents'));

app.get('/api/stats', async (req, res) => {
  try {
    const [sims, agents, rounds, running] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM simulations'),
      pool.query('SELECT COUNT(*) FROM agents'),
      pool.query('SELECT COUNT(*) FROM rounds'),
      pool.query("SELECT COUNT(*) FROM simulations WHERE status='running'"),
    ]);
    res.json({ simulations: parseInt(sims.rows[0].count), agents: parseInt(agents.rows[0].count),
      rounds: parseInt(rounds.rows[0].count), running: parseInt(running.rows[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
