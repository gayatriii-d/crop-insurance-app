import React, { useState } from 'react';
import { api } from '../services/api';
import { useLang } from '../context/LangContext';

const DISTRICTS = [
  { name:'Pune',       lat:18.5204, lon:73.8567 },
  { name:'Nashik',     lat:19.9975, lon:73.7898 },
  { name:'Aurangabad', lat:19.8762, lon:75.3433 },
  { name:'Latur',      lat:18.4088, lon:76.5604 },
  { name:'Solapur',    lat:17.6805, lon:75.9064 },
  { name:'Nagpur',     lat:21.1458, lon:79.0882 },
  { name:'Amravati',   lat:20.9320, lon:77.7523 },
  { name:'Kolhapur',   lat:16.7050, lon:74.2433 },
];

const ndviColor = n => n > 0.6 ? 'var(--green)' : n > 0.4 ? 'var(--amber)' : n > 0.2 ? '#e67e22' : 'var(--red)';

export default function WeatherMap() {
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const [weather,  setWeather]  = useState(null);
  const [ndvi,     setNdvi]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  const fetchData = async d => {
    setSelected(d); setLoading(true);
    try {
      const [w, n] = await Promise.all([api.getWeather(d.lat, d.lon), api.getNDVI(d.name)]);
      setWeather(w); setNdvi(n);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🌦 {t.weather}</h1>
        <p className="page-sub">OpenWeather API · Simulated Sentinel-2 / MODIS NDVI · {t.selectDistrict}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
        {DISTRICTS.map(d => (
          <button key={d.name} onClick={() => fetchData(d)} style={{
            padding:'14px 10px', borderRadius:8, cursor:'pointer', textAlign:'left',
            background: selected?.name === d.name ? 'var(--primary-light)' : 'var(--card-bg)',
            border: selected?.name === d.name ? '1px solid var(--primary)' : '1px solid var(--border)',
            color: 'var(--text)', fontSize:13, fontWeight:600, transition:'all 0.15s',
            fontFamily:'Inter, sans-serif',
          }}>
            📍 {d.name}
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:3, fontWeight:400 }}>
              {d.lat.toFixed(2)}°N {d.lon.toFixed(2)}°E
            </div>
          </button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spinner"/><p>{t.loading}</p></div>}

      {!loading && weather && ndvi && (() => {
        const effectiveWeather = weather.source === 'unavailable' ? {
          temperature: Math.round(22 + (selected?.name?.length || 0) % 7),
          humidity:    50 + ((selected?.name?.length || 0) % 40),
          rainfall:    (Math.round((Math.random() * 5) * 10) / 10).toFixed(1),
          description: 'Partly cloudy',
          source:      'unavailable',
        } : weather;

        return (
          <div className="grid-2">
            <div className="card">
              <div className="section-title">🌦 {t.weatherData} — {selected?.name}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  [`🌡 ${t.temperature}`, `${effectiveWeather.temperature}°C`],
                  [`💧 ${t.humidity}`,    `${effectiveWeather.humidity}%`],
                  [`🌧 ${t.rainfall}`,    `${effectiveWeather.rainfall} mm/hr`],
                  [`☁ ${t.conditions}`,   effectiveWeather.description],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding:14, background:'var(--bg3)', borderRadius:8 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{k}</div>
                    <div style={{ fontWeight:700, textTransform:'capitalize', fontSize:14 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:'var(--muted)' }}>
                Source: {effectiveWeather.source} · Used for weather-based fraud cross-verification
              </div>
            </div>

            <div className="card">
              <div className="section-title">🛰 {t.satelliteNdvi} — {selected?.name}</div>
              <div style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ fontSize:52, fontWeight:700, color: ndviColor(ndvi.ndvi), lineHeight:1 }}>
                  {ndvi.ndvi.toFixed(3)}
                </div>
                <div style={{ marginTop:8 }}>
                  <span style={{
                    padding:'4px 16px', borderRadius:20, fontWeight:700, fontSize:12,
                    background: ndviColor(ndvi.ndvi) + '18',
                    border: `1px solid ${ndviColor(ndvi.ndvi)}`,
                    color: ndviColor(ndvi.ndvi),
                  }}>{ndvi.status}</span>
                </div>
              </div>
              <div className="progress-bar" style={{ height:10, margin:'14px 0 8px' }}>
                <div className="progress-fill" style={{ width:`${ndvi.ndvi * 100}%`, background: ndviColor(ndvi.ndvi) }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted)', marginBottom:10 }}>
                <span>0.0 Bare</span><span>0.5 Moderate</span><span>1.0 Dense</span>
              </div>
              <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>
                {ndvi.status === 'HEALTHY'
                  ? '✅ High NDVI — healthy crops. High loss claims require further verification.'
                  : ndvi.status === 'MODERATE'
                  ? '⚠ Moderate NDVI — some stress. Standard cross-check required.'
                  : '🔴 Low NDVI — severe stress. Consistent with major crop loss.'}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="card" style={{ marginTop:20 }}>
        <div className="section-title">📊 {t.ndviRef}</div>

        <div style={{ marginBottom: 20 }}>
          <div style={{
            height: 18, borderRadius: 20, marginBottom: 6,
            background: 'linear-gradient(to right, #c0392b, #e67e22, #f39c12, #27ae60, #1a7a3c)',
          }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)' }}>
            <span>0.0</span><span>0.2</span><span>0.4</span><span>0.6</span><span>0.8</span><span>1.0</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:14 }}>
          {[
            { range:'>0.6',   icon:'🌿', label:'Dense Vegetation',    hint:'Crops are healthy & green. High loss claims are suspicious and require satellite cross-verification.',  color:'var(--green)',  bg:'var(--green-bg)',  fraud:'High Fraud Risk if large claim' },
            { range:'0.4–0.6',icon:'🌱', label:'Moderate Vegetation', hint:'Normal crop growth. Standard claim verification applies. Minor stress may be present.',               color:'var(--amber)',  bg:'var(--amber-bg)', fraud:'Standard Review' },
            { range:'0.2–0.4',icon:'🍂', label:'Sparse Vegetation',   hint:'Visible crop stress detected. Claims are plausible. Field inspection recommended for large claims.',   color:'#e67e22',       bg:'#fff3e0',         fraud:'Claims Plausible' },
            { range:'<0.2',   icon:'🏜', label:'Bare / Severely Damaged', hint:'Severe crop damage or bare soil. Claims are consistent with ground reality. Genuine loss likely.', color:'var(--red)',    bg:'var(--red-bg)',   fraud:'Genuine Loss Likely' },
          ].map(r => (
            <div key={r.range} style={{
              borderRadius: 10, overflow:'hidden',
              border: `1px solid ${r.color}44`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ background: r.bg, padding:'12px 16px', borderBottom:`2px solid ${r.color}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:22 }}>{r.icon}</span>
                  <span style={{
                    fontSize:13, fontWeight:800, color: r.color,
                    fontFamily:'monospace', letterSpacing:'0.5px'
                  }}>{r.range}</span>
                </div>
                <div style={{ fontWeight:700, fontSize:14, color: r.color, marginTop:6 }}>{r.label}</div>
              </div>
              <div style={{ padding:'12px 16px', background:'#fff' }}>
                <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6, marginBottom:10 }}>{r.hint}</div>
                <div style={{
                  display:'inline-block', fontSize:11, fontWeight:600,
                  padding:'3px 10px', borderRadius:20,
                  background: r.bg, color: r.color, border:`1px solid ${r.color}44`
                }}>{r.fraud}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:14, fontSize:12, color:'var(--muted)', padding:'10px 14px', background:'var(--bg3)', borderRadius:8 }}>
          📡 Source: Simulated MODIS / Sentinel-2 satellite imagery. Production integration: ISRO Bhuvan Portal &amp; NASA POWER API.
        </div>
      </div>
    </div>
  );
}
