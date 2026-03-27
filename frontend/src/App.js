import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LangProvider, useLang } from './context/LangContext';
import Dashboard    from './pages/Dashboard';
import Farmers      from './pages/Farmers';
import Claims       from './pages/Claims';
import ClaimDetail  from './pages/ClaimDetail';
import NewClaim     from './pages/NewClaim';
import FraudAnalysis from './pages/FraudAnalysis';
import WeatherMap   from './pages/WeatherMap';
import Login        from './pages/Login';
import Register     from './pages/Register';
import './App.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const isAdmin = user?.role === 'admin';

  const adminLinks = [
    { to: '/',        icon: '⊞',  label: t.dashboard },
    { to: '/farmers', icon: '👤', label: t.farmers },
    { to: '/claims',  icon: '📋', label: t.claims },
    { to: '/fraud',   icon: '🔍', label: t.fraud },
  ];
  const farmerLinks = [
    { to: '/new-claim', icon: '➕', label: t.submitClaim },
    { to: '/claims',    icon: '📋', label: t.myClaims },
    { to: '/weather',   icon: '🌦', label: t.weather },
  ];
  const links = isAdmin ? adminLinks : farmerLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem" className="sidebar-emblem" />
        <div>
          <div className="brand-name">FasalRaksha</div>
          <div className="brand-sub">{isAdmin ? t.govtOfficerRole : t.farmerRole}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className={`user-avatar ${isAdmin ? 'admin' : 'farmer'}`}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{isAdmin ? t.govtOfficerRole : t.farmerRole}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>{t.signOut}</button>
      </div>
    </aside>
  );
}

function AppShell() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  if (!user) {
    return showRegister
      ? <Register onSwitch={() => setShowRegister(false)} />
      : <Login    onSwitch={() => setShowRegister(true)} />;
  }
  const isAdmin = user.role === 'admin';
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={isAdmin ? <Dashboard /> : <Navigate to="/claims" />} />
          <Route path="/claims"     element={<Claims />} />
          <Route path="/claims/:id" element={<ClaimDetail />} />
          {isAdmin  && <Route path="/farmers"   element={<Farmers />} />}
          {isAdmin  && <Route path="/fraud"     element={<FraudAnalysis />} />}
          {!isAdmin && <Route path="/weather"   element={<WeatherMap />} />}
          {!isAdmin && <Route path="/new-claim" element={<NewClaim />} />}
          <Route path="*" element={<Navigate to={isAdmin ? "/" : "/claims"} />} />
        </Routes>
      </main>
    </div>
  );
}

function AppProviderWithAuth({ children }) {
  const { user } = useAuth();
  return <AppProvider user={user}>{children}</AppProvider>;
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppProviderWithAuth>
            <AppShell />
          </AppProviderWithAuth>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}
