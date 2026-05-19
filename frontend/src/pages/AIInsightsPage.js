import React, { useState, useEffect } from 'react';

const API = 'http://localhost:3012/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

async function aiPost(path, d) {
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: h(), body: JSON.stringify(d) });
  if (r.status === 503) {
    const body = await r.json().catch(() => ({}));
    return { error: body.error || 'AI is not configured. Please set OPENROUTER_API_KEY on the backend.' };
  }
  return r.json();
}

const aiAgentBehavior = (d) => aiPost('/ai/agent-behavior-generator', d);
const aiInteractionAnalyzer = (d) => aiPost('/ai/interaction-analyzer', d);
const aiSimulationInsights = (d) => aiPost('/ai/simulation-insights', d);
const aiScenarioTemplate = (d) => aiPost('/ai/scenario-template-generator', d);
const aiNegotiationStrategy = (d) => aiPost('/ai/negotiation-strategy', d);
const aiParamTuning = (d) => aiPost('/ai/parameter-tuning-suggestor', d);
const aiReplayNarrator = (d) => aiPost('/ai/replay-narrator', d);
const aiVerticalPresets = (d) => aiPost('/ai/vertical-scenario-presets', d);
const aiHistory = () =>
  fetch(`${API}/ai/history`, { headers: h() }).then(r => r.json());

const s = {
  card: { background: '#1a1a2e', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #0f3460' },
  label: { color: '#e94560', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  value: { color: '#fff', fontSize: 14, lineHeight: 1.5 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  listItem: { color: '#ccc', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #0f3460', lineHeight: 1.5 },
};

const inputStyle = { width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' };

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

export default function AIInsightsPage() {
  const [tab, setTab] = useState('behavior');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const [behaviorInputs, setBehaviorInputs] = useState({
    role: 'trader',
    scenario: 'stock market with momentum and value strategies',
    traits: '{"risk":"high","patience":"low"}',
    goals: 'maximize profit, minimize drawdown',
  });
  const [interactionInputs, setInteractionInputs] = useState({
    simulation_id: '',
    interactions_text: '',
  });
  const [insightsInputs, setInsightsInputs] = useState({ simulation_id: '' });
  const [scenarioInputs, setScenarioInputs] = useState({
    domain: 'logistics',
    agent_count: '5',
    objective: 'minimize average delivery time',
    constraints: '{"budget":"limited"}',
  });
  const [negotiationInputs, setNegotiationInputs] = useState({
    agent_role: 'buyer',
    opponent_profile: '{"style":"aggressive","reservation_price":1200}',
    goals: 'price under 900, lock 2-year contract',
    current_offer: '{"price":1100,"term_years":1}',
    history: '[]',
  });
  const [tuningInputs, setTuningInputs] = useState({
    simulation_id: '',
    current_params: '{}',
    observed_outcomes: '{}',
    target: 'higher cooperation, faster convergence',
  });
  const [replayInputs, setReplayInputs] = useState({ simulation_id: '', style: 'concise journalistic' });
  const [verticalInputs, setVerticalInputs] = useState({ vertical: 'supply_chain', notes: '' });

  const loadHistory = async () => {
    try {
      const r = await aiHistory();
      setHistory(Array.isArray(r) ? r : []);
    } catch { /* ignore */ }
  };
  useEffect(() => { loadHistory(); }, []);

  const run = async () => {
    setLoading(true); setResult(null);
    try {
      let r;
      if (tab === 'behavior') {
        let traits = {}; let goals = [];
        try { traits = JSON.parse(behaviorInputs.traits || '{}'); } catch { traits = {}; }
        goals = behaviorInputs.goals.split(',').map(s => s.trim()).filter(Boolean);
        r = await aiAgentBehavior({ role: behaviorInputs.role, scenario: behaviorInputs.scenario, traits, goals });
      } else if (tab === 'interaction') {
        const body = {};
        if (interactionInputs.simulation_id) body.simulation_id = parseInt(interactionInputs.simulation_id);
        if (interactionInputs.interactions_text) {
          try { body.interactions = JSON.parse(interactionInputs.interactions_text); } catch { /* ignore */ }
        }
        r = await aiInteractionAnalyzer(body);
      } else if (tab === 'insights') {
        r = await aiSimulationInsights({ simulation_id: parseInt(insightsInputs.simulation_id) });
      } else if (tab === 'scenario') {
        let constraints = {};
        try { constraints = JSON.parse(scenarioInputs.constraints || '{}'); } catch { constraints = {}; }
        r = await aiScenarioTemplate({
          domain: scenarioInputs.domain,
          agent_count: parseInt(scenarioInputs.agent_count) || 5,
          objective: scenarioInputs.objective,
          constraints,
        });
      } else if (tab === 'negotiation') {
        let opponent_profile = {}, current_offer = {}, history = [];
        try { opponent_profile = JSON.parse(negotiationInputs.opponent_profile || '{}'); } catch {}
        try { current_offer = JSON.parse(negotiationInputs.current_offer || '{}'); } catch {}
        try { history = JSON.parse(negotiationInputs.history || '[]'); } catch {}
        r = await aiNegotiationStrategy({
          agent_role: negotiationInputs.agent_role,
          opponent_profile,
          goals: negotiationInputs.goals.split(',').map(s => s.trim()).filter(Boolean),
          current_offer,
          history,
        });
      } else if (tab === 'tuning') {
        const body = { target: tuningInputs.target };
        if (tuningInputs.simulation_id) body.simulation_id = parseInt(tuningInputs.simulation_id);
        try { body.current_params = JSON.parse(tuningInputs.current_params || '{}'); } catch { body.current_params = {}; }
        try { body.observed_outcomes = JSON.parse(tuningInputs.observed_outcomes || '{}'); } catch { body.observed_outcomes = {}; }
        r = await aiParamTuning(body);
      } else if (tab === 'replay') {
        r = await aiReplayNarrator({ simulation_id: parseInt(replayInputs.simulation_id), style: replayInputs.style });
      } else if (tab === 'vertical') {
        r = await aiVerticalPresets({ vertical: verticalInputs.vertical, notes: verticalInputs.notes });
      }
      setResult(r);
      loadHistory();
    } catch { setResult({ error: 'AI request failed' }); }
    setLoading(false);
  };

  const tabs = [
    { key: 'behavior', label: 'Agent Behavior', desc: 'Generate behavior profile for a role under a scenario' },
    { key: 'interaction', label: 'Interaction Analyzer', desc: 'Analyze interaction logs for patterns and emergent behavior' },
    { key: 'insights', label: 'Simulation Insights', desc: 'Interpret a complete simulation run with recommendations' },
    { key: 'scenario', label: 'Scenario Template', desc: 'Generate a reusable scenario template for a domain' },
    { key: 'negotiation', label: 'Negotiation Strategy', desc: 'Suggest negotiation moves with rationale and fallback options' },
    { key: 'tuning', label: 'Parameter Tuning', desc: 'Suggest parameter adjustments to reach desired outcomes' },
    { key: 'replay', label: 'Replay Narrator', desc: 'Narrate a completed simulation as a story' },
    { key: 'vertical', label: 'Vertical Presets', desc: 'Ready-to-run presets for supply chain / market / disease / traffic' },
  ];

  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>🧠 AI Insights</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            style={{ padding: '10px 20px', background: tab === t.key ? '#e94560' : '#16213e', color: tab === t.key ? '#fff' : '#ccc', border: '1px solid #0f3460', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ background: '#16213e', padding: 24, borderRadius: 12, marginBottom: 20 }}>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>{tabs.find(t => t.key === tab)?.desc}</p>
        {tab === 'behavior' && (
          <>
            <input value={behaviorInputs.role} onChange={e => setBehaviorInputs({ ...behaviorInputs, role: e.target.value })} placeholder="Agent role"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea value={behaviorInputs.scenario} onChange={e => setBehaviorInputs({ ...behaviorInputs, scenario: e.target.value })} rows={2} placeholder="Scenario..."
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
            <input value={behaviorInputs.traits} onChange={e => setBehaviorInputs({ ...behaviorInputs, traits: e.target.value })} placeholder='Traits JSON e.g. {"risk":"high"}'
              style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 12 }} />
            <input value={behaviorInputs.goals} onChange={e => setBehaviorInputs({ ...behaviorInputs, goals: e.target.value })} placeholder="Goals (comma-separated)"
              style={inputStyle} />
          </>
        )}
        {tab === 'interaction' && (
          <>
            <input value={interactionInputs.simulation_id} onChange={e => setInteractionInputs({ ...interactionInputs, simulation_id: e.target.value })} placeholder="Simulation ID (optional)"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea value={interactionInputs.interactions_text} onChange={e => setInteractionInputs({ ...interactionInputs, interactions_text: e.target.value })} rows={5}
              placeholder='Or paste interactions JSON: [{"agent_from":"A","type":"trade","content":"buy"}]'
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />
          </>
        )}
        {tab === 'insights' && (
          <input value={insightsInputs.simulation_id} onChange={e => setInsightsInputs({ simulation_id: e.target.value })} placeholder="Simulation ID"
            style={inputStyle} />
        )}
        {tab === 'scenario' && (
          <>
            <input value={scenarioInputs.domain} onChange={e => setScenarioInputs({ ...scenarioInputs, domain: e.target.value })} placeholder="Domain (e.g. logistics, market)"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input value={scenarioInputs.agent_count} onChange={e => setScenarioInputs({ ...scenarioInputs, agent_count: e.target.value })} placeholder="Agent count"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea value={scenarioInputs.objective} onChange={e => setScenarioInputs({ ...scenarioInputs, objective: e.target.value })} rows={2} placeholder="Objective..."
              style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }} />
            <input value={scenarioInputs.constraints} onChange={e => setScenarioInputs({ ...scenarioInputs, constraints: e.target.value })} placeholder='Constraints JSON e.g. {"budget":"limited"}'
              style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </>
        )}
        {tab === 'negotiation' && (
          <>
            <input value={negotiationInputs.agent_role} onChange={e => setNegotiationInputs({ ...negotiationInputs, agent_role: e.target.value })} placeholder="Agent role (buyer/seller)"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input value={negotiationInputs.opponent_profile} onChange={e => setNegotiationInputs({ ...negotiationInputs, opponent_profile: e.target.value })} placeholder='Opponent profile JSON'
              style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 12 }} />
            <input value={negotiationInputs.goals} onChange={e => setNegotiationInputs({ ...negotiationInputs, goals: e.target.value })} placeholder="Goals (comma-separated)"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input value={negotiationInputs.current_offer} onChange={e => setNegotiationInputs({ ...negotiationInputs, current_offer: e.target.value })} placeholder='Current offer JSON'
              style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 12 }} />
            <textarea value={negotiationInputs.history} onChange={e => setNegotiationInputs({ ...negotiationInputs, history: e.target.value })} rows={3} placeholder='History JSON array (optional)'
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }} />
          </>
        )}
        {tab === 'tuning' && (
          <>
            <input value={tuningInputs.simulation_id} onChange={e => setTuningInputs({ ...tuningInputs, simulation_id: e.target.value })} placeholder="Simulation ID (optional, autoloads params)"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea value={tuningInputs.current_params} onChange={e => setTuningInputs({ ...tuningInputs, current_params: e.target.value })} rows={3} placeholder='Current parameters JSON'
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical', marginBottom: 12 }} />
            <textarea value={tuningInputs.observed_outcomes} onChange={e => setTuningInputs({ ...tuningInputs, observed_outcomes: e.target.value })} rows={3} placeholder='Observed outcomes JSON'
              style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical', marginBottom: 12 }} />
            <input value={tuningInputs.target} onChange={e => setTuningInputs({ ...tuningInputs, target: e.target.value })} placeholder="Target outcome"
              style={inputStyle} />
          </>
        )}
        {tab === 'replay' && (
          <>
            <input value={replayInputs.simulation_id} onChange={e => setReplayInputs({ ...replayInputs, simulation_id: e.target.value })} placeholder="Simulation ID"
              style={{ ...inputStyle, marginBottom: 12 }} />
            <input value={replayInputs.style} onChange={e => setReplayInputs({ ...replayInputs, style: e.target.value })} placeholder="Narration style (e.g. concise journalistic)"
              style={inputStyle} />
          </>
        )}
        {tab === 'vertical' && (
          <>
            <select value={verticalInputs.vertical} onChange={e => setVerticalInputs({ ...verticalInputs, vertical: e.target.value })}
              style={{ ...inputStyle, marginBottom: 12 }}>
              <option value="supply_chain">Supply chain</option>
              <option value="market">Market</option>
              <option value="disease">Disease spread</option>
              <option value="traffic">Traffic</option>
              <option value="custom">Custom</option>
            </select>
            <textarea value={verticalInputs.notes} onChange={e => setVerticalInputs({ ...verticalInputs, notes: e.target.value })} rows={3} placeholder="Optional notes / customization..."
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
        <div style={{ background: '#16213e', padding: 24, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ color: '#e94560', marginTop: 0 }}>Results</h3>
          {result.error ? <div style={{ color: '#e74c3c' }}>{result.error}</div> : renderResult(result)}
        </div>
      )}

      <div style={{ background: '#16213e', padding: 24, borderRadius: 12 }}>
        <h3 style={{ color: '#e94560', marginTop: 0 }}>Recent Analyses</h3>
        {history.length === 0 ? (
          <div style={{ color: '#888', fontSize: 13 }}>No history yet</div>
        ) : (
          <ul style={s.list}>
            {history.slice(0, 20).map(item => (
              <li key={item.id} style={s.listItem}>
                <span style={{ color: '#e94560', marginRight: 8 }}>#{item.id}</span>
                <span style={{ color: '#3498db' }}>{item.type}</span>
                <span style={{ color: '#888', marginLeft: 8, fontSize: 11 }}>{new Date(item.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
