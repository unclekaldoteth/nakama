import { Router, Request, Response } from 'express';
import { pool } from '../index';
import { requireQuickAuth } from '../auth/quickAuth';

const router = Router();

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

        res.json({
            supporters: result.rows.map(row => ({
                address: row.user_address,
                amount: row.amount,
                lockEnd: row.lock_end,
                tier: row.tier,
                convictionScore: row.conviction_score,
                user: row.fid ? {
                    fid: row.fid,
                    username: row.username,
                    displayName: row.display_name,
                    avatarUrl: row.avatar_url,
                } : null,
            })),
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

        const stats = await pool.query(
            `SELECT 
        COUNT(*) as total_supporters,
        COUNT(CASE WHEN tier >= 1 THEN 1 END) as bronze_count,
        COUNT(CASE WHEN tier >= 2 THEN 1 END) as silver_count,
        COUNT(CASE WHEN tier >= 3 THEN 1 END) as gold_count,
        COUNT(CASE WHEN tier >= 4 THEN 1 END) as legend_count,
        COALESCE(SUM(amount), 0) as total_staked
      FROM positions
      WHERE LOWER(token_address) = LOWER($1) AND amount > 0`,
            [token]
        );

        // New this week
        const newThisWeek = await pool.query(
            `SELECT COUNT(*) as count FROM positions
      WHERE LOWER(token_address) = LOWER($1) 
      AND created_at >= NOW() - INTERVAL '7 days'
      AND amount > 0`,
            [token]
        );

        res.json({
            totalSupporters: parseInt(stats.rows[0].total_supporters),
            bronzeCount: parseInt(stats.rows[0].bronze_count),
            silverCount: parseInt(stats.rows[0].silver_count),
            goldCount: parseInt(stats.rows[0].gold_count),
            legendCount: parseInt(stats.rows[0].legend_count),
            totalStaked: stats.rows[0].total_staked,
            newThisWeek: parseInt(newThisWeek.rows[0].count),
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
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
            `SELECT user_address, tier FROM positions
      WHERE LOWER(token_address) = LOWER($1) 
      AND tier >= $2 
      AND amount > 0
      ORDER BY tier DESC, conviction_score DESC`,
            [token, minTier]
        );

        res.json({
            addresses: result.rows.map(row => ({
                address: row.user_address,
                tier: row.tier,
            })),
            total: result.rows.length,
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

export default router;
