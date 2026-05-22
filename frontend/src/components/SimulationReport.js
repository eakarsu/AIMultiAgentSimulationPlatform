import React, { useState } from 'react';
import { cvGetReport } from '../services/api';

export default function SimulationReport() {
  const [simId, setSimId] = useState(1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await cvGetReport(simId);
      if (r.error) setError(r.error);
      setReport(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const download = () => {
    if (!report?.content) return;
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation_${simId}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="sim-report" style={{ background: '#16213e', padding: 20, borderRadius: 10, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Simulation Report (PDF)</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <label style={{ color: '#aaa', fontSize: 13 }}>Simulation ID:</label>
        <input type="number" value={simId} onChange={e => setSimId(parseInt(e.target.value) || 1)}
          style={{ width: 80, padding: 6, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 4, color: '#fff' }} />
        <button onClick={load} disabled={loading}
          style={{ padding: '6px 14px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
        {report && (
          <button onClick={download}
            style={{ padding: '6px 14px', background: '#0f3460', color: '#e94560', border: '1px solid #e94560', borderRadius: 4, cursor: 'pointer' }}>
            Download
          </button>
        )}
      </div>
      {error && <div style={{ color: '#e94560', marginBottom: 8 }}>Error: {error}</div>}
      {report && (
        <>
          <div style={{ color: '#5dade2', fontSize: 12, marginBottom: 8 }}>
            {report.title} | {report.bytes} bytes | {report.format}
          </div>
          <pre style={{
            background: '#0f3460', color: '#fff', padding: 14, borderRadius: 6,
            fontSize: 11, maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap'
          }}>{report.content}</pre>
        </>
      )}
    </div>
  );
}
