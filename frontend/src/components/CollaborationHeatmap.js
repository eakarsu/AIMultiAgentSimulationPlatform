import React, { useEffect, useState } from 'react';
import { cvGetHeatmap } from '../services/api';

function cellColor(v) {
  // Blue -> Red scale
  const n = Math.max(0, Math.min(1, v));
  const r = Math.round(233 * n + 22 * (1 - n));
  const g = Math.round(69 * n + 50 * (1 - n));
  const b = Math.round(96 * n + 130 * (1 - n));
  return `rgb(${r},${g},${b})`;
}

export default function CollaborationHeatmap({ simulationId }) {
  const [data, setData] = useState({ agents: [], matrix: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    setLoading(true);
    cvGetHeatmap(simulationId)
      .then(r => { if (on) { setData(r); setError(r.error || ''); } })
      .catch(e => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [simulationId]);

  return (
    <div data-testid="collab-heatmap" style={{ background: '#16213e', padding: 20, borderRadius: 10, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Agent Collaboration Heatmap</h3>
      {loading && <div style={{ color: '#888' }}>Loading heatmap...</div>}
      {error && <div style={{ color: '#e94560' }}>Error: {error}</div>}
      {!loading && !error && data.agents && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', color: '#fff' }}>
            <thead>
              <tr>
                <th style={{ padding: 6, fontSize: 11, color: '#aaa' }}></th>
                {data.agents.map(a => (
                  <th key={a} style={{ padding: 6, fontSize: 11, color: '#aaa', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: 6, fontSize: 11, color: '#aaa', textAlign: 'right' }}>{data.agents[i]}</td>
                  {row.map((v, j) => (
                    <td key={j} title={`${data.agents[i]} ↔ ${data.agents[j]}: ${v}`}
                      style={{
                        width: 38, height: 38, background: cellColor(v),
                        textAlign: 'center', fontSize: 10, fontWeight: 'bold',
                        border: '1px solid #1a1a2e', color: v > 0.5 ? '#fff' : '#000'
                      }}>{v.toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: '#ccc' }}>
            Scale: low (blue) → high (red). Values 0.00 to 1.00.
          </div>
        </div>
      )}
    </div>
  );
}
