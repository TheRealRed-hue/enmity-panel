-- ============================================================================
-- ENMITY EXE MODERATION DASHBOARD - SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE - Discord Users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_username ON users(username);

-- ============================================================================
-- ROBLOX USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roblox_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roblox_id VARCHAR(255) UNIQUE NOT NULL,
  roblox_username VARCHAR(255) NOT NULL,
  discord_id VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roblox_users_roblox_id ON roblox_users(roblox_id);
CREATE INDEX idx_roblox_users_discord_id ON roblox_users(discord_id);
CREATE INDEX idx_roblox_users_roblox_username ON roblox_users(roblox_username);

-- ============================================================================
-- MODERATORS TABLE - Staff Members
-- ============================================================================
CREATE TABLE IF NOT EXISTS moderators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  discord_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'moderator', 'trial_mod')),
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moderators_discord_id ON moderators(discord_id);
CREATE INDEX idx_moderators_user_id ON moderators(user_id);
CREATE INDEX idx_moderators_role ON moderators(role);

-- ============================================================================
-- INFRACTIONS TABLE - User Infractions/Punishments
-- ============================================================================
CREATE TABLE IF NOT EXISTS infractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_discord_id VARCHAR(255) NOT NULL,
  infraction_type VARCHAR(50) NOT NULL CHECK (infraction_type IN ('warning', 'mute', 'temporary_ban', 'permanent_ban', 'blacklist')),
  reason TEXT NOT NULL,
  moderator_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  duration VARCHAR(100),
  duration_until TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_infractions_target_discord_id ON infractions(target_discord_id);
CREATE INDEX idx_infractions_moderator_id ON infractions(moderator_id);
CREATE INDEX idx_infractions_type ON infractions(infraction_type);
CREATE INDEX idx_infractions_active ON infractions(active);

-- ============================================================================
-- BLACKLIST TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_discord_id VARCHAR(255) UNIQUE NOT NULL,
  roblox_id VARCHAR(255),
  roblox_username VARCHAR(255),
  reason TEXT NOT NULL,
  added_by_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  appeal_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blacklist_target_discord_id ON blacklist(target_discord_id);
CREATE INDEX idx_blacklist_roblox_id ON blacklist(roblox_id);
CREATE INDEX idx_blacklist_active ON blacklist(active);

-- ============================================================================
-- AUCTION CASES TABLE - Main Moderation Cases
-- ============================================================================
CREATE TABLE IF NOT EXISTS auction_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., #AUC-1234
  moderator_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  target_discord_id VARCHAR(255) NOT NULL,
  target_roblox_id VARCHAR(255),
  target_roblox_username VARCHAR(255) NOT NULL,
  target_discord_username VARCHAR(255),
  reason TEXT NOT NULL,
  punishment_type VARCHAR(50) NOT NULL CHECK (punishment_type IN ('warning', 'mute', 'temporary_ban', 'permanent_ban', 'blacklist')),
  duration VARCHAR(100),
  duration_until TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Pending Review', 'Appealed')),
  appealable BOOLEAN DEFAULT TRUE,
  notes TEXT,
  risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  previous_infractions INTEGER DEFAULT 0,
  related_cases INTEGER DEFAULT 0,
  linked_accounts INTEGER DEFAULT 0,
  blacklist_matches INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auction_cases_case_id ON auction_cases(case_id);
CREATE INDEX idx_auction_cases_moderator_id ON auction_cases(moderator_id);
CREATE INDEX idx_auction_cases_target_discord_id ON auction_cases(target_discord_id);
CREATE INDEX idx_auction_cases_target_roblox_id ON auction_cases(target_roblox_id);
CREATE INDEX idx_auction_cases_status ON auction_cases(status);
CREATE INDEX idx_auction_cases_created_at ON auction_cases(created_at DESC);

-- ============================================================================
-- CASE EVIDENCE TABLE - Evidence Files
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES auction_cases(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50), -- image, video, pdf, etc.
  file_size INTEGER,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  uploaded_by_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_evidence_case_id ON case_evidence(case_id);
CREATE INDEX idx_case_evidence_uploaded_by_id ON case_evidence(uploaded_by_id);
CREATE INDEX idx_case_evidence_created_at ON case_evidence(created_at DESC);

-- ============================================================================
-- CASE TIMELINE TABLE - Audit Trail / Activity Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES auction_cases(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'edited', 'evidence_added', 'evidence_removed', 'status_changed', 'commented', 'deleted')),
  actor_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  changes JSONB, -- Stores detailed change information
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_timeline_case_id ON case_timeline(case_id);
CREATE INDEX idx_case_timeline_actor_id ON case_timeline(actor_id);
CREATE INDEX idx_case_timeline_action_type ON case_timeline(action_type);
CREATE INDEX idx_case_timeline_created_at ON case_timeline(created_at DESC);

-- ============================================================================
-- CASE COMMENTS TABLE - Discussion Thread
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES auction_cases(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_comments_case_id ON case_comments(case_id);
CREATE INDEX idx_case_comments_moderator_id ON case_comments(moderator_id);
CREATE INDEX idx_case_comments_created_at ON case_comments(created_at DESC);

-- ============================================================================
-- CASE APPEALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_appeals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES auction_cases(id) ON DELETE CASCADE,
  target_discord_id VARCHAR(255) NOT NULL,
  appeal_reason TEXT NOT NULL,
  appeal_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (appeal_status IN ('pending', 'approved', 'denied')),
  reviewed_by_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  review_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_appeals_case_id ON case_appeals(case_id);
CREATE INDEX idx_case_appeals_target_discord_id ON case_appeals(target_discord_id);
CREATE INDEX idx_case_appeals_appeal_status ON case_appeals(appeal_status);

-- ============================================================================
-- RELATED CASES TABLE - Link Cases Together
-- ============================================================================
CREATE TABLE IF NOT EXISTS related_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id_1 UUID REFERENCES auction_cases(id) ON DELETE CASCADE,
  case_id_2 UUID REFERENCES auction_cases(id) ON DELETE CASCADE,
  relation_type VARCHAR(50), -- same_user, linked_accounts, similar_offense
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_cases CHECK (case_id_1 < case_id_2)
);

CREATE INDEX idx_related_cases_case_id_1 ON related_cases(case_id_1);
CREATE INDEX idx_related_cases_case_id_2 ON related_cases(case_id_2);

-- ============================================================================
-- ACTIVITY LOG TABLE - Server Wide Activity
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50), -- case, user, infraction, etc.
  entity_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_actor_id ON activity_log(actor_id);
CREATE INDEX idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roblox_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Public read access for some tables (viewers)
CREATE POLICY "Public read auction_cases" ON auction_cases
  FOR SELECT USING (true);

CREATE POLICY "Public read case_timeline" ON case_timeline
  FOR SELECT USING (true);

CREATE POLICY "Public read case_evidence" ON case_evidence
  FOR SELECT USING (true);

CREATE POLICY "Public read moderators" ON moderators
  FOR SELECT USING (true);

CREATE POLICY "Public read users" ON users
  FOR SELECT USING (true);

-- Moderator insert/update policies
CREATE POLICY "Moderators can create cases" ON auction_cases
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Moderators can update own cases" ON auction_cases
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- SAMPLE DATA (Optional - Comment out if not needed)
-- ============================================================================
-- INSERT INTO users (discord_id, username) VALUES
--   ('1508950244057153600', 'ModeratorOne'),
--   ('123456789012345678', 'TestUser');

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================
-- 1. Supabase Storage Buckets needed:
--    - auction-evidence (for case evidence files)
--    - avatars (for user profile pictures)
--
-- 2. Environment variables needed:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY
--
-- 3. Update your lib/supabase.ts to use these tables
--
-- 4. Consider adding more indexes for frequently queried fields
--
-- 5. Adjust RLS policies based on your authentication setup
--
-- ============================================================================
