import type { Request } from 'express';
import type { Pool } from 'pg';

function getAddressFromPayload(payload?: Record<string, unknown>): string | null {
    if (!payload) return null;
    const candidates = ['address', 'custodyAddress', 'authAddress', 'walletAddress'];
    for (const key of candidates) {
        const value = payload[key];
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
    }
    return null;
}

export async function resolveUserAddress(
    req: Request,
    pool: Pool,
    allowFallback = false
): Promise<string | null> {
    if (req.quickAuth) {
        const fromToken = getAddressFromPayload(req.quickAuth.payload);
        if (fromToken) return fromToken;

        const result = await pool.query(
            'SELECT address FROM users WHERE fid = $1 LIMIT 1',
            [req.quickAuth.fid]
        );

        if (result.rows.length > 0) {
            return result.rows[0].address as string;
        }

        if (!allowFallback) {
            return null;
        }
    }

    const headerAddress = req.headers['x-user-address'] as string | undefined;
    const queryAddress = req.query.address as string | undefined;
    return headerAddress || queryAddress || null;
}
