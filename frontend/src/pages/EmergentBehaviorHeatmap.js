import React, { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3012/api';

export default function EmergentBehaviorHeatmap() {
  const [result, setResult] = useState(null);

  const analyze = async () => {
    const positions = Array.from({ length: 40 }, (_, i) => ({ x: i % 5 + (i < 25 ? 2 : 6), y: i % 4 + 3 }));
    const res = await fetch(`${API}/emergent-behavior-heatmap/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions, gridSize: 10 }),
    });
    setResult(await res.json());
  };

  return (
    <div>
      <h1 style={{ color: '#fff' }}>Emergent Behavior Heatmap</h1>
      <p style={{ color: '#cbd5e1' }}>Detect clustering and convergence patterns from simulated agent positions.</p>
      <button onClick={analyze}>Analyze positions</button>
      {result && <pre style={{ marginTop: 20, color: '#e2e8f0', background: '#0f172a', padding: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
