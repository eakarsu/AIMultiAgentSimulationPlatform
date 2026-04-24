import React, { useState, useEffect } from 'react';
import { getStats } from '../services/api';
export default function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState({});
  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);
  const cards = [
    { key: 'simulations', label: 'Simulations', value: stats.simulations || 0, icon: '🎮', color: '#3498db' },
    { key: 'simulations', label: 'Running', value: stats.running || 0, icon: '▶️', color: '#2ecc71' },
    { key: 'agents', label: 'Agents', value: stats.agents || 0, icon: '🤖', color: '#e94560' },
    { key: 'rounds', label: 'Rounds', value: stats.rounds || 0, icon: '🔄', color: '#f39c12' },
  ];
  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 30 }}>Simulation Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {cards.map((c, i) => (
          <div key={i} onClick={() => onNavigate(c.key)} style={{ background: '#16213e', padding: 24, borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${c.color}`, transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{c.label}</div>
            <div style={{ color: c.color, fontSize: 28, fontWeight: 'bold' }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
