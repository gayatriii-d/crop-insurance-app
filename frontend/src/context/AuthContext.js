import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const ADMIN_KEY_CHECK = simpleHash('admin');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const validateAdminKey = (key) => simpleHash(key) === ADMIN_KEY_CHECK;

  const login = (email, password, role, adminKey) => {
    if (role === 'admin' && !validateAdminKey(adminKey)) {
      throw new Error('Invalid government access key');
    }
    const existing = (() => { try { return JSON.parse(localStorage.getItem('ci_user')); } catch { return null; } })();
    const farmer_id = (existing?.email === email && role === 'farmer') ? existing.farmer_id : null;
    const u = { email, role, name: email.split('@')[0], farmer_id };
    localStorage.setItem('ci_user', JSON.stringify(u)); // set BEFORE setUser
    setUser(u);
  };

  const register = (email, password, role, name, adminKey, farmer_id = null) => {
    if (role === 'admin' && !validateAdminKey(adminKey)) {
      throw new Error('Invalid government access key');
    }
    const u = { email, role, name, farmer_id: role === 'farmer' ? farmer_id : null };
    localStorage.setItem('ci_user', JSON.stringify(u)); // set BEFORE setUser
    setUser(u);
  };

  const linkFarmerId = (farmer_id) => {
    setUser(prev => {
      const updated = { ...prev, farmer_id };
      localStorage.setItem('ci_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('ci_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, linkFarmerId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
