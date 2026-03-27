# 🌾 InnovateX — Crop Insurance Fraud Detection System

> **Team:** Debuggers &nbsp;|&nbsp; **Members:** Nilakshi Gaikwad, Vaishnavi Kandekar, Gayatri Dere &nbsp;|&nbsp; SY Comp

An Agri-Fintech platform that replaces manual surveys with digital objectivity, reducing insurance claim settlement from **90–120 days → under 15 days** while enabling a **15–20% increase** in effective payouts for genuinely affected farmers.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│   React.js  +  Firebase Auth/Storage  +  OpenWeather API    │
│              (http://localhost:3000)                          │
└──────────────────────┬──────────────────────────────────────┘
                        │ REST API
┌──────────────────────▼──────────────────────────────────────┐
│                        BACKEND                               │
│          Python / Flask  (http://localhost:5000)             │
│   AI-Lite Fraud Engine · NDVI Simulator · Weather Proxy      │
└──────────────────────┬──────────────────────────────────────┘
                        │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────────────────┐
│                      DATABASE                                │
│               PostgreSQL  (port 5432)                        │
│          Tables: farmers, claims · View: claim_summary       │
└─────────────────────────────────────────────────────────────┘
                        +
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE (Cloud)                            │
│     Firestore (metadata) · Storage (field photos)            │
│     Auth (officer login) · Realtime DB (notifications)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone and enter
cd crop-insurance-app

# 2. Start all services
docker-compose up --build

# 3. Open browser
#    Frontend: http://localhost:3000
#    Backend:  http://localhost:5000/api/health
```

### Option B — Manual Setup

#### Backend (Flask + PostgreSQL)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your values

# Create PostgreSQL database
createdb crop_insurance
# Or: psql -U postgres -c "CREATE DATABASE crop_insurance;"

# Run schema
psql -U postgres -d crop_insurance -f ../docs/schema.sql

# Start server
python app.py
# → Running on http://localhost:5000
```

#### Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Firebase config and API URL

# Start dev server
npm start
# → Running on http://localhost:3000
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENWEATHER_API_KEY` | From [openweathermap.org](https://openweathermap.org/api) |
| `FLASK_ENV` | `development` or `production` |
| `SECRET_KEY` | Random secret for Flask sessions |

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Flask backend URL |
| `REACT_APP_FIREBASE_*` | From Firebase Console → Project Settings |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/farmers` | List all farmers |
| POST | `/api/farmers` | Register new farmer |
| GET | `/api/farmers/:id` | Farmer detail |
| GET | `/api/claims` | List all claims |
| POST | `/api/claims` | Submit new claim (auto fraud-scored) |
| GET | `/api/claims/:id` | Claim detail with farmer info |
| PUT | `/api/claims/:id/status` | Update claim status/payout |
| GET | `/api/weather?lat=&lon=` | OpenWeather data |
| GET | `/api/ndvi?district=` | Satellite NDVI data |
| POST | `/api/fraud/analyze` | Run fraud analysis |
| POST | `/api/seed` | Seed demo data |

---

## 🧠 Fraud Detection Rules (AI-Lite)

| Rule | Trigger | Weight |
|------|---------|--------|
| NDVI_LOSS_MISMATCH | NDVI > 0.6 (healthy) but loss > ₹50,000 | 35% |
| WEATHER_LOSS_MISMATCH | Weather good but loss > ₹40,000 | 25% |
| HIGH_LOSS_PER_HECTARE | Loss/ha > ₹2,00,000 | 20% |
| EXTREMELY_LOW_NDVI | NDVI < 0.1 (possible intentional damage) | 10% |

**Score interpretation:**
- `< 0.30` → LOW risk → Eligible for instant pre-approval
- `0.30–0.59` → MEDIUM risk → Standard officer review
- `≥ 0.60` → HIGH risk → Flagged for manual field inspection

---

## 🌐 External Integrations

| Service | Usage |
|---------|-------|
| **OpenWeather API** | Real-time weather for claim validation |
| **Sentinel-2 / MODIS (simulated)** | NDVI greenness index per district |
| **MahaBhumi API** | Land record cross-verification (Maharashtra) |
| **National Crop Insurance Portal** | PMFBY scheme data |
| **Firebase Storage** | Field photo uploads from farmers |
| **Firebase Auth** | Officer authentication |
| **Render** | Cloud deployment platform |

---

## ☁ Deployment (Render)

```bash
# Push to GitHub, then connect to Render
# Or use render.yaml blueprint:
render deploy --yaml render.yaml
```

Set environment variables in Render dashboard:
- `OPENWEATHER_API_KEY`
- `REACT_APP_API_URL` → your Render API service URL

---

## 📁 Project Structure

```
crop-insurance-app/
├── backend/
│   ├── app.py              # Flask app, models, routes, fraud engine
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js           # Router + Sidebar layout
│   │   ├── App.css          # Design system (dark theme)
│   │   ├── context/
│   │   │   └── AppContext.js # Global state
│   │   ├── services/
│   │   │   ├── api.js       # REST API calls
│   │   │   └── firebase.js  # Firebase init
│   │   └── pages/
│   │       ├── Dashboard.js
│   │       ├── Farmers.js
│   │       ├── Claims.js
│   │       ├── ClaimDetail.js
│   │       ├── NewClaim.js
│   │       ├── FraudAnalysis.js
│   │       └── WeatherMap.js
│   ├── public/index.html
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docs/
│   └── schema.sql          # PostgreSQL schema
├── firestore.rules         # Firebase Firestore rules
├── storage.rules           # Firebase Storage rules
├── docker-compose.yml      # Full stack Docker setup
├── render.yaml             # Render.com deployment
└── README.md
```

---

## 👩‍💻 Team

**Debuggers — SY Comp, InnovateX Hackathon**

| Member | Role |
|--------|------|
| Nilakshi Gaikwad | Full Stack / Backend |
| Vaishnavi Kandekar | Frontend / UI |
| Gayatri Dere | Research / Data |

---

## 📚 References

- [PMFBY — Pradhan Mantri Fasal Bima Yojana](https://pmfby.gov.in)
- [Ministry of Agriculture & Farmers Welfare](https://agricoop.nic.in)
- [ICAR — Indian Council of Agricultural Research](https://icar.org.in)
- [NASA POWER Weather Data](https://power.larc.nasa.gov)
- [AI Rule-Based Systems — GeeksForGeeks](https://www.geeksforgeeks.org/rule-based-system-in-artificial-intelligence/)
