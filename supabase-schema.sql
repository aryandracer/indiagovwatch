-- IndiaGovWatch Supabase Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  language TEXT DEFAULT 'English',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- SUBSCRIPTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('bharat', 'pro', 'global')),
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  trial_end TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- =============================================================================
-- PAYMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);

-- =============================================================================
-- AUTH OTPs TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for OTP lookups
CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON auth_otps(email);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires ON auth_otps(expires_at);

-- =============================================================================
-- CONTENT SOURCES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('schemes', 'jobs', 'tenders', 'rti', 'policy')),
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'api')),
  feed_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active sources
CREATE INDEX IF NOT EXISTS idx_content_sources_active ON content_sources(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- CONTENT TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES content_sources(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('schemes', 'jobs', 'tenders', 'rti', 'policy')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  state TEXT, -- NULL = national level
  tags TEXT[], -- Array of tags for filtering
  is_sent BOOLEAN DEFAULT FALSE, -- Has been included in digest
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for content queries
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category);
CREATE INDEX IF NOT EXISTS idx_content_published ON content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_not_sent ON content(is_sent) WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_content_state ON content(state);
CREATE INDEX IF NOT EXISTS idx_content_url ON content(url);

-- =============================================================================
-- USER PREFERENCES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  categories TEXT[] DEFAULT ARRAY['schemes', 'jobs', 'tenders', 'rti', 'policy'],
  states TEXT[] DEFAULT ARRAY[]::TEXT[], -- Empty = all states
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  digest_time TEXT DEFAULT '08:00', -- IST time for digest
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- =============================================================================
-- NOTIFICATIONS SENT TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_ids UUID[], -- Array of content IDs included in this notification
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced'))
);

-- Index for notification history
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications_sent(sent_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_sent ENABLE ROW LEVEL SECURITY;

-- Note: Service role key bypasses RLS, so server-side operations work without policies
-- If you want to enable client-side access, add appropriate policies here

-- =============================================================================
-- SEED INITIAL CONTENT SOURCES
-- =============================================================================

INSERT INTO content_sources (name, category, source_type, feed_url) VALUES
  ('Press Information Bureau', 'policy', 'rss', 'https://pib.gov.in/RssMain.aspx'),
  ('PIB Welfare Ministry', 'schemes', 'rss', 'https://pib.gov.in/RssMain.aspx?MinCode=56'),
  ('PIB Finance Ministry', 'policy', 'rss', 'https://pib.gov.in/RssMain.aspx?MinCode=12'),
  ('UPSC Notifications', 'jobs', 'rss', 'https://upsc.gov.in/rss.xml'),
  ('SSC Notifications', 'jobs', 'rss', 'https://ssc.nic.in/rss.xml'),
  ('MyGov India', 'schemes', 'rss', 'https://www.mygov.in/rss.xml')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- USEFUL QUERIES FOR DEBUGGING
-- =============================================================================

-- Check table counts
-- SELECT 'users' as table_name, COUNT(*) FROM users
-- UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
-- UNION ALL SELECT 'content', COUNT(*) FROM content
-- UNION ALL SELECT 'content_sources', COUNT(*) FROM content_sources;

-- Get recent content
-- SELECT * FROM content ORDER BY created_at DESC LIMIT 10;

-- Get active subscribers
-- SELECT u.email, u.name, s.plan, s.status
-- FROM subscriptions s
-- JOIN users u ON s.user_id = u.id
-- WHERE s.status IN ('trial', 'active');
