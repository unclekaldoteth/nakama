'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { getAddress } from 'viem';

// Define the context type based on SDK usage
type FrameContextType = Awaited<typeof sdk.context>;

interface MiniAppContextType {
    isReady: boolean;
    context: FrameContextType | null;
    isInMiniApp: boolean;
    user: {
        fid: number | null;
        username: string | null;
        displayName: string | null;
        pfpUrl: string | null;
    } | null;
    authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    actions: {
        swapToken: (tokenAddress: string, chainId?: number) => Promise<void>;
        composeCast: (text: string, embeds?: string[]) => Promise<void>;
        viewProfile: (fid: number) => Promise<void>;
        addMiniApp: () => Promise<void>;
    };
}

const MiniAppContext = createContext<MiniAppContextType | null>(null);
const DEFAULT_SWAP_CHAIN_ID = (() => {
    const envValue = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
    return Number.isFinite(envValue) && envValue > 0 ? envValue : 8453;
})();
const SWAP_CHAIN_SLUGS: Record<number, string> = {
    8453: 'base',
    84532: 'base-sepolia',
};

export function MiniAppProvider({ children }: { children: ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [context, setContext] = useState<FrameContextType | null>(null);
    const [isInMiniApp, setIsInMiniApp] = useState(false);

    useEffect(() => {
        const initMiniApp = async () => {
            try {
                // Get context from SDK
                const frameContext = await sdk.context;
                setContext(frameContext);
                setIsInMiniApp(true);

                // Signal that app is ready
                await sdk.actions.ready();
                setIsReady(true);
            } catch (error) {
                // Not in Mini App context, running standalone
                console.log('Not in Mini App context, running standalone');
                setIsInMiniApp(false);
                setIsReady(true);
            }
        };

        initMiniApp();
    }, []);

    const user = context?.user ? {
        fid: context.user.fid,
        username: context.user.username || null,
        displayName: context.user.displayName || null,
        pfpUrl: context.user.pfpUrl || null,
    } : null;

    const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (!isInMiniApp) {
            return fetch(input, init);
        }
        try {
            return await sdk.quickAuth.fetch(input, init);
        } catch (error) {
            console.error('quickAuth fetch error:', error);
            return fetch(input, init);
        }
    }, [isInMiniApp]);

    const actions = {
        swapToken: async (tokenAddress: string, chainId?: number) => {
            const resolvedChainId = Number.isFinite(chainId) && chainId ? chainId : DEFAULT_SWAP_CHAIN_ID;
            const normalizedAddress = (() => {
                try {
                    return getAddress(tokenAddress);
                } catch {
                    return tokenAddress;
                }
            })();
            const chainSlug = SWAP_CHAIN_SLUGS[resolvedChainId] ?? SWAP_CHAIN_SLUGS[8453];
            const swapUrl = `https://app.uniswap.org/#/swap?outputCurrency=${normalizedAddress}&chain=${chainSlug}`;

            if (!isInMiniApp) {
                // Fallback: open external swap
                window.open(swapUrl, '_blank');
                return;
            }
            try {
                const buyToken = `eip155:${resolvedChainId}/erc20:${normalizedAddress}`;
                const result = await sdk.actions.swapToken({ buyToken });
                if (!result?.success) {
                    throw new Error(result?.reason || 'swapToken failed');
                }
            } catch (error) {
                try {
                    await sdk.actions.openUrl(swapUrl);
                } catch (fallbackError) {
                    console.error('swapToken/openUrl not supported:', fallbackError);
                    window.open(swapUrl, '_blank');
                }
            }
        },

        composeCast: async (text: string, embeds?: string[]) => {
            if (!isInMiniApp) {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(text);
                alert('Text copied to clipboard!');
                return;
            }
            try {
                const castEmbeds = embeds?.slice(0, 2) as [] | [string] | [string, string] | undefined;
                await sdk.actions.composeCast({
                    text,
                    embeds: castEmbeds
                });
            } catch (error) {
                console.error('composeCast error:', error);
            }
        },

        viewProfile: async (fid: number) => {
            if (!isInMiniApp) {
                window.open(`https://warpcast.com/~/profiles/${fid}`, '_blank');
                return;
            }
            try {
                await sdk.actions.viewProfile({ fid });
            } catch (error) {
                console.error('viewProfile error:', error);
            }
        },

        addMiniApp: async () => {
            if (!isInMiniApp) {
                return;
            }
            try {
                const actions = sdk.actions as typeof sdk.actions & {
                    addMiniApp?: () => Promise<void>;
                    addFrame?: () => Promise<void>;
                };
                if (actions.addMiniApp) {
                    await actions.addMiniApp();
                } else if (actions.addFrame) {
                    await actions.addFrame();
                }
            } catch (error) {
                console.error('addMiniApp error:', error);
            }
        },
    };

    return (
        <MiniAppContext.Provider value={{ isReady, context, isInMiniApp, user, authFetch, actions }}>
            {children}
        </MiniAppContext.Provider>
    );
}

export function useMiniApp() {
    const context = useContext(MiniAppContext);
    if (!context) {
        throw new Error('useMiniApp must be used within a MiniAppProvider');
    }
    return context;
}
