-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Indexed positions from blockchain events
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    lock_end TIMESTAMP WITH TIME ZONE NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 0,
    conviction_score NUMERIC(78, 0) NOT NULL DEFAULT 0,
    chain_id INT NOT NULL DEFAULT 84532,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, token_address, chain_id)
);

ALTER TABLE positions ADD COLUMN IF NOT EXISTS chain_id INT;
ALTER TABLE positions ALTER COLUMN chain_id SET DEFAULT 84532;
UPDATE positions SET chain_id = COALESCE(chain_id, 84532);
ALTER TABLE positions ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_user_address_token_address_key;
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_user_address_token_address_chain_id_key;
ALTER TABLE positions ADD CONSTRAINT positions_user_address_token_address_chain_id_key UNIQUE (user_address, token_address, chain_id);

-- Creator content (gated posts, polls, etc.)
CREATE TABLE IF NOT EXISTS gated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_fid BIGINT NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('post', 'poll', 'shoutout', 'allowlist')),
    title VARCHAR(255),
    content JSONB NOT NULL,
    min_tier SMALLINT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Event sync cursor for indexer
CREATE TABLE IF NOT EXISTS sync_state (
    chain_id INT PRIMARY KEY,
    last_block BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS chain_id INT;
ALTER TABLE sync_state DROP CONSTRAINT IF EXISTS sync_state_pkey;
ALTER TABLE sync_state DROP COLUMN IF EXISTS id;
ALTER TABLE sync_state ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE sync_state ADD PRIMARY KEY (chain_id);

-- User profiles (cached from Farcaster)
CREATE TABLE IF NOT EXISTS users (
    address VARCHAR(42) PRIMARY KEY,
    fid BIGINT,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_positions_token_score ON positions(token_address, conviction_score DESC);
CREATE INDEX IF NOT EXISTS idx_positions_token_tier ON positions(token_address, tier DESC);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_address);
CREATE INDEX IF NOT EXISTS idx_positions_updated ON positions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gated_content_token ON gated_content(token_address);
CREATE INDEX IF NOT EXISTS idx_gated_content_creator ON gated_content(creator_fid);

-- ============================================
-- ETHOS INTEGRATION TABLES (Vibeathon)
-- ============================================

-- Ethos score cache
CREATE TABLE IF NOT EXISTS ethos_cache (
    userkey VARCHAR(255) PRIMARY KEY,
    fid BIGINT,
    address VARCHAR(42),
    score INTEGER NOT NULL DEFAULT 1200,
    band VARCHAR(20) NOT NULL DEFAULT 'Neutral',
    review_count INTEGER DEFAULT 0,
    vouch_count INTEGER DEFAULT 0,
    payload_json JSONB,
    last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ethos_cache_fid ON ethos_cache(fid);
CREATE INDEX IF NOT EXISTS idx_ethos_cache_address ON ethos_cache(address);
CREATE INDEX IF NOT EXISTS idx_ethos_cache_score ON ethos_cache(score);
CREATE INDEX IF NOT EXISTS idx_ethos_cache_last_fetched ON ethos_cache(last_fetched_at);

-- Ethos write audit log
CREATE TABLE IF NOT EXISTS ethos_writes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    writer_userkey VARCHAR(255) NOT NULL,
    writer_fid BIGINT,
    target_userkey VARCHAR(255) NOT NULL,
    target_fid BIGINT,
    write_type VARCHAR(20) NOT NULL,
    rating VARCHAR(15),
    content_text TEXT,
    content_hash VARCHAR(64) NOT NULL,
    ethos_receipt_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ethos_writes_writer ON ethos_writes(writer_userkey);
CREATE INDEX IF NOT EXISTS idx_ethos_writes_target ON ethos_writes(target_userkey);
CREATE INDEX IF NOT EXISTS idx_ethos_writes_created ON ethos_writes(created_at);
CREATE INDEX IF NOT EXISTS idx_ethos_writes_hash ON ethos_writes(content_hash);

-- Rate limiting for Ethos writes
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userkey VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    window_key VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(userkey, action_type, window_key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(userkey, action_type, window_key);

