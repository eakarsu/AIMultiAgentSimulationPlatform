import React from 'react';
const items = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'simulations', icon: '🎮', label: 'Simulations' },
  { key: 'agents', icon: '🤖', label: 'Agents' },
  { key: 'rounds', icon: '🔄', label: 'Rounds' },
  { key: 'interactions', icon: '💬', label: 'Interactions' },
  { key: 'ai', icon: '🧠', label: 'AI Designer' },
  { key: 'aiInsights', icon: '📈', label: 'AI Insights' },
  { key: 'customViews', icon: '🗺️', label: 'Sim Views' },
];
export default function Sidebar({ active, onNavigate }) {
  return (
    <div style={{ width: 240, background: '#16213e', height: '100vh', padding: '20px 0', position: 'fixed', left: 0, top: 0, overflowY: 'auto' }}>
      <div style={{ padding: '0 20px 30px', borderBottom: '1px solid #0f3460' }}>
        <h2 style={{ color: '#e94560', margin: 0, fontSize: 18 }}>🎮 Simulation Platform</h2>
        <p style={{ color: '#888', fontSize: 12, margin: '5px 0 0' }}>Multi-Agent Simulations</p>
      </div>
      {items.map(it => (
        <div key={it.key} onClick={() => onNavigate(it.key)}
          style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            background: active === it.key ? '#0f3460' : 'transparent', color: active === it.key ? '#e94560' : '#ccc',
            borderLeft: active === it.key ? '3px solid #e94560' : '3px solid transparent' }}>
          <span>{it.icon}</span><span style={{ fontSize: 14 }}>{it.label}</span>
        </div>
      ))}
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
        <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}
          style={{ width: '100%', padding: '10px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
      </div>
    </div>
  );
}
