'use client';

import { ConnectWallet } from '@coinbase/onchainkit/wallet';

/**
 * A button component that triggers wallet connection.
 * Used as fallback when auto-connect doesn't work.
 */
export function ConnectWalletButton() {
    return (
        <ConnectWallet
            render={({ onClick, status, isLoading }) => {
                if (status === 'connected') {
                    return null;
                }

                return (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="btn btn-primary"
                            onClick={onClick}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                maxWidth: '280px',
                            }}
                        >
                            {isLoading ? 'Connecting...' : '🔗 Connect Wallet'}
                        </button>
                    </div>
                );
            }}
        />
    );
}
