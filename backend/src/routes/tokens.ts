/**
 * Token Search Routes
 * Proxy to Clanker API for creator coin discovery
 */

import { Router, Request, Response } from 'express';

const router = Router();

const CLANKER_API_BASE = 'https://clanker.world/api';

interface ClankerToken {
    contract_address: string;
    name: string;
    symbol: string;
    img_url?: string;
    chain_id: number;
    deployed_at: string;
}

/**
 * Search creator coins via Clanker API
 * GET /api/tokens/search?q=<query>&limit=20
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { q, limit = '20' } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }

        // Search by Farcaster username or wallet address
        const url = `${CLANKER_API_BASE}/search-creator?q=${encodeURIComponent(q)}&limit=${limit}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`Clanker API error: ${response.status}`);
            return res.status(response.status).json({ error: 'Failed to fetch from Clanker' });
        }

        const data = await response.json() as { tokens?: ClankerToken[] } | ClankerToken[];

        // Normalize the response
        const rawTokens = Array.isArray(data) ? data : (data.tokens || []);
        const tokens: ClankerToken[] = rawTokens.map((token: any) => ({
            contract_address: token.contract_address || token.address,
            name: token.name,
            symbol: token.symbol,
            img_url: token.img_url || token.image,
            chain_id: token.chain_id || 8453, // Default to Base mainnet
            deployed_at: token.deployed_at,
        }));

        res.json({
            tokens,
            total: tokens.length,
        });
    } catch (error) {
        console.error('Token search error:', error);
        res.status(500).json({ error: 'Failed to search tokens' });
    }
});

/**
 * Get trending/popular creator coins
 * GET /api/tokens/trending?limit=10
 */
router.get('/trending', async (_req: Request, res: Response) => {
    try {
        // For now, return a static list of popular Base creator coins
        // In production, could integrate with Clanker trending endpoint
        const trendingTokens: ClankerToken[] = [
            {
                contract_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                name: 'USD Coin',
                symbol: 'USDC',
                chain_id: 8453,
                deployed_at: '2023-07-01',
            },
            // Add more trending tokens as needed
        ];

        res.json({
            tokens: trendingTokens,
            total: trendingTokens.length,
        });
    } catch (error) {
        console.error('Trending tokens error:', error);
        res.status(500).json({ error: 'Failed to fetch trending tokens' });
    }
});

export default router;
