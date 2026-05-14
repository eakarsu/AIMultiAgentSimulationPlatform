import React, { useState, useRef, useEffect } from 'react';

const API = 'http://localhost:3012/api';

const statusColor = { running: '#3498db', completed: '#2ecc71', failed: '#e74c3c', waiting: '#f39c12' };

export default function SimulationRunner({ simulation, onComplete }) {
  const [status, setStatus] = useState('idle'); // idle | running | completed | error
  const [rounds, setRounds] = useState([]);
  const [winner, setWinner] = useState(null);
  const [finalAgents, setFinalAgents] = useState([]);
  const [error, setError] = useState('');
  const esRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [rounds]);

  const startStream = () => {
    if (esRef.current) { esRef.current.close(); }
    setRounds([]);
    setWinner(null);
    setFinalAgents([]);
    setError('');
    setStatus('running');

    const token = localStorage.getItem('token');
    const url = `${API}/simulations/${simulation.id}/stream?token=${token}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('start', e => {
      const data = JSON.parse(e.data);
      console.log('[SSE] start', data);
    });

    es.addEventListener('round_start', e => {
      const data = JSON.parse(e.data);
      setRounds(prev => [...prev, { round: data.round, status: 'running', interactions: [] }]);
    });

    es.addEventListener('round_complete', e => {
      const data = JSON.parse(e.data);
      setRounds(prev => prev.map(r =>
        r.round === data.round
          ? { ...r, status: 'completed', interactions: data.interactions || [], worldState: data.world_state }
          : r
      ));
    });

    es.addEventListener('complete', e => {
      const data = JSON.parse(e.data);
      setWinner(data.winner);
      setFinalAgents(data.final_agents || []);
      setStatus('completed');
      es.close();
      if (onComplete) onComplete(data);
    });

    es.addEventListener('error', e => {
      try {
        const data = JSON.parse(e.data);
        setError(data.error || 'Stream error');
      } catch {
        setError('Connection lost');
      }
      setStatus('error');
      es.close();
    });

    es.onerror = () => {
      if (status === 'running') {
        setError('Stream connection error');
        setStatus('error');
        es.close();
      }
    };
  };

  const stop = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setStatus('idle');
  };

  const s = { container: { background: '#16213e', borderRadius: 12, padding: 24, marginTop: 20 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold', margin: 0 },
    btn: (bg) => ({ padding: '10px 24px', background: bg, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }),
    roundCard: (status) => ({
      background: '#1a1a2e', borderRadius: 8, padding: 16, marginBottom: 12,
      borderLeft: `4px solid ${statusColor[status] || '#888'}`
    }),
    roundHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
    roundTitle: { color: '#fff', fontWeight: 'bold' },
    roundStatus: (s) => ({ color: statusColor[s] || '#888', fontSize: 12, fontWeight: 'bold' }),
    interaction: { background: '#0f3460', borderRadius: 6, padding: '8px 12px', marginBottom: 6 },
    agentName: { color: '#e94560', fontWeight: 'bold', fontSize: 13 },
    action: { color: '#3498db', fontSize: 13 },
    reasoning: { color: '#aaa', fontSize: 12, marginTop: 2 },
    winner: { background: 'linear-gradient(135deg, #f39c12, #e67e22)', borderRadius: 12, padding: 24, textAlign: 'center', marginTop: 16 },
    winnerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', margin: 0 },
    finalTable: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
    th: { color: '#e94560', textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #0f3460', fontSize: 13 },
    td: { color: '#ccc', padding: '8px 12px', borderBottom: '1px solid #0f3460', fontSize: 13 },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h3 style={s.title}>Live Simulation Runner — {simulation.name}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {status !== 'running' && (
            <button onClick={startStream} style={s.btn('#e94560')}>
              {status === 'completed' ? 'Re-run Simulation' : 'Run Simulation'}
            </button>
          )}
          {status === 'running' && (
            <button onClick={stop} style={s.btn('#888')}>Stop</button>
          )}
        </div>
      </div>

      {status === 'running' && (
        <div style={{ color: '#3498db', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3498db', animation: 'pulse 1s infinite' }} />
          Simulation running — streaming live updates...
        </div>
      )}

      {error && (
        <div style={{ color: '#e74c3c', background: '#2d0a0a', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {rounds.length > 0 && (
        <div>
          <h4 style={{ color: '#e94560', marginBottom: 12 }}>Round Activity</h4>
          {rounds.map(round => (
            <div key={round.round} style={s.roundCard(round.status)}>
              <div style={s.roundHeader}>
                <span style={s.roundTitle}>Round {round.round}</span>
                <span style={s.roundStatus(round.status)}>{round.status === 'running' ? 'Running...' : 'Completed'}</span>
              </div>
              {round.interactions && round.interactions.map((inter, i) => (
                <div key={i} style={s.interaction}>
                  <div style={s.agentName}>{inter.agent_name}</div>
                  <div style={s.action}>{inter.action}</div>
                  {inter.reasoning && <div style={s.reasoning}>{inter.reasoning}</div>}
                  {inter.resource_change !== 0 && (
                    <div style={{ color: inter.resource_change > 0 ? '#2ecc71' : '#e74c3c', fontSize: 12, marginTop: 2 }}>
                      Score {inter.resource_change > 0 ? '+' : ''}{inter.resource_change}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {status === 'completed' && winner && (
        <div style={s.winner}>
          <p style={{ color: '#fff', fontSize: 14, margin: '0 0 8px 0' }}>Winner</p>
          <h2 style={s.winnerTitle}>{winner}</h2>
        </div>
      )}

      {finalAgents.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ color: '#e94560', marginBottom: 8 }}>Final Standings</h4>
          <table style={s.finalTable}>
            <thead>
              <tr>
                {['Rank', 'Agent', 'Role', 'Final Score', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finalAgents.map((agent, i) => (
                <tr key={agent.id}>
                  <td style={s.td}>{i === 0 ? '🏆 1' : i + 1}</td>
                  <td style={{ ...s.td, color: i === 0 ? '#f39c12' : '#fff', fontWeight: i === 0 ? 'bold' : 'normal' }}>{agent.name}</td>
                  <td style={s.td}>{agent.role}</td>
                  <td style={{ ...s.td, color: '#2ecc71', fontWeight: 'bold' }}>{parseFloat(agent.score || 0).toFixed(1)}</td>
                  <td style={s.td}>{agent.actions_taken || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
