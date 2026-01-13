import { Router, Request, Response } from 'express';
import { pool } from '../index';
import { optionalQuickAuth } from '../auth/quickAuth';
import { resolveUserAddress } from '../utils/resolveUserAddress';

const router = Router();

/**
 * GET /api/gated/creator/:token
 * List all gated content for a token
 */
router.get('/creator/:token', optionalQuickAuth, async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const userAddress = req.quickAuth ? await resolveUserAddress(req, pool) : null;

        const result = await pool.query(
            `SELECT id, content_type, title, min_tier, created_at, expires_at
      FROM gated_content
      WHERE LOWER(token_address) = LOWER($1)
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC`,
            [token]
        );

        // Get user tier if address provided
        let userTier = 0;
        if (userAddress) {
            const positionResult = await pool.query(
                `SELECT tier FROM positions
        WHERE LOWER(user_address) = LOWER($1) 
        AND LOWER(token_address) = LOWER($2)
        AND amount > 0`,
                [userAddress, token]
            );
            userTier = positionResult.rows.length > 0 ? positionResult.rows[0].tier : 0;
        }

        res.json({
            content: result.rows.map(row => ({
                id: row.id,
                type: row.content_type,
                title: row.title,
                minTier: row.min_tier,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
                hasAccess: userTier >= row.min_tier,
            })),
            userTier,
        });
    } catch (error) {
        console.error('Error fetching gated content list:', error);
        res.status(500).json({ error: 'Failed to fetch content list' });
    }
});

/**
 * GET /api/gated/:contentId
 * View gated content (requires valid badge tier)
 */
router.get('/:contentId', optionalQuickAuth, async (req: Request, res: Response) => {
    try {
        const { contentId } = req.params;
        const userAddress = req.quickAuth ? await resolveUserAddress(req, pool) : null;

        // Fetch content metadata
        const contentResult = await pool.query(
            `SELECT * FROM gated_content WHERE id = $1`,
            [contentId]
        );

        if (contentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Content not found' });
        }

        const content = contentResult.rows[0];

        // Check if content is expired
        if (content.expires_at && new Date(content.expires_at) < new Date()) {
            return res.status(410).json({ error: 'Content expired' });
        }

        // If no verified user address, return metadata only
        if (!userAddress) {
            return res.json({
                id: content.id,
                type: content.content_type,
                title: content.title,
                minTier: content.min_tier,
                createdAt: content.created_at,
                hasAccess: false,
                requiresTier: getTierName(content.min_tier),
            });
        }

        // Check user's tier for this token
        const positionResult = await pool.query(
            `SELECT tier FROM positions
      WHERE LOWER(user_address) = LOWER($1) 
      AND LOWER(token_address) = LOWER($2)
      AND amount > 0`,
            [userAddress, content.token_address]
        );

        const userTier = positionResult.rows.length > 0 ? positionResult.rows[0].tier : 0;
        const hasAccess = userTier >= content.min_tier;

        if (!hasAccess) {
            return res.json({
                id: content.id,
                type: content.content_type,
                title: content.title,
                minTier: content.min_tier,
                createdAt: content.created_at,
                hasAccess: false,
                userTier,
                requiresTier: getTierName(content.min_tier),
            });
        }

        // User has access - return full content
        res.json({
            id: content.id,
            type: content.content_type,
            title: content.title,
            content: content.content,
            minTier: content.min_tier,
            createdAt: content.created_at,
            hasAccess: true,
            userTier,
        });
    } catch (error) {
        console.error('Error fetching gated content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

function getTierName(tier: number): string {
    switch (tier) {
        case 1: return 'Bronze';
        case 2: return 'Silver';
        case 3: return 'Gold';
        case 4: return 'Legend';
        default: return 'None';
    }
}

export default router;
