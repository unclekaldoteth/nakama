'use client';

import { useConnect, useAccount } from 'wagmi';
import { useState } from 'react';

/**
 * A button component that triggers wallet connection.
 * Used as fallback when auto-connect doesn't work.
 */
export function ConnectWalletButton() {
    const { connect, connectors, isPending } = useConnect();
    const { isConnected } = useAccount();
    const [error, setError] = useState<string | null>(null);

    if (isConnected) {
        return null;
    }

    const handleConnect = () => {
        setError(null);

        // Find the farcaster connector first (ID is 'farcaster' in v1.1.0+), fallback to injected
        const farcasterConnector = connectors.find(
            (connector) => connector.id === 'farcaster'
        );
        const injectedConnector = connectors.find(
            (connector) => connector.id === 'injected'
        );

        const connector = farcasterConnector || injectedConnector || connectors[0];

        if (connector) {
            connect(
                { connector },
                {
                    onError: (err) => {
                        console.error('Wallet connection failed:', err);
                        setError('Failed to connect wallet. Please try again.');
                    },
                }
            );
        } else {
            setError('No wallet connector available');
        }
    };

    return (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={isPending}
                style={{
                    width: '100%',
                    maxWidth: '280px',
                }}
            >
                {isPending ? 'Connecting...' : '🔗 Connect Wallet'}
            </button>
            {error && (
                <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
                    {error}
                </p>
            )}
        </div>
    );
}
