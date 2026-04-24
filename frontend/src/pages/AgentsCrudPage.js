import React, { useState, useEffect } from 'react';
import { getAgents, createAgent, updateAgent, deleteAgent, getSimulations } from '../services/api';
import Modal from '../components/Modal';
import DetailPanel from '../components/DetailPanel';
export default function AgentsCrudPage() {
  const [items, setItems] = useState([]);
  const [sims, setSims] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ simulation_id: '', name: '', role: '', strategy: '', personality: '' });
  const load = () => { getAgents().then(setItems).catch(() => {}); getSimulations().then(setSims).catch(() => {}); };
  useEffect(() => { load(); }, []);
  const handleSave = async () => { if (editing) await updateAgent(editing.id, form); else await createAgent(form); setShowModal(false); setEditing(null); load(); };
  const handleDelete = async (id) => { await deleteAgent(id); setSelected(null); load(); };
  const statusColor = { idle: '#888', active: '#3498db', finished: '#2ecc71', eliminated: '#e74c3c' };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: '#fff', margin: 0 }}>Agents</h1>
        <button onClick={() => { setEditing(null); setForm({ simulation_id: sims[0]?.id || '', name: '', role: '', strategy: '', personality: '' }); setShowModal(true); }}
          style={{ padding: '10px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ Add Agent</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {items.map(a => (
          <div key={a.id} onClick={() => setSelected(a)} style={{ background: '#16213e', padding: 20, borderRadius: 12, cursor: 'pointer', borderTop: `3px solid ${statusColor[a.status] || '#888'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>{a.name}</h3>
              <span style={{ color: statusColor[a.status], fontSize: 12 }}>● {a.status}</span>
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>{a.simulation_name}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ background: '#0f3460', color: '#3498db', padding: '3px 8px', borderRadius: 8, fontSize: 11 }}>{a.role}</span>
              <span style={{ background: '#0f3460', color: '#e94560', padding: '3px 8px', borderRadius: 8, fontSize: 11 }}>{a.strategy}</span>
              <span style={{ background: '#0f3460', color: '#f39c12', padding: '3px 8px', borderRadius: 8, fontSize: 11 }}>{a.personality}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 18 }}>{a.score}</span>
              <span style={{ color: '#888', fontSize: 12 }}>{a.actions_taken} actions</span>
            </div>
          </div>
        ))}
      </div>
      {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setForm({ simulation_id: selected.simulation_id, name: selected.name, role: selected.role, strategy: selected.strategy, personality: selected.personality }); setShowModal(true); }} onDelete={() => handleDelete(selected.id)}
        fields={[{ key: 'name', label: 'Name' }, { key: 'simulation_name', label: 'Simulation' }, { key: 'role', label: 'Role' }, { key: 'strategy', label: 'Strategy' }, { key: 'personality', label: 'Personality' }, { key: 'score', label: 'Score' }, { key: 'actions_taken', label: 'Actions' }, { key: 'status', label: 'Status' }]} />}
      {showModal && <Modal title={editing ? 'Edit Agent' : 'Add Agent'} onClose={() => setShowModal(false)} onSave={handleSave}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>Simulation</label>
          <select value={form.simulation_id} onChange={e => setForm({ ...form, simulation_id: parseInt(e.target.value) })}
            style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff' }}>
            {sims.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {[{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'strategy', label: 'Strategy' }, { key: 'personality', label: 'Personality' }].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              style={{ width: '100%', padding: 10, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
          </div>
        ))}
      </Modal>}
    </div>
  );
}
