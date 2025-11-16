-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_email ON accounts(email);

-- Marketing daily metrics table
CREATE TABLE IF NOT EXISTS marketing_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  channel TEXT NOT NULL,
  spend NUMERIC(12,2) NOT NULL CHECK (spend >= 0),
  revenue NUMERIC(12,2) CHECK (revenue >= 0),
  impressions INTEGER CHECK (impressions >= 0),
  clicks INTEGER CHECK (clicks >= 0),
  conversions INTEGER CHECK (conversions >= 0),
  new_customers INTEGER CHECK (new_customers >= 0),
  returning_customers INTEGER CHECK (returning_customers >= 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, date, channel)
);

CREATE INDEX idx_metrics_account_date ON marketing_daily_metrics(account_id, date);
CREATE INDEX idx_metrics_channel ON marketing_daily_metrics(channel);

-- CSV uploads table
CREATE TABLE IF NOT EXISTS csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  s3_key VARCHAR(500) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  row_count INTEGER,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_uploads_account ON csv_uploads(account_id);

-- Channel normalization map
CREATE TABLE IF NOT EXISTS channel_normalization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  raw_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, raw_name)
);

CREATE INDEX idx_channel_norm_account ON channel_normalization(account_id);

-- Attribution model results cache
CREATE TABLE IF NOT EXISTS attribution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  model_version VARCHAR(50),
  r_squared NUMERIC(5,4),
  coefficients JSONB,
  contributions JSONB,
  confidence_intervals JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_attribution_account ON attribution_results(account_id);

