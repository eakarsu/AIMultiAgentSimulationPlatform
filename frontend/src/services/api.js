const API = 'http://localhost:3012/api';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export const login = (email, password) =>
  fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => r.json());

export const getStats = () => fetch(`${API}/stats`, { headers: h() }).then(r => r.json());

export const getSimulations = (page = 1, limit = 20) =>
  fetch(`${API}/simulations?page=${page}&limit=${limit}`, { headers: h() }).then(r => r.json());

export const createSimulation = (d) =>
  fetch(`${API}/simulations`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const updateSimulation = (id, d) =>
  fetch(`${API}/simulations/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const deleteSimulation = (id) =>
  fetch(`${API}/simulations/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());

export const runSimulation = (id) =>
  fetch(`${API}/simulations/${id}/run`, { method: 'POST', headers: h() }).then(r => r.json());

export const getAgents = (simId) =>
  fetch(`${API}/agents-crud${simId ? `?simulation_id=${simId}` : ''}`, { headers: h() }).then(r => r.json());

export const createAgent = (d) =>
  fetch(`${API}/agents-crud`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const updateAgent = (id, d) =>
  fetch(`${API}/agents-crud/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const deleteAgent = (id) =>
  fetch(`${API}/agents-crud/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json());

export const getRounds = (simId) =>
  fetch(`${API}/rounds${simId ? `?simulation_id=${simId}` : ''}`, { headers: h() }).then(r => r.json());

export const getInteractions = (simId, page = 1, limit = 50) =>
  fetch(`${API}/interactions?${simId ? `simulation_id=${simId}&` : ''}page=${page}&limit=${limit}`, { headers: h() }).then(r => r.json());

export const aiDesignSim = (d) =>
  fetch(`${API}/agents/design-simulation`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const aiPredictOutcome = (d) =>
  fetch(`${API}/agents/predict-outcome`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const aiAnalyzeStrategies = (d) =>
  fetch(`${API}/agents/analyze-strategies`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());

export const getSimulationStreamUrl = (id) =>
  `${API}/simulations/${id}/stream?token=${localStorage.getItem('token')}`;

// Custom Views API
export const cvGetTimeline = (simId) =>
  fetch(`${API}/custom-views/timeline${simId ? `?simulation_id=${simId}` : ''}`, { headers: h() }).then(r => r.json());
export const cvGetHeatmap = (simId) =>
  fetch(`${API}/custom-views/collaboration-heatmap${simId ? `?simulation_id=${simId}` : ''}`, { headers: h() }).then(r => r.json());
export const cvGetReport = (id) =>
  fetch(`${API}/custom-views/report/${id}`, { headers: h() }).then(r => r.json());
export const cvListRules = () =>
  fetch(`${API}/custom-views/rules`, { headers: h() }).then(r => r.json());
export const cvCreateRule = (d) =>
  fetch(`${API}/custom-views/rules`, { method: 'POST', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const cvUpdateRule = (d) =>
  fetch(`${API}/custom-views/rules`, { method: 'PUT', headers: h(), body: JSON.stringify(d) }).then(r => r.json());
export const cvDeleteRule = (id) =>
  fetch(`${API}/custom-views/rules`, { method: 'DELETE', headers: h(), body: JSON.stringify({ id }) }).then(r => r.json());
