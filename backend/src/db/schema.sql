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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, token_address)
);

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
    id INT PRIMARY KEY DEFAULT 1,
    chain_id INT NOT NULL,
    last_block BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
