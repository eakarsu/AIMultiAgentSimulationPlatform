import React, { useState, useEffect } from 'react';
import { getRounds } from '../services/api';
import DetailPanel from '../components/DetailPanel';
export default function RoundsPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { getRounds().then(setItems).catch(() => {}); }, []);
  const statusColor = { pending: '#f39c12', running: '#3498db', completed: '#2ecc71' };
  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Rounds</h1>
      <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #0f3460' }}>
            {['Simulation', 'Round', 'Status', 'Events', 'Started', 'Completed'].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#e94560', fontSize: 13 }}>{h}</th>)}
          </tr></thead>
          <tbody>{items.map(r => (
            <tr key={r.id} onClick={() => setSelected(r)} style={{ borderBottom: '1px solid #0f3460', cursor: 'pointer', background: selected?.id === r.id ? '#0f3460' : 'transparent' }}>
              <td style={{ padding: '12px 16px', color: '#fff' }}>{r.simulation_name}</td>
              <td style={{ padding: '12px 16px', color: '#3498db', fontWeight: 'bold' }}>#{r.round_number}</td>
              <td style={{ padding: '12px 16px' }}><span style={{ color: statusColor[r.status] || '#888' }}>● {r.status}</span></td>
              <td style={{ padding: '12px 16px', color: '#ccc' }}>{Array.isArray(r.events) ? r.events.length : 0}</td>
              <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>{r.started_at ? new Date(r.started_at).toLocaleString() : '-'}</td>
              <td style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>{r.completed_at ? new Date(r.completed_at).toLocaleString() : '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {selected && <DetailPanel item={{...selected, events: JSON.stringify(selected.events, null, 2), outcomes: JSON.stringify(selected.outcomes, null, 2)}} onClose={() => setSelected(null)} onEdit={() => {}} onDelete={() => {}}
        fields={[{ key: 'simulation_name', label: 'Simulation' }, { key: 'round_number', label: 'Round' }, { key: 'status', label: 'Status' }, { key: 'events', label: 'Events' }, { key: 'outcomes', label: 'Outcomes' }]} />}
    </div>
  );
}
