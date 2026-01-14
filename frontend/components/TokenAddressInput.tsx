/**
 * Token Address Input Component
 * Paste a contract address to navigate to creator page
 * Fetches token data from Zora API for avatar and metadata
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAddress } from 'viem';
import { getZoraCoin, ZoraCoinData } from '@/lib/zoraApi';

export function TokenAddressInput() {
    const router = useRouter();
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [zoraCoin, setZoraCoin] = useState<ZoraCoinData | null>(null);

    const validAddress = isAddress(address) ? address as `0x${string}` : undefined;

    // Fetch Zora coin data when valid address is entered
    useEffect(() => {
        if (!validAddress) {
            setZoraCoin(null);
            setError('');
            return;
        }

        setIsLoading(true);
        setError('');
        setZoraCoin(null);

        getZoraCoin(validAddress).then(data => {
            if (data) {
                setZoraCoin(data);
                setError('');
            } else {
                setError('Not a valid Zora creator coin on Base');
            }
        }).catch(() => {
            setError('Failed to fetch token data');
        }).finally(() => {
            setIsLoading(false);
        });
    }, [validAddress]);

    const handleAddressChange = (value: string) => {
        setAddress(value.trim());
        setError('');
        setZoraCoin(null);

        if (value.trim() && !isAddress(value.trim())) {
            setError('Invalid address format');
        }
    };

    const handleNavigate = () => {
        if (zoraCoin) {
            router.push(`/creator/${zoraCoin.address}`);
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
                        Fetching token data from Zora...
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

            {/* Token Found - Success State with Zora Data */}
            {zoraCoin && (
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
                            {/* Avatar from Zora */}
                            {zoraCoin.mediaContent?.previewImage?.medium ? (
                                <img
                                    src={zoraCoin.mediaContent.previewImage.medium}
                                    alt={zoraCoin.name}
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid rgba(16, 185, 129, 0.3)'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    background: 'var(--gradient-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    fontWeight: 'bold',
                                    color: 'white'
                                }}>
                                    {zoraCoin.symbol[0]}
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {zoraCoin.creatorProfile?.handle || zoraCoin.name}
                                    <span style={{
                                        padding: '2px 6px',
                                        fontSize: '10px',
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        color: '#10B981',
                                        borderRadius: '4px',
                                        fontWeight: 500
                                    }}>ZORA</span>
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)'
                                }}>
                                    ${zoraCoin.symbol}
                                </div>
                            </div>
                        </div>

                        {/* Zora Stats */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            marginBottom: '12px',
                            fontSize: '12px',
                            color: 'var(--text-muted)'
                        }}>
                            <span>💰 ${parseFloat(zoraCoin.marketCap).toLocaleString(undefined, { maximumFractionDigits: 0 })} mcap</span>
                            <span>👥 {zoraCoin.uniqueHolders} holders</span>
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
                            {zoraCoin.address}
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
                        <li>Open the creator's profile in Zora or Base App</li>
                        <li>Tap on their creator coin</li>
                        <li>Copy the contract address</li>
                        <li>Paste it above</li>
                    </ol>
                </div>
            )}
        </div>
    );
}
