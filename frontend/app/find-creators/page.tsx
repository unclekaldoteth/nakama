'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { searchZoraProfile, ZoraProfileResult } from '@/lib/zoraApi';
import { isAddress } from 'viem';
import './page.css';

export default function FindCreatorsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [addressInput, setAddressInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<ZoraProfileResult | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);

        try {
            const profile = await searchZoraProfile(searchQuery);

            if (profile) {
                setSearchResult(profile);
            } else {
                setSearchError('No creator found with that username');
            }
        } catch (error) {
            setSearchError('Failed to search. Please try again.');
        }

        setIsSearching(false);
    };

    const handleAddressSubmit = () => {
        const trimmed = addressInput.trim();

        if (!trimmed) return;

        if (isAddress(trimmed)) {
            router.push(`/creator/${trimmed}`);
        } else {
            setSearchError('Invalid token address');
        }
    };

    const handleProfileClick = (profile: ZoraProfileResult) => {
        if (profile.creatorCoinAddress) {
            router.push(`/creator/${profile.creatorCoinAddress}`);
        }
    };

    return (
        <div className="find-creators-container">
            {/* Header */}
            <header className="find-header">
                <Link href="/" className="back-button">←</Link>
                <h1>Find Creators</h1>
                <div className="header-spacer"></div>
            </header>

            {/* Search by Username */}
            <section className="search-section">
                <h2 className="section-title">Search by Username</h2>
                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder="Enter username (e.g., jessepollak)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="search-input"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="search-button"
                    >
                        {isSearching ? '...' : '🔍'}
                    </button>
                </div>

                {/* Search Result */}
                {searchResult && (
                    <button
                        className="search-result-card"
                        onClick={() => handleProfileClick(searchResult)}
                    >
                        <div className="result-avatar">
                            {searchResult.avatar?.previewImage?.small ? (
                                <img src={searchResult.avatar.previewImage.small} alt={searchResult.handle} />
                            ) : (
                                <div className="avatar-placeholder">👤</div>
                            )}
                        </div>
                        <div className="result-info">
                            <h3>@{searchResult.handle}</h3>
                            <p>{searchResult.displayName}</p>
                            {searchResult.creatorCoinAddress && (
                                <span className="has-coin-badge">Has Creator Coin ✓</span>
                            )}
                        </div>
                        <div className="result-arrow">→</div>
                    </button>
                )}
            </section>

            {/* Divider */}
            <div className="section-divider">
                <span>OR</span>
            </div>

            {/* Enter Token Address */}
            <section className="address-section">
                <h2 className="section-title">Enter Token Address</h2>
                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder="0x..."
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddressSubmit()}
                        className="search-input address-input"
                    />
                    <button
                        onClick={handleAddressSubmit}
                        disabled={!addressInput.trim()}
                        className="search-button"
                    >
                        →
                    </button>
                </div>
            </section>

            {/* Error Message */}
            {searchError && (
                <div className="error-message">
                    {searchError}
                </div>
            )}

            {/* Trending Section (Future) */}
            <section className="trending-section">
                <h2 className="section-title">Trending Creators</h2>
                <p className="coming-soon">Coming soon...</p>
            </section>
        </div>
    );
}
