import React, { useState } from 'react';
import { aiDesignSim, aiPredictOutcome, aiAnalyzeStrategies } from '../services/api';

const s = {
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #0f3460' },
  label: { color: '#e94560', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  value: { color: '#fff', fontSize: 14, lineHeight: 1.5 },
  badge: (color) => ({ display: 'inline-block', background: color + '22', color, padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 'bold', marginRight: 6, marginBottom: 4 }),
  agentCard: { background: '#0f3460', borderRadius: 8, padding: 14, marginBottom: 8, borderLeft: '3px solid #e94560' },
  agentName: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  agentMeta: { color: '#aaa', fontSize: 13 },
  gauge: (pct) => ({ height: 10, background: '#1a1a2e', borderRadius: 5, overflow: 'hidden', marginTop: 6 }),
  gaugeFill: (pct) => ({
    height: '100%', borderRadius: 5,
    background: pct >= 70 ? '#2ecc71' : pct >= 40 ? '#f39c12' : '#e74c3c',
    width: `${pct}%`, transition: 'width 0.5s ease',
  }),
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { color: '#ccc', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #0f3460', lineHeight: 1.5 },
};

function DesignResult({ result }) {
  if (!result) return null;
  if (result.raw_output) return <pre style={{ color: '#ccc', fontSize: 12, whiteSpace: 'pre-wrap' }}>{result.raw_output}</pre>;
  return (
    <div>
      {result.name && <div style={s.card}><div style={s.label}>Simulation Name</div><div style={{ ...s.value, fontSize: 18, fontWeight: 'bold', color: '#e94560' }}>{result.name}</div></div>}
      {result.description && <div style={s.card}><div style={s.label}>Description</div><div style={s.value}>{result.description}</div></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {result.num_agents && <div style={s.card}><div style={s.label}>Agents</div><div style={{ ...s.value, fontSize: 24, fontWeight: 'bold', color: '#3498db' }}>{result.num_agents}</div></div>}
        {result.scoring_criteria && <div style={s.card}><div style={s.label}>Scoring</div><div style={s.value}>{result.scoring_criteria}</div></div>}
      </div>

      {result.agent_roles?.length > 0 && (
        <div>
          <h4 style={{ color: '#e94560', marginBottom: 8 }}>Agent Roles</h4>
          {result.agent_roles.map((agent, i) => (
            <div key={i} style={s.agentCard}>
              <div style={s.agentName}>{agent.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                <span style={s.badge('#3498db')}>Role: {agent.role}</span>
                <span style={s.badge('#9b59b6')}>Strategy: {agent.strategy}</span>
              </div>
              {agent.starting_resources && <div style={s.agentMeta}>Resources: {agent.starting_resources}</div>}
            </div>
          ))}
        </div>
      )}

      {result.world_rules?.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>World Rules</div>
          <ul style={s.list}>
            {result.world_rules.map((rule, i) => <li key={i} style={s.listItem}>• {rule}</li>)}
          </ul>
        </div>
      )}

      {result.expected_outcomes?.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>Expected Outcomes</div>
          <ul style={s.list}>
            {result.expected_outcomes.map((o, i) => <li key={i} style={s.listItem}>• {o}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function PredictResult({ result }) {
  if (!result) return null;
  if (result.raw_output) return <pre style={{ color: '#ccc', fontSize: 12, whiteSpace: 'pre-wrap' }}>{result.raw_output}</pre>;
  const confidence = result.confidence || 0;
  return (
    <div>
      {result.predicted_winner && (
        <div style={{ ...s.card, borderColor: '#f39c12', background: '#1a1a0a' }}>
          <div style={s.label}>Predicted Winner</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f39c12' }}>{result.predicted_winner}</div>
        </div>
      )}
      <div style={s.card}>
        <div style={s.label}>Confidence: {confidence}%</div>
        <div style={s.gauge(confidence)}><div style={s.gaugeFill(confidence)} /></div>
        <div style={{ color: confidence >= 70 ? '#2ecc71' : confidence >= 40 ? '#f39c12' : '#e74c3c', fontSize: 12, marginTop: 4 }}>
          {confidence >= 70 ? 'High confidence' : confidence >= 40 ? 'Medium confidence' : 'Low confidence'}
        </div>
      </div>
      {result.key_turning_points?.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>Key Turning Points</div>
          <ul style={s.list}>{result.key_turning_points.map((pt, i) => <li key={i} style={s.listItem}>• {pt}</li>)}</ul>
        </div>
      )}
      {result.risk_factors?.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>Risk Factors</div>
          <ul style={s.list}>{result.risk_factors.map((rf, i) => <li key={i} style={{ ...s.listItem, color: '#e74c3c' }}>⚠ {rf}</li>)}</ul>
        </div>
      )}
      {result.alternative_scenarios?.length > 0 && (
        <div style={s.card}>
          <div style={s.label}>Alternative Scenarios</div>
          <ul style={s.list}>{result.alternative_scenarios.map((sc, i) => <li key={i} style={s.listItem}>↔ {sc}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function renderResult(obj, depth = 0) {
  if (!obj) return null;
  if (typeof obj === 'string') return <p style={{ color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{obj}</p>;
  if (Array.isArray(obj)) return (
    <div style={{ marginLeft: depth * 12 }}>
      {obj.map((item, i) => (
        <div key={i} style={{ background: '#1a1a2e', padding: 12, borderRadius: 8, marginBottom: 8, borderLeft: '3px solid #e94560' }}>
          {typeof item === 'object' ? renderResult(item, depth + 1) : <span style={{ color: '#e0e0e0' }}>{String(item)}</span>}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ marginLeft: depth * 12 }}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 12 }}>
          <div style={{ color: '#e94560', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>{k.replace(/_/g, ' ')}</div>
          {typeof v === 'object' && v !== null ? renderResult(v, depth + 1) :
            <div style={{ color: '#e0e0e0', background: '#1a1a2e', padding: '8px 12px', borderRadius: 6, fontSize: 14 }}>
              {typeof v === 'number' ? <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 18 }}>{v}</span> :
                typeof v === 'boolean' ? <span style={{ color: v ? '#2ecc71' : '#e94560', fontWeight: 'bold' }}>{v ? 'Yes' : 'No'}</span> :
                  String(v)}
            </div>}
        </div>
      ))}
    </div>
  );
}

export default function AIPage() {
  const [tab, setTab] = useState('design');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [inputs, setInputs] = useState({
    scenario: 'A stock market where 4 AI traders compete using different strategies: momentum trading, value investing, arbitrage, and market making',
    agent_count: 4,
    goal: 'Maximize portfolio returns over 20 rounds',
    sim_type: 'market',
    agents_desc: 'Agent-A (aggressive buyer), Agent-B (conservative seller), Agent-C (tit-for-tat), Agent-D (random)',
    scores: '{"Agent-A": 85, "Agent-B": 72, "Agent-C": 91, "Agent-D": 45}',
    rounds_remaining: 10,
    strategies: 'aggressive, conservative, tit-for-tat, random, adaptive',
    game_type: 'competitive',
    history: 'After 10 rounds, tit-for-tat leads with cooperation emerging between adaptive and conservative strategies',
  });

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
    { key: 'design', label: 'Design Simulation', desc: 'AI designs a complete multi-agent simulation with agent cards' },
    { key: 'predict', label: 'Predict Outcome', desc: 'AI predicts simulation results with confidence gauge' },
    { key: 'strategies', label: 'Analyze Strategies', desc: 'AI evaluates agent strategies and finds optimal plays' },
  ];

  const inputStyle = { width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' };

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
        {tab === 'design' && (
          <>
            <textarea value={inputs.scenario} onChange={e => setInputs({ ...inputs, scenario: e.target.value })} rows={3} placeholder="Describe the simulation scenario..."
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <input type="number" value={inputs.agent_count} onChange={e => setInputs({ ...inputs, agent_count: parseInt(e.target.value) })} placeholder="Agent count"
                style={{ ...inputStyle, width: 120 }} />
              <input value={inputs.goal} onChange={e => setInputs({ ...inputs, goal: e.target.value })} placeholder="Goal"
                style={{ ...inputStyle, flex: 1 }} />
            </div>
          </>
        )}
        {tab === 'predict' && (
          <>
            <input value={inputs.agents_desc} onChange={e => setInputs({ ...inputs, agents_desc: e.target.value })} placeholder="Describe agents..."
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input value={inputs.scores} onChange={e => setInputs({ ...inputs, scores: e.target.value })} placeholder="Current scores JSON"
              style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 12 }} />
            <input type="number" value={inputs.rounds_remaining} onChange={e => setInputs({ ...inputs, rounds_remaining: parseInt(e.target.value) })} placeholder="Rounds remaining"
              style={{ ...inputStyle, width: 160 }} />
          </>
        )}
        {tab === 'strategies' && (
          <>
            <input value={inputs.strategies} onChange={e => setInputs({ ...inputs, strategies: e.target.value })} placeholder="Strategies (comma-separated)"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input value={inputs.game_type} onChange={e => setInputs({ ...inputs, game_type: e.target.value })} placeholder="Game type"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea value={inputs.history} onChange={e => setInputs({ ...inputs, history: e.target.value })} rows={3} placeholder="Game history..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </>
        )}
        <div style={{ marginTop: 16 }}>
          <button onClick={run} disabled={loading}
            style={{ padding: '12px 30px', background: loading ? '#888' : '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14 }}>
            {loading ? 'Processing...' : 'Run AI'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ background: '#16213e', padding: 24, borderRadius: 12 }}>
          <h3 style={{ color: '#e94560', marginTop: 0 }}>Results</h3>
          {tab === 'design' ? <DesignResult result={result} /> :
            tab === 'predict' ? <PredictResult result={result} /> :
              renderResult(result)}
        </div>
      )}
    </div>
  );
}
