'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { farcasterFrame } from '@farcaster/miniapp-wagmi-connector';
import { injected } from 'wagmi/connectors';

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
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
