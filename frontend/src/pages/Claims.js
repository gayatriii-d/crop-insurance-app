import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../services/api';

export default function Claims() {
  const { claims, loading, reload } = useApp();
  const { user } = useAuth();
  const { t } = useLang();
  const [filter, setFilter] = useState('ALL');
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const isAdmin = user?.role === 'admin';

  if (loading) return <div className="loading"><div className="spinner"/><p>{t.loading}</p></div>;

  const filtered = filter === 'ALL' ? claims : (
    filter === 'MANUAL' 
      ? claims.filter(c => c.status === 'MANUAL_REVIEW')
      : claims.filter(c => c.fraud_risk === filter || c.status === filter)
  );

  const visibleClaims = isAdmin ? filtered : filtered.slice(0, 3);

  const counts = {
    ALL:     claims.length,
    HIGH:    claims.filter(c => c.fraud_risk === 'HIGH').length,
    MEDIUM:  claims.filter(c => c.fraud_risk === 'MEDIUM').length,
    LOW:     claims.filter(c => c.fraud_risk === 'LOW').length,
    PENDING: claims.filter(c => c.status === 'PENDING').length,
    MANUAL:  isAdmin ? claims.filter(c => c.status === 'MANUAL_REVIEW').length : 0,
  };

  const filterLabels = {
    ALL:     t.viewAll,
    HIGH:    'High Risk',
    MEDIUM:  'Medium Risk',
    LOW:     'Low Risk',
    PENDING: t.pending,
    MANUAL:  isAdmin ? '🔍 Manual Review' : null,
  };

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 className="page-title">📋 {t.claims}</h1>
          <p className="page-sub">
            {isAdmin
              ? 'Multi-source AI fraud scoring — NDVI · Weather · Anomaly Detection'
              : t.myClaims}
          </p>
        </div>
        {!isAdmin && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                if (!user?.farmer_id) {
                  setSeedMessage('Farmer profile is not linked to claims yet.');
                  return;
                }
                setLoadingSeed(true);
                setSeedMessage('Adding 3 claims...');
                try {
                  const samples = [
                    { loss_type:'drought_damage', estimated_loss:42000, notes:'Drought stress in north field' },
                    { loss_type:'flood_damage',    estimated_loss:58000, notes:'Heavy rain waterlogging' },
                    { loss_type:'pest_infested',   estimated_loss:31000, notes:'Pest outbreak on soybean' },
                  ];
                  for (const s of samples) {
                    await api.createClaim({ ...s, farmer_id: user.farmer_id });
                  }
                  await reload();
                  setSeedMessage('3 claims added successfully.');
                } catch (err) {
                  setSeedMessage('Failed to add claims: ' + err.message);
                } finally {
                  setLoadingSeed(false);
                }
              }}
              disabled={loadingSeed}
            >
              {loadingSeed ? 'Adding...' : 'Add 3 Claims'}
            </button>
            <Link to="/new-claim" className="btn btn-primary">+ {t.submitClaim}</Link>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(filterLabels).map(([key, label]) => label ? (
          <button key={key}
            className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(key)}
          >
            {label} <span style={{ marginLeft:4, opacity:0.7 }}>({counts[key] || 0})</span>
          </button>
        ) : null)}
      </div>
      {!isAdmin && seedMessage && (
        <div style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 13 }}>{seedMessage}</div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {isAdmin && <th>{t.farmer}</th>}
                {isAdmin && <th>{t.district}</th>}
                <th>{t.lossType}</th>
                <th>{t.estLoss}</th>
                <th>{t.ndviScore}</th>
                <th>{t.fraudScore}</th>
                <th>{t.risk}</th>
                <th>{t.status}</th>
                <th>{t.payout}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 11 : 9} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>{t.noClaims}</td></tr>
              ) : visibleClaims.map(c => {
                const fScore = Math.round((c.fraud_score || 0) * 100);
                const fColor = c.fraud_risk === 'HIGH' ? 'var(--red)' : c.fraud_risk === 'MEDIUM' ? 'var(--amber)' : 'var(--green)';
                return (
                  <tr key={c.id}>
                    <td><Link to={`/claims/${c.id}`} className="table-link">#{c.id}</Link></td>
                    {isAdmin && <td style={{ fontWeight:600 }}>{c.farmer_name}</td>}
                    {isAdmin && <td style={{ color:'var(--muted)' }}>{c.farmer_district}</td>}
                    <td style={{ textTransform:'capitalize' }}>{c.loss_type?.replace('_',' ')}</td>
                    <td>₹{Number(c.estimated_loss).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{ fontSize:12, fontWeight:600,
                        color: c.ndvi_score > 0.5 ? 'var(--green)' : c.ndvi_score > 0.3 ? 'var(--amber)' : 'var(--red)'
                      }}>{c.ndvi_score?.toFixed(3)}</span>
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div className="progress-bar" style={{ width:60 }}>
                          <div className="progress-fill" style={{ width:`${fScore}%`, background:fColor }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, color:fColor }}>{fScore}%</span>
                      </div>
                    </td>
                    <td><span className={`risk-${c.fraud_risk}`}>{c.fraud_risk}</span></td>
                    <td><span className={`status-badge status-${c.status}`}>{c.status?.replace('_',' ')}</span></td>
                    <td style={{ color:'var(--green)', fontWeight:600 }}>
                      {c.payout_amount > 0 ? `₹${Number(c.payout_amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td><Link to={`/claims/${c.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {!isAdmin && filtered.length > 3 && (
        <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>
          Showing newest 3 claims. Click “View All” in the top-right to see the full list.
        </div>
      )}
    </div>
  );
}
