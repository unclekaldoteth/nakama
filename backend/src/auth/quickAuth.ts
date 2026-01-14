import type { NextFunction, Request, Response } from 'express';
import { createClient } from '@farcaster/quick-auth';
import type { JWTPayload } from '@farcaster/quick-auth';

type QuickAuthPayload = JWTPayload & Record<string, unknown>;

const quickAuthClient = createClient({
    origin: process.env.QUICK_AUTH_ORIGIN,
});

function normalizeDomain(value?: string): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        if (trimmed.includes('://')) {
            return new URL(trimmed).host;
        }
    } catch {
        return null;
    }
    return trimmed;
}

function getCandidateDomains(req: Request): string[] {
    const domains: string[] = [];

    if (process.env.QUICK_AUTH_DOMAIN) {
        for (const entry of process.env.QUICK_AUTH_DOMAIN.split(',')) {
            const normalized = normalizeDomain(entry);
            if (normalized) domains.push(normalized);
        }
    }

    if (domains.length === 0 && process.env.FRONTEND_URL) {
        for (const entry of process.env.FRONTEND_URL.split(',')) {
            const normalized = normalizeDomain(entry);
            if (normalized) domains.push(normalized);
        }
    }

    if (req.headers.origin) {
        const normalized = normalizeDomain(req.headers.origin);
        if (normalized) domains.push(normalized);
    }

    if (domains.length === 0 && req.headers.host) {
        const normalized = normalizeDomain(req.headers.host);
        if (normalized) domains.push(normalized);
    }

    return Array.from(new Set(domains));
}

function getBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
}

async function verifyTokenForDomains(
    token: string,
    domains: string[]
): Promise<{ payload: QuickAuthPayload; domain: string }> {
    let lastError: unknown;
    for (const domain of domains) {
        try {
            const payload = await quickAuthClient.verifyJwt({ token, domain });
            return { payload, domain };
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ?? new Error('Unable to verify Quick Auth token');
}

export async function requireQuickAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Authorization required' });
        }

        const domains = getCandidateDomains(req);
        if (domains.length === 0) {
            return res.status(500).json({ error: 'Quick Auth domain not configured' });
        }

        const { payload, domain } = await verifyTokenForDomains(token, domains);
        const fid = Number(payload.sub);
        if (!Number.isFinite(fid)) {
            return res.status(401).json({ error: 'Invalid Quick Auth token' });
        }

        req.quickAuth = { fid, payload, token, domain };
        req.user = { fid, address: payload.address as string | undefined };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid Quick Auth token' });
    }
}

export async function optionalQuickAuth(req: Request, res: Response, next: NextFunction) {
    const token = getBearerToken(req);
    if (!token) return next();

    try {
        const domains = getCandidateDomains(req);
        if (domains.length === 0) {
            return res.status(500).json({ error: 'Quick Auth domain not configured' });
        }

        const { payload, domain } = await verifyTokenForDomains(token, domains);
        const fid = Number(payload.sub);
        if (!Number.isFinite(fid)) {
            return res.status(401).json({ error: 'Invalid Quick Auth token' });
        }

        req.quickAuth = { fid, payload, token, domain };
        req.user = { fid, address: payload.address as string | undefined };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid Quick Auth token' });
    }
}
