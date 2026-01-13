/**
 * Token Address Input Component
 * Paste a contract address to navigate to creator page
 * Validates ERC20 on-chain using wagmi
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAddress } from 'viem';
import { useReadContracts } from 'wagmi';

const erc20Abi = [
    { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
    { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
    { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

interface TokenInfo {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
}

export function TokenAddressInput() {
    const router = useRouter();
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

    const validAddress = isAddress(address) ? address as `0x${string}` : undefined;

    // Read ERC20 metadata on-chain
    const { data, isLoading, isError } = useReadContracts({
        contracts: validAddress ? [
            { address: validAddress, abi: erc20Abi, functionName: 'name' },
            { address: validAddress, abi: erc20Abi, functionName: 'symbol' },
            { address: validAddress, abi: erc20Abi, functionName: 'decimals' },
        ] : [],
        query: { enabled: !!validAddress }
    });

    // Process contract read results
    React.useEffect(() => {
        if (!validAddress) {
            setTokenInfo(null);
            return;
        }

        if (isError || !data || data.length < 3) {
            setError('Not a valid ERC20 token on Base');
            setTokenInfo(null);
            return;
        }

        const [nameResult, symbolResult, decimalsResult] = data;

        if (nameResult?.status === 'success' && symbolResult?.status === 'success' && decimalsResult?.status === 'success') {
            setError('');
            setTokenInfo({
                name: nameResult.result as string,
                symbol: symbolResult.result as string,
                decimals: decimalsResult.result as number,
                address: validAddress,
            });
        } else {
            setError('Not a valid ERC20 token on Base');
            setTokenInfo(null);
        }
    }, [data, isError, validAddress]);

    const handleAddressChange = (value: string) => {
        setAddress(value.trim());
        setError('');
        setTokenInfo(null);

        if (value.trim() && !isAddress(value.trim())) {
            setError('Invalid address format');
        }
    };

    const handleNavigate = () => {
        if (tokenInfo) {
            router.push(`/creator/${tokenInfo.address}`);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Input Field */}
            <div>
                <input
                    type="text"
                    placeholder="Paste contract address (0x...)"
                    value={address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    className="form-input"
                    style={{ fontFamily: 'monospace' }}
                />
            </div>

            {/* Loading State */}
            {isLoading && validAddress && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--surface-border)'
                }}>
                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Validating token on Base...
                    </span>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={{
                    padding: '14px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    color: '#EF4444',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>❌</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Token Found - Success State */}
            {tokenInfo && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {/* Token Info Card */}
                    <div style={{
                        padding: '16px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: 'white'
                            }}>
                                {tokenInfo.symbol[0]}
                            </div>
                            <div>
                                <div style={{
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {tokenInfo.name}
                                    <span style={{
                                        padding: '2px 6px',
                                        fontSize: '10px',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: '#10B981',
                                        borderRadius: '4px',
                                        fontWeight: 500
                                    }}>VERIFIED</span>
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    ${tokenInfo.symbol}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            wordBreak: 'break-all'
                        }}>
                            {tokenInfo.address}
                        </div>
                    </div>

                    {/* Navigate Button */}
                    <button
                        onClick={handleNavigate}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                    >
                        View Creator Page →
                    </button>
                </div>
            )}

            {/* Help Text */}
            {!address && (
                <div style={{
                    padding: '16px',
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--surface-border)',
                }}>
                    <div style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        marginBottom: '12px'
                    }}>
                        <strong style={{ color: 'var(--text-primary)' }}>How to find a creator coin address:</strong>
                    </div>
                    <ol style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6
                    }}>
                        <li>Open the creator's profile in Base App</li>
                        <li>Tap on their creator coin</li>
                        <li>Copy the contract address</li>
                        <li>Paste it above</li>
                    </ol>
                </div>
            )}
        </div>
    );
}
