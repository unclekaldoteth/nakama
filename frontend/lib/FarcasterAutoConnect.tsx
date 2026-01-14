'use client';

import { useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';

/**
 * Auto-connects to Farcaster wallet when inside Mini App
 * This hook should be used at the app level
 */
export function useFarcasterAutoConnect() {
    const { connect, connectors } = useConnect();
    const { isConnected } = useAccount();

    useEffect(() => {
        if (isConnected) return;

        // Find the farcaster connector (ID is 'farcaster' in v1.1.0+)
        const farcasterConnector = connectors.find(
            (connector) => connector.id === 'farcaster'
        );

        if (farcasterConnector) {
            // Auto-connect using Farcaster connector
            connect(
                { connector: farcasterConnector },
                {
                    onError: (error) => {
                        console.log('Farcaster auto-connect not available:', error.message);
                    },
                }
            );
        }
    }, [connect, connectors, isConnected]);
}

/**
 * Component wrapper that auto-connects on mount
 */
export function FarcasterAutoConnect({ children }: { children: React.ReactNode }) {
    useFarcasterAutoConnect();
    return <>{children}</>;
}
