/**
 * Token Picker Component
 * Search and select creator coins from Clanker
 * 
 * TODO: Integrate FIP-247 Profile Tokens when available
 * - Will replace Clanker search with verified profile_token from Hub API
 * - USER_DATA_TYPE_PROFILE_TOKEN (type 13) in CAIP-19 format
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/contracts';

interface Token {
    contract_address: string;
    name: string;
    symbol: string;
    img_url?: string;
}

interface TokenPickerProps {
    onSelect?: (token: Token) => void;
}

export function TokenPicker({ onSelect }: TokenPickerProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const latestQueryRef = useRef('');

    const searchTokens = useCallback(async (searchQuery: string) => {
        latestQueryRef.current = searchQuery;
        if (!searchQuery.trim()) {
            setTokens([]);
            setLoading(false);
            setSearched(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/tokens/search?q=${encodeURIComponent(searchQuery)}&limit=10`
            );
            if (response.ok) {
                const data = await response.json();
                if (latestQueryRef.current === searchQuery) {
                    setTokens(data.tokens || []);
                }
            }
        } catch (error) {
            console.error('Token search error:', error);
        } finally {
            if (latestQueryRef.current === searchQuery) {
                setLoading(false);
                setSearched(true);
            }
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            searchTokens(query);
        }, 300);
        return () => clearTimeout(timeout);
    }, [query, searchTokens]);

    const handleSelect = (token: Token) => {
        if (onSelect) {
            onSelect(token);
        } else {
            router.push(`/creator/${token.contract_address}`);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search by Farcaster username or address..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingRight: '44px' }}
                />
                {loading && (
                    <div style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}>
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                    </div>
                )}
            </div>

            {searched && tokens.length === 0 && (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                    <p className="empty-state-text" style={{ fontSize: '14px' }}>No tokens found. Try a different search.</p>
                </div>
            )}

            {/* Disclaimer about unverified results */}
            {tokens.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#FBBF24'
                }}>
                    <span>⚠️</span>
                    <span>Results from Clanker API. Always verify the token contract before staking.</span>
                </div>
            )}

            {tokens.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tokens.map((token) => (
                        <button
                            key={token.contract_address}
                            onClick={() => handleSelect(token)}
                            className="card"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                marginBottom: 0,
                                textAlign: 'left',
                                cursor: 'pointer',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--surface-border)',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--surface-hover)';
                                e.currentTarget.style.borderColor = 'var(--surface-highlight)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'var(--surface-border)';
                            }}
                        >
                            {token.img_url ? (
                                <img
                                    src={token.img_url}
                                    alt={token.symbol}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '1px solid var(--surface-border)'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'var(--gradient-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: 'white'
                                }}>
                                    {token.symbol[0]}
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {token.name}
                                    <span style={{
                                        marginLeft: '8px',
                                        padding: '2px 6px',
                                        fontSize: '10px',
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        color: '#FBBF24',
                                        borderRadius: '4px',
                                        fontWeight: 500
                                    }}>UNVERIFIED</span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>${token.symbol}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {token.contract_address.slice(0, 4)}...{token.contract_address.slice(-4)}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
