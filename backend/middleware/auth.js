const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });
module.exports = (req, res, next) => {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT secret unavailable');
    req.user = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'multi-agent-simulation-platform' });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
