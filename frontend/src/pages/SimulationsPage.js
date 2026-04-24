import React, { useState, useEffect } from 'react';
import { getSimulations, createSimulation, updateSimulation, deleteSimulation } from '../services/api';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
export default function SimulationsPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'market', agent_count: 4, rounds: 10 });
  const load = () => getSimulations().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const handleSave = async () => { if (editing) await updateSimulation(editing.id, form); else await createSimulation(form); setShowModal(false); setEditing(null); load(); };
  const handleEdit = (s) => { setEditing(s); setForm({ name: s.name, description: s.description, type: s.type, agent_count: s.agent_count, rounds: s.rounds, status: s.status }); setShowModal(true); };
  const handleDelete = async (id) => { await deleteSimulation(id); setSelected(null); load(); };
  const statusColor = { draft: '#888', running: '#3498db', completed: '#2ecc71', paused: '#f39c12', failed: '#e74c3c' };
  const typeColor = { market: '#3498db', negotiation: '#9b59b6', game_theory: '#e67e22', evolution: '#2ecc71', competition: '#e94560', war_game: '#e74c3c' };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: '#fff', margin: 0 }}>Simulations</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '', type: 'market', agent_count: 4, rounds: 10 }); setShowModal(true); }}
          style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ New Simulation</button>
      </div>
      <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #0f3460' }}>
            {['Name', 'Type', 'Status', 'Agents', 'Rounds', 'Progress'].map(h => <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#e94560', fontSize: 13 }}>{h}</th>)}
          </tr></thead>
          <tbody>{items.map(s => (
            <tr key={s.id} onClick={() => setSelected(s)} style={{ borderBottom: '1px solid #0f3460', cursor: 'pointer', background: selected?.id === s.id ? '#0f3460' : 'transparent' }}>
              <td style={{ padding: '12px 16px', color: '#fff', fontWeight: 500 }}>{s.name}</td>
              <td style={{ padding: '12px 16px' }}><span style={{ background: (typeColor[s.type] || '#888') + '20', color: typeColor[s.type] || '#888', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>{s.type?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '12px 16px' }}><span style={{ color: statusColor[s.status] || '#888', fontWeight: 'bold' }}>● {s.status}</span></td>
              <td style={{ padding: '12px 16px', color: '#3498db', fontWeight: 'bold' }}>{s.agent_count}</td>
              <td style={{ padding: '12px 16px', color: '#ccc' }}>{s.current_round}/{s.rounds}</td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ background: '#1a1a2e', borderRadius: 4, height: 8, width: 100 }}>
                  <div style={{ background: statusColor[s.status] || '#888', borderRadius: 4, height: 8, width: `${Math.min(100, (s.current_round / s.rounds) * 100)}%` }} />
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => handleEdit(selected)} onDelete={() => handleDelete(selected.id)}
        fields={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'agent_count', label: 'Agents' }, { key: 'rounds', label: 'Total Rounds' }, { key: 'current_round', label: 'Current Round' }, { key: 'created_at', label: 'Created' }]} />}
      {showModal && <Modal title={editing ? 'Edit Simulation' : 'New Simulation'} onClose={() => setShowModal(false)} onSave={handleSave}>
        {[{ key: 'name', label: 'Name', type: 'text' }, { key: 'description', label: 'Description', type: 'text' }, { key: 'agent_count', label: 'Agent Count', type: 'number' }, { key: 'rounds', label: 'Rounds', type: 'number' }].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? parseInt(e.target.value) : e.target.value })}
              style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff' }}>
            {['market', 'negotiation', 'game_theory', 'evolution', 'competition', 'war_game'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </Modal>}
    </div>
  );
}
