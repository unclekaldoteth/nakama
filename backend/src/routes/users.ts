import { Router, Request, Response } from 'express';
import { pool } from '../index';
import { optionalQuickAuth } from '../auth/quickAuth';
import { resolveUserAddress } from '../utils/resolveUserAddress';

const router = Router();

/**
 * GET /api/me/positions
 * Get all positions for the authenticated user
 */
router.get('/positions', optionalQuickAuth, async (req: Request, res: Response) => {
    try {
        const userAddress = await resolveUserAddress(req, pool);

        if (!userAddress) {
            return res.status(400).json({ error: 'User address required' });
        }

        const result = await pool.query(
            `SELECT 
        p.token_address,
        p.amount,
        p.lock_end,
        p.tier,
        p.conviction_score,
        p.created_at,
        p.updated_at
      FROM positions p
      WHERE LOWER(p.user_address) = LOWER($1) AND p.amount > 0
      ORDER BY p.conviction_score DESC`,
            [userAddress]
        );

        res.json({
            positions: result.rows.map(row => ({
                tokenAddress: row.token_address,
                amount: row.amount,
                lockEnd: row.lock_end,
                tier: row.tier,
                convictionScore: row.conviction_score,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                tierName: getTierName(row.tier),
                isLocked: new Date(row.lock_end) > new Date(),
            })),
        });
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ error: 'Failed to fetch positions' });
    }
});

/**
 * GET /api/me/badges
 * Get badge status for all user positions
 */
router.get('/badges', optionalQuickAuth, async (req: Request, res: Response) => {
    try {
        const userAddress = await resolveUserAddress(req, pool);

        if (!userAddress) {
            return res.status(400).json({ error: 'User address required' });
        }

        const result = await pool.query(
            `SELECT 
        token_address,
        tier,
        lock_end
      FROM positions
      WHERE LOWER(user_address) = LOWER($1) AND amount > 0`,
            [userAddress]
        );

        res.json({
            badges: result.rows.map(row => ({
                tokenAddress: row.token_address,
                tier: row.tier,
                tierName: getTierName(row.tier),
                validUntil: row.lock_end,
                isValid: new Date(row.lock_end) > new Date(),
                canClaim: row.tier > 0,
            })),
        });
    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({ error: 'Failed to fetch badges' });
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
