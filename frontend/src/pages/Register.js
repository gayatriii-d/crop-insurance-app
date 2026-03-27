import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang, LANGS } from '../context/LangContext';

export default function Register({ onSwitch }) {
  const { register } = useAuth();
  const { lang, t, switchLang } = useLang();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'farmer', adminKey: '', aadhaar: '', phone: '' });
  const [error, setError] = useState('');

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = e => {
    e.preventDefault();
    setError('');
    try { register(form.email, form.password, form.role, form.name, form.adminKey); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" />

      {/* Left panel */}
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-visual-icon">🏦</div>
          <h2 className="auth-visual-title">
            {lang === 'en' ? 'Join FasalRaksha' : lang === 'hi' ? 'FasalRaksha से जुड़ें' : 'FasalRaksha मध्ये सामील व्हा'}
          </h2>
          <p className="auth-visual-desc">
            {lang === 'en' && 'Register to access crop insurance services, submit claims, and receive timely payouts.'}
            {lang === 'hi' && 'फसल बीमा सेवाओं तक पहुंचने, दावे दर्ज करने और समय पर भुगतान प्राप्त करने के लिए पंजीकरण करें।'}
            {lang === 'mr' && 'पीक विमा सेवांमध्ये प्रवेश करण्यासाठी, दावे सादर करण्यासाठी आणि वेळेवर देयक मिळवण्यासाठी नोंदणी करा.'}
          </p>
          <div className="auth-visual-features">
            {[
              { icon: '🛰', en: 'Satellite NDVI Verification', hi: 'उपग्रह NDVI सत्यापन', mr: 'उपग्रह NDVI सत्यापन' },
              { icon: '🤖', en: 'AI Fraud Detection', hi: 'AI धोखाधड़ी पहचान', mr: 'AI फसवणूक शोध' },
              { icon: '⚡', en: 'Fast Claim Settlement', hi: 'त्वरित दावा निपटान', mr: 'जलद दावा निपटारा' },
              { icon: '🔒', en: 'Secure & Transparent', hi: 'सुरक्षित और पारदर्शी', mr: 'सुरक्षित आणि पारदर्शक' },
            ].map(f => (
              <div key={f.en} className="auth-feature-item">
                <span>{f.icon}</span>
                <span>{lang === 'en' ? f.en : lang === 'hi' ? f.hi : f.mr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-lang-row">
            {Object.entries(LANGS).map(([code, label]) => (
              <button key={code} className={`lang-btn ${lang === code ? 'active' : ''}`} onClick={() => switchLang(code)}>{label}</button>
            ))}
          </div>

          <div className="auth-logo">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem" className="auth-emblem" />
            <div className="auth-title">{t.appName}</div>
            <div className="auth-subtitle">{t.register}</div>
          </div>

          <div className="auth-tabs">
            <button type="button" className={`auth-tab ${form.role === 'farmer' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, role: 'farmer', adminKey: '' }))}>
              🌾 {t.farmer}
            </button>
            <button type="button" className={`auth-tab ${form.role === 'admin' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, role: 'admin' }))}>
              🏛 {t.govtOfficer}
            </button>
          </div>

          {form.role === 'admin' && (
            <div className="auth-role-badge">
              <span>🔐 {lang === 'en' ? 'Restricted — Government Officers Only' : lang === 'hi' ? 'प्रतिबंधित — केवल सरकारी अधिकारी' : 'प्रतिबंधित — केवल सरकारी अधिकारी'}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">{t.fullName}</label>
              <input className="form-input" name="name" value={form.name} onChange={handle} required placeholder={lang === 'en' ? 'Enter your full name' : lang === 'hi' ? 'पूरा नाम दर्ज करें' : 'पूर्ण नाव प्रविष्ट करा'} />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">{t.email}</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handle} required placeholder={lang === 'en' ? 'Enter your email' : lang === 'hi' ? 'ईमेल दर्ज करें' : 'ईमेल प्रविष्ट करा'} />
            </div>
            {form.role === 'farmer' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="form-group">
                  <label className="form-label">{t.aadhaar}</label>
                  <input className="form-input" name="aadhaar" value={form.aadhaar} onChange={handle} placeholder="XXXX XXXX XXXX" maxLength={12} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.phone}</label>
                  <input className="form-input" name="phone" value={form.phone} onChange={handle} placeholder="+91 98765..." />
                </div>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">{t.password}</label>
              <input className="form-input" name="password" type="password" value={form.password} onChange={handle} required placeholder={lang === 'en' ? 'Create a password' : lang === 'hi' ? 'पासवर्ड बनाएं' : 'पासवर्ड तयार करा'} />
            </div>
            {form.role === 'admin' && (
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">{t.govtKey}</label>
                <input className="form-input" name="adminKey" type="password" value={form.adminKey} onChange={handle} required placeholder={t.govtKeyPlaceholder} />
              </div>
            )}
            {error && <div className="auth-error">⚠ {error}</div>}
            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8, padding: '10px' }}>{t.createAccount}</button>
          </form>

          <div className="auth-switch">
            {t.haveAccount} <button onClick={onSwitch}>{t.signInHere}</button>
          </div>

          <div className="auth-footer-note">
            {lang === 'en' ? 'Ministry of Agriculture & Farmers Welfare, Government of India' : lang === 'hi' ? 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार' : 'कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार'}
          </div>
        </div>
      </div>
    </div>
  );
}
