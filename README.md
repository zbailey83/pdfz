# MarketingMix AI

Enterprise-grade Marketing Mix Modeling (MMM) and budget optimization for SMBs at ~1/10th the cost.

## Architecture

- **Frontend**: React + TypeScript, TailwindCSS, Recharts
- **Backend**: Node.js + Express, PostgreSQL, Redis
- **ML Service**: Python microservice (scikit-learn, statsmodels, Prophet)
- **Infrastructure**: AWS/GCP, Docker, GitHub Actions CI/CD

## Project Structure

```
├── frontend/          # React + TypeScript frontend
├── backend/           # Node.js + Express API
├── ml/                # Python ML microservice
├── infra/             # Docker, Terraform, CI/CD
└── shared/            # Shared types/utilities
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+

### Local Development

1. **Start infrastructure**:

   ```bash
   docker-compose up -d postgres redis
   ```

2. **Backend setup**:

   ```bash
   cd backend
   npm install
   cp .env.sample .env
   npm run dev
   ```

3. **Frontend setup**:

   ```bash
   cd frontend
   npm install
   cp .env.sample .env
   npm run dev
   ```

4. **ML service setup**:
   ```bash
   cd ml
   pip install -r requirements.txt
   python -m uvicorn main:app --reload --port 8001
   ```

## Development Roadmap

- **Phase 1** (Weeks 1-4): Foundation - Auth, CSV upload, Dashboard
- **Phase 2** (Weeks 5-8): AI Attribution
- **Phase 3** (Weeks 9-12): Predictions & Optimization
- **Phase 4** (Weeks 13-16): Polish & Launch

## License

Proprietary
