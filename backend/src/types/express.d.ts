import type { JWTPayload } from '@farcaster/quick-auth';

type QuickAuthPayload = JWTPayload & Record<string, unknown>;

declare global {
    namespace Express {
        interface Request {
            quickAuth?: {
                fid: number;
                payload: QuickAuthPayload;
                token: string;
                domain: string;
            };
            // Used by Quick Auth middleware for simplified access
            user?: {
                fid?: number;
                address?: string;
            };
        }
    }
}

export { };

