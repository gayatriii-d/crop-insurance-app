import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

export default function ClaimDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLang();
  const isAdmin = user?.role === 'admin';

  const [claim,     setClaim]    = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [updating,  setUpdating] = useState(false);
  const [newStatus, setNewStatus]= useState('');
  const [notes,     setNotes]    = useState('');
  const [payout,    setPayout]   = useState('');

  useEffect(() => {
    api.getClaim(id)
      .then(d => { setClaim(d); setNewStatus(d.status); setNotes(d.notes || ''); setPayout(d.payout_amount || ''); })
      .finally(() => setLoading(false));
  }, [id]);

  const update = async () => {
    setUpdating(true);
    try {
      const updated = await api.updateStatus(id, { status: newStatus, notes, payout_amount: parseFloat(payout) || 0 });
      setClaim(c => ({ ...c, ...updated }));
    } catch (e) { alert('Error: ' + e.message); }
    finally { setUpdating(false); }
  };

  if (loading) return <div className="loading"><div className="spinner"/><p>{t.loading}</p></div>;
  if (!claim)  return <div className="alert alert-error">Claim not found</div>;

  const fScore = Math.round((claim.fraud_score || 0) * 100);
  const fColor = claim.fraud_risk === 'HIGH' ? 'var(--red)' : claim.fraud_risk === 'MEDIUM' ? 'var(--amber)' : 'var(--green)';
  const f = claim.farmer || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📄 Claim #{claim.id}</h1>
        <p className="page-sub">
          <Link to="/claims" style={{ color:'var(--muted)', textDecoration:'none' }}>{t.backToClaims}</Link>
        </p>
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        {/* Fraud Score */}
        <div className="card" style={{ textAlign:'center' }}>
          <div className="card-title">🔍 {t.fraudScore}</div>
          <div style={{ fontSize:52, fontWeight:700, color:fColor, lineHeight:1 }}>{fScore}%</div>
          <div style={{ marginTop:8 }}>
            <span className={`risk-${claim.fraud_risk}`} style={{ fontSize:13, padding:'4px 14px' }}>
              {claim.fraud_risk} RISK
            </span>
          </div>
          <div className="progress-bar" style={{ height:10, marginTop:14 }}>
            <div className="progress-fill" style={{ width:`${fScore}%`, background:fColor }} />
          </div>
          <div style={{ marginTop:10, fontSize:12, color:'var(--muted)' }}>
            Ensemble ML · NDVI · Weather · Z-Score
          </div>
        </div>

        {/* Farmer Info */}
        <div className="card">
          <div className="card-title">👨‍🌾 {t.farmerDetails}</div>
          {[
            [t.name,     f.name],
            [t.aadhaar,  f.aadhaar || '—'],
            [t.phone,    f.phone || '—'],
            [t.district, f.district],
            [t.village,  f.village],
            [t.crop,     f.crop_type],
            [t.land,     f.land_area ? `${f.land_area} ha` : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--muted)' }}>{k}</span>
              <span style={{ fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Claim Data */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title">📊 {t.claimAnalysis}</div>
        <div className="grid-3">
          {[
            [t.lossType,    claim.loss_type?.replace('_',' '), 'var(--text)', false],
            [t.estLoss,     `₹${Number(claim.estimated_loss).toLocaleString('en-IN')}`, 'var(--red)', true],
            [t.payout,      claim.payout_amount > 0 ? `₹${Number(claim.payout_amount).toLocaleString('en-IN')}` : '—', 'var(--green)', true],
            [t.ndviScore,   claim.ndvi_score?.toFixed(3), claim.ndvi_score > 0.5 ? 'var(--green)' : claim.ndvi_score > 0.3 ? 'var(--amber)' : 'var(--red)', true],
            [t.weatherScore, `${((claim.weather_score || 0) * 100).toFixed(0)}%`, claim.weather_score > 0.5 ? 'var(--green)' : 'var(--amber)', true],
            [t.claimDate,   new Date(claim.claim_date).toLocaleDateString('en-IN'), 'var(--text)', false],
          ].map(([label, val, color, mono]) => (
            <div key={label} style={{ padding:14, background:'var(--bg3)', borderRadius:8 }}>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4, textTransform:'capitalize' }}>{label}</div>
              <div style={{ fontWeight:700, color, fontSize: mono ? 16 : 14, textTransform:'capitalize' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Land Ownership */}
        {(claim.plot_id || claim.ownership_doc) && (
          <div style={{ marginTop:16, padding:'12px 16px', background:'var(--primary-light)', border:'1px solid #b3cdf5', borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>📜 Land Ownership Verification</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, fontSize:13 }}>
              {claim.plot_id && (
                <div>
                  <div style={{ color:'var(--muted)', fontSize:11, marginBottom:2 }}>Plot / Gat Number</div>
                  <div style={{ fontWeight:700, color:'var(--primary)' }}>{claim.plot_id}</div>
                </div>
              )}
              {claim.ownership_doc && (
                <div>
                  <div style={{ color:'var(--muted)', fontSize:11, marginBottom:2 }}>Ownership Document</div>
                  <div style={{ fontWeight:600 }}>{claim.ownership_doc}</div>
                </div>
              )}
              <div>
                <div style={{ color:'var(--muted)', fontSize:11, marginBottom:2 }}>Verification Status</div>
                <span style={{ background:'var(--amber-bg)', color:'var(--amber)', border:'1px solid #fcd34d', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>
                  ⏳ Pending Cross-Verification
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Photo + GeoTag */}
        {(claim.image_url || claim.geo_lat) && (
          <div style={{ display:'grid', gridTemplateColumns: claim.image_url && claim.geo_lat ? '1fr 1fr' : '1fr', gap:16, marginTop:16 }}>
            {claim.image_url && (
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:6, textTransform:'uppercase' }}>📷 Field Photo</div>
                <img src={claim.image_url} alt="Field" style={{ width:'100%', maxHeight:220, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} />
              </div>
            )}
            {claim.geo_lat && (
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:6, textTransform:'uppercase' }}>📍 GeoTag</div>
                <div style={{ background:'var(--green-bg)', border:'1px solid #a7d7b8', borderRadius:8, padding:'12px 14px', fontSize:13 }}>
                  <div style={{ marginBottom:4 }}><strong>Latitude:</strong> {claim.geo_lat}°</div>
                  <div style={{ marginBottom:10 }}><strong>Longitude:</strong> {claim.geo_lon}°</div>
                  <a href={`https://maps.google.com/?q=${claim.geo_lat},${claim.geo_lon}`} target="_blank" rel="noreferrer"
                    className="btn btn-ghost btn-sm">🗺️ View on Google Maps ↗</a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Officer Panel — admin only */}
      {isAdmin && (
        <div className="card">
          <div className="card-title">🏛 {t.officerPanel}</div>
          <div className="alert alert-info" style={{ marginBottom:16 }}>{t.humanAuthority}</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{t.updateStatus}</label>
              <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {['PENDING','PRE_APPROVED','UNDER_REVIEW','APPROVED','REJECTED'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t.payoutAmount}</label>
              <input className="form-input" type="number" value={payout} onChange={e => setPayout(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group" style={{ gridColumn:'span 2' }}>
              <label className="form-label">{t.officerNotes}</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add review notes…" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop:14 }} onClick={update} disabled={updating}>
            {updating ? `${t.loading}` : `✓ ${t.updateClaim}`}
          </button>
        </div>
      )}
    </div>
  );
}
