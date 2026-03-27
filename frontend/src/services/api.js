// src/services/api.js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getAuthHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem('ci_user'));
    return {
      'X-User-Role':     user?.role      || '',
      'X-User-FarmerId': user?.farmer_id || '',
    };
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  health:       ()         => request('/health'),
  dashboard:    ()         => request('/dashboard'),
  seedData:     ()         => request('/seed', { method: 'POST' }),

  getFarmers:   ()         => request('/farmers'),
  getFarmer:    (id)       => request(`/farmers/${id}`),
  createFarmer: (data)     => request('/farmers', { method: 'POST', body: JSON.stringify(data) }),

  getClaims:    ()         => request('/claims'),
  getClaim:     (id)       => request(`/claims/${id}`),
  createClaim:  (data)     => request('/claims', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, data) => request(`/claims/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  getWeather:   (lat, lon) => request(`/weather?lat=${lat}&lon=${lon}`),
  getNDVI:      (district) => request(`/ndvi?district=${district}`),
  analyzeFraud: (data)     => request('/fraud/analyze', { method: 'POST', body: JSON.stringify(data) }),
};
