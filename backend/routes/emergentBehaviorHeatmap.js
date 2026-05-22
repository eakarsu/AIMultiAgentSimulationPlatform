const express = require('express');
const router = express.Router();

router.post('/analyze', (req, res) => {
  const { positions = [], gridSize = 10 } = req.body || {};
  const grid = {};
  (Array.isArray(positions) ? positions : []).forEach((point) => {
    const x = Math.max(0, Math.min(Number(gridSize) - 1, Math.floor(Number(point.x || 0))));
    const y = Math.max(0, Math.min(Number(gridSize) - 1, Math.floor(Number(point.y || 0))));
    const key = `${x},${y}`;
    grid[key] = (grid[key] || 0) + 1;
  });
  const cells = Object.entries(grid).map(([key, count]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, count, intensity: Math.min(1, count / Math.max(1, positions.length / 5)) };
  }).sort((a, b) => b.count - a.count);
  res.json({
    feature: 'Emergent Behavior Heatmap',
    hotCells: cells.slice(0, 10),
    convergenceScore: cells[0] ? Math.round(cells[0].count / Math.max(1, positions.length) * 100) : 0,
    interpretation: cells[0] && cells[0].count > positions.length * 0.35 ? 'agents are clustering strongly' : 'agent behavior remains distributed',
  });
});

module.exports = router;
