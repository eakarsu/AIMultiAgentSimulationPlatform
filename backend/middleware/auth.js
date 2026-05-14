const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });
module.exports = (req, res, next) => {
  // Support token in Authorization header OR query param (for SSE EventSource)
  let token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
