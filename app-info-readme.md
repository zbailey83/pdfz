

# MarketingMix AI

Enterprise-grade Marketing Mix Modeling (MMM) and budget optimization for SMBs at ~1/10th the cost.

## 🎯 Overview

MarketingMix AI delivers enterprise-grade Marketing Mix Modeling (MMM) and budget optimization at ~1/10th the cost using a lightweight, modular stack and progressive feature tiers. Perfect for SMBs spending $5K–50K/month on marketing who need reliable, data-driven attribution and budget optimization but cannot afford enterprise MMM tools ($10K+/mo).

## ✨ Features

### 🔐 Authentication & Account Management

- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Account Management**: User signup, login, password management
- **Tier Management**: Free and Premium tier support with automatic feature gating
- **Session Management**: Persistent sessions with automatic token refresh

### 📊 Data Management

- **CSV Upload**: Drag-and-drop CSV file upload with validation
- **Data Validation**: Comprehensive validation with detailed error messages
  - Date range validation (respects tier limits)
  - Minimum 60 days requirement for attribution
  - Channel name normalization
  - Data type and format validation
- **Channel Normalization**: Automatic channel name standardization
  - Supports common variations (e.g., "FB Ads" → "Facebook Ads")
  - Custom channel mapping per account
- **Data Storage**: Secure storage in PostgreSQL with S3 backup
- **Historical Data**: Unlimited history for Premium, 90 days for Free tier

### 📈 Dashboard & Analytics

- **Real-time KPIs**:
  - Total spend and revenue
  - Blended ROAS
  - Total conversions
  - Per-channel performance metrics
- **Interactive Charts**:
  - Spend vs Revenue time series
  - Per-channel ROAS visualization
  - Channel performance comparison
- **Channel Breakdown**: Detailed table with spend, revenue, and ROAS per channel
- **Performance Caching**: Redis-backed caching for sub-2s load times

### 🤖 AI Attribution Analysis (Premium)

- **Multi-Touch Attribution**: Ridge regression model with lagged features
  - 7, 14, and 30-day lag effects
  - Seasonality indicators (day of week, month)
  - Marginal ROAS calculation per channel
- **Statistical Rigor**:
  - Bootstrap confidence intervals (95% CI)
  - R² score for model fit assessment
  - MAPE (Mean Absolute Percentage Error)
  - Model diagnostics and explainability
- **Visualizations**:
  - Marginal ROAS bar chart with confidence intervals
  - Revenue contribution pie chart
  - Detailed attribution table
- **Background Processing**: Async job processing with real-time status updates
- **Results Caching**: 7-day cache for attribution results

### 📉 Revenue Forecasting (Premium)

- **Prophet-Based Forecasting**: Advanced time series forecasting
  - Multiple horizons: 7, 30, 60, 90 days
  - Marketing spend regressors per channel
  - Trend and seasonality decomposition
- **Confidence Intervals**: 80% prediction intervals
- **Interactive Charts**:
  - Area chart with confidence bands
  - Daily forecast details table
  - Summary metrics (total, average revenue)
- **Scenario Planning**: Support for future spend scenarios

### 💰 Budget Optimizer (Premium)

- **Constrained Optimization**: SLSQP algorithm for optimal allocation
  - Min/max spend constraints per channel
  - Total budget constraint
  - Saturation curves for diminishing returns
- **Recommendations**:
  - Optimal budget allocation per channel
  - Expected revenue and ROI
  - Comparison with current allocation
- **Visualizations**:
  - Recommended vs current allocation chart
  - ROI and revenue predictions
- **Scenario Comparison**: Compare multiple budget scenarios

### ⚡ Performance & Scalability

- **Response Caching**: Redis-backed caching middleware
- **Parallel Queries**: Optimized database queries with Promise.all
- **Performance Monitoring**: Automatic performance tracking and warnings
- **Query Optimization**: Efficient data fetching patterns
- **Horizontal Scaling**: Docker-based architecture ready for orchestration

### 🔒 Security & Compliance

- **Data Security**:
  - AES-256 encryption at rest
  - TLS 1.2+ in transit
  - Secure password hashing (bcrypt)
- **API Security**:
  - Rate limiting
  - Input validation and sanitization
  - SQL injection prevention (parameterized queries)
  - XSS protection
- **Access Control**:
  - JWT token authentication
  - Premium feature gating
  - Account-based data isolation

## 👥 User Flows

### 🆕 New User Onboarding

1. **Sign Up**

   - User visits landing page
   - Clicks "Sign Up" or "Get Started"
   - Enters email and password (min 8 characters)
   - Account created with Free tier by default
   - Automatic login and redirect to dashboard

2. **First Data Upload**

   - User navigates to "Upload Data" page
   - Downloads CSV template (optional)
   - Uploads CSV file with marketing metrics
   - System validates data:
     - Checks date range (Free: last 2 years)
     - Validates minimum 60 days
     - Normalizes channel names
     - Reports any errors with row numbers
   - Data processed and stored
   - Success message with rows processed count

3. **View Dashboard**
   - User redirected to dashboard
   - KPIs displayed (spend, revenue, ROAS, conversions)
   - Charts render with uploaded data
   - Channel performance table shows breakdown
   - Data cached for fast subsequent loads

### 📊 Free Tier User Flow

1. **Daily Usage**

   - Login → Dashboard (cached, < 2s load)
   - View KPIs and charts for last 90 days
   - Upload new data (max 500 rows/month)
   - Export PDF reports (if implemented)

2. **Data Management**

   - Upload CSV files (validated)
   - View historical data (90-day limit)
   - Channel normalization suggestions
   - Data export (PDF format)

3. **Upgrade Prompt**
   - See "Premium Feature" banners on:
     - Attribution page
     - Forecast page
     - Optimizer page
   - Click "Upgrade" to view pricing
   - Stripe checkout (when implemented)

### 💎 Premium Tier User Flow

1. **Attribution Analysis**

   - Navigate to "Attribution" page
   - Click "Run Attribution Analysis"
   - Job queued in Redis
   - Real-time status updates (pending → processing → completed)
   - Results displayed:
     - Model diagnostics (R², MAPE)
     - Marginal ROAS chart with confidence intervals
     - Revenue contribution pie chart
     - Detailed channel table
   - Results cached for 7 days

2. **Revenue Forecasting**

   - Navigate to "Forecast" page
   - Select forecast horizon (7/30/60/90 days)
   - Forecast generated automatically
   - View:
     - Forecast chart with confidence bands
     - Daily forecast table
     - Summary metrics
   - Adjust horizon to see different predictions

3. **Budget Optimization**

   - Navigate to "Optimizer" page
   - Enter total budget
   - Set optional constraints:
     - Min spend per channel
     - Max spend per channel
   - Click "Optimize Budget"
   - View recommendations:
     - Optimal allocation per channel
     - Expected revenue and ROI
     - Comparison chart
   - Adjust constraints and re-optimize

4. **Advanced Workflows**
   - Run attribution → Use results for optimization
   - Generate forecast → Plan budget allocation
   - Compare scenarios → Make data-driven decisions
   - Export results → Share with team

### 🔄 Data Upload Flow

1. **Prepare Data**

   - User exports data from marketing platforms
   - Formats as CSV with required columns:
     - date, channel, spend, revenue
     - Optional: impressions, clicks, conversions, new_customers, returning_customers
   - Validates dates are within allowed range

2. **Upload Process**

   - User selects CSV file
   - File validated client-side (size, format)
   - Uploaded to S3 via pre-signed URL
   - Backend processes file:
     - Parses CSV
     - Validates each row
     - Normalizes channels
     - Checks tier limits
   - Data inserted into database
   - Cache invalidated for dashboard

3. **Error Handling**
   - Validation errors shown with row numbers
   - Partial uploads supported (valid rows processed)
   - Error messages are specific and actionable
   - User can correct and re-upload

### 🔍 Attribution Analysis Flow

1. **Prerequisites**

   - Minimum 60 days of historical data
   - Multiple channels with spend data
   - Revenue data for model training

2. **Job Execution**

   - User triggers attribution job
   - Job enqueued in Redis
   - Background worker:
     - Fetches last 180 days of data
     - Trains Ridge regression model
     - Calculates confidence intervals (bootstrap)
     - Saves results to database
   - Status updates every 2 seconds in UI

3. **Results Display**
   - Model quality metrics shown first
   - Charts render with attribution data
   - Confidence intervals visualized
   - User can interpret results with help text

### 📈 Forecasting Flow

1. **Data Requirements**

   - Minimum 30 days of historical data
   - Revenue and spend data per channel

2. **Forecast Generation**

   - User selects horizon
   - Prophet model fits to historical data
   - Forecast generated with confidence intervals
   - Results displayed immediately

3. **Scenario Planning** (Future)
   - User can input future spend scenarios
   - Forecast adjusts based on planned spend
   - Compare multiple scenarios

### 💡 Optimization Flow

1. **Setup**

   - Attribution model must be run first (for marginal ROAS)
   - User enters total budget
   - Optionally sets constraints

2. **Optimization**

   - System fetches latest attribution results
   - Runs constrained optimization
   - Applies saturation curves
   - Returns optimal allocation

3. **Review & Apply**
   - User reviews recommendations
   - Compares with current allocation
   - Can adjust constraints and re-optimize
   - Export recommendations (future)

## 🏗️ Architecture

- **Frontend**: React + TypeScript, TailwindCSS, Recharts
- **Backend**: Node.js + Express, PostgreSQL, Redis
- **ML Service**: Python microservice (scikit-learn, statsmodels, Prophet)
- **Infrastructure**: AWS/GCP, Docker, GitHub Actions CI/CD

## 📁 Project Structure

```
├── frontend/          # React + TypeScript frontend
├── backend/           # Node.js + Express API
├── ml/                # Python ML microservice
├── infra/             # Docker, Terraform, CI/CD
├── samples/           # Sample CSV files
└── shared/            # Shared types/utilities
```

## 🚀 Quick Start

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
   # Edit .env with your configuration
   npm run migrate
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
   cp .env.sample .env
   python -m uvicorn main:app --reload --port 8001
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - ML Service: http://localhost:8001

## 📋 Feature Matrix

### Free Tier

- ✅ 90-day dashboard
- ✅ Per-channel ROAS
- ✅ 5 channels limit
- ✅ CSV upload (≤500 rows/mo)
- ✅ PDF export
- ✅ Basic analytics

### Premium Tier ($99/mo)

- ✅ Unlimited history
- ✅ Multi-touch attribution
- ✅ Diminishing returns curves
- ✅ Budget optimizer
- ✅ Revenue forecasting (7/30/60/90 days)
- ✅ Confidence intervals
- ✅ Advanced visualizations
- ✅ API access
- ⏳ Integrations (Google, Meta, LinkedIn)
- ⏳ Weekly AI recommendations
- ⏳ Anomaly detection
- ⏳ Excel raw export
- ⏳ Slack alerts

## 🎯 Success Metrics

- **Performance Targets**:

  - Dashboard load: < 2s
  - Attribution model: < 5s for 12 months data
  - Forecast generation: < 5s for 90-day horizon
  - Optimization: < 2s for 5 channels

- **Business Goals**:
  - 10 beta orgs uploading data weekly
  - 8–12% conversion free → premium within 30 days
  - Attribution model R² ≥ 0.7 on real test data
  - Page load < 2s

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Project Status](./PROJECT_STATUS.md) - Current development status
- [Contributing](./CONTRIBUTING.md) - Development guidelines
- [Sprint 3 Complete](./SPRINT3_COMPLETE.md) - Attribution implementation
- [Sprint 4 Complete](./SPRINT4_COMPLETE.md) - Forecasting & optimization

## 🔧 Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and workflow.

## 📄 License

Proprietary
