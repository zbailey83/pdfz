# MarketingMix AI - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)
- Redis 6+ (or use Docker)
- AWS Account (for S3) - optional for local dev

## Quick Start

### 1. Clone and Setup

```bash
# Install backend dependencies
cd backend
npm install
cp .env.sample .env
# Edit .env with your configuration

# Install frontend dependencies
cd ../frontend
npm install
cp .env.sample .env
# Edit .env with your configuration

# Install ML service dependencies
cd ../ml
pip install -r requirements.txt
cp .env.sample .env
```

### 2. Start Infrastructure

```bash
# From project root
docker-compose up -d postgres redis
```

Wait for services to be healthy (check with `docker-compose ps`)

### 3. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 4. Start Services

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

**Terminal 3 - ML Service:**

```bash
cd ml
uvicorn main:app --reload --port 8001
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- ML Service: http://localhost:8001
- API Health: http://localhost:3000/health

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://marketingmix:dev_password_change_in_prod@localhost:5432/marketingmix_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=marketingmix-dev
ML_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api/v1
```

### ML Service (.env)

```env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://marketingmix:dev_password_change_in_prod@localhost:5432/marketingmix_db
MODEL_CACHE_TTL=3600
```

## Testing the Setup

1. **Create an account:**

   - Go to http://localhost:5173/signup
   - Create a test account

2. **Upload sample data:**

   - Use the sample CSV at `samples/sample_upload.csv`
   - Go to Upload page and upload the file

3. **View dashboard:**
   - Check the dashboard for KPIs and charts

## Development Workflow

1. Make changes to code
2. Backend/Frontend: Hot reload should pick up changes
3. ML Service: Restart if needed
4. Run tests: `npm test` (backend) or `pytest` (ML)

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in backend/.env
- Verify migrations ran: `npm run migrate` in backend/

### Port Conflicts

- Change ports in docker-compose.yml or .env files
- Update CORS_ORIGIN if frontend port changes

### AWS S3 Issues (Local Dev)

- For local development, you can mock S3 or use a local S3 alternative
- Or configure AWS credentials in .env

## Production Deployment

See deployment documentation in `infra/` directory (to be created).
