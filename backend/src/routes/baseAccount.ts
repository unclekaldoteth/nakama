import { Router, Request, Response } from 'express';
import { getSubscriptionStatus, prepareCharge } from '@base-org/account/payment/node';

type SubscriptionStatusBody = {
    id?: string;
    testnet?: boolean;
    rpcUrl?: string;
};

type PrepareChargeBody = {
    id?: string;
    amount?: string;
    testnet?: boolean;
    recipient?: string;
    rpcUrl?: string;
};

const router = Router();

router.post('/subscription/status', async (req: Request, res: Response) => {
    try {
        const { id, testnet, rpcUrl } = (req.body || {}) as SubscriptionStatusBody;
        if (!id) {
            return res.status(400).json({ error: 'Subscription id is required' });
        }
        const status = await getSubscriptionStatus({
            id,
            testnet,
            rpcUrl,
        });
        return res.json({ status });
    } catch (error) {
        console.error('Base Account subscription status error:', error);
        return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
});

router.post('/subscription/prepare-charge', async (req: Request, res: Response) => {
    try {
        const { id, amount, testnet, recipient, rpcUrl } = (req.body || {}) as PrepareChargeBody;
        if (!id || !amount) {
            return res.status(400).json({ error: 'Subscription id and amount are required' });
        }
        const calls = await prepareCharge({
            id,
            amount,
            testnet,
            recipient,
            rpcUrl,
        });
        return res.json({ calls });
    } catch (error) {
        console.error('Base Account prepare charge error:', error);
        return res.status(500).json({ error: 'Failed to prepare subscription charge' });
    }
});

export default router;
