import React, { useEffect, useState } from 'react';
import { cvGetTimeline } from '../services/api';

const TYPE_COLORS = {
  action: '#e94560', decision: '#5dade2', message: '#48c774',
  reward: '#f1c40f', round_start: '#9b59b6',
};

export default function SimulationTimeline({ simulationId }) {
  const [data, setData] = useState({ events: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let on = true;
    setLoading(true);
    cvGetTimeline(simulationId)
      .then(r => { if (on) { setData(r); setError(r.error || ''); } })
      .catch(e => on && setError(e.message))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [simulationId]);

  const events = data.events || [];
  const minTs = events.length ? Math.min(...events.map(e => new Date(e.timestamp).getTime())) : 0;
  const maxTs = events.length ? Math.max(...events.map(e => new Date(e.timestamp).getTime())) : 1;
  const span = Math.max(1, maxTs - minTs);

  return (
    <div data-testid="sim-timeline" style={{ background: '#16213e', padding: 20, borderRadius: 10, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Simulation Timeline (Agent Events)</h3>
      {loading && <div style={{ color: '#888' }}>Loading timeline...</div>}
      {error && <div style={{ color: '#e94560' }}>Error: {error}</div>}
      {!loading && !error && (
        <>
          <div style={{ color: '#aaa', fontSize: 12, marginBottom: 10 }}>
            {data.count} events {data.simulation_id ? `for simulation #${data.simulation_id}` : '(all simulations)'}
          </div>
          <div style={{ position: 'relative', height: 220, background: '#0f3460', borderRadius: 6, padding: 12, overflow: 'auto' }}>
            <div style={{ position: 'relative', height: 200, minWidth: 600 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, top: 100, height: 2, background: '#1a1a2e' }} />
              {events.map((e, i) => {
                const x = ((new Date(e.timestamp).getTime() - minTs) / span) * 95;
                const y = 30 + (i % 5) * 30;
                return (
                  <div key={i} title={`${e.agent} | ${e.type} | ${e.detail}`}
                    style={{
                      position: 'absolute', left: `${x}%`, top: y,
                      width: 14, height: 14, borderRadius: '50%',
                      background: TYPE_COLORS[e.type] || '#888',
                      border: '2px solid #fff', cursor: 'pointer'
                    }} />
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#ccc', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(TYPE_COLORS).map(([k, c]) => (
              <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, background: c, borderRadius: '50%', marginRight: 4 }} />{k}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
