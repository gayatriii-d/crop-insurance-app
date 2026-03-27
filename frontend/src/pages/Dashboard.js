import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

function FraudBar({ score }) {
  const pct   = Math.round(score * 100);
  const color = score >= 0.6 ? 'var(--red)' : score >= 0.3 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div className="progress-bar" style={{ flex:1 }}>
        <div className="progress-fill" style={{ width:`${pct}%`, background:color }} />
      </div>
      <span style={{ fontSize:12, color, fontWeight:600 }}>{pct}%</span>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', padding:20
    }} onClick={onClose}>
      <div style={{
        background:'#fff', borderRadius:12, width:'100%', maxWidth:860,
        maxHeight:'80vh', display:'flex', flexDirection:'column',
        boxShadow:'0 8px 40px rgba(0,0,0,0.18)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'16px 20px', borderBottom:'1px solid var(--border)'
        }}>
          <div style={{ fontWeight:700, fontSize:15 }}>{title}</div>
          <button onClick={onClose} style={{
            background:'none', border:'none', fontSize:20, cursor:'pointer',
            color:'var(--muted)', lineHeight:1, padding:'0 4px'
          }}>✕</button>
        </div>
        <div style={{ overflow:'auto', padding:'16px 20px' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Clickable stat card ──────────────────────────────────────────
function StatCard({ label, value, delta, accent, onClick }) {
  return (
    <div
      className="stat-card"
      style={{ '--accent-color': accent, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      title={onClick ? `Click to view ${label}` : undefined}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {delta && <div className="stat-delta">{delta}</div>}
      {onClick && <div style={{ fontSize:10, color: accent, marginTop:4, fontWeight:600 }}>Click to view ›</div>}
    </div>
  );
}

export default function Dashboard() {
  const { dashboard: d, claims, farmers, loading, error } = useApp();
  const { user }  = useAuth();
  const { t }     = useLang();
  const isAdmin   = user?.role === 'admin';
  const [modal, setModal] = useState(null); // { title, type }

  if (loading) return <div className="loading"><div className="spinner"/><p>{t.loading}</p></div>;
  if (error)   return <div className="alert alert-error">⚠ {t.backendError}<br/><small>{error}</small></div>;

  const recentClaims = (claims || []).slice(0, 6);

  // Filter sets for each modal
  const modalData = {
    farmers:  { title: `👤 ${t.totalFarmers}`,  rows: farmers || [] },
    all:      { title: `📋 ${t.totalClaims}`,   rows: claims  || [] },
    high:     { title: `🚨 ${t.highRisk}`,       rows: (claims || []).filter(c => c.fraud_risk === 'HIGH') },
    approved: { title: `✅ ${t.approved}`,       rows: (claims || []).filter(c => c.status === 'APPROVED' || c.status === 'PRE_APPROVED') },
    pending:  { title: `⏳ ${t.pending}`,        rows: (claims || []).filter(c => c.status === 'PENDING') },
    manual:   { title: `🔍 Manual Review`,       rows: (claims || []).filter(c => c.status === 'MANUAL_REVIEW') },
  };

  const open = type => setModal(type);
  const close = () => setModal(null);

  // ── Farmer modal table ──
  const FarmersTable = ({ rows }) => (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>{t.name}</th><th>{t.aadhaar}</th><th>{t.district}</th><th>{t.crop}</th><th>{t.landArea}</th></tr></thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:24 }}>{t.noFarmers}</td></tr>
            : rows.map(f => (
              <tr key={f.id}>
                <td style={{ color:'var(--muted)', fontSize:12 }}>{f.id}</td>
                <td style={{ fontWeight:600 }}>{f.name}</td>
                <td style={{ fontSize:12, color:'var(--muted)' }}>{f.aadhaar || '—'}</td>
                <td>{f.district}</td>
                <td><span style={{ background:'var(--bg3)', padding:'2px 8px', borderRadius:20, fontSize:12 }}>{f.crop_type}</span></td>
                <td style={{ textAlign:'right' }}>{f.land_area} ha</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  // ── Claims modal table ──
  const ClaimsTable = ({ rows }) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>{t.farmer}</th><th>{t.district}</th><th>{t.lossType}</th><th>{t.estLoss}</th><th>{t.fraudScore}</th><th>{t.risk}</th><th>{t.status}</th></tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--muted)', padding:24 }}>{t.noClaims}</td></tr>
            : rows.map(c => (
              <tr key={c.id}>
                <td><Link to={`/claims/${c.id}`} className="table-link" onClick={close}>#{c.id}</Link></td>
                <td style={{ fontWeight:500 }}>{c.farmer_name}</td>
                <td style={{ color:'var(--muted)' }}>{c.farmer_district}</td>
                <td style={{ textTransform:'capitalize' }}>{c.loss_type?.replace('_',' ')}</td>
                <td>₹{Number(c.estimated_loss).toLocaleString('en-IN')}</td>
                <td style={{ width:120 }}><FraudBar score={c.fraud_score || 0} /></td>
                <td><span className={`risk-${c.fraud_risk}`}>{c.fraud_risk}</span></td>
                <td><span className={`status-badge status-${c.status}`}>{c.status?.replace('_',' ')}</span></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  /* ── Farmer view ── */
  if (!isAdmin) {
    const myClaims = (claims || []).slice(0, 3);

    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">🌾 {t.myDashboard}</h1>
          <p className="page-sub">{t.myClaims} (showing latest 3)</p>
        </div>

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div className="card-title">📋 {t.myClaims}</div>
            <Link to="/claims" className="btn btn-ghost btn-sm">{t.viewAll}</Link>
          </div>
          <ClaimsTable rows={myClaims} />
        </div>
      </div>
    );
  }

  /* ── Admin view ── */
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 {t.dashboard}</h1>
        <p className="page-sub">FasalRaksha · AI-Powered Crop Protection — {t.govtOfficerRole} Portal</p>
      </div>

      <div className="stat-grid">
        <StatCard label={t.totalFarmers}  value={d?.total_farmers}   accent="#1a56a0" delta={t.registered}                          onClick={() => open('farmers')} />
        <StatCard label={t.totalClaims}   value={d?.total_claims}    accent="#1a56a0" delta={t.allTime}                              onClick={() => open('all')} />
        <StatCard label="🔍 High Risk / Manual Review" value={d?.manual_review_claims || d?.fraud_claims} accent="#c0392b" delta={`${d?.fraud_rate}% ${t.fraudRate}`} onClick={() => open('manual')} />
        <StatCard label={t.approved}      value={d?.approved_claims} accent="#1a7a3c" delta={t.cleared}                              onClick={() => open('approved')} />
        <StatCard label={t.pending}       value={d?.pending_claims}  accent="#b45309" delta={t.awaitingAction}                       onClick={() => open('pending')} />
        <StatCard label={t.avgSettlement} value={`${d?.settlement_days}d`} accent="#1a7a3c" />
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        <div className="card">
          <div className="card-title">� {t.recentFarmers}</div>
          <div className="table-wrap">
            <table style={{ fontSize:13 }}>
              <thead><tr><th style={{ textAlign:'left' }}>{t.name}</th><th>{t.district}</th><th>{t.crop}</th></tr></thead>
              <tbody>
                {(farmers || []).slice(0, 5).length === 0
                  ? <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--muted)', padding:12 }}>{t.noFarmers}</td></tr>
                  : (farmers || []).slice(0, 5).map(f => (
                    <tr key={f.id} onClick={() => open('farmers')} style={{ cursor:'pointer' }}>
                      <td style={{ fontWeight:600, color:'var(--primary)' }}>{f.name}</td>
                      <td style={{ color:'var(--muted)' }}>{f.district}</td>
                      <td style={{ fontSize:12 }}>{f.crop_type}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">💰 {t.totalPayout}</div>
          <div style={{ fontSize:30, fontWeight:700, color:'var(--green)', marginBottom:6 }}>
            ₹{(d?.total_payout || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ color:'var(--muted)', fontSize:13 }}>{t.acrossApproved}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        <div className="card">
          <div className="card-title">📊 {t.farmStats}</div>
          <div style={{ fontSize:13 }}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span>{t.avgLandArea}</span>
              <span style={{ fontWeight:600 }}>{farmers && farmers.length > 0 ? (farmers.reduce((s, f) => s + (f.land_area || 0), 0) / farmers.length).toFixed(2) : '0'} ha</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span>{t.topCrop}</span>
              <span style={{ fontWeight:600 }}>
                {farmers && farmers.length > 0 
                  ? Object.entries(farmers.reduce((acc, f) => ({ ...acc, [f.crop_type]: (acc[f.crop_type] || 0) + 1 }), {}))
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🤖 AI/ML Engine Status</div>
          {[
            ['Ensemble Fraud Scorer',   'Active'],
            ['NDVI Anomaly Detector',   'Active'],
            ['Weather Cross-Validator', 'Active'],
            ['Claim Velocity Monitor',  'Active'],
            ['Z-Score Outlier Filter',  'Active'],
          ].map(([name, status]) => (
            <div key={name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span>{name}</span>
              <span style={{ color:'var(--green)', fontWeight:600, fontSize:11 }}>● {status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div className="card-title">� Manual Review Required (High Risk)</div>
          <Link to="/claims?filter=MANUAL" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        {modalData.manual.rows.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--muted)', padding:24 }}>
            ✅ No high-risk claims requiring manual review
          </div>
        ) : (
          <ClaimsTable rows={modalData.manual.rows} />
        )}
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div className="card-title">�📋 {t.recentClaims}</div>
          <Link to="/claims" className="btn btn-ghost btn-sm">{t.viewAll}</Link>
        </div>
        <ClaimsTable rows={recentClaims} />
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modalData[modal].title} onClose={close}>
          {modal === 'farmers'
            ? <FarmersTable rows={modalData[modal].rows} />
            : <ClaimsTable  rows={modalData[modal].rows} />}
        </Modal>
      )}
    </div>
  );
}
