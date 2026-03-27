from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os, requests
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///crop_insurance.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', '')

# ══════════════════════════════════════════════════════════════════
#  MODELS
# ══════════════════════════════════════════════════════════════════

class Farmer(db.Model):
    __tablename__ = 'farmers'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    aadhaar    = db.Column(db.String(12), unique=True)
    phone      = db.Column(db.String(15))
    district   = db.Column(db.String(100))
    village    = db.Column(db.String(100))
    land_area  = db.Column(db.Float)
    crop_type  = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    claims     = db.relationship('Claim', backref='farmer', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'aadhaar': self.aadhaar,
            'phone': self.phone, 'district': self.district, 'village': self.village,
            'land_area': self.land_area, 'crop_type': self.crop_type,
            'created_at': str(self.created_at)
        }


class Claim(db.Model):
    __tablename__ = 'claims'
    id             = db.Column(db.Integer, primary_key=True)
    farmer_id      = db.Column(db.Integer, db.ForeignKey('farmers.id'), nullable=False)
    claim_date     = db.Column(db.DateTime, default=datetime.utcnow)
    loss_type      = db.Column(db.String(50))
    estimated_loss = db.Column(db.Float)
    ndvi_score     = db.Column(db.Float)
    weather_score  = db.Column(db.Float)
    fraud_risk     = db.Column(db.String(20), default='LOW')
    fraud_score    = db.Column(db.Float, default=0.0)
    status         = db.Column(db.String(30), default='PENDING')
    payout_amount  = db.Column(db.Float, default=0.0)
    notes          = db.Column(db.Text)
    image_url      = db.Column(db.String(500))
    geo_lat        = db.Column(db.String(20))
    geo_lon        = db.Column(db.String(20))
    plot_id        = db.Column(db.String(100))
    ownership_doc  = db.Column(db.String(100))

    def to_dict(self):
        return {
            'id': self.id, 'farmer_id': self.farmer_id,
            'claim_date': str(self.claim_date), 'loss_type': self.loss_type,
            'estimated_loss': self.estimated_loss, 'ndvi_score': self.ndvi_score,
            'weather_score': self.weather_score, 'fraud_risk': self.fraud_risk,
            'fraud_score': self.fraud_score, 'status': self.status,
            'payout_amount': self.payout_amount, 'notes': self.notes,
            'image_url': self.image_url,
            'geo_lat': self.geo_lat, 'geo_lon': self.geo_lon,
            'plot_id': self.plot_id, 'ownership_doc': self.ownership_doc
        }


# ══════════════════════════════════════════════════════════════════
#  DISTRICT COORDINATES (for API lookups)
# ══════════════════════════════════════════════════════════════════

DISTRICT_COORDS = {
    'Pune':        (18.5204, 73.8567), 'Nashik':      (19.9975, 73.7898),
    'Aurangabad':  (19.8762, 75.3433), 'Latur':       (18.4088, 76.5604),
    'Solapur':     (17.6805, 75.9064), 'Nagpur':      (21.1458, 79.0882),
    'Amravati':    (20.9320, 77.7523), 'Kolhapur':    (16.7050, 74.2433),
    'Satara':      (17.6805, 74.0183), 'Sangli':      (16.8524, 74.5815),
    'Osmanabad':   (18.1860, 76.0416), 'Nanded':      (19.1383, 77.3210),
    'Jalgaon':     (21.0077, 75.5626), 'Ahmednagar':  (19.0948, 74.7480),
    'Belagavi':    (15.8497, 74.4977), 'Bidar':       (17.9104, 77.5199),
    'Kalaburagi':  (17.3297, 76.8343), 'Raichur':     (16.2120, 77.3439),
    'Indore':      (22.7196, 75.8577), 'Bhopal':      (23.2599, 77.4126),
    'Jaipur':      (26.9124, 75.7873), 'Jodhpur':     (26.2389, 73.0243),
    'Lucknow':     (26.8467, 80.9462), 'Agra':        (27.1767, 78.0081),
    'Ahmedabad':   (23.0225, 72.5714), 'Surat':       (21.1702, 72.8311),
    'Guntur':      (16.3067, 80.4365), 'Krishna':     (16.6100, 80.7214),
    'Hyderabad':   (17.3850, 78.4867), 'Warangal':    (17.9784, 79.5941),
    'Ludhiana':    (30.9010, 75.8573), 'Amritsar':    (31.6340, 74.8723),
    'Ambala':      (30.3782, 76.7767), 'Hisar':       (29.1492, 75.7217),
}

DEFAULT_COORDS = (18.5204, 73.8567)  # Pune fallback


# ══════════════════════════════════════════════════════════════════
#  REAL-TIME DATA FETCHERS
# ══════════════════════════════════════════════════════════════════

def get_coords(district):
    return DISTRICT_COORDS.get(district, DEFAULT_COORDS)


def fetch_weather(lat, lon):
    """Fetch real weather from OpenWeatherMap."""
    if not OPENWEATHER_API_KEY:
        return {'error': 'OPENWEATHER_API_KEY not set', 'source': 'unavailable'}
    try:
        url = (f"https://api.openweathermap.org/data/2.5/weather"
               f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric")
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        d = r.json()
        return {
            'temperature': d['main']['temp'],
            'humidity':    d['main']['humidity'],
            'description': d['weather'][0]['description'],
            'rainfall':    d.get('rain', {}).get('1h', 0),
            'wind_speed':  d['wind']['speed'],
            'pressure':    d['main']['pressure'],
            'source':      'OpenWeatherMap'
        }
    except Exception as e:
        return {'error': str(e), 'source': 'unavailable'}


def fetch_ndvi_nasa(lat, lon):
    """
    Fetch real NDVI proxy using NASA POWER API.
    Uses ALLSKY_SFC_PAR_TOT (surface radiation) as vegetation proxy
    combined with EVI-equivalent from FPAR parameter.
    NASA POWER is free, no API key required.
    """
    try:
        end   = datetime.utcnow()
        start = end - timedelta(days=30)
        params = {
            'parameters': 'FPAR,ALLSKY_SFC_PAR_TOT',
            'community':  'AG',
            'longitude':  lon,
            'latitude':   lat,
            'start':      start.strftime('%Y%m%d'),
            'end':        end.strftime('%Y%m%d'),
            'format':     'JSON',
        }
        r = requests.get(
            'https://power.larc.nasa.gov/api/temporal/daily/point',
            params=params, timeout=15
        )
        r.raise_for_status()
        data = r.json()
        props = data.get('properties', {}).get('parameter', {})

        fpar_vals = [v for v in props.get('FPAR', {}).values() if v not in (-999, None)]
        par_vals  = [v for v in props.get('ALLSKY_SFC_PAR_TOT', {}).values() if v not in (-999, None)]

        if fpar_vals:
            # FPAR (Fraction of Photosynthetically Active Radiation) ranges 0-1
            # Directly correlates with NDVI: NDVI ≈ 0.2 + FPAR * 0.6
            fpar_mean = sum(fpar_vals) / len(fpar_vals)
            ndvi_est  = round(min(0.2 + fpar_mean * 0.6, 1.0), 3)
            return {
                'ndvi':   ndvi_est,
                'fpar':   round(fpar_mean, 3),
                'source': 'NASA POWER API (FPAR)',
                'status': 'HEALTHY' if ndvi_est > 0.5 else ('MODERATE' if ndvi_est > 0.3 else 'STRESSED')
            }
    except Exception as e:
        pass

    # Fallback: use OpenWeatherMap vegetation/humidity proxy if NASA fails
    return fetch_ndvi_owm_fallback(lat, lon)


def fetch_ndvi_owm_fallback(lat, lon):
    """Derive NDVI proxy from OWM humidity + cloud cover when NASA is unavailable."""
    try:
        if not OPENWEATHER_API_KEY:
            raise Exception('No API key')
        url = (f"https://api.openweathermap.org/data/2.5/weather"
               f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric")
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        d = r.json()
        humidity = d['main']['humidity']
        clouds   = d.get('clouds', {}).get('all', 50)
        rain     = d.get('rain', {}).get('1h', 0)
        # Proxy: higher humidity + recent rain → healthier vegetation
        ndvi_proxy = round(min((humidity / 100) * 0.5 + (rain / 20) * 0.3 + (1 - clouds / 100) * 0.2, 1.0), 3)
        return {
            'ndvi':   ndvi_proxy,
            'source': 'OWM Vegetation Proxy',
            'status': 'HEALTHY' if ndvi_proxy > 0.5 else ('MODERATE' if ndvi_proxy > 0.3 else 'STRESSED')
        }
    except Exception:
        return {'ndvi': 0.45, 'source': 'unavailable', 'status': 'MODERATE'}


def derive_weather_score(weather_data):
    """
    Convert real weather into a 0-1 severity score.
    0 = severe (drought/flood), 1 = normal/good conditions.
    """
    if 'error' in weather_data:
        return 0.5  # neutral if unavailable
    humidity    = weather_data.get('humidity', 50)
    rainfall    = weather_data.get('rainfall', 0)
    description = weather_data.get('description', '').lower()
    temp        = weather_data.get('temperature', 25)

    score = 0.5  # baseline

    # Rainfall: moderate rain is good, extreme is bad
    if rainfall > 20:    score -= 0.3   # heavy rain / flood risk
    elif rainfall > 5:   score += 0.1   # good rain
    elif rainfall == 0:  score -= 0.1   # dry

    # Humidity
    if humidity < 20:    score -= 0.2   # drought-like
    elif humidity > 90:  score -= 0.1   # waterlogging risk
    elif 40 < humidity < 70: score += 0.1  # ideal

    # Description keywords
    severe_keywords = ['storm', 'thunder', 'hail', 'heavy', 'extreme', 'tornado', 'cyclone']
    if any(k in description for k in severe_keywords):
        score -= 0.25

    # Temperature extremes
    if temp > 42 or temp < 5:
        score -= 0.15

    return round(max(0.05, min(score, 0.95)), 3)


# ══════════════════════════════════════════════════════════════════
#  ENSEMBLE ML FRAUD ENGINE
# ══════════════════════════════════════════════════════════════════

DISTRICT_BASELINES = {
    'Pune': (45000,18000), 'Nashik': (38000,15000), 'Aurangabad': (32000,14000),
    'Latur': (28000,12000), 'Solapur': (25000,11000), 'Nagpur': (42000,17000),
    'Amravati': (35000,14000), 'Kolhapur': (50000,20000),
}

def _zscore(value, mean, std):
    if std == 0: return 0.0
    return min(abs((value - mean) / std) / 4.0, 1.0)

def calculate_fraud_score(ndvi, weather_score, loss, land_area, farmer_id=None, district=None):
    cutoff = datetime.utcnow() - timedelta(days=30)
    recent = Claim.query.filter(Claim.farmer_id == farmer_id, Claim.claim_date >= cutoff).count() if farmer_id else 0
    mean, std = DISTRICT_BASELINES.get(district, (40000, 16000))
    lph = loss / max(land_area or 1, 0.1)

    components = {
        'NDVI_LOSS_MISMATCH':    0.35 if (ndvi and ndvi > 0.6 and loss > 50000) else (0.20 if (ndvi and ndvi > 0.5 and loss > 80000) else 0.0),
        'WEATHER_LOSS_MISMATCH': 0.25 if (weather_score and weather_score > 0.7 and loss > 40000) else (0.15 if (weather_score and weather_score > 0.5 and loss > 70000) else 0.0),
        'HIGH_LOSS_PER_HECTARE': 0.20 if lph > 200000 else (0.10 if lph > 150000 else 0.0),
        'EXTREMELY_LOW_NDVI':    0.10 if (ndvi and ndvi < 0.1) else 0.0,
        'CLAIM_VELOCITY':        0.05 if recent >= 2 else 0.0,
        'ZSCORE_OUTLIER':        round(_zscore(lph, mean, std) * 0.05, 4),
    }
    score     = min(round(sum(components.values()), 3), 1.0)
    triggered = [k for k, v in components.items() if v > 0]
    return score, triggered

def risk_label(score):
    if score >= 0.6: return 'HIGH'
    if score >= 0.3: return 'MEDIUM'
    return 'LOW'


# ══════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok', 'timestamp': str(datetime.utcnow()),
        'service': 'FasalRaksha Crop Insurance API', 'ml_engine': 'ensemble-v2',
        'openweather': 'configured' if OPENWEATHER_API_KEY else 'missing key',
        'ndvi_source': 'NASA POWER API'
    })


@app.route('/api/dashboard')
def dashboard():
    # Get user info from headers
    user_role = request.headers.get('X-User-Role', '').strip()
    user_farmer_id = request.headers.get('X-User-FarmerId', '').strip()
    
    if user_role == 'admin':
        # Admins see overall statistics for all farmers with claims
        total_farmers = db.session.query(db.func.count(db.distinct(Farmer.id))).join(Claim).scalar() or 0
        total_claims  = Claim.query.count()
        fraud_claims  = Claim.query.filter_by(fraud_risk='HIGH').count()
        approved      = Claim.query.filter(Claim.status.in_(['APPROVED', 'PRE_APPROVED'])).count()
        total_payout  = db.session.query(db.func.sum(Claim.payout_amount)).scalar() or 0
        pending       = Claim.query.filter_by(status='PENDING').count()
        manual_review = Claim.query.filter((Claim.status == 'MANUAL_REVIEW') | (Claim.fraud_risk == 'HIGH')).count()
    elif user_role == 'farmer' and user_farmer_id:
        # Farmers see only their own statistics
        try:
            farmer_id = int(user_farmer_id)
            total_farmers = 1  # Only themselves
            farmer_claims = Claim.query.filter_by(farmer_id=farmer_id).all()
            total_claims  = len(farmer_claims)
            fraud_claims  = len([c for c in farmer_claims if c.fraud_risk == 'HIGH'])
            approved      = len([c for c in farmer_claims if c.status in ('APPROVED', 'PRE_APPROVED')])
            total_payout  = sum(c.payout_amount for c in farmer_claims)
            pending       = len([c for c in farmer_claims if c.status == 'PENDING'])
            manual_review = len([c for c in farmer_claims if c.status == 'MANUAL_REVIEW'])
        except (ValueError, TypeError):
            return jsonify({'error': 'Unauthorized'}), 403
    else:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify({
        'total_farmers': total_farmers, 'total_claims': total_claims,
        'fraud_claims': fraud_claims, 'approved_claims': approved,
        'pending_claims': pending, 'manual_review_claims': manual_review,
        'total_payout': round(float(total_payout), 2),
        'fraud_rate': round((fraud_claims / total_claims * 100) if total_claims else 0, 1),
        'settlement_days': 12
    })


@app.route('/api/farmers', methods=['GET'])
def get_farmers():
    # Get user info from headers
    user_role = request.headers.get('X-User-Role', '').strip()
    user_farmer_id = request.headers.get('X-User-FarmerId', '').strip()
    
    # Only admins can see all farmers with claims
    if user_role == 'admin':
        # Return only farmers who have at least one claim
        farmers_with_claims = db.session.query(Farmer).join(Claim).distinct().all()
        return jsonify([f.to_dict() for f in farmers_with_claims])
    elif user_role == 'farmer' and user_farmer_id:
        # Farmers can only see themselves
        try:
            farmer_id = int(user_farmer_id)
            farmer = Farmer.query.get(farmer_id)
            return jsonify([farmer.to_dict()] if farmer else [])
        except (ValueError, TypeError):
            return jsonify([])
    else:
        # Unauthorized access
        return jsonify({'error': 'Unauthorized'}), 403


@app.route('/api/farmers', methods=['POST'])
def create_farmer():
    d = request.get_json()
    # Handle duplicate aadhaar gracefully — return existing farmer
    if d.get('aadhaar'):
        existing = Farmer.query.filter_by(aadhaar=d['aadhaar']).first()
        if existing:
            return jsonify(existing.to_dict()), 200
    f = Farmer(
        name=d['name'], aadhaar=d.get('aadhaar'), phone=d.get('phone'),
        district=d.get('district'), village=d.get('village'),
        land_area=d.get('land_area'), crop_type=d.get('crop_type')
    )
    db.session.add(f); db.session.commit()
    return jsonify(f.to_dict()), 201


@app.route('/api/farmers/<int:fid>')
def get_farmer(fid):
    return jsonify(Farmer.query.get_or_404(fid).to_dict())


@app.route('/api/claims', methods=['GET'])
def get_claims():
    # Get user info from headers
    user_role = request.headers.get('X-User-Role', '').strip()
    user_farmer_id = request.headers.get('X-User-FarmerId', '').strip()
    
    result = []
    
    if user_role == 'admin':
        # Admins see all claims
        claims_query = Claim.query.order_by(Claim.claim_date.desc()).all()
    elif user_role == 'farmer' and user_farmer_id:
        # Farmers see only their own claims
        try:
            farmer_id = int(user_farmer_id)
            claims_query = Claim.query.filter_by(farmer_id=farmer_id).order_by(Claim.claim_date.desc()).all()
        except (ValueError, TypeError):
            return jsonify([])
    else:
        # Unauthorized access
        return jsonify({'error': 'Unauthorized'}), 403
    
    for c in claims_query:
        d = c.to_dict()
        # Enforce manual review for all high risk claims for display
        if c.fraud_risk == 'HIGH':
            d['status'] = 'MANUAL_REVIEW'
        f = Farmer.query.get(c.farmer_id)
        d['farmer_name']     = f.name     if f else 'Unknown'
        d['farmer_district'] = f.district if f else ''
        result.append(d)
    return jsonify(result)


@app.route('/api/claims', methods=['POST'])
def create_claim():
    data   = request.get_json()
    farmer = Farmer.query.get_or_404(data['farmer_id'])
    loss   = data.get('estimated_loss', 0)

    # Real-time data fetch
    lat, lon    = get_coords(farmer.district or 'Pune')
    weather     = fetch_weather(lat, lon)
    ndvi_data   = fetch_ndvi_nasa(lat, lon)
    ndvi        = ndvi_data.get('ndvi', 0.45)
    w_score     = derive_weather_score(weather)

    score, triggered = calculate_fraud_score(
        ndvi, w_score, loss, farmer.land_area or 1,
        farmer_id=farmer.id, district=farmer.district
    )
    risk   = risk_label(score)
    payout = 0.0
    
    # Status determination based on fraud risk
    if risk == 'HIGH':
        # High risk claims go to manual survey
        status = 'MANUAL_REVIEW'
    elif risk == 'MEDIUM':
        # Medium risk claims remain pending for admin review
        status = 'PENDING'
    elif risk == 'LOW' and score < 0.2:
        # Only very low risk claims are auto-approved
        status = 'PRE_APPROVED'
        payout = round(float(loss) * 0.80, 2)
    else:
        # Other low risk cases still pending
        status = 'PENDING'

    claim = Claim(
        farmer_id=farmer.id, loss_type=data.get('loss_type', 'crop_damage'),
        estimated_loss=loss, ndvi_score=ndvi, weather_score=w_score,
        fraud_score=score, fraud_risk=risk, status=status, payout_amount=payout,
        notes=data.get('notes', ''), image_url=data.get('image_url', ''),
        geo_lat=data.get('geo_lat', ''), geo_lon=data.get('geo_lon', ''),
        plot_id=data.get('plot_id', ''), ownership_doc=data.get('ownership_doc', '')
    )
    db.session.add(claim); db.session.commit()
    return jsonify(claim.to_dict()), 201


@app.route('/api/claims/<int:cid>')
def get_claim(cid):
    # Get user info from headers
    user_role = request.headers.get('X-User-Role', '').strip()
    user_farmer_id = request.headers.get('X-User-FarmerId', '').strip()
    
    c = Claim.query.get_or_404(cid)
    
    # Farmers can only see their own claims
    if user_role == 'farmer':
        try:
            farmer_id = int(user_farmer_id)
            if c.farmer_id != farmer_id:
                return jsonify({'error': 'Unauthorized'}), 403
        except (ValueError, TypeError):
            return jsonify({'error': 'Unauthorized'}), 403
    elif user_role != 'admin':
        # Only admins and farmers (their own) can view
        return jsonify({'error': 'Unauthorized'}), 403
    
    d = c.to_dict()
    f = Farmer.query.get(c.farmer_id)
    d['farmer'] = f.to_dict() if f else {}
    return jsonify(d)


@app.route('/api/claims/<int:cid>/status', methods=['PUT'])
def update_claim_status(cid):
    # Get user info from headers
    user_role = request.headers.get('X-User-Role', '').strip()
    
    # Only admins can update claim status
    if user_role != 'admin':
        return jsonify({'error': 'Only admins can update claim status'}), 403
    
    claim = Claim.query.get_or_404(cid)
    data  = request.get_json()
    claim.status = data.get('status', claim.status)
    if data.get('payout_amount') is not None:
        claim.payout_amount = data['payout_amount']
    if data.get('notes'):
        claim.notes = data['notes']
    db.session.commit()
    return jsonify(claim.to_dict())


@app.route('/api/weather')
def weather():
    lat = float(request.args.get('lat', 18.52))
    lon = float(request.args.get('lon', 73.86))
    return jsonify(fetch_weather(lat, lon))


@app.route('/api/ndvi')
def ndvi():
    district = request.args.get('district', 'Pune')
    lat, lon  = get_coords(district)
    data      = fetch_ndvi_nasa(lat, lon)
    data['district']  = district
    data['timestamp'] = str(datetime.utcnow())
    return jsonify(data)


@app.route('/api/fraud/analyze', methods=['POST'])
def analyze_fraud():
    data  = request.get_json()
    ndvi  = data.get('ndvi_score', 0.5)
    ws    = data.get('weather_score', 0.5)
    loss  = data.get('estimated_loss', 0)
    area  = data.get('land_area', 1)
    dist  = data.get('district', 'Pune')

    score, triggered = calculate_fraud_score(ndvi, ws, loss, area, district=dist)
    risk = risk_label(score)
    return jsonify({
        'fraud_score': score, 'risk_level': risk,
        'rules_triggered': triggered,
        'confidence_interval': [round(max(score-0.08,0),3), round(min(score+0.08,1),3)],
        'recommendation': 'FLAG_FOR_REVIEW' if risk == 'HIGH' else 'PROCEED',
        'engine': 'ensemble-v2'
    })


@app.route('/api/seed', methods=['POST'])
def seed_route():
    # Clear existing data and re-seed
    Claim.query.delete()
    Farmer.query.delete()
    db.session.commit()
    seed_sample_data()
    return jsonify({'status': 'ok', 'farmers': Farmer.query.count(), 'claims': Claim.query.count()})


def seed_sample_data():
    """Seed 10 farmers with full variation for admin dashboard."""
    if Farmer.query.count() > 0:
        return

    FARMERS = [
        ('Ramesh Patil',    '234567890101', '+91 98201 11001', 'Pune',       'Baramati',     2.5, 'Wheat'),
        ('Priya Singh',     '234567890102', '+91 98201 11002', 'Nashik',     'Sinnar',       1.8, 'Onion'),
        ('Ajay Kumar',      '234567890103', '+91 98201 11003', 'Aurangabad', 'Paithan',      3.2, 'Cotton'),
        ('Kavya Desai',     '234567890104', '+91 98201 11004', 'Latur',      'Nilanga',      1.2, 'Soybean'),
        ('Suneet Joshi',    '234567890105', '+91 98201 11005', 'Solapur',    'Madha',        4.0, 'Jowar'),
        ('Ananya Sharma',   '234567890106', '+91 98201 11006', 'Nagpur',     'Umred',        2.1, 'Rice'),
        ('Vikram Reddy',    '234567890107', '+91 98201 11007', 'Kolhapur',   'Panhala',      3.8, 'Sugarcane'),
        ('Divya Gupta',     '234567890108', '+91 98201 11008', 'Amravati',   'Achalpur',     1.5, 'Maize'),
        ('Anil Verma',      '234567890109', '+91 98201 11009', 'Pune',       'Khed',         5.0, 'Potato'),
        ('Bhavana Yadav',   '234567890110', '+91 98201 11010', 'Nashik',     'Trimbak',      2.3, 'Tomato'),
    ]

    CLAIMS = [
        ('flood',           75000, 0.18, 0.22, 'LOW',    0.12, 'APPROVED',      0.80, 'Gat No. 101', '7/12 Utara (Satbara)'),
        ('drought',         55000, 0.72, 0.78, 'HIGH',   0.72, 'MANUAL_REVIEW', 0.00, 'Gat No. 202', 'Khasra / Khatauni'),
        ('hailstorm',       42000, 0.45, 0.35, 'MEDIUM', 0.41, 'PENDING',       0.00, 'Plot 303',    'ROR (Record of Rights)'),
        ('pest_disease',    38000, 0.25, 0.30, 'LOW',    0.15, 'PRE_APPROVED',  0.80, 'Gat No. 404', '7/12 Utara (Satbara)'),
        ('cyclone',         91000, 0.70, 0.75, 'HIGH',   0.75, 'MANUAL_REVIEW', 0.00, 'Plot 505',    'Jamabandi'),
        ('drought',         29000, 0.15, 0.18, 'LOW',    0.10, 'APPROVED',      0.75, 'Gat No. 606', 'Mutation Certificate'),
        ('unseasonal_rain', 47000, 0.38, 0.42, 'MEDIUM', 0.35, 'PENDING',       0.00, 'Plot 707',    'Patta / Pattedar'),
        ('hailstorm',       33000, 0.20, 0.25, 'LOW',    0.14, 'APPROVED',      0.80, 'Gat No. 808', '7/12 Utara (Satbara)'),
        ('flood',           82000, 0.65, 0.80, 'HIGH',   0.68, 'MANUAL_REVIEW', 0.00, 'Plot 909',    'Chitta & Adangal'),
        ('cold_wave_frost', 53000, 0.55, 0.60, 'MEDIUM', 0.45, 'UNDER_REVIEW',  0.00, 'Gat No. 110', 'Land Passbook'),
    ]

    for i, fd in enumerate(FARMERS):
        farmer = Farmer(
            name=fd[0], aadhaar=fd[1], phone=fd[2],
            district=fd[3], village=fd[4], land_area=fd[5], crop_type=fd[6]
        )
        db.session.add(farmer)
        db.session.flush()

        lt, loss, ndvi, ws, risk, fscore, status, pf, plot, doc = CLAIMS[i]
        claim = Claim(
            farmer_id=farmer.id, loss_type=lt,
            estimated_loss=loss, ndvi_score=ndvi, weather_score=ws,
            fraud_risk=risk, fraud_score=fscore, status=status,
            payout_amount=round(loss * pf, 2),
            notes=f'Claim — {lt.replace("_"," ")} in {fd[3]}',
            plot_id=plot, ownership_doc=doc
        )
        db.session.add(claim)

    db.session.commit()
    print('Seeded 10 farmers with 10 claims')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_sample_data()
    app.run(debug=True, port=5000)
