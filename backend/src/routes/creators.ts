/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { pool } from '../index';
import { requireQuickAuth } from '../auth/quickAuth';
import { EthosClient, buildUserkey } from '../services/ethosClient';
import { calculateCreatorStats, Position } from '../services/credibilityCalc';
import { GLOBAL_DEFAULTS, TierConfig, rowToTierConfig, getStakeBasedTier, getEthosBasedTier } from '../services/tierCalculator';

const router = Router();
const ethosClient = new EthosClient(pool);
const DEFAULT_ETHOS_SCORE = 1200;

async function getTierConfigForToken(token: string): Promise<TierConfig> {
    const configResult = await pool.query(
        `SELECT * FROM creator_tier_config WHERE LOWER(token_address) = LOWER($1)`,
        [token]
    );

    if (configResult.rows.length > 0) {
        return rowToTierConfig(configResult.rows[0]);
    }

    const defaultsResult = await pool.query(
        `SELECT * FROM global_tier_defaults WHERE id = 1`
    );

    if (defaultsResult.rows.length > 0) {
        return rowToTierConfig(defaultsResult.rows[0]);
    }

    return GLOBAL_DEFAULTS;
}

function computeEffectiveTier(lockTier: number, stakeAmount: string, ethosScore: number, config: TierConfig): number {
    const stakeTier = getStakeBasedTier(stakeAmount, config);
    const ethosTier = getEthosBasedTier(ethosScore, config);
    return Math.min(lockTier, stakeTier, ethosTier);
}

/**
 * GET /api/creator/:token/supporters
 * Get paginated list of supporters for a creator token
 */
router.get('/:token/supporters', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT 
        p.user_address,
        p.amount,
        p.lock_end,
        p.tier,
        p.conviction_score,
        u.fid,
        u.username,
        u.display_name,
        u.avatar_url
      FROM positions p
      LEFT JOIN users u ON LOWER(p.user_address) = LOWER(u.address)
      WHERE LOWER(p.token_address) = LOWER($1) AND p.amount > 0
      ORDER BY p.conviction_score DESC
      LIMIT $2 OFFSET $3`,
            [token, limit, offset]
        );

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM positions WHERE LOWER(token_address) = LOWER($1) AND amount > 0`,
            [token]
        );

        const supporterRows = result.rows;
        const tierConfig = await getTierConfigForToken(token as string);
        const userkeys = supporterRows
            .map(row => buildUserkey(undefined, row.user_address))
            .filter(Boolean) as string[];
        const uniqueUserkeys = Array.from(new Set(userkeys));
        const ethosProfiles = uniqueUserkeys.length > 0
            ? await ethosClient.bulkLookup(uniqueUserkeys)
            : new Map();

        res.json({
            supporters: supporterRows.map(row => {
                const userkey = buildUserkey(undefined, row.user_address);
                const ethosProfile = userkey ? ethosProfiles.get(userkey) : null;

                const lockTier = Number(row.tier) || 0;
                const ethosScoreForTier = ethosProfile?.score ?? DEFAULT_ETHOS_SCORE;
                const effectiveTier = computeEffectiveTier(lockTier, row.amount, ethosScoreForTier, tierConfig);

                return {
                    address: row.user_address,
                    amount: row.amount,
                    lockEnd: row.lock_end,
                    tier: effectiveTier,
                    convictionScore: row.conviction_score,
                    ethosScore: ethosProfile?.score,
                    ethosBand: ethosProfile?.band,
                    user: row.fid ? {
                        fid: row.fid,
                        username: row.username,
                        displayName: row.display_name,
                        avatarUrl: row.avatar_url,
                    } : null,
                };
            }),
            total: parseInt(countResult.rows[0].count),
            page,
            limit,
        });
    } catch (error) {
        console.error('Error fetching supporters:', error);
        res.status(500).json({ error: 'Failed to fetch supporters' });
    }
});

/**
 * GET /api/creator/:token/stats
 * Get supporter stats for a creator token
 */
router.get('/:token/stats', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const positionsResult = await pool.query(
            `SELECT 
        user_address,
        amount,
        tier,
        created_at
      FROM positions
      WHERE LOWER(token_address) = LOWER($1) AND amount > 0`,
            [token]
        );

        const rows = positionsResult.rows;
        const totalSupporters = rows.length;
        let bronzeCount = 0;
        let silverCount = 0;
        let goldCount = 0;
        let legendCount = 0;
        let totalStaked = BigInt(0);
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        let newThisWeek = 0;

        const tierConfig = await getTierConfigForToken(token as string);
        const userkeys = rows
            .map(row => buildUserkey(undefined, row.user_address))
            .filter(Boolean) as string[];
        const uniqueUserkeys = Array.from(new Set(userkeys));
        const ethosProfiles = uniqueUserkeys.length > 0
            ? await ethosClient.bulkLookup(uniqueUserkeys)
            : new Map();

        for (const row of rows) {
            totalStaked += BigInt(row.amount || '0');
            const createdAt = new Date(row.created_at).getTime();
            if (!Number.isNaN(createdAt) && createdAt >= weekAgo) {
                newThisWeek += 1;
            }

            const userkey = buildUserkey(undefined, row.user_address);
            const ethosProfile = userkey ? ethosProfiles.get(userkey) : null;
            const lockTier = Number(row.tier) || 0;
            const ethosScoreForTier = ethosProfile?.score ?? DEFAULT_ETHOS_SCORE;
            const effectiveTier = computeEffectiveTier(lockTier, row.amount, ethosScoreForTier, tierConfig);

            if (effectiveTier >= 1) bronzeCount += 1;
            if (effectiveTier >= 2) silverCount += 1;
            if (effectiveTier >= 3) goldCount += 1;
            if (effectiveTier >= 4) legendCount += 1;
        }

        res.json({
            totalSupporters,
            bronzeCount,
            silverCount,
            goldCount,
            legendCount,
            totalStaked: totalStaked.toString(),
            newThisWeek,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/creator/:token/ethos-stats
 * Get Ethos-weighted credibility stats for Vibeathon (Ethos-first metrics)
 */
router.get('/:token/ethos-stats', async (req: Request, res: Response) => {
    try {
        const token = req.params.token as string;

        // Fetch all positions for this token
        const positionsResult = await pool.query(
            `SELECT 
                user_address,
                token_address,
                amount,
                lock_end,
                tier,
                created_at
             FROM positions
             WHERE LOWER(token_address) = LOWER($1) AND amount > 0
             ORDER BY conviction_score DESC`,
            [token]
        );

        if (positionsResult.rows.length === 0) {
            return res.json(null);
        }

        // Convert to Position format
        const positions: Position[] = positionsResult.rows.map(row => ({
            userAddress: row.user_address,
            tokenAddress: row.token_address,
            amount: row.amount,
            lockEnd: row.lock_end,
            tier: row.tier,
            createdAt: row.created_at,
        }));

        // Build userkeys for Ethos lookup
        const userkeys = positions.map(p => buildUserkey(undefined, p.userAddress)).filter(Boolean) as string[];

        // Bulk fetch Ethos profiles
        const ethosProfiles = await ethosClient.bulkLookup(userkeys);

        // Calculate credibility-weighted stats
        const stats = calculateCreatorStats(positions, ethosProfiles);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching Ethos stats:', error);
        res.status(500).json({ error: 'Failed to fetch Ethos stats' });
    }
});

/**
 * GET /api/creator/:token/allowlist
 * Export addresses meeting minimum tier (creator-only, requires Quick Auth)
 */
router.get('/:token/allowlist', requireQuickAuth, async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const minTier = parseInt(req.query.minTier as string, 10) || 1;
        const creatorFid = req.query.creatorFid ? parseInt(req.query.creatorFid as string, 10) : null;
        if (creatorFid && req.quickAuth && creatorFid !== req.quickAuth.fid) {
            return res.status(403).json({ error: 'Creator mismatch' });
        }

        const result = await pool.query(
            `SELECT user_address, amount, tier, conviction_score FROM positions
      WHERE LOWER(token_address) = LOWER($1)
      AND amount > 0`,
            [token]
        );

        const tierConfig = await getTierConfigForToken(token as string);
        const userkeys = result.rows
            .map(row => buildUserkey(undefined, row.user_address))
            .filter(Boolean) as string[];
        const uniqueUserkeys = Array.from(new Set(userkeys));
        const ethosProfiles = uniqueUserkeys.length > 0
            ? await ethosClient.bulkLookup(uniqueUserkeys)
            : new Map();

        const addresses = result.rows.map(row => {
            const userkey = buildUserkey(undefined, row.user_address);
            const ethosProfile = userkey ? ethosProfiles.get(userkey) : null;
            const lockTier = Number(row.tier) || 0;
            const ethosScoreForTier = ethosProfile?.score ?? DEFAULT_ETHOS_SCORE;
            const effectiveTier = computeEffectiveTier(lockTier, row.amount, ethosScoreForTier, tierConfig);

            return {
                address: row.user_address,
                tier: effectiveTier,
                convictionScore: row.conviction_score,
            };
        }).filter(row => row.tier >= minTier);

        addresses.sort((a, b) => {
            if (b.tier !== a.tier) return b.tier - a.tier;
            const aScore = BigInt(a.convictionScore || '0');
            const bScore = BigInt(b.convictionScore || '0');
            if (aScore === bScore) return 0;
            return aScore > bScore ? -1 : 1;
        });

        res.json({
            addresses: addresses.map(row => ({
                address: row.address,
                tier: row.tier,
            })),
            total: addresses.length,
            minTier,
        });
    } catch (error) {
        console.error('Error fetching allowlist:', error);
        res.status(500).json({ error: 'Failed to fetch allowlist' });
    }
});

/**
 * POST /api/creator/:token/gated-content
 * Create gated content (creator-only, requires Quick Auth)
 */
router.post('/:token/gated-content', requireQuickAuth, async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const { creatorFid, contentType, title, content, minTier, expiresAt } = req.body;
        const creatorFidValue = typeof creatorFid === 'string' ? parseInt(creatorFid, 10) : creatorFid;
        const resolvedCreatorFid = creatorFidValue ?? req.quickAuth?.fid;

        if (!resolvedCreatorFid) {
            return res.status(400).json({ error: 'creatorFid required' });
        }

        if (creatorFidValue && req.quickAuth && creatorFidValue !== req.quickAuth.fid) {
            return res.status(403).json({ error: 'Creator mismatch' });
        }

        const result = await pool.query(
            `INSERT INTO gated_content (creator_fid, token_address, content_type, title, content, min_tier, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at`,
            [resolvedCreatorFid, token, contentType, title, JSON.stringify(content), minTier || 1, expiresAt || null]
        );

        res.status(201).json({
            id: result.rows[0].id,
            createdAt: result.rows[0].created_at,
        });
    } catch (error) {
        console.error('Error creating gated content:', error);
        res.status(500).json({ error: 'Failed to create gated content' });
    }
});

/**
 * GET /api/creator/:token/config
 * Get tier configuration for a creator token
 * Returns creator-specific config or global defaults
 */
router.get('/:token/config', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        // Try to get creator-specific config
        const configResult = await pool.query(
            `SELECT * FROM creator_tier_config WHERE LOWER(token_address) = LOWER($1)`,
            [token]
        );

        if (configResult.rows.length > 0) {
            const row = configResult.rows[0];
            return res.json({
                isCustom: true,
                creatorFid: row.creator_fid,
                config: {
                    minStakeBronze: row.min_stake_bronze?.toString() || '0',
                    minStakeSilver: row.min_stake_silver?.toString() || '0',
                    minStakeGold: row.min_stake_gold?.toString() || '0',
                    minStakeLegend: row.min_stake_legend?.toString() || '0',
                    minEthosBronze: parseInt(row.min_ethos_bronze) || 0,
                    minEthosSilver: parseInt(row.min_ethos_silver) || 0,
                    minEthosGold: parseInt(row.min_ethos_gold) || 0,
                    minEthosLegend: parseInt(row.min_ethos_legend) || 0,
                },
            });
        }

        // Return global defaults
        const defaultsResult = await pool.query(
            `SELECT * FROM global_tier_defaults WHERE id = 1`
        );

        if (defaultsResult.rows.length > 0) {
            const row = defaultsResult.rows[0];
            return res.json({
                isCustom: false,
                config: {
                    minStakeBronze: row.min_stake_bronze?.toString() || '0',
                    minStakeSilver: row.min_stake_silver?.toString() || '0',
                    minStakeGold: row.min_stake_gold?.toString() || '0',
                    minStakeLegend: row.min_stake_legend?.toString() || '0',
                    minEthosBronze: parseInt(row.min_ethos_bronze) || 0,
                    minEthosSilver: parseInt(row.min_ethos_silver) || 0,
                    minEthosGold: parseInt(row.min_ethos_gold) || 0,
                    minEthosLegend: parseInt(row.min_ethos_legend) || 0,
                },
            });
        }

        // Hardcoded fallback defaults
        res.json({
            isCustom: false,
            config: {
                minStakeBronze: '0',
                minStakeSilver: '1000000000000000000',
                minStakeGold: '10000000000000000000',
                minStakeLegend: '100000000000000000000',
                minEthosBronze: 0,
                minEthosSilver: 1200,
                minEthosGold: 1400,
                minEthosLegend: 1600,
            },
        });
    } catch (error) {
        console.error('Error fetching tier config:', error);
        res.status(500).json({ error: 'Failed to fetch tier config' });
    }
});

/**
 * PUT /api/creator/:token/config
 * Update tier configuration for a creator token
 * Requires Quick Auth (creator verification via Farcaster FID)
 */
router.put('/:token/config', requireQuickAuth, async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const creatorFid = req.quickAuth?.fid;

        if (!creatorFid) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const {
            minStakeBronze,
            minStakeSilver,
            minStakeGold,
            minStakeLegend,
            minEthosBronze,
            minEthosSilver,
            minEthosGold,
            minEthosLegend,
        } = req.body;

        // Check if config already exists
        const existingConfig = await pool.query(
            `SELECT creator_fid FROM creator_tier_config WHERE LOWER(token_address) = LOWER($1)`,
            [token]
        );

        if (existingConfig.rows.length > 0) {
            // Verify ownership - only original creator can update
            if (String(existingConfig.rows[0].creator_fid) !== String(creatorFid)) {
                return res.status(403).json({ error: 'Only the original creator can update this config' });
            }

            // Update existing config
            await pool.query(
                `UPDATE creator_tier_config SET
                    min_stake_bronze = $1,
                    min_stake_silver = $2,
                    min_stake_gold = $3,
                    min_stake_legend = $4,
                    min_ethos_bronze = $5,
                    min_ethos_silver = $6,
                    min_ethos_gold = $7,
                    min_ethos_legend = $8,
                    updated_at = NOW()
                WHERE LOWER(token_address) = LOWER($9)`,
                [
                    minStakeBronze || '0',
                    minStakeSilver || '0',
                    minStakeGold || '0',
                    minStakeLegend || '0',
                    minEthosBronze || 0,
                    minEthosSilver || 0,
                    minEthosGold || 0,
                    minEthosLegend || 0,
                    token,
                ]
            );
        } else {
            // Insert new config
            await pool.query(
                `INSERT INTO creator_tier_config (
                    token_address, creator_fid,
                    min_stake_bronze, min_stake_silver, min_stake_gold, min_stake_legend,
                    min_ethos_bronze, min_ethos_silver, min_ethos_gold, min_ethos_legend
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    (token as string).toLowerCase(),
                    creatorFid,
                    minStakeBronze || '0',
                    minStakeSilver || '0',
                    minStakeGold || '0',
                    minStakeLegend || '0',
                    minEthosBronze || 0,
                    minEthosSilver || 0,
                    minEthosGold || 0,
                    minEthosLegend || 0,
                ]
            );
        }

        res.json({ success: true, message: 'Tier configuration updated' });
    } catch (error) {
        console.error('Error updating tier config:', error);
        res.status(500).json({ error: 'Failed to update tier config' });
    }
});

export default router;
