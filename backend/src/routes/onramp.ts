import { Router, Request, Response } from 'express';
import https from 'https';
import { URL } from 'url';

type SessionTokenRequestBody = {
    address?: string;
    addresses?: string[];
    blockchain?: string;
    assets?: string[];
    partnerUserId?: string;
    redirectUrl?: string;
};

type SessionTokenApiResponse = {
    token?: string;
    session_token?: string;
    sessionToken?: string;
};

const router = Router();

function requestJson<T>(url: string, body: Record<string, unknown>, apiKey: string): Promise<{ status: number; data: T }> {
    const target = new URL(url);
    const payload = JSON.stringify(body);

    const options = {
        method: 'POST',
        hostname: target.hostname,
        path: `${target.pathname}${target.search}`,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload).toString(),
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode || 500, data: parsed as T });
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

router.post('/session-token', async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.CDP_API_KEY || process.env.ONRAMP_API_KEY;
        const projectId = process.env.CDP_PROJECT_ID || process.env.ONRAMP_PROJECT_ID;
        const baseUrl = process.env.ONRAMP_API_BASE_URL || 'https://api.developer.coinbase.com/onramp/v1';

        if (!apiKey || !projectId) {
            return res.status(500).json({ error: 'Onramp API not configured' });
        }

        const {
            address,
            addresses,
            blockchain = 'base',
            assets,
            partnerUserId,
            redirectUrl,
        } = (req.body || {}) as SessionTokenRequestBody;

        const resolvedAddresses = (addresses && addresses.length > 0)
            ? addresses
            : (address ? [address] : []);

        if (resolvedAddresses.length === 0) {
            return res.status(400).json({ error: 'Address is required to create a session token' });
        }

        const payload: Record<string, unknown> = {
            project_id: projectId,
            addresses: resolvedAddresses.map((walletAddress) => ({
                address: walletAddress,
                blockchains: [blockchain],
            })),
            assets: assets && assets.length > 0 ? assets : ['USDC'],
        };

        if (partnerUserId) {
            payload.partner_user_id = partnerUserId;
        }

        if (redirectUrl) {
            payload.redirect_url = redirectUrl;
        }

        const response = await requestJson<SessionTokenApiResponse>(`${baseUrl}/token`, payload, apiKey);

        if (response.status >= 400) {
            return res.status(502).json({ error: 'Failed to create onramp session token' });
        }

        const sessionToken = response.data.token || response.data.session_token || response.data.sessionToken;
        if (!sessionToken) {
            return res.status(502).json({ error: 'Onramp session token missing in response' });
        }

        return res.json({ sessionToken });
    } catch (error) {
        console.error('Onramp session token error:', error);
        return res.status(500).json({ error: 'Failed to create session token' });
    }
});

export default router;
