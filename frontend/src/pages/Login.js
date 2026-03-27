import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang, LANGS } from '../context/LangContext';

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const { lang, t, switchLang } = useLang();
  const [form, setForm] = useState({ email: '', password: '', role: 'farmer', adminKey: '' });
  const [error, setError] = useState('');

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = e => {
    e.preventDefault();
    setError('');
    try { login(form.email, form.password, form.role, form.adminKey); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" />

      {/* Left panel — visual */}
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-visual-icon">🌾</div>
          <h2 className="auth-visual-title">{t.appSub}</h2>
          <p className="auth-visual-desc">
            {lang === 'en' && 'FasalRaksha protects farmers with AI-powered crop insurance fraud detection and real-time satellite verification.'}
            {lang === 'hi' && 'फसलरक्षा AI-संचालित फसल बीमा धोखाधड़ी पहचान और उपग्रह सत्यापन के साथ किसानों की सुरक्षा करता है।'}
            {lang === 'mr' && 'फसलरक्षा AI-चालित पीक विमा फसवणूक शोध आणि उपग्रह सत्यापनासह शेतकऱ्यांचे संरक्षण करते.'}
          </p>
          <div className="auth-visual-stats">
            <div className="auth-stat"><span className="auth-stat-val">₹2.5L Cr+</span><span className="auth-stat-lbl">{lang === 'en' ? 'Claims Processed' : lang === 'hi' ? 'दावे संसाधित' : 'दावे प्रक्रिया'}</span></div>
            <div className="auth-stat"><span className="auth-stat-val">14 Cr+</span><span className="auth-stat-lbl">{lang === 'en' ? 'Farmers Covered' : lang === 'hi' ? 'किसान कवर' : 'शेतकरी संरक्षित'}</span></div>
            <div className="auth-stat"><span className="auth-stat-val">99.2%</span><span className="auth-stat-lbl">{lang === 'en' ? 'Detection Accuracy' : lang === 'hi' ? 'पहचान सटीकता' : 'शोध अचूकता'}</span></div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          {/* Language selector */}
          <div className="auth-lang-row">
            {Object.entries(LANGS).map(([code, label]) => (
              <button key={code} className={`lang-btn ${lang === code ? 'active' : ''}`} onClick={() => switchLang(code)}>{label}</button>
            ))}
          </div>

          <div className="auth-logo">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="Emblem" className="auth-emblem" />
            <div className="auth-title">{t.appName}</div>
            <div className="auth-subtitle">{lang === 'en' ? 'Sign in to your account' : lang === 'hi' ? 'अपने खाते में साइन इन करें' : 'आपल्या खात्यात साइन इन करा'}</div>
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
              <span>🔐 {lang === 'en' ? 'Restricted Access — Government Officers Only' : lang === 'hi' ? 'प्रतिबंधित पहुंच — केवल सरकारी अधिकारी' : 'प्रतिबंधित प्रवेश — केवल सरकारी अधिकारी'}</span>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{t.email}</label>
              <input className="form-input" name="email" type="email" value={form.email} onChange={handle} required placeholder={lang === 'en' ? 'Enter your email' : lang === 'hi' ? 'ईमेल दर्ज करें' : 'ईमेल प्रविष्ट करा'} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{t.password}</label>
              <input className="form-input" name="password" type="password" value={form.password} onChange={handle} required placeholder={lang === 'en' ? 'Enter your password' : lang === 'hi' ? 'पासवर्ड दर्ज करें' : 'पासवर्ड प्रविष्ट करा'} />
            </div>
            {form.role === 'admin' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{t.govtKey}</label>
                <input className="form-input" name="adminKey" type="password" value={form.adminKey} onChange={handle} required placeholder={t.govtKeyPlaceholder} />
              </div>
            )}
            {error && <div className="auth-error">⚠ {error}</div>}
            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8, padding: '10px' }}>{t.signIn}</button>
          </form>

          <div className="auth-switch">
            {t.noAccount} <button onClick={onSwitch}>{t.registerHere}</button>
          </div>

          <div className="auth-footer-note">
            {lang === 'en' ? 'Ministry of Agriculture & Farmers Welfare, Government of India' : lang === 'hi' ? 'कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार' : 'कृषी व शेतकरी कल्याण मंत्रालय, भारत सरकार'}
          </div>
        </div>
      </div>
    </div>
  );
}
