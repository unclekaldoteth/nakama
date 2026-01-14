/**
 * Token Address Input Component
 * Search by creator name OR paste contract address
 * Fetches token data from Zora API
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAddress } from 'viem';
import { getZoraCoin, searchZoraProfile, ZoraCoinData } from '@/lib/zoraApi';

export function TokenAddressInput() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [zoraCoin, setZoraCoin] = useState<ZoraCoinData | null>(null);
    const latestQueryRef = useRef('');
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detect if input is a contract address or a name search
    const isContractAddress = isAddress(query);

    // Search function with debounce
    const performSearch = useCallback(async (searchQuery: string) => {
        const trimmedQuery = searchQuery.trim();
        latestQueryRef.current = trimmedQuery;
        if (!trimmedQuery) {
            setZoraCoin(null);
            setError('');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        setZoraCoin(null);

        try {
            if (isAddress(trimmedQuery)) {
                // Direct contract address lookup
                const coin = await getZoraCoin(trimmedQuery);
                if (latestQueryRef.current !== trimmedQuery) return;
                if (coin) {
                    setZoraCoin(coin);
                } else {
                    setError('Not a valid Zora creator coin on Base');
                }
            } else {
                // Search by creator name/handle
                const profile = await searchZoraProfile(trimmedQuery);
                if (latestQueryRef.current !== trimmedQuery) return;
                if (profile && profile.creatorCoinAddress) {
                    // Found profile with creator coin - fetch full coin data
                    const coin = await getZoraCoin(profile.creatorCoinAddress);
                    if (latestQueryRef.current !== trimmedQuery) return;
                    if (coin) {
                        setZoraCoin(coin);
                    } else {
                        setError('Creator found but no creator coin data available');
                    }
                } else if (profile && !profile.creatorCoinAddress) {
                    setError(`@${profile.handle} doesn't have a creator coin yet`);
                } else {
                    setError('No creator found with that username');
                }
            }
        } catch {
            if (latestQueryRef.current === trimmedQuery) {
                setError('Failed to fetch data');
            }
        } finally {
            if (latestQueryRef.current === trimmedQuery) {
                setIsLoading(false);
            }
        }
    }, []);

    // Debounced search effect
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const trimmedQuery = query.trim();
        latestQueryRef.current = trimmedQuery;
        if (!trimmedQuery) {
            setZoraCoin(null);
            setError('');
            setIsLoading(false);
            return;
        }

        // Immediate search for contract addresses
        if (isAddress(trimmedQuery)) {
            performSearch(trimmedQuery);
            return;
        }

        // Debounced search for name queries (wait 500ms)
        if (trimmedQuery.length < 2) {
            setZoraCoin(null);
            setError('');
            setIsLoading(false);
            return;
        }

        if (trimmedQuery.length >= 2) {
            setIsLoading(true);
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(trimmedQuery);
            }, 500);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [query, performSearch]);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        setError('');
        setZoraCoin(null);
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
                    placeholder="Search by username or paste address..."
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    className="form-input"
                    style={{ fontFamily: isContractAddress ? 'monospace' : 'inherit' }}
                />
            </div>

            {/* Loading State */}
            {isLoading && (
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
                        {isContractAddress ? 'Looking up token...' : 'Searching creators...'}
                    </span>
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
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
                                    {zoraCoin.symbol?.[0] || zoraCoin.name?.[0] || '?'}
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
                            <span>
                                💰 ${Number.isFinite(Number(zoraCoin.marketCap))
                                    ? Number(zoraCoin.marketCap).toLocaleString(undefined, { maximumFractionDigits: 0 })
                                    : '0'} mcap
                            </span>
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
            {!query && (
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
                        <strong style={{ color: 'var(--text-primary)' }}>Find a creator:</strong>
                    </div>
                    <ul style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.8
                    }}>
                        <li><strong>By username:</strong> Type their Zora username (e.g. "fabiokalandra")</li>
                        <li><strong>By address:</strong> Paste their token contract address</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
