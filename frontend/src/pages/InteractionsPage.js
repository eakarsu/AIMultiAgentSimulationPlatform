import React, { useState, useEffect } from 'react';
import { getInteractions } from '../services/api';
export default function InteractionsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { getInteractions().then(setItems).catch(() => {}); }, []);
  const typeColor = { trade: '#2ecc71', attack: '#e74c3c', negotiate: '#3498db', cooperate: '#f39c12', compete: '#e94560', communicate: '#9b59b6' };
  return (
    <div>
      <h1 style={{ color: '#fff', marginBottom: 20 }}>Interactions</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(i => (
          <div key={i.id} style={{ background: '#16213e', padding: 16, borderRadius: 12, borderLeft: `4px solid ${typeColor[i.type] || '#888'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#3498db', fontWeight: 'bold' }}>{i.from_name || 'Unknown'}</span>
                <span style={{ color: '#888' }}>→</span>
                <span style={{ color: '#e94560', fontWeight: 'bold' }}>{i.to_name || 'Unknown'}</span>
              </div>
              <span style={{ background: (typeColor[i.type] || '#888') + '20', color: typeColor[i.type] || '#888', padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{i.type}</span>
            </div>
            <p style={{ color: '#ccc', margin: '0 0 4px', fontSize: 14 }}>{i.content}</p>
            {i.result && <p style={{ color: '#2ecc71', margin: 0, fontSize: 13 }}>Result: {i.result}</p>}
            <div style={{ color: '#888', fontSize: 11, marginTop: 8 }}>{new Date(i.created_at).toLocaleString()}</div>
          </div>
        ))}
        {items.length === 0 && <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>No interactions recorded yet. Run a simulation to generate interactions.</div>}
      </div>
    </div>
  );
}
