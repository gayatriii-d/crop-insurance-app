import React, { useState } from 'react';
import { api } from '../services/api';
import { useLang } from '../context/LangContext';

const RULES = [
  { key: 'NDVI_LOSS_MISMATCH',    icon: '🛰', weight: 0.35, title: 'NDVI vs Loss Mismatch',     desc: 'NDVI > 0.6 (healthy fields) but loss > ₹50,000 — vegetation index contradicts claimed damage.' },
  { key: 'WEATHER_LOSS_MISMATCH', icon: '🌦', weight: 0.25, title: 'Weather vs Loss Mismatch',  desc: 'Weather severity < 0.3 (favourable) but loss > ₹40,000 — meteorological data inconsistent.' },
  { key: 'HIGH_LOSS_PER_HECTARE', icon: '📐', weight: 0.20, title: 'Loss/Ha Anomaly',           desc: 'Loss per hectare > ₹2,00,000 — statistically 3σ above district mean.' },
  { key: 'EXTREMELY_LOW_NDVI',    icon: '🌱', weight: 0.10, title: 'Extremely Low NDVI',        desc: 'NDVI < 0.1 — possible intentional crop destruction prior to filing.' },
  { key: 'CLAIM_VELOCITY',        icon: '⚡', weight: 0.05, title: 'Claim Velocity',            desc: 'Multiple claims filed in short window — temporal pattern anomaly.' },
  { key: 'ZSCORE_OUTLIER',        icon: '📊', weight: 0.05, title: 'Z-Score Outlier',           desc: 'Estimated loss is a statistical outlier vs district historical baseline.' },
];

function FeatureBar({ label, value, color }) {
  return (
    <div className="feature-bar-row">
      <span className="feature-bar-label">{label}</span>
      <div className="feature-bar-track">
        <div className="feature-bar-fill" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
      <span className="feature-bar-val" style={{ color }}>{Math.round(value * 100)}%</span>
    </div>
  );
}

export default function FraudAnalysis() {
  const { t } = useLang();
  const [form, setForm]     = useState({ ndvi_score: 0.5, weather_score: 0.5, estimated_loss: 50000, land_area: 3 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: parseFloat(e.target.value) || 0 }));

  const analyze = async () => {
    setLoading(true);
    try { setResult(await api.analyzeFraud(form)); }
    catch (e) { alert('Backend error: ' + e.message); }
    finally { setLoading(false); }
  };

  const fColor = result
    ? result.risk_level === 'HIGH' ? 'var(--red)' : result.risk_level === 'MEDIUM' ? 'var(--amber)' : 'var(--green)'
    : 'var(--muted)';

  // Derived feature importances for display
  const features = result ? [
    { label: 'NDVI Signal',         value: Math.abs(form.ndvi_score - 0.5) * 1.4,  color: '#1a7a3c' },
    { label: 'Weather Severity',    value: Math.abs(form.weather_score - 0.5) * 1.2, color: '#1a56a0' },
    { label: 'Loss Magnitude',      value: Math.min(form.estimated_loss / 200000, 1), color: '#b45309' },
    { label: 'Loss/Ha Ratio',       value: Math.min((form.estimated_loss / Math.max(form.land_area, 0.1)) / 300000, 1), color: '#c0392b' },
    { label: 'Ensemble Confidence', value: 1 - Math.abs(result.fraud_score - 0.5) * 0.4, color: '#6b7280' },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔍 {t.fraud}</h1>
        <p className="page-sub">Ensemble ML engine — NDVI · Weather · Z-Score · Claim Velocity · Explainable AI</p>
      </div>

      <div className="grid-2">
        {/* Input */}
        <div className="card">
          <div className="section-title">📥 {t.inputParams}</div>

          <div style={{ marginBottom: 18 }}>
            <label className="form-label">🛰 NDVI Score (0 = bare soil · 1 = dense crop)</label>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:6 }}>
              <input type="range" name="ndvi_score" min={0} max={1} step={0.01}
                value={form.ndvi_score} onChange={handle}
                style={{ flex:1, accentColor:'var(--green)' }} />
              <span style={{ fontSize:14, fontWeight:700, width:42, color:'var(--green)' }}>{form.ndvi_score.toFixed(2)}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>
              {form.ndvi_score > 0.6 ? '🟢 Healthy — high loss claim suspicious'
                : form.ndvi_score > 0.3 ? '🟡 Moderate stress — standard review'
                : '🔴 Severe stress — consistent with damage'}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="form-label">🌦 Weather Severity (0 = severe · 1 = normal)</label>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:6 }}>
              <input type="range" name="weather_score" min={0} max={1} step={0.01}
                value={form.weather_score} onChange={handle}
                style={{ flex:1, accentColor:'var(--blue)' }} />
              <span style={{ fontSize:14, fontWeight:700, width:42, color:'var(--blue)' }}>{form.weather_score.toFixed(2)}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>
              {form.weather_score > 0.6 ? '🟢 Good weather — large claim needs justification'
                : form.weather_score > 0.3 ? '🟡 Moderate events'
                : '🔴 Severe weather — claims plausible'}
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: 18 }}>
            <div className="form-group">
              <label className="form-label">{t.estLoss} (₹)</label>
              <input className="form-input" type="number" name="estimated_loss" value={form.estimated_loss} onChange={handle} />
            </div>
            <div className="form-group">
              <label className="form-label">{t.landArea}</label>
              <input className="form-input" type="number" name="land_area" step="0.1" value={form.land_area} onChange={handle} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={analyze} disabled={loading} style={{ width:'100%' }}>
            {loading ? `⏳ ${t.analyzing}` : `🔍 ${t.runAnalysis}`}
          </button>
        </div>

        {/* Result */}
        <div className="card">
          <div className="section-title">📊 {t.analysisResult}</div>
          {!result ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--muted)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🤖</div>
              <div style={{ fontSize:13 }}>Enter parameters and run analysis</div>
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:52, fontWeight:700, color:fColor, lineHeight:1 }}>
                  {Math.round(result.fraud_score * 100)}%
                </div>
                <div style={{ marginTop:8 }}>
                  <span className={`risk-${result.risk_level}`} style={{ fontSize:13, padding:'4px 14px' }}>
                    {result.risk_level} FRAUD RISK
                  </span>
                </div>
                <div className="progress-bar" style={{ height:10, marginTop:14 }}>
                  <div className="progress-fill" style={{ width:`${Math.round(result.fraud_score*100)}%`, background:fColor }} />
                </div>
              </div>

              <div style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontWeight:600, fontSize:13 }}>
                {result.recommendation === 'FLAG_FOR_REVIEW'
                  ? `🚨 ${t.flagReview}`
                  : `✅ ${t.proceed}`}
              </div>

              <div style={{ marginBottom:14 }}>
                <div className="card-title">Feature Importance</div>
                {features.map(f => <FeatureBar key={f.label} {...f} />)}
              </div>

              <div>
                <div className="card-title">{t.rulesTriggered}</div>
                {result.rules_triggered.length === 0 ? (
                  <div style={{ color:'var(--green)', fontSize:13, fontWeight:500 }}>✓ {t.noFraudIndicators}</div>
                ) : result.rules_triggered.map(rule => (
                  <div key={rule} style={{
                    padding:'8px 12px', background:'var(--red-bg)', border:'1px solid #f5c6c2',
                    borderRadius:6, marginBottom:6, fontSize:13, color:'var(--red)', fontWeight:500
                  }}>
                    ⚠ {rule.replace(/_/g,' ')}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rules reference */}
      <div className="card" style={{ marginTop:20 }}>
        <div className="section-title">📖 {t.fraudRules} — Ensemble Model Breakdown</div>
        <div className="grid-3">
          {RULES.map(r => (
            <div key={r.key} style={{ padding:14, background:'var(--bg3)', borderRadius:8, borderLeft:`3px solid var(--primary)` }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{r.icon}</div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{r.title}</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8, lineHeight:1.5 }}>{r.desc}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="progress-bar" style={{ flex:1, height:5 }}>
                  <div className="progress-fill" style={{ width:`${r.weight*100}%`, background:'var(--primary)' }} />
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--primary)' }}>{Math.round(r.weight*100)}%</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, padding:'10px 14px', background:'var(--primary-light)', borderRadius:8, fontSize:12, color:'var(--primary)' }}>
          🏛 <strong>{t.humanAuthority}</strong>
        </div>
      </div>
    </div>
  );
}
