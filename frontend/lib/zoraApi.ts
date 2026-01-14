/**
 * Zora Coins API Service
 * Fetches creator coin data from Zora protocol
 */

export interface ZoraCoinData {
    name: string;
    symbol: string;
    description: string;
    address: string;
    coinType: string;
    totalSupply: string;
    marketCap: string;
    volume24h: string;
    uniqueHolders: number;
    createdAt: string;
    creatorAddress: string;
    creatorProfile: {
        handle: string;
        avatar?: {
            previewImage?: {
                small?: string;
                medium?: string;
            };
        };
    } | null;
    mediaContent?: {
        previewImage?: {
            small?: string;
            medium?: string;
        };
    };
}

export async function getZoraCoin(address: string): Promise<ZoraCoinData | null> {
    try {
        const response = await fetch(
            `https://api-sdk.zora.engineering/coin?address=${address}&chain=8453`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 60 } // Cache for 60 seconds
            }
        );

        if (!response.ok) {
            console.error('Zora API error:', response.status);
            return null;
        }

        const data = await response.json();
        const token = data.zora20Token;

        if (!token) {
            return null;
        }

        return {
            name: token.name || '',
            symbol: token.symbol || '',
            description: token.description || '',
            address: token.address || address,
            coinType: token.coinType || 'CREATOR',
            totalSupply: token.totalSupply || '0',
            marketCap: token.marketCap || '0',
            volume24h: token.volume24h || '0',
            uniqueHolders: token.uniqueHolders || 0,
            createdAt: token.createdAt || '',
            creatorAddress: token.creatorAddress || '',
            creatorProfile: token.creatorProfile ? {
                handle: token.creatorProfile.handle || '',
                avatar: token.creatorProfile.avatar || undefined,
            } : null,
            mediaContent: token.mediaContent || undefined,
        };
    } catch (error) {
        console.error('Failed to fetch Zora coin data:', error);
        return null;
    }
}

/**
 * Search for a creator by handle/username and get their creator coin
 */
export interface ZoraProfileResult {
    handle: string;
    displayName: string;
    bio: string;
    avatar?: {
        previewImage?: {
            small?: string;
            medium?: string;
        };
    };
    creatorCoinAddress: string | null;
}

export async function searchZoraProfile(query: string): Promise<ZoraProfileResult | null> {
    try {
        // Clean up the query - remove @ if present
        const cleanQuery = query.replace(/^@/, '').trim().toLowerCase();

        if (!cleanQuery) return null;

        const response = await fetch(
            `https://api-sdk.zora.engineering/profile?identifier=${encodeURIComponent(cleanQuery)}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const profile = data.profile;

        if (!profile) {
            return null;
        }

        return {
            handle: profile.handle || cleanQuery,
            displayName: profile.displayName || profile.handle || cleanQuery,
            bio: profile.bio || '',
            avatar: profile.avatar || undefined,
            creatorCoinAddress: profile.creatorCoin?.address || null,
        };
    } catch (error) {
        console.error('Failed to search Zora profile:', error);
        return null;
    }
}

