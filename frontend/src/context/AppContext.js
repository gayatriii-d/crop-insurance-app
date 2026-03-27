import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children, user }) {
  const [dashboard, setDashboard] = useState(null);
  const [farmers,   setFarmers]   = useState([]);
  const [claims,    setClaims]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const loadAll = async () => {
    if (!user) {
      setDashboard(null); setFarmers([]); setClaims([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dash, fList, cList] = await Promise.all([
        api.dashboard(), api.getFarmers(), api.getClaims()
      ]);
      setDashboard(dash);
      if (user.role === 'admin') {
        setFarmers(fList);
        setClaims(cList);
      } else {
        const fid = user.farmer_id;
        setFarmers(fid ? fList.filter(f => f.id === fid) : []);
        setClaims(fid ? cList.filter(c => c.farmer_id === fid) : []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-run whenever user logs in or out
  useEffect(() => {
    loadAll();
  }, [user?.email, user?.role]);

  return (
    <AppContext.Provider value={{ dashboard, farmers, claims, loading, error, reload: loadAll }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
