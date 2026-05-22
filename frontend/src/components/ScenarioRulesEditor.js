import React, { useEffect, useState } from 'react';
import { cvListRules, cvCreateRule, cvUpdateRule, cvDeleteRule } from '../services/api';

const EMPTY = { name: '', expression: '', priority: 10, enabled: true, description: '' };

export default function ScenarioRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await cvListRules();
      setRules(r.rules || []);
      setError(r.error || '');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await cvUpdateRule({ ...form, id: editingId });
      } else {
        await cvCreateRule(form);
      }
      setForm(EMPTY); setEditingId(null);
      await load();
    } catch (err) { setError(err.message); }
  };

  const edit = (r) => { setForm({ name: r.name, expression: r.expression, priority: r.priority, enabled: r.enabled, description: r.description }); setEditingId(r.id); };
  const del = async (id) => { await cvDeleteRule(id); await load(); };

  return (
    <div data-testid="rules-editor" style={{ background: '#16213e', padding: 20, borderRadius: 10, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Scenario Rules Editor</h3>
      {error && <div style={{ color: '#e94560', marginBottom: 8 }}>Error: {error}</div>}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rule name" required
          style={{ padding: 8, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 4, color: '#fff' }} />
        <input value={form.expression} onChange={e => setForm({ ...form, expression: e.target.value })} placeholder="Expression" required
          style={{ padding: 8, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 4, color: '#fff' }} />
        <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} placeholder="Priority"
          style={{ padding: 8, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 4, color: '#fff' }} />
        <label style={{ color: '#aaa', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
          Enabled
        </label>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
          style={{ gridColumn: '1 / -1', padding: 8, background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 4, color: '#fff' }} />
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
          <button type="submit" style={{ padding: '8px 16px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setForm(EMPTY); setEditingId(null); }}
              style={{ padding: '8px 16px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
          )}
        </div>
      </form>
      <div>
        {loading && <div style={{ color: '#888' }}>Loading rules...</div>}
        {rules.map(r => (
          <div key={r.id} style={{ background: '#0f3460', padding: 12, borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>
                {r.enabled ? '●' : '○'} {r.name} <span style={{ color: '#888', fontWeight: 'normal', fontSize: 11 }}>p={r.priority}</span>
              </div>
              <div style={{ color: '#5dade2', fontSize: 12, fontFamily: 'monospace' }}>{r.expression}</div>
              {r.description && <div style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>{r.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => edit(r)} style={{ padding: '4px 10px', background: '#5dade2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
              <button onClick={() => del(r.id)} style={{ padding: '4px 10px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
