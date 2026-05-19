import React, { useState, useEffect } from 'react';
import { BrowserRouter, useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SimulationsPage from './pages/SimulationsPage';
import AgentsCrudPage from './pages/AgentsCrudPage';
import RoundsPage from './pages/RoundsPage';
import InteractionsPage from './pages/InteractionsPage';
import AIPage from './pages/AIPage';
import AIInsightsPage from './pages/AIInsightsPage';
import CustomViewsPage from './pages/CustomViewsPage';

function Shell() {
  const [page, setPage] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/custom-views') setPage('customViews');
  }, [location.pathname]);

  const handleNavigate = (key) => {
    setPage(key);
    if (key === 'customViews') navigate('/custom-views');
    else if (location.pathname !== '/') navigate('/');
  };

  const pages = {
    dashboard: <DashboardPage onNavigate={handleNavigate} />,
    simulations: <SimulationsPage />,
    agents: <AgentsCrudPage />,
    rounds: <RoundsPage />,
    interactions: <InteractionsPage />,
    ai: <AIPage />,
    aiInsights: <AIInsightsPage />,
    customViews: <CustomViewsPage />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}>
      <Sidebar active={page} onNavigate={handleNavigate} />
      <div style={{ marginLeft: 240, padding: 30, flex: 1 }}>
        <Routes>
          <Route path="/custom-views" element={<CustomViewsPage />} />
          <Route path="*" element={pages[page] || pages.dashboard} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
export default App;
