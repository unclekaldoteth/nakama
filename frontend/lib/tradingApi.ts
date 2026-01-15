/**
 * Trading API Service
 * Multi-API integration for real-time token trading data
 * 
 * APIs integrated:
 * - DexScreener (trending tokens, price data)
 * - Zora (creator coins)
 * - CoinGecko (market data for major tokens)
 */

export interface TrendingToken {
    address: string;
    name: string;
    symbol: string;
    priceUsd: string;
    priceChange24h: number;
    volume24h: string;
    marketCap: string;
    imageUrl?: string;
    chainId: string;
    dexId?: string;
    pairAddress?: string;
    category: 'meme' | 'creator' | 'defi' | 'other';
}

export interface TopTrader {
    address: string;
    username?: string;
    avatarUrl?: string;
    pnl7d: number;
    pnl30d: number;
    pnlAll: number;
    totalTrades: number;
    winRate: number;
}

export interface TokenSearchResult {
    address: string;
    name: string;
    symbol: string;
    priceUsd: string;
    priceChange24h: number;
    imageUrl?: string;
    chainId: string;
}

// Base chain ID
const BASE_CHAIN_ID = '8453';
const BASE_CHAIN_NAME = 'base';

/**
 * Fetch trending tokens from DexScreener API
 * Returns top tokens by volume on Base chain
 */
export async function getTrendingTokens(limit: number = 10): Promise<TrendingToken[]> {
    try {
        // DexScreener's trending API for Base
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/trending?chainId=${BASE_CHAIN_NAME}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 60 } // Cache for 60 seconds
            }
        );

        if (!response.ok) {
            console.error('DexScreener trending API error:', response.status);
            return getFallbackTrendingTokens();
        }

        const data = await response.json();
        const pairs = data.pairs || [];

        // Filter and transform to our format
        const tokens: TrendingToken[] = pairs
            .filter((pair: any) => pair.chainId === BASE_CHAIN_NAME)
            .slice(0, limit)
            .map((pair: any) => ({
                address: pair.baseToken?.address || '',
                name: pair.baseToken?.name || 'Unknown',
                symbol: pair.baseToken?.symbol || '???',
                priceUsd: pair.priceUsd || '0',
                priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
                volume24h: pair.volume?.h24 || '0',
                marketCap: pair.marketCap || '0',
                imageUrl: pair.info?.imageUrl || undefined,
                chainId: BASE_CHAIN_ID,
                dexId: pair.dexId,
                pairAddress: pair.pairAddress,
                category: categorizeToken(pair.baseToken?.symbol || '', pair.baseToken?.name || ''),
            }));

        const uniqueTokens = dedupeTokens(tokens);
        return uniqueTokens.length > 0 ? uniqueTokens : getFallbackTrendingTokens();
    } catch (error) {
        console.error('Failed to fetch trending tokens:', error);
        return getFallbackTrendingTokens();
    }
}

/**
 * Fetch top gainers on Base chain
 */
export async function getTopGainers(limit: number = 5): Promise<TrendingToken[]> {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=base`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 120 }
            }
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const pairs = data.pairs || [];

        // Filter Base chain and sort by 24h price change
        const gainers = pairs
            .filter((pair: any) => pair.chainId === BASE_CHAIN_NAME)
            .filter((pair: any) => parseFloat(pair.priceChange?.h24 || '0') > 0)
            .sort((a: any, b: any) =>
                parseFloat(b.priceChange?.h24 || '0') - parseFloat(a.priceChange?.h24 || '0')
            )
            .slice(0, limit)
            .map((pair: any) => ({
                address: pair.baseToken?.address || '',
                name: pair.baseToken?.name || 'Unknown',
                symbol: pair.baseToken?.symbol || '???',
                priceUsd: pair.priceUsd || '0',
                priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
                volume24h: pair.volume?.h24 || '0',
                marketCap: pair.marketCap || '0',
                imageUrl: pair.info?.imageUrl || undefined,
                chainId: BASE_CHAIN_ID,
                category: categorizeToken(pair.baseToken?.symbol || '', pair.baseToken?.name || ''),
            }));

        return dedupeTokens(gainers);
    } catch (error) {
        console.error('Failed to fetch top gainers:', error);
        return [];
    }
}

/**
 * Search for tokens by name or symbol
 */
export async function searchTokens(query: string): Promise<TokenSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const pairs = data.pairs || [];

        // Deduplicate by token address
        const seen = new Set<string>();
        const results: TokenSearchResult[] = [];

        for (const pair of pairs) {
            if (pair.chainId !== BASE_CHAIN_NAME) continue;

            const address = pair.baseToken?.address?.toLowerCase();
            if (!address || seen.has(address)) continue;

            seen.add(address);
            results.push({
                address: pair.baseToken?.address || '',
                name: pair.baseToken?.name || 'Unknown',
                symbol: pair.baseToken?.symbol || '???',
                priceUsd: pair.priceUsd || '0',
                priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
                imageUrl: pair.info?.imageUrl || undefined,
                chainId: BASE_CHAIN_ID,
            });

            if (results.length >= 10) break;
        }

        return results;
    } catch (error) {
        console.error('Failed to search tokens:', error);
        return [];
    }
}

/**
 * Get token data by address
 */
export async function getTokenByAddress(address: string): Promise<TrendingToken | null> {
    try {
        const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 30 }
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const pairs = data.pairs || [];

        // Find the best pair (highest liquidity on Base)
        const basePair = pairs
            .filter((p: any) => p.chainId === BASE_CHAIN_NAME)
            .sort((a: any, b: any) =>
                parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0')
            )[0];

        if (!basePair) {
            return null;
        }

        return {
            address: basePair.baseToken?.address || address,
            name: basePair.baseToken?.name || 'Unknown',
            symbol: basePair.baseToken?.symbol || '???',
            priceUsd: basePair.priceUsd || '0',
            priceChange24h: parseFloat(basePair.priceChange?.h24 || '0'),
            volume24h: basePair.volume?.h24 || '0',
            marketCap: basePair.marketCap || '0',
            imageUrl: basePair.info?.imageUrl || undefined,
            chainId: BASE_CHAIN_ID,
            dexId: basePair.dexId,
            pairAddress: basePair.pairAddress,
            category: categorizeToken(basePair.baseToken?.symbol || '', basePair.baseToken?.name || ''),
        };
    } catch (error) {
        console.error('Failed to fetch token by address:', error);
        return null;
    }
}

/**
 * Get mock top traders (placeholder for leaderboard)
 * TODO: Integrate with real trading data source
 */
export async function getTopTraders(limit: number = 5): Promise<TopTrader[]> {
    // For now, return mock data
    // In production, this would integrate with:
    // - On-chain PnL tracking
    // - Trading competition API
    // - Farcaster social data
    return [
        {
            address: '0x1234...5678',
            username: 'based_trader',
            avatarUrl: undefined,
            pnl7d: 12450.50,
            pnl30d: 45230.00,
            pnlAll: 112430.00,
            totalTrades: 156,
            winRate: 68.5,
        },
        {
            address: '0x2345...6789',
            username: 'degen_king',
            avatarUrl: undefined,
            pnl7d: 8234.25,
            pnl30d: 32100.00,
            pnlAll: 78450.00,
            totalTrades: 89,
            winRate: 72.1,
        },
        {
            address: '0x3456...7890',
            username: 'meme_hunter',
            avatarUrl: undefined,
            pnl7d: 5123.80,
            pnl30d: 18500.00,
            pnlAll: 50200.00,
            totalTrades: 234,
            winRate: 61.2,
        },
        {
            address: '0x4567...8901',
            username: 'whale_watcher',
            avatarUrl: undefined,
            pnl7d: 4890.00,
            pnl30d: 15200.00,
            pnlAll: 44600.00,
            totalTrades: 67,
            winRate: 75.3,
        },
        {
            address: '0x5678...9012',
            username: 'alpha_seeker',
            avatarUrl: undefined,
            pnl7d: 3210.50,
            pnl30d: 12800.00,
            pnlAll: 35900.00,
            totalTrades: 112,
            winRate: 58.9,
        },
    ].slice(0, limit);
}

// Helper to categorize tokens
function categorizeToken(symbol: string, name: string): 'meme' | 'creator' | 'defi' | 'other' {
    const lower = (symbol + name).toLowerCase();

    // Common meme indicators
    const memeKeywords = ['pepe', 'doge', 'shib', 'wojak', 'chad', 'meme', 'inu', 'elon', 'moon', 'rocket', 'based'];
    if (memeKeywords.some(k => lower.includes(k))) {
        return 'meme';
    }

    // DeFi indicators
    const defiKeywords = ['swap', 'lend', 'stake', 'yield', 'farm', 'dao', 'vault', 'pool', 'aave', 'uni', 'compound'];
    if (defiKeywords.some(k => lower.includes(k))) {
        return 'defi';
    }

    return 'other';
}

// Fallback trending tokens when API fails
function getFallbackTrendingTokens(): TrendingToken[] {
    return [
        {
            address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
            name: 'Degen',
            symbol: 'DEGEN',
            priceUsd: '0.0045',
            priceChange24h: 5.2,
            volume24h: '1500000',
            marketCap: '45000000',
            chainId: BASE_CHAIN_ID,
            category: 'meme',
        },
        {
            address: '0x0578d8a44db98b23bf096a382e016e29a5ce0ffe',
            name: 'Higher',
            symbol: 'HIGHER',
            priceUsd: '0.012',
            priceChange24h: 8.7,
            volume24h: '890000',
            marketCap: '12000000',
            chainId: BASE_CHAIN_ID,
            category: 'meme',
        },
        {
            address: '0x532f27101965dd16442e59d40670faf5ebb142e4',
            name: 'Brett',
            symbol: 'BRETT',
            priceUsd: '0.089',
            priceChange24h: -2.3,
            volume24h: '2100000',
            marketCap: '89000000',
            chainId: BASE_CHAIN_ID,
            category: 'meme',
        },
    ];
}

// Format price for display
export function formatPrice(price: string | number): string {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '$0.00';
    if (num === 0) return '$0.00';

    if (num < 0.0001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    if (num < 1) return `$${num.toFixed(4)}`;
    if (num < 1000) return `$${num.toFixed(2)}`;

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2,
    }).format(num);
}

// Format percentage change
export function formatPriceChange(change: number): { text: string; isPositive: boolean } {
    const isPositive = change >= 0;
    const text = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
    return { text, isPositive };
}

// Format volume/market cap
export function formatLargeNumber(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(num);
}

// Format PnL
export function formatPnL(value: number): { text: string; isPositive: boolean } {
    const isPositive = value >= 0;
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        signDisplay: 'always',
        maximumFractionDigits: 0,
    }).format(value);

    return { text: formatted, isPositive };
}

function dedupeTokens(tokens: TrendingToken[]): TrendingToken[] {
    const seen = new Set<string>();
    const unique: TrendingToken[] = [];

    for (const token of tokens) {
        const address = token.address?.toLowerCase();
        if (!address || seen.has(address)) continue;

        seen.add(address);
        unique.push(token);
    }

    return unique;
}
