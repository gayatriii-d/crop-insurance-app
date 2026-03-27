import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../services/api';

// ── PMFBY official data ──────────────────────────────────────────
const STATES = ['Maharashtra','Karnataka','Madhya Pradesh','Rajasthan','Uttar Pradesh','Gujarat','Andhra Pradesh','Telangana','Punjab','Haryana'];

const DISTRICTS_BY_STATE = {
  'Maharashtra': ['Pune','Nashik','Aurangabad','Latur','Solapur','Nagpur','Amravati','Kolhapur','Satara','Sangli','Osmanabad','Nanded','Jalgaon','Ahmednagar'],
  'Karnataka':   ['Belagavi','Bidar','Kalaburagi','Raichur','Vijayapura','Dharwad','Haveri','Gadag'],
  'Madhya Pradesh': ['Indore','Bhopal','Ujjain','Dewas','Ratlam','Mandsaur','Neemuch','Shajapur'],
  'Rajasthan':   ['Jaipur','Jodhpur','Kota','Ajmer','Bikaner','Udaipur','Barmer','Nagaur'],
  'Uttar Pradesh':['Lucknow','Agra','Varanasi','Kanpur','Allahabad','Meerut','Bareilly','Gorakhpur'],
  'Gujarat':     ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Junagadh','Anand','Kheda'],
  'Andhra Pradesh':['Guntur','Krishna','Kurnool','Nellore','Prakasam','Chittoor','Kadapa','Anantapur'],
  'Telangana':   ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Nalgonda','Medak','Adilabad'],
  'Punjab':      ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Moga','Gurdaspur','Hoshiarpur'],
  'Haryana':     ['Ambala','Hisar','Rohtak','Karnal','Panipat','Sonipat','Sirsa','Fatehabad'],
};

// PMFBY notified crops by season
const CROPS_BY_SEASON = {
  'Kharif':  ['Paddy (Rice)','Maize','Jowar','Bajra','Cotton','Soybean','Groundnut','Tur (Arhar)','Moong','Urad','Sugarcane','Banana'],
  'Rabi':    ['Wheat','Gram (Chickpea)','Lentil (Masur)','Mustard','Sunflower','Potato','Onion','Tomato','Garlic'],
  'Zaid':    ['Watermelon','Muskmelon','Cucumber','Bitter Gourd','Pumpkin','Moong (Summer)'],
  'Annual':  ['Sugarcane','Banana','Turmeric','Ginger','Papaya'],
};

// PMFBY notified calamities
const DISASTER_TYPES = [
  { value: 'drought',           label: 'Drought / Deficient Rainfall' },
  { value: 'flood',             label: 'Flood / Inundation' },
  { value: 'cyclone',           label: 'Cyclone / Typhoon / Tempest' },
  { value: 'hailstorm',         label: 'Hailstorm' },
  { value: 'landslide',         label: 'Landslide' },
  { value: 'pest_disease',      label: 'Pest Attack / Disease' },
  { value: 'unseasonal_rain',   label: 'Unseasonal / Untimely Rains' },
  { value: 'cold_wave_frost',   label: 'Cold Wave / Frost' },
  { value: 'heat_wave',         label: 'Heat Wave / Dry Spell' },
  { value: 'fire',              label: 'Fire (Natural)' },
  { value: 'lightning',         label: 'Lightning Strike' },
  { value: 'cloud_burst',       label: 'Cloud Burst' },
];

const LAND_TYPES = ['Irrigated','Rainfed','Partially Irrigated'];
const HOLDING_TYPES = ['Owner','Tenant / Sharecropper','Both Owner & Tenant'];
const INSURANCE_UNITS = ['Village','Gram Panchayat','Block / Taluka','District'];
const BANKS = ['State Bank of India','Bank of Maharashtra','Punjab National Bank','Canara Bank','Union Bank','HDFC Bank','ICICI Bank','Axis Bank','Cooperative Bank','Gramin Bank','Other'];
const OWNERSHIP_DOCS = ['7/12 Utara (Satbara)','Khasra / Khatauni','Patta / Pattedar','ROR (Record of Rights)','Jamabandi','Chitta & Adangal','Land Passbook','Mutation Certificate'];

const EMPTY = {
  // Personal
  farmer_name:'', aadhaar:'', mobile:'', state:'Maharashtra', district:'Pune', taluka:'', village:'',
  // Land Ownership
  survey_no:'', plot_id:'', ownership_doc:'7/12 Utara (Satbara)', land_holding_type:'Owner', land_area:'', land_type:'Rainfed',
  // Crop
  season:'Kharif', crop_type:'Paddy (Rice)', sowing_date:'', insurance_unit:'Village',
  // Claim
  loss_type:'flood', disaster_date:'', affected_area:'', estimated_loss:'',
  // Bank
  bank_name:'State Bank of India', account_no:'', ifsc:'',
  // Extra
  notes:'', image_url:'', geo_lat:'', geo_lon:'',
};

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase',
        letterSpacing: '0.6px', marginBottom: 14, paddingBottom: 8,
        borderBottom: '2px solid var(--primary-light)', display: 'flex', alignItems: 'center', gap: 8
      }}>{title}</div>
      <div className="form-grid">{children}</div>
    </div>
  );
}

function Field({ label, required, span, children }) {
  return (
    <div className="form-group" style={span ? { gridColumn: `span ${span}` } : {}}>
      <label className="form-label">{label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

export default function NewClaim() {
  const { reload } = useApp();
  const { user, linkFarmerId } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [geoTag, setGeoTag] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const handlePhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
    // Store base64 as image_url for submission
    const fr = new FileReader();
    fr.onload = ev => setForm(f => ({ ...f, image_url: ev.target.result }));
    fr.readAsDataURL(file);
  };

  const captureGeoTag = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported by your browser.'); return; }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        const tag = { lat: latitude.toFixed(6), lon: longitude.toFixed(6), accuracy: Math.round(accuracy) };
        setGeoTag(tag);
        setForm(f => ({ ...f, geo_lat: tag.lat, geo_lon: tag.lon }));
        setGeoLoading(false);
      },
      err => { setGeoError('Could not get location: ' + err.message); setGeoLoading(false); }
    );
  };

  const handle = e => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      // Reset crop when season changes
      if (name === 'season') updated.crop_type = CROPS_BY_SEASON[value][0];
      // Reset district when state changes
      if (name === 'state') updated.district = (DISTRICTS_BY_STATE[value] || [])[0] || '';
      return updated;
    });
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        farmer_name:      form.farmer_name,
        aadhaar:          form.aadhaar,
        phone:            form.mobile,
        district:         form.district,
        village:          form.village,
        land_area:        parseFloat(form.land_area) || 1,
        crop_type:        form.crop_type,
        loss_type:        form.loss_type,
        estimated_loss:   parseFloat(form.estimated_loss) || 0,
        notes:            form.notes,
        image_url:        form.image_url,
        // Extra PMFBY fields passed as notes supplement
        meta: {
          state: form.state, taluka: form.taluka, survey_no: form.survey_no,
          land_type: form.land_type, land_holding_type: form.land_holding_type,
          season: form.season, sowing_date: form.sowing_date,
          insurance_unit: form.insurance_unit, disaster_date: form.disaster_date,
          affected_area: form.affected_area, bank_name: form.bank_name,
          account_no: form.account_no, ifsc: form.ifsc,
        }
      };
      // Create farmer first, then claim
      // If farmer already has a linked farmer_id, reuse it; otherwise create new record
      let farmerId = user?.farmer_id;
      if (!farmerId) {
        const newFarmer = await api.createFarmer({
          name: form.farmer_name, aadhaar: form.aadhaar, phone: form.mobile,
          district: form.district, village: form.village,
          land_area: parseFloat(form.land_area) || 1, crop_type: form.crop_type,
        });
        farmerId = newFarmer.id;
        linkFarmerId(farmerId);
      }
      const claim = await api.createClaim({
        farmer_id: farmerId,
        loss_type: form.loss_type,
        estimated_loss: parseFloat(form.estimated_loss) || 0,
        notes: `Season: ${form.season} | State: ${form.state} | Taluka: ${form.taluka} | Survey: ${form.survey_no} | Plot ID: ${form.plot_id} | Ownership Doc: ${form.ownership_doc} | Land: ${form.land_type} | Sowing: ${form.sowing_date} | Disaster Date: ${form.disaster_date} | Affected Area: ${form.affected_area} ha | Bank: ${form.bank_name} | GeoTag: ${form.geo_lat ? `${form.geo_lat},${form.geo_lon}` : 'N/A'} | ${form.notes}`,
        image_url: form.image_url,
        geo_lat: form.geo_lat,
        geo_lon: form.geo_lon,
        plot_id: form.plot_id,
        ownership_doc: form.ownership_doc,
      });
      setResult(claim);
      reload();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const resetForm = () => { setResult(null); setForm(EMPTY); setPhotoPreview(null); setGeoTag(null); setGeoError(''); };

  // ── Result screen ──
  if (result) {
    const fScore = Math.round((result.fraud_score || 0) * 100);
    const fColor = result.fraud_risk === 'HIGH' ? 'var(--red)' : result.fraud_risk === 'MEDIUM' ? 'var(--amber)' : 'var(--green)';
    return (
      <div>
        <h1 className="page-title" style={{ marginBottom: 24 }}>✅ {t.claimSubmitted}</h1>
        <div className="card" style={{ textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>
            {result.fraud_risk === 'LOW' ? '✅' : result.fraud_risk === 'MEDIUM' ? '⚠️' : '🚨'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Claim #{result.id}</div>
          <span className={`status-badge status-${result.status}`} style={{ fontSize: 13, padding: '5px 14px' }}>
            {result.status?.replace('_', ' ')}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
            {[
              [t.fraudScore,        `${fScore}%`,  fColor],
              [t.risk,              result.fraud_risk, fColor],
              [t.ndviScore,         result.ndvi_score?.toFixed(3), 'var(--text)'],
              [t.preApprovedPayout, result.payout_amount > 0 ? `₹${Number(result.payout_amount).toLocaleString('en-IN')}` : '—', 'var(--green)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: 'var(--bg3)', padding: 14, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/claims/${result.id}`)}>{t.viewClaim}</button>
            <button className="btn btn-ghost" onClick={resetForm}>{t.submitAnother}</button>
          </div>
        </div>
      </div>
    );
  }

  const districts = DISTRICTS_BY_STATE[form.state] || [];
  const crops     = CROPS_BY_SEASON[form.season]   || [];

  // ── Form ──
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 {t.submitClaim}</h1>
        <p className="page-sub">FasalRaksha — Official Claim Registration</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        🛰 Satellite NDVI &amp; weather data auto-fetched on submission · AI ensemble fraud scoring · Low-risk claims pre-approved instantly
      </div>

      <form onSubmit={submit}>

        {/* ── 1. Personal Details ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <Section title="👤 Personal Details">
            <Field label="Full Name" required>
              <input className="form-input" name="farmer_name" value={form.farmer_name} onChange={handle} required placeholder="As per Aadhaar" />
            </Field>
            <Field label="Aadhaar Number" required>
              <input className="form-input" name="aadhaar" value={form.aadhaar} onChange={handle} required placeholder="XXXX XXXX XXXX" maxLength={12} />
            </Field>
            <Field label="Mobile Number" required>
              <input className="form-input" name="mobile" value={form.mobile} onChange={handle} required placeholder="+91 98765 43210" />
            </Field>
          </Section>
        </div>

        {/* ── 2. Location Details ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <Section title="📍 Location Details">
            <Field label="State" required>
              <select className="form-select" name="state" value={form.state} onChange={handle}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="District" required>
              <select className="form-select" name="district" value={form.district} onChange={handle}>
                {districts.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Taluka / Block">
              <input className="form-input" name="taluka" value={form.taluka} onChange={handle} placeholder="Enter taluka name" />
            </Field>
            <Field label="Village / Gram Panchayat" required>
              <input className="form-input" name="village" value={form.village} onChange={handle} required placeholder="Village name" />
            </Field>
          </Section>
        </div>

        {/* ── 3. Land Ownership Verification ── */}
        <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--primary-light)' }}>
          <Section title="📜 Land Ownership Verification">
            <Field label="Survey Number" required>
              <input className="form-input" name="survey_no" value={form.survey_no} onChange={handle} required placeholder="e.g. 123, 45/A" />
            </Field>
            <Field label="Plot / Gat Number (Plot ID)" required>
              <input className="form-input" name="plot_id" value={form.plot_id} onChange={handle} required placeholder="e.g. Gat No. 456 or Plot 12B" />
            </Field>
            <Field label="Ownership Document Type" required>
              <select className="form-select" name="ownership_doc" value={form.ownership_doc} onChange={handle}>
                {OWNERSHIP_DOCS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Land Holding Type" required>
              <select className="form-select" name="land_holding_type" value={form.land_holding_type} onChange={handle}>
                {HOLDING_TYPES.map(h => <option key={h}>{h}</option>)}
              </select>
            </Field>
          </Section>
          {/* Verification status banner */}
          {form.survey_no && form.plot_id ? (
            <div style={{ marginTop:4, padding:'10px 14px', background:'var(--green-bg)', border:'1px solid #a7d7b8', borderRadius:8, fontSize:12, display:'flex', alignItems:'center', gap:8 }}>
              ✅ <strong>Plot ID & Survey No. recorded</strong> — Will be cross-verified against MahaBhumi / State Land Records during claim processing.
            </div>
          ) : (
            <div style={{ marginTop:4, padding:'10px 14px', background:'var(--amber-bg)', border:'1px solid #fcd34d', borderRadius:8, fontSize:12, display:'flex', alignItems:'center', gap:8 }}>
              ⚠️ Survey Number and Plot ID are <strong>required</strong> to verify land ownership before claim approval.
            </div>
          )}
        </div>

        {/* ── 4. Land & Crop Details ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <Section title="🌾 Land & Crop Details">
            <Field label="Land Type" required>
              <select className="form-select" name="land_type" value={form.land_type} onChange={handle}>
                {LAND_TYPES.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Total Land Area (Hectares)" required>
              <input className="form-input" type="number" name="land_area" value={form.land_area} onChange={handle} required placeholder="e.g. 2.5" step="0.01" min={0.01} />
            </Field>
            <Field label="Crop Season" required>
              <select className="form-select" name="season" value={form.season} onChange={handle}>
                {Object.keys(CROPS_BY_SEASON).map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Notified Crop" required>
              <select className="form-select" name="crop_type" value={form.crop_type} onChange={handle}>
                {crops.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Sowing / Planting Date" required>
              <input className="form-input" type="date" name="sowing_date" value={form.sowing_date} onChange={handle} required />
            </Field>
            <Field label="Insurance Unit">
              <select className="form-select" name="insurance_unit" value={form.insurance_unit} onChange={handle}>
                {INSURANCE_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
          </Section>
        </div>

        {/* ── 4. Loss / Disaster Details ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <Section title="⚠️ Loss / Disaster Details">
            <Field label="Type of Calamity / Disaster" required>
              <select className="form-select" name="loss_type" value={form.loss_type} onChange={handle}>
                {DISASTER_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
            <Field label="Date of Disaster / Loss" required>
              <input className="form-input" type="date" name="disaster_date" value={form.disaster_date} onChange={handle} required />
            </Field>
            <Field label="Affected Area (Hectares)" required>
              <input className="form-input" type="number" name="affected_area" value={form.affected_area} onChange={handle} required placeholder="e.g. 1.5" step="0.01" min={0} />
            </Field>
            <Field label="Estimated Loss Amount (₹)" required>
              <input className="form-input" type="number" name="estimated_loss" value={form.estimated_loss} onChange={handle} required placeholder="e.g. 50000" min={0} />
            </Field>
            {/* ── Photo Upload + GeoTag ── */}
            <Field label="📷 Field Photo (Live Camera)" span={2}>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {!photoPreview ? (
                  <label style={{
                    display:'flex', alignItems:'center', gap:10, padding:'12px 18px',
                    background:'var(--primary)', color:'#fff', borderRadius:8,
                    cursor:'pointer', fontWeight:600, fontSize:13, width:'fit-content'
                  }}>
                    📸 Open Camera & Take Photo
                    <input
                      type="file" accept="image/*" capture="environment"
                      onChange={handlePhoto}
                      style={{ display:'none' }}
                    />
                  </label>
                ) : (
                  <div style={{ position:'relative', display:'inline-block', width:'100%' }}>
                    <img src={photoPreview} alt="Field" style={{ width:'100%', maxHeight:220, objectFit:'cover', borderRadius:8, border:'2px solid var(--green)' }} />
                    <div style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:11, padding:'3px 8px', borderRadius:20 }}>✅ Photo captured</div>
                    <button type="button" onClick={() => { setPhotoPreview(null); setForm(f => ({ ...f, image_url:'' })); }}
                      style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:15, lineHeight:'26px', textAlign:'center' }}>✕</button>
                    <label style={{
                      position:'absolute', bottom:8, right:8,
                      display:'flex', alignItems:'center', gap:6,
                      background:'var(--primary)', color:'#fff', borderRadius:7,
                      cursor:'pointer', fontWeight:600, fontSize:12, padding:'5px 10px'
                    }}>
                      🔄 Retake
                      <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display:'none' }} />
                    </label>
                  </div>
                )}
              </div>
            </Field>
            <Field label="📍 GPS GeoTag" span={2}>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <button type="button" className="btn btn-ghost" onClick={captureGeoTag} disabled={geoLoading}
                  style={{ alignSelf:'flex-start', display:'flex', alignItems:'center', gap:6 }}>
                  {geoLoading ? '⏳ Getting location…' : '📍 Capture My Location'}
                </button>
                {geoTag && (
                  <div style={{ background:'var(--green-bg)', border:'1px solid #a7d7b8', borderRadius:7, padding:'8px 12px', fontSize:12 }}>
                    ✅ <strong>Location captured</strong> — Lat: {geoTag.lat}°, Lon: {geoTag.lon}° &nbsp;|&nbsp; Accuracy: ±{geoTag.accuracy}m
                    &nbsp;<a href={`https://maps.google.com/?q=${geoTag.lat},${geoTag.lon}`} target="_blank" rel="noreferrer"
                      style={{ color:'var(--primary)', fontWeight:600 }}>View on Map ↗</a>
                  </div>
                )}
                {geoError && <div style={{ color:'var(--red)', fontSize:12 }}>⚠ {geoError}</div>}
              </div>
            </Field>
            <Field label="Description of Damage" span={2}>
              <textarea className="form-textarea" name="notes" value={form.notes} onChange={handle} placeholder="Describe the nature and extent of crop damage in detail…" />
            </Field>
          </Section>
        </div>

        {/* ── 5. Bank Details ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <Section title="🏦 Bank Account Details (for Payout)">
            <Field label="Bank Name" required>
              <select className="form-select" name="bank_name" value={form.bank_name} onChange={handle}>
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Account Number" required>
              <input className="form-input" name="account_no" value={form.account_no} onChange={handle} required placeholder="Enter account number" />
            </Field>
            <Field label="IFSC Code" required>
              <input className="form-input" name="ifsc" value={form.ifsc} onChange={handle} required placeholder="e.g. SBIN0001234" maxLength={11} style={{ textTransform:'uppercase' }} />
            </Field>
          </Section>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ padding: '10px 28px', fontSize: 14 }}>
            {saving ? `⏳ ${t.loading}` : `🚀 ${t.submitAnalyze}`}
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            NDVI · Sentinel-2 · OpenWeather · Ensemble AI scoring · Low-risk auto pre-approval
          </span>
        </div>

      </form>
    </div>
  );
}
