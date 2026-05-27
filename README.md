# Ethereum Fraud Detection — Full Stack App

**Stack:** React + Vite + Tailwind (frontend) · FastAPI + PyTorch + XGBoost (backend) · SQLite (DB)

---

## 📁 Project Structure

```
ethereum-fraud-detection/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry
│   │   ├── api/                     # Route handlers
│   │   │   ├── fraud.py             # /api/fraud/analyze
│   │   │   ├── history.py           # /api/history/
│   │   │   ├── compare.py           # /api/compare/
│   │   │   └── health.py            # /api/health + /api/warmup
│   │   ├── core/
│   │   │   ├── config.py            # Settings from .env
│   │   │   └── model_loader.py      # Load ML models once at startup
│   │   ├── db/
│   │   │   └── database.py          # SQLAlchemy + SQLite
│   │   ├── schemas/
│   │   │   └── schemas.py           # Pydantic request/response models
│   │   └── services/
│   │       └── inference.py         # Full ML pipeline (your notebook logic)
│   ├── models_v3/                   # ← PUT YOUR MODEL FILES HERE
│   │   ├── scaler_v3.pkl
│   │   ├── xgboost_v3.json
│   │   ├── graphsage_v3.pt
│   │   ├── ensemble_v3.json
│   │   └── feature_cols.json
│   ├── .env                         # Add your Etherscan API key here
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                   # Home, Result, History, Compare
│   │   ├── components/
│   │   │   ├── ui/                  # Navbar, RiskBadge, StatCard, LoadingSteps
│   │   │   ├── graph/               # TransactionGraph (React Flow)
│   │   │   └── charts/              # ScoreCharts (Recharts)
│   │   ├── store/useStore.js        # Zustand global state
│   │   └── utils/api.js             # Axios API client
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local)

### Step 1 — Copy your model files
Download your 5 model files from Google Drive and put them in `backend/models_v3/`:
```
scaler_v3.pkl
xgboost_v3.json
graphsage_v3.pt
ensemble_v3.json
feature_cols.json
```

### Step 2 — Set your Etherscan API key
Edit `backend/.env`:
```
ETHERSCAN_API_KEY=your_real_api_key_here
```

### Step 3 — Run the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs available at: http://localhost:8000/docs

### Step 4 — Run the frontend
```bash
cd frontend
npm install
npm run dev
```
App available at: http://localhost:5173

---

## 🐳 Docker (both together)

```bash
docker-compose up --build
```
App at: http://localhost:5173

---

## 🌐 Deploy to Cloud

### Backend → Render
1. Push to GitHub
2. New Web Service → select `backend/` folder
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
5. Add environment variables from `.env`

### Frontend → Vercel
1. Import GitHub repo
2. Set root to `frontend/`
3. Add env var: `VITE_API_URL=https://your-render-backend.onrender.com`

---

## 📡 API Endpoints

| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | /api/fraud/analyze          | Analyze a wallet               |
| DELETE | /api/fraud/cache/{wallet}   | Clear cache, force re-analysis |
| GET    | /api/history/               | Get analysis history           |
| DELETE | /api/history/{id}           | Delete history record          |
| POST   | /api/compare/               | Compare two wallets            |
| GET    | /api/health                 | Health check + model status    |
| GET    | /api/warmup                 | Keep-alive ping                |
