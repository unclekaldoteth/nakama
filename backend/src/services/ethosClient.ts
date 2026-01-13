/**
 * Ethos Network API Client
 * READ + WRITE integration for Nakama Vibeathon
 */

import { Pool } from 'pg';
import crypto from 'crypto';

const ETHOS_API_BASE = 'https://api.ethos.network';
const ETHOS_CLIENT_HEADER = 'nakama@1.0.0';
const CACHE_TTL_HOURS = 6;

// Credibility bands based on Ethos score
export const ETHOS_BANDS = {
    Neutral: { min: 1200, max: 1399, weight: 1.0, color: '#666666' },
    Known: { min: 1400, max: 1599, weight: 1.1, color: '#3B82F6' },
    Established: { min: 1600, max: 1799, weight: 1.2, color: '#10B981' },
    Reputable: { min: 1800, max: 2199, weight: 1.3, color: '#8B5CF6' },
    Exemplary: { min: 2200, max: 2800, weight: 1.4, color: '#F59E0B' },
} as const;

export type EthosBand = keyof typeof ETHOS_BANDS;

// API Response interfaces
interface EthosUserStatsResponse {
    score?: number;
    reviewStats?: { received?: number; given?: number };
    vouchStats?: { received?: number; given?: number };
}

interface EthosBulkUserResponse {
    users?: Array<{ userkey: string; score?: number }>;
}

interface EthosReviewResponse {
    id?: string;
}

export interface EthosProfile {
    userkey: string;
    fid?: number;
    address?: string;
    score: number;
    band: EthosBand;
    reviewCount: number;
    vouchCount: number;
    lastFetchedAt: Date;
}

export interface EthosWriteRequest {
    writerFid: number;
    writerAddress: string;
    targetFid?: number;
    targetAddress?: string;
    writeType: 'review' | 'vouch';
    rating?: 'positive' | 'neutral' | 'negative';
    comment?: string;
}

export interface EthosWriteResult {
    success: boolean;
    receiptId?: string;
    error?: string;
    deepLink?: string;
}

/**
 * Get Ethos band from score
 */
export function getBandFromScore(score: number): EthosBand {
    if (score >= 2200) return 'Exemplary';
    if (score >= 1800) return 'Reputable';
    if (score >= 1600) return 'Established';
    if (score >= 1400) return 'Known';
    return 'Neutral';
}

/**
 * Get band weight for credibility calculations
 */
export function getBandWeight(band: EthosBand): number {
    return ETHOS_BANDS[band].weight;
}

/**
 * Build userkey from FID or address
 */
export function buildUserkey(fid?: number, address?: string): string | null {
    if (fid) return `service:farcaster:${fid}`;
    if (address) return `address:${address.toLowerCase()}`;
    return null;
}

export class EthosClient {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    /**
     * Fetch headers for Ethos API requests
     */
    private getHeaders(authToken?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Ethos-Client': ETHOS_CLIENT_HEADER,
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        return headers;
    }

    /**
     * Get cached Ethos profile or fetch from API
     */
    async getProfile(userkey: string, forceRefresh = false): Promise<EthosProfile | null> {
        // Check cache first
        if (!forceRefresh) {
            const cached = await this.getCached(userkey);
            if (cached) {
                const age = Date.now() - cached.lastFetchedAt.getTime();
                const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000;
                if (age < ttlMs) {
                    return cached;
                }
            }
        }

        // Fetch from Ethos API
        try {
            const response = await fetch(`${ETHOS_API_BASE}/api/v1/users/${encodeURIComponent(userkey)}/stats`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                console.warn(`Ethos API returned ${response.status} for ${userkey}`);
                return this.getCached(userkey); // Return stale cache if available
            }

            const data = await response.json() as EthosUserStatsResponse;
            const score = data.score || 1200;
            const band = getBandFromScore(score);

            const profile: EthosProfile = {
                userkey,
                score,
                band,
                reviewCount: data.reviewStats?.received || 0,
                vouchCount: data.vouchStats?.received || 0,
                lastFetchedAt: new Date(),
            };

            // Parse FID or address from userkey
            if (userkey.startsWith('service:farcaster:')) {
                profile.fid = parseInt(userkey.split(':')[2], 10);
            } else if (userkey.startsWith('address:')) {
                profile.address = userkey.split(':')[1];
            }

            // Cache the result
            await this.cacheProfile(profile, data);

            return profile;
        } catch (error) {
            console.error(`Error fetching Ethos profile for ${userkey}:`, error);
            return this.getCached(userkey);
        }
    }

    /**
     * Get profile by FID
     */
    async getProfileByFid(fid: number, forceRefresh = false): Promise<EthosProfile | null> {
        const userkey = buildUserkey(fid);
        return userkey ? this.getProfile(userkey, forceRefresh) : null;
    }

    /**
     * Get profile by address
     */
    async getProfileByAddress(address: string, forceRefresh = false): Promise<EthosProfile | null> {
        const userkey = buildUserkey(undefined, address);
        return userkey ? this.getProfile(userkey, forceRefresh) : null;
    }

    /**
     * Bulk lookup profiles (with caching)
     */
    async bulkLookup(userkeys: string[]): Promise<Map<string, EthosProfile>> {
        const results = new Map<string, EthosProfile>();
        const toFetch: string[] = [];

        // Check cache first
        for (const userkey of userkeys) {
            const cached = await this.getCached(userkey);
            if (cached) {
                const age = Date.now() - cached.lastFetchedAt.getTime();
                const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000;
                if (age < ttlMs) {
                    results.set(userkey, cached);
                    continue;
                }
            }
            toFetch.push(userkey);
        }

        // Fetch missing from API (in batches of 20)
        const batchSize = 20;
        for (let i = 0; i < toFetch.length; i += batchSize) {
            const batch = toFetch.slice(i, i + batchSize);
            try {
                const response = await fetch(`${ETHOS_API_BASE}/api/v1/users/bulk`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({ userkeys: batch }),
                });

                if (response.ok) {
                    const data = await response.json() as EthosBulkUserResponse;
                    for (const user of data.users || []) {
                        const score = user.score || 1200;
                        const profile: EthosProfile = {
                            userkey: user.userkey,
                            score,
                            band: getBandFromScore(score),
                            reviewCount: 0,
                            vouchCount: 0,
                            lastFetchedAt: new Date(),
                        };
                        results.set(user.userkey, profile);
                        await this.cacheProfile(profile, user);
                    }
                }
            } catch (error) {
                console.error('Bulk lookup error:', error);
            }
        }

        // Fill in with neutral defaults for missing
        for (const userkey of userkeys) {
            if (!results.has(userkey)) {
                results.set(userkey, {
                    userkey,
                    score: 1200,
                    band: 'Neutral',
                    reviewCount: 0,
                    vouchCount: 0,
                    lastFetchedAt: new Date(),
                });
            }
        }

        return results;
    }

    /**
     * Get cached profile from database
     */
    private async getCached(userkey: string): Promise<EthosProfile | null> {
        const result = await this.pool.query(
            `SELECT userkey, fid, address, score, band, review_count, vouch_count, last_fetched_at
       FROM ethos_cache WHERE userkey = $1`,
            [userkey]
        );
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            userkey: row.userkey,
            fid: row.fid,
            address: row.address,
            score: row.score,
            band: row.band as EthosBand,
            reviewCount: row.review_count,
            vouchCount: row.vouch_count,
            lastFetchedAt: new Date(row.last_fetched_at),
        };
    }

    /**
     * Cache profile in database
     */
    private async cacheProfile(profile: EthosProfile, rawPayload?: unknown): Promise<void> {
        await this.pool.query(
            `INSERT INTO ethos_cache (userkey, fid, address, score, band, review_count, vouch_count, payload_json, last_fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (userkey) DO UPDATE SET
         score = $4, band = $5, review_count = $6, vouch_count = $7, 
         payload_json = $8, last_fetched_at = NOW()`,
            [
                profile.userkey,
                profile.fid || null,
                profile.address || null,
                profile.score,
                profile.band,
                profile.reviewCount,
                profile.vouchCount,
                rawPayload ? JSON.stringify(rawPayload) : null,
            ]
        );
    }

    /**
     * Create a review (via Ethos API or deep link)
     */
    async createReview(request: EthosWriteRequest, authToken?: string): Promise<EthosWriteResult> {
        const writerUserkey = buildUserkey(request.writerFid, request.writerAddress);
        const targetUserkey = buildUserkey(request.targetFid, request.targetAddress);

        if (!writerUserkey || !targetUserkey) {
            return { success: false, error: 'Invalid writer or target' };
        }

        // Generate content hash for idempotency
        const contentHash = crypto
            .createHash('sha256')
            .update(`${writerUserkey}:${targetUserkey}:${request.writeType}:${request.rating}:${request.comment || ''}`)
            .digest('hex');

        // Check for duplicate
        const existingWrite = await this.pool.query(
            `SELECT id FROM ethos_writes WHERE content_hash = $1 AND created_at > NOW() - INTERVAL '7 days'`,
            [contentHash]
        );
        if (existingWrite.rows.length > 0) {
            return { success: false, error: 'Duplicate review within 7 days' };
        }

        // Try direct API call if we have auth token
        if (authToken) {
            try {
                const response = await fetch(`${ETHOS_API_BASE}/api/v1/reviews/create`, {
                    method: 'POST',
                    headers: this.getHeaders(authToken),
                    body: JSON.stringify({
                        subject: targetUserkey,
                        score: request.rating || 'positive',
                        comment: request.comment || '',
                        author: writerUserkey,
                    }),
                });

                if (response.ok) {
                    const data = await response.json() as EthosReviewResponse;
                    await this.logWrite(writerUserkey, targetUserkey, request, contentHash, data.id, 'confirmed');
                    return { success: true, receiptId: data.id };
                }
            } catch (error) {
                console.error('Direct review creation failed:', error);
            }
        }

        // Fallback: generate deep link
        const deepLink = `https://ethos.network/profile/${encodeURIComponent(targetUserkey)}/review`;
        await this.logWrite(writerUserkey, targetUserkey, request, contentHash, undefined, 'pending');

        return {
            success: true,
            deepLink,
            receiptId: contentHash,
        };
    }

    /**
     * Generate vouch deep link (vouching requires on-chain ETH stake)
     */
    async createVouchLink(request: EthosWriteRequest): Promise<EthosWriteResult> {
        const targetUserkey = buildUserkey(request.targetFid, request.targetAddress);
        if (!targetUserkey) {
            return { success: false, error: 'Invalid target' };
        }

        const deepLink = `https://ethos.network/profile/${encodeURIComponent(targetUserkey)}/vouch`;
        return { success: true, deepLink };
    }

    /**
     * Log write attempt for audit
     */
    private async logWrite(
        writerUserkey: string,
        targetUserkey: string,
        request: EthosWriteRequest,
        contentHash: string,
        receiptId?: string,
        status = 'pending'
    ): Promise<void> {
        await this.pool.query(
            `INSERT INTO ethos_writes 
       (writer_userkey, writer_fid, target_userkey, target_fid, write_type, rating, content_text, content_hash, ethos_receipt_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                writerUserkey,
                request.writerFid || null,
                targetUserkey,
                request.targetFid || null,
                request.writeType,
                request.rating || null,
                request.comment || null,
                contentHash,
                receiptId || null,
                status,
            ]
        );
    }

    /**
     * Check rate limit for writes (3/day)
     */
    async checkRateLimit(userkey: string, actionType: string, maxPerDay = 3): Promise<boolean> {
        const today = new Date().toISOString().slice(0, 10);

        const result = await this.pool.query(
            `INSERT INTO rate_limits (userkey, action_type, window_key, count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (userkey, action_type, window_key)
       DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
            [userkey, actionType, today]
        );

        return result.rows[0].count <= maxPerDay;
    }

    /**
     * Get rate limit status
     */
    async getRateLimitStatus(userkey: string, actionType: string): Promise<{ used: number; remaining: number }> {
        const today = new Date().toISOString().slice(0, 10);
        const maxPerDay = 3;

        const result = await this.pool.query(
            `SELECT count FROM rate_limits WHERE userkey = $1 AND action_type = $2 AND window_key = $3`,
            [userkey, actionType, today]
        );

        const used = result.rows.length > 0 ? result.rows[0].count : 0;
        return { used, remaining: Math.max(0, maxPerDay - used) };
    }
}
