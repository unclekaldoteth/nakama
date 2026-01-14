-- Creator Tier Configuration
-- Allows creators to customize tier requirements (min stake + min ethos score)

CREATE TABLE IF NOT EXISTS creator_tier_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_address VARCHAR(42) NOT NULL UNIQUE,
    creator_fid BIGINT NOT NULL,
    
    -- Minimum stake amounts per tier (in wei, stored as string for BigInt compatibility)
    min_stake_bronze NUMERIC(78, 0) DEFAULT 0,
    min_stake_silver NUMERIC(78, 0) DEFAULT 0,
    min_stake_gold NUMERIC(78, 0) DEFAULT 0,
    min_stake_legend NUMERIC(78, 0) DEFAULT 0,
    
    -- Minimum ethos scores per tier (0-2000 range typically)
    min_ethos_bronze INTEGER DEFAULT 0,
    min_ethos_silver INTEGER DEFAULT 0,
    min_ethos_gold INTEGER DEFAULT 0,
    min_ethos_legend INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_creator_tier_config_token ON creator_tier_config(token_address);
CREATE INDEX IF NOT EXISTS idx_creator_tier_config_fid ON creator_tier_config(creator_fid);

-- Global defaults table (single row)
CREATE TABLE IF NOT EXISTS global_tier_defaults (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- Ensure only 1 row
    
    -- Default minimum stake amounts per tier (in wei)
    min_stake_bronze NUMERIC(78, 0) DEFAULT 0,
    min_stake_silver NUMERIC(78, 0) DEFAULT 1000000000000000000,    -- 1 token default
    min_stake_gold NUMERIC(78, 0) DEFAULT 10000000000000000000,     -- 10 tokens default
    min_stake_legend NUMERIC(78, 0) DEFAULT 100000000000000000000,  -- 100 tokens default
    
    -- Default minimum ethos scores per tier
    min_ethos_bronze INTEGER DEFAULT 0,
    min_ethos_silver INTEGER DEFAULT 1200,   -- Neutral+
    min_ethos_gold INTEGER DEFAULT 1400,     -- Reputable
    min_ethos_legend INTEGER DEFAULT 1600,   -- Exemplary
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO global_tier_defaults (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
