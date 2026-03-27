import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../services/api';

const DISTRICTS = ['Pune','Nashik','Aurangabad','Latur','Solapur','Nagpur','Amravati','Kolhapur'];
const CROPS     = ['Wheat','Rice','Sugarcane','Cotton','Soybean','Maize','Onion','Tomato'];

function FraudBar({ score }) {
  const pct   = Math.round(score * 100);
  const color = score >= 0.6 ? 'var(--red)' : score >= 0.3 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div className="progress-bar" style={{ width:56 }}>
        <div className="progress-fill" style={{ width:`${pct}%`, background:color }} />
      </div>
      <span style={{ fontSize:11, fontWeight:600, color }}>{pct}%</span>
    </div>
  );
}

export default function Farmers() {
  const { farmers, claims, loading, reload } = useApp();
  const { user } = useAuth();
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({ name:'', aadhaar:'', phone:'', district:'Pune', village:'', land_area:'', crop_type:'Wheat' });

  const isAdmin = user?.role === 'admin';

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createFarmer({ ...form, land_area: parseFloat(form.land_area) });
      setShowForm(false);
      setForm({ name:'', aadhaar:'', phone:'', district:'Pune', village:'', land_area:'', crop_type:'Wheat' });
      reload();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const farmerClaims = id => (claims || []).filter(c => c.farmer_id === id);

  if (loading) return <div className="loading"><div className="spinner"/><p>{t.loading}</p></div>;

  // Only admins can view all farmers
  if (!isAdmin) {
    return (
      <div style={{ padding:'40px 20px', textAlign:'center' }}>
        <div className="card" style={{ maxWidth:'500px', margin:'0 auto', padding:'40px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🚫</div>
          <h2 style={{ marginBottom:12 }}>Access Restricted</h2>
          <p style={{ color:'var(--muted)', marginBottom:24 }}>
            Only administrators can view all farmers. You can only view your own information and claims on the Claims page.
          </p>
          <Link to="/claims" className="btn btn-primary">
            View My Claims
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">👨🌾 {t.farmers}</h1>
          <p className="page-sub">{farmers.length} {t.registered} — Click a name to view their claims</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : `+ ${t.registerFarmer}`}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:24 }}>
          <div className="section-title">📝 {t.newFarmerReg}</div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{t.fullName} *</label>
                <input className="form-input" name="name" value={form.name} onChange={handle} required placeholder="e.g. Ramesh Patil" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.aadhaar}</label>
                <input className="form-input" name="aadhaar" value={form.aadhaar} onChange={handle} placeholder="XXXX XXXX XXXX" maxLength={12} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.phone}</label>
                <input className="form-input" name="phone" value={form.phone} onChange={handle} placeholder="+91 98765..." />
              </div>
              <div className="form-group">
                <label className="form-label">{t.district}</label>
                <select className="form-select" name="district" value={form.district} onChange={handle}>
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.village}</label>
                <input className="form-input" name="village" value={form.village} onChange={handle} placeholder="Village name" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.landArea}</label>
                <input className="form-input" name="land_area" type="number" step="0.01" value={form.land_area} onChange={handle} placeholder="e.g. 3.5" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.crop}</label>
                <select className="form-select" name="crop_type" value={form.crop_type} onChange={handle}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t.loading : `✓ ${t.registerFarmer}`}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width:32 }}></th>
                <th>#</th>
                <th>{t.name}</th>
                <th>{t.aadhaar}</th>
                <th>{t.district}</th>
                <th>{t.village}</th>
                <th>{t.crop}</th>
                <th>{t.landArea}</th>
                <th>Claims</th>
                <th>{t.registered}</th>
              </tr>
            </thead>
            <tbody>
              {farmers.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>{t.noFarmers}</td></tr>
              ) : farmers.map(f => {
                const fc     = farmerClaims(f.id);
                const isOpen = expanded === f.id;
                return (
                  <React.Fragment key={f.id}>
                    <tr style={{ background: isOpen ? '#f0f5ff' : undefined }}>
                      <td>
                        <button onClick={() => setExpanded(isOpen ? null : f.id)} style={{
                          background:'none', border:'none', cursor:'pointer',
                          color:'var(--primary)', fontWeight:700, fontSize:13,
                          display:'inline-block', transition:'transform 0.2s',
                          transform: isOpen ? 'rotate(90deg)' : 'none'
                        }}>▶</button>
                      </td>
                      <td style={{ color:'var(--muted)', fontSize:12 }}>{f.id}</td>
                      <td>
                        <button onClick={() => setExpanded(isOpen ? null : f.id)} style={{
                          background:'none', border:'none', cursor:'pointer',
                          fontWeight:700, color:'var(--primary)', fontSize:13, padding:0,
                          textDecoration: isOpen ? 'underline' : 'none'
                        }}>{f.name}</button>
                      </td>
                      <td style={{ fontSize:12, color:'var(--muted)' }}>{f.aadhaar || '—'}</td>
                      <td>{f.district}</td>
                      <td style={{ color:'var(--muted)' }}>{f.village}</td>
                      <td>
                        <span style={{ background:'var(--bg3)', padding:'2px 8px', borderRadius:20, fontSize:12 }}>
                          {f.crop_type}
                        </span>
                      </td>
                      <td style={{ textAlign:'right' }}>{f.land_area} ha</td>
                      <td>
                        <span style={{
                          background: fc.length > 0 ? 'var(--primary-light)' : 'var(--bg3)',
                          color: fc.length > 0 ? 'var(--primary)' : 'var(--muted)',
                          padding:'2px 8px', borderRadius:20, fontSize:12, fontWeight:600
                        }}>{fc.length}</span>
                      </td>
                      <td style={{ color:'var(--muted)', fontSize:12 }}>
                        {new Date(f.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>

                    {/* Expanded claims */}
                    {isOpen && (
                      <tr>
                        <td colSpan={10} style={{ padding:0, background:'#f7f9ff', borderBottom:'2px solid var(--primary-light)' }}>
                          <div style={{ padding:'14px 16px 16px 48px' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'var(--primary)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                              📋 All Claims — {f.name}
                            </div>
                            {fc.length === 0 ? (
                              <div style={{ fontSize:13, color:'var(--muted)', padding:'6px 0' }}>{t.noClaims}</div>
                            ) : (
                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                                <thead>
                                  <tr>
                                    {['Claim #', t.lossType, t.estLoss, t.ndviScore, t.fraudScore, t.risk, t.status, t.payout, ''].map(h => (
                                      <th key={h} style={{
                                        textAlign:'left', padding:'6px 10px', fontSize:11,
                                        fontWeight:600, color:'var(--muted)', textTransform:'uppercase',
                                        letterSpacing:'0.4px', background:'#eef2ff',
                                        borderBottom:'1px solid var(--border)'
                                      }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {fc.map(c => (
                                    <tr key={c.id} style={{ background:'#fff', borderBottom:'1px solid var(--border)' }}>
                                      <td style={{ padding:'8px 10px', fontWeight:600 }}>#{c.id}</td>
                                      <td style={{ padding:'8px 10px', textTransform:'capitalize' }}>{c.loss_type?.replace('_',' ')}</td>
                                      <td style={{ padding:'8px 10px' }}>₹{Number(c.estimated_loss).toLocaleString('en-IN')}</td>
                                      <td style={{ padding:'8px 10px' }}>
                                        <span style={{ fontWeight:600, color: c.ndvi_score > 0.5 ? 'var(--green)' : c.ndvi_score > 0.3 ? 'var(--amber)' : 'var(--red)' }}>
                                          {c.ndvi_score?.toFixed(3)}
                                        </span>
                                      </td>
                                      <td style={{ padding:'8px 10px', width:130 }}><FraudBar score={c.fraud_score || 0} /></td>
                                      <td style={{ padding:'8px 10px' }}><span className={`risk-${c.fraud_risk}`}>{c.fraud_risk}</span></td>
                                      <td style={{ padding:'8px 10px' }}><span className={`status-badge status-${c.status}`}>{c.status?.replace('_',' ')}</span></td>
                                      <td style={{ padding:'8px 10px', color:'var(--green)', fontWeight:600 }}>
                                        {c.payout_amount > 0 ? `₹${Number(c.payout_amount).toLocaleString('en-IN')}` : '—'}
                                      </td>
                                      <td style={{ padding:'8px 10px' }}>
                                        <Link to={`/claims/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
