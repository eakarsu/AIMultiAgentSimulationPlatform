import React, { useState } from 'react';
import { aiDesignSim, aiPredictOutcome, aiAnalyzeStrategies } from '../services/api';
export default function AIPage() {
  const [tab, setTab] = useState('design');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [inputs, setInputs] = useState({ scenario: 'A stock market where 4 AI traders compete using different strategies: momentum trading, value investing, arbitrage, and market making', agent_count: 4, goal: 'Maximize portfolio returns over 20 rounds',
    sim_type: 'market', agents_desc: 'Agent-A (aggressive buyer), Agent-B (conservative seller), Agent-C (tit-for-tat), Agent-D (random)', scores: '{"Agent-A": 85, "Agent-B": 72, "Agent-C": 91, "Agent-D": 45}', rounds_remaining: 10,
    strategies: 'aggressive, conservative, tit-for-tat, random, adaptive', game_type: 'competitive', history: 'After 10 rounds, tit-for-tat leads with cooperation emerging between adaptive and conservative strategies' });
  const renderResult = (obj, depth = 0) => {
    if (!obj) return null;
    if (typeof obj === 'string') return <p style={{ color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{obj}</p>;
    if (Array.isArray(obj)) return <div style={{ marginLeft: depth * 12 }}>{obj.map((item, i) =>
      <div key={i} style={{ background: '#1a1a2e', padding: 12, borderRadius: 8, marginBottom: 8, borderLeft: '3px solid #e94560' }}>
        {typeof item === 'object' ? renderResult(item, depth + 1) : <span style={{ color: '#e0e0e0' }}>{String(item)}</span>}
      </div>)}</div>;
    return <div style={{ marginLeft: depth * 12 }}>{Object.entries(obj).map(([k, v]) =>
      <div key={k} style={{ marginBottom: 12 }}>
        <div style={{ color: '#e94560', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>{k.replace(/_/g, ' ')}</div>
        {typeof v === 'object' && v !== null ? renderResult(v, depth + 1) :
          <div style={{ color: '#e0e0e0', background: '#1a1a2e', padding: '8px 12px', borderRadius: 6, fontSize: 14 }}>
            {typeof v === 'number' ? <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 18 }}>{v}</span> :
              typeof v === 'boolean' ? <span style={{ color: v ? '#2ecc71' : '#e94560', fontWeight: 'bold' }}>{v ? 'Yes' : 'No'}</span> : String(v)}
          </div>}
      </div>)}</div>;
  };
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r;
      if (tab === 'design') r = await aiDesignSim({ scenario: inputs.scenario, agent_count: inputs.agent_count, goal: inputs.goal });
      else if (tab === 'predict') r = await aiPredictOutcome({ simulation_type: inputs.sim_type, agents: inputs.agents_desc, current_scores: inputs.scores, rounds_remaining: inputs.rounds_remaining });
      else r = await aiAnalyzeStrategies({ strategies: inputs.strategies, game_type: inputs.game_type, history: inputs.history });
      setResult(r);
    } catch { setResult({ error: 'AI request failed' }); }
    setLoading(false);
  };
  const tabs = [
    { key: 'design', label: '🎨 Design Simulation', desc: 'AI designs a complete multi-agent simulation' },
    { key: 'predict', label: '🔮 Predict Outcome', desc: 'AI predicts simulation results based on current state' },
    { key: 'strategies', label: '♟️ Analyze Strategies', desc: 'AI evaluates agent strategies and finds optimal plays' },
  ];
  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>AI Simulation Designer</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            style={{ padding: '10px 20px', background: tab === t.key ? '#e94560' : '#16213e', color: tab === t.key ? '#fff' : '#ccc', border: '1px solid #0f3460', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ background: '#16213e', padding: 24, borderRadius: 12, marginBottom: 20 }}>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>{tabs.find(t => t.key === tab)?.desc}</p>
        {tab === 'design' && (<>
          <textarea value={inputs.scenario} onChange={e => setInputs({ ...inputs, scenario: e.target.value })} rows={3} placeholder="Describe the simulation scenario..."
            style={{ width: '100%', padding: 12, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', fontSize: 13, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="number" value={inputs.agent_count} onChange={e => setInputs({ ...inputs, agent_count: parseInt(e.target.value) })} placeholder="Agent count"
              style={{ padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', width: 120 }} />
            <input value={inputs.goal} onChange={e => setInputs({ ...inputs, goal: e.target.value })} placeholder="Goal"
              style={{ flex: 1, padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff' }} />
          </div>
        </>)}
        {tab === 'predict' && (<>
          <input value={inputs.agents_desc} onChange={e => setInputs({ ...inputs, agents_desc: e.target.value })} placeholder="Describe agents..."
            style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', marginBottom: 12, boxSizing: 'border-box' }} />
          <input value={inputs.scores} onChange={e => setInputs({ ...inputs, scores: e.target.value })} placeholder="Current scores JSON"
            style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', fontFamily: 'monospace', marginBottom: 12, boxSizing: 'border-box' }} />
          <input type="number" value={inputs.rounds_remaining} onChange={e => setInputs({ ...inputs, rounds_remaining: parseInt(e.target.value) })} placeholder="Rounds remaining"
            style={{ padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', width: 160 }} />
        </>)}
        {tab === 'strategies' && (<>
          <input value={inputs.strategies} onChange={e => setInputs({ ...inputs, strategies: e.target.value })} placeholder="Strategies (comma-separated)"
            style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', marginBottom: 12, boxSizing: 'border-box' }} />
          <input value={inputs.game_type} onChange={e => setInputs({ ...inputs, game_type: e.target.value })} placeholder="Game type"
            style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', marginBottom: 12, boxSizing: 'border-box' }} />
          <textarea value={inputs.history} onChange={e => setInputs({ ...inputs, history: e.target.value })} rows={3} placeholder="Game history..."
            style={{ width: '100%', padding: 12, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
        </>)}
        <div style={{ marginTop: 16 }}>
          <button onClick={run} disabled={loading}
            style={{ padding: '12px 30px', background: loading ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
            {loading ? '⏳ Processing...' : '🚀 Run AI'}
          </button>
        </div>
      </div>
      {result && <div style={{ background: '#16213e', padding: 24, borderRadius: 12 }}><h3 style={{ color: '#e94560', marginTop: 0 }}>Results</h3>{renderResult(result)}</div>}
    </div>
  );
}
