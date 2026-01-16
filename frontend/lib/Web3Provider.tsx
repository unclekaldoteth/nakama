'use client';

import { OnchainKitProvider, type AppConfig } from '@coinbase/onchainkit';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { farcasterFrame } from '@farcaster/miniapp-wagmi-connector';
import { injected } from 'wagmi/connectors';

const onchainKitChain = (() => {
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
    if (Number.isFinite(chainId) && chainId === baseSepolia.id) {
        return baseSepolia;
    }
    return base;
})();

const onchainKitConfig: AppConfig = {
    appearance: {
        name: 'Conviction Vault',
        logo: '/og-image.svg',
        mode: 'dark',
        theme: 'default',
    },
    wallet: {
        display: 'classic',
    },
};

const onchainKitApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
const onchainKitProjectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;
const onchainKitRpcUrl = process.env.NEXT_PUBLIC_ONCHAINKIT_RPC_URL;

const config = createConfig({
    chains: [base, baseSepolia],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
    connectors: [
        // Farcaster Mini App connector - auto-connects inside Mini App
        farcasterFrame(),
        // Fallback for browser testing
        injected(),
    ],
});

export function Web3Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider
                    apiKey={onchainKitApiKey}
                    chain={onchainKitChain}
                    config={onchainKitConfig}
                    projectId={onchainKitProjectId}
                    rpcUrl={onchainKitRpcUrl}
                >
                    {children}
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
