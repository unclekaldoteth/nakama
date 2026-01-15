/**
 * Ethos API Routes
 * READ + WRITE endpoints for Ethos integration
 */

import { Router, Request, Response } from 'express';
import { pool } from '../index';
import { EthosClient, buildUserkey, EthosWriteRequest } from '../services/ethosClient';
import { optionalQuickAuth, requireQuickAuth } from '../auth/quickAuth';
import { resolveUserAddress } from '../utils/resolveUserAddress';

const router = Router();
const ethosClient = new EthosClient(pool);

// Minimum Ethos score to write reviews (Known band)
const MIN_WRITE_SCORE = 1400;
// Minimum Nakama tier to write reviews (Bronze)
const MIN_WRITE_TIER = 1;

/**
 * GET /api/ethos/score/:userkey
 * Get cached Ethos score for a userkey
 */
router.get('/score/:userkey', async (req: Request, res: Response) => {
    try {
        const userkey = req.params.userkey as string;
        const profile = await ethosClient.getProfile(decodeURIComponent(userkey));

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({
            userkey: profile.userkey,
            score: profile.score,
            band: profile.band,
            reviewCount: profile.reviewCount,
            vouchCount: profile.vouchCount,
            lastFetchedAt: profile.lastFetchedAt,
        });
    } catch (error) {
        console.error('Error fetching Ethos score:', error);
        res.status(500).json({ error: 'Failed to fetch Ethos score' });
    }
});

/**
 * GET /api/ethos/profile/fid/:fid
 * Get Ethos profile by Farcaster ID
 */
router.get('/profile/fid/:fid', async (req: Request, res: Response) => {
    try {
        const fid = parseInt(req.params.fid as string, 10);
        if (isNaN(fid)) {
            return res.status(400).json({ error: 'Invalid FID' });
        }

        const profile = await ethosClient.getProfileByFid(fid);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Error fetching Ethos profile:', error);
        res.status(500).json({ error: 'Failed to fetch Ethos profile' });
    }
});

/**
 * GET /api/ethos/profile/address/:address
 * Get Ethos profile by wallet address
 */
router.get('/profile/address/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address as string;
        const profile = await ethosClient.getProfileByAddress(address);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profile);
    } catch (error) {
        console.error('Error fetching Ethos profile:', error);
        res.status(500).json({ error: 'Failed to fetch Ethos profile' });
    }
});

/**
 * POST /api/ethos/refresh/:userkey
 * Force refresh Ethos score (rate limited)
 */
router.post('/refresh/:userkey', async (req: Request, res: Response) => {
    try {
        const userkey = req.params.userkey as string;
        const decodedUserkey = decodeURIComponent(userkey);

        // Rate limit: 5 refreshes per userkey per day
        const canRefresh = await ethosClient.checkRateLimit(decodedUserkey, 'refresh', 5);
        if (!canRefresh) {
            return res.status(429).json({ error: 'Rate limit exceeded. Try again tomorrow.' });
        }

        const profile = await ethosClient.getProfile(decodedUserkey, true);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({
            ...profile,
            refreshed: true,
        });
    } catch (error) {
        console.error('Error refreshing Ethos score:', error);
        res.status(500).json({ error: 'Failed to refresh Ethos score' });
    }
});

/**
 * POST /api/ethos/bulk
 * Bulk lookup Ethos profiles
 */
router.post('/bulk', async (req: Request, res: Response) => {
    try {
        const { userkeys } = req.body as { userkeys: string[] };

        if (!Array.isArray(userkeys) || userkeys.length === 0) {
            return res.status(400).json({ error: 'userkeys array required' });
        }

        if (userkeys.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 userkeys per request' });
        }

        const profiles = await ethosClient.bulkLookup(userkeys);

        res.json({
            profiles: Array.from(profiles.values()),
        });
    } catch (error) {
        console.error('Error bulk fetching Ethos profiles:', error);
        res.status(500).json({ error: 'Failed to fetch Ethos profiles' });
    }
});

/**
 * POST /api/ethos/review
 * Create Ethos review (requires Quick Auth + gating)
 */
router.post('/review', requireQuickAuth, async (req: Request, res: Response) => {
    try {
        const { targetFid, targetAddress, rating, comment } = req.body as {
            targetFid?: number;
            targetAddress?: string;
            rating?: 'positive' | 'neutral' | 'negative';
            comment?: string;
        };

        // Validate target
        if (!targetFid && !targetAddress) {
            return res.status(400).json({ error: 'Target FID or address required' });
        }

        // Get writer info from Quick Auth
        const writerFid = req.user?.fid;
        const writerAddress = await resolveUserAddress(req, pool);

        if (!writerFid && !writerAddress) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!writerAddress) {
            return res.status(400).json({
                error: 'Wallet address required',
                message: 'Connect a wallet to verify your Nakama tier.',
            });
        }

        const writerUserkey = buildUserkey(writerFid, writerAddress);
        if (!writerUserkey) {
            return res.status(400).json({ error: 'Invalid writer identity' });
        }

        // Check writer's Ethos score (must be Known+)
        const writerProfile = await ethosClient.getProfile(writerUserkey);
        if (!writerProfile || writerProfile.score < MIN_WRITE_SCORE) {
            return res.status(403).json({
                error: 'Ethos score too low',
                message: `You need at least ${MIN_WRITE_SCORE} Ethos score (Known) to write reviews.`,
                currentScore: writerProfile?.score || 0,
                currentBand: writerProfile?.band || 'Unknown',
            });
        }

        // Check writer's Nakama tier (must have staked)
        const positionResult = await pool.query(
            `SELECT tier FROM positions WHERE LOWER(user_address) = LOWER($1) LIMIT 1`,
            [writerAddress]
        );
        const writerTier = positionResult.rows[0]?.tier || 0;

        if (writerTier < MIN_WRITE_TIER) {
            return res.status(403).json({
                error: 'Nakama commitment required',
                message: 'You need at least Bronze tier (stake any creator coin) to write reviews.',
                currentTier: writerTier,
            });
        }

        // Check rate limit (3 reviews/day)
        const canWrite = await ethosClient.checkRateLimit(writerUserkey, 'review', 3);
        if (!canWrite) {
            const status = await ethosClient.getRateLimitStatus(writerUserkey, 'review');
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'You can only write 3 reviews per day.',
                used: status.used,
                remaining: status.remaining,
            });
        }

        // Create review
        const writeRequest: EthosWriteRequest = {
            writerFid: writerFid || 0,
            writerAddress: writerAddress || '',
            targetFid,
            targetAddress,
            writeType: 'review',
            rating: rating || 'positive',
            comment,
        };

        const result = await ethosClient.createReview(writeRequest);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            receiptId: result.receiptId,
            deepLink: result.deepLink,
            message: result.deepLink
                ? 'Review initiated. Complete on Ethos to finalize.'
                : 'Review submitted successfully.',
        });
    } catch (error) {
        console.error('Error creating Ethos review:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

/**
 * POST /api/ethos/vouch
 * Generate Ethos vouch deep link (vouching requires on-chain ETH)
 */
router.post('/vouch', requireQuickAuth, async (req: Request, res: Response) => {
    try {
        const { targetFid, targetAddress } = req.body as {
            targetFid?: number;
            targetAddress?: string;
        };

        if (!targetFid && !targetAddress) {
            return res.status(400).json({ error: 'Target FID or address required' });
        }

        // Get writer info for validation
        const writerFid = req.user?.fid;
        const writerAddress = req.user?.address;
        const writerUserkey = buildUserkey(writerFid, writerAddress);

        if (!writerUserkey) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check writer's Ethos score
        const writerProfile = await ethosClient.getProfile(writerUserkey);
        if (!writerProfile || writerProfile.score < MIN_WRITE_SCORE) {
            return res.status(403).json({
                error: 'Ethos score too low',
                message: `You need at least ${MIN_WRITE_SCORE} Ethos score (Known) to vouch.`,
                currentScore: writerProfile?.score || 0,
            });
        }

        const result = await ethosClient.createVouchLink({
            writerFid: writerFid || 0,
            writerAddress: writerAddress || '',
            targetFid,
            targetAddress,
            writeType: 'vouch',
        });

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            deepLink: result.deepLink,
            message: 'Vouch link generated. Vouching requires staking ETH on Ethos.',
        });
    } catch (error) {
        console.error('Error generating vouch link:', error);
        res.status(500).json({ error: 'Failed to generate vouch link' });
    }
});

/**
 * GET /api/ethos/eligibility
 * Check if current user is eligible to write reviews
 */
router.get('/eligibility', optionalQuickAuth, async (req: Request, res: Response) => {
    try {
        const writerFid = req.user?.fid;
        const writerAddress = req.user?.address;

        if (!writerFid && !writerAddress) {
            return res.json({
                eligible: false,
                reason: 'authentication_required',
                message: 'Please connect your wallet to check eligibility.',
                ethos: {
                    score: 0,
                    band: 'Unknown',
                    eligible: false,
                    required: MIN_WRITE_SCORE,
                },
                nakama: {
                    tier: 0,
                    eligible: false,
                    required: MIN_WRITE_TIER,
                },
                rateLimit: {
                    used: 0,
                    remaining: 0,
                    eligible: false,
                },
            });
        }

        const writerUserkey = buildUserkey(writerFid, writerAddress);
        if (!writerUserkey) {
            return res.json({
                eligible: false,
                reason: 'invalid_identity',
            });
        }

        // Check Ethos score
        const profile = await ethosClient.getProfile(writerUserkey);
        const ethosScore = profile?.score || 0;
        const ethosBand = profile?.band || 'Unknown';
        const ethosEligible = ethosScore >= MIN_WRITE_SCORE;

        // Check Nakama tier
        let nakamaTier = 0;
        if (writerAddress) {
            const positionResult = await pool.query(
                `SELECT MAX(tier) as max_tier FROM positions WHERE LOWER(user_address) = LOWER($1)`,
                [writerAddress]
            );
            nakamaTier = positionResult.rows[0]?.max_tier || 0;
        }
        const nakamaEligible = nakamaTier >= MIN_WRITE_TIER;

        // Check rate limit
        const rateStatus = await ethosClient.getRateLimitStatus(writerUserkey, 'review');
        const rateEligible = rateStatus.remaining > 0;

        const eligible = ethosEligible && nakamaEligible && rateEligible;

        res.json({
            eligible,
            ethos: {
                score: ethosScore,
                band: ethosBand,
                eligible: ethosEligible,
                required: MIN_WRITE_SCORE,
            },
            nakama: {
                tier: nakamaTier,
                eligible: nakamaEligible,
                required: MIN_WRITE_TIER,
            },
            rateLimit: {
                used: rateStatus.used,
                remaining: rateStatus.remaining,
                eligible: rateEligible,
            },
        });
    } catch (error) {
        console.error('Error checking eligibility:', error);
        res.status(500).json({ error: 'Failed to check eligibility' });
    }
});

export default router;
