import React, { useState } from 'react';
import SimulationTimeline from '../components/SimulationTimeline';
import CollaborationHeatmap from '../components/CollaborationHeatmap';
import SimulationReport from '../components/SimulationReport';
import ScenarioRulesEditor from '../components/ScenarioRulesEditor';

export default function CustomViewsPage() {
  const [simId, setSimId] = useState('');
  return (
    <div data-testid="custom-views-page">
      <h1 style={{ color: '#e94560', marginBottom: 6 }}>Sim Views — Custom</h1>
      <p style={{ color: '#aaa', marginTop: 0, marginBottom: 18 }}>
        Custom visualizations & tools for multi-agent simulations.
      </p>
      <div style={{ background: '#0f3460', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{ color: '#aaa', fontSize: 13 }}>Filter by Simulation ID (optional):</label>
        <input value={simId} onChange={e => setSimId(e.target.value)} placeholder="e.g. 1"
          style={{ width: 100, padding: 6, background: '#1a1a2e', border: '1px solid #16213e', borderRadius: 4, color: '#fff' }} />
      </div>
      <SimulationTimeline simulationId={simId || null} />
      <CollaborationHeatmap simulationId={simId || null} />
      <SimulationReport />
      <ScenarioRulesEditor />
    </div>
  );
}
