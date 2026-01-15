'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    TrendingToken,
    getTrendingTokens,
    getTopGainers,
    searchTokens,
    TokenSearchResult,
    formatPrice,
    formatPriceChange,
    formatLargeNumber
} from '@/lib/tradingApi';
import './page.css';

type Category = 'all' | 'trending' | 'gainers' | 'meme' | 'creator' | 'defi';

export default function DiscoverPage() {
    const router = useRouter();
    const [activeCategory, setActiveCategory] = useState<Category>('trending');
    const [tokens, setTokens] = useState<TrendingToken[]>([]);
    const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        fetchTokens();
    }, [activeCategory]);

    async function fetchTokens() {
        if (searchQuery) return; // Don't fetch if searching

        setIsLoading(true);
        try {
            let data: TrendingToken[] = [];

            switch (activeCategory) {
                case 'gainers':
                    data = await getTopGainers(15);
                    break;
                case 'meme':
                    const allTokens = await getTrendingTokens(30);
                    data = allTokens.filter(t => t.category === 'meme');
                    break;
                case 'defi':
                    const allDefi = await getTrendingTokens(30);
                    data = allDefi.filter(t => t.category === 'defi');
                    break;
                default:
                    data = await getTrendingTokens(15);
            }

            setTokens(data);
        } catch (error) {
            console.error('Failed to fetch tokens:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSearch(query: string) {
        setSearchQuery(query);

        if (!query || query.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchTokens(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    }

    function handleTokenClick(token: TrendingToken | TokenSearchResult) {
        // Open Uniswap with this token
        window.open(
            `https://app.uniswap.org/swap?chain=base&outputCurrency=${token.address}`,
            '_blank'
        );
    }

    const categories: { id: Category; label: string; icon: string }[] = [
        { id: 'trending', label: 'Trending', icon: '🔥' },
        { id: 'gainers', label: 'Top Gainers', icon: '📈' },
        { id: 'meme', label: 'Memes', icon: '🐸' },
        { id: 'defi', label: 'DeFi', icon: '💎' },
    ];

    const displayTokens = searchQuery ? searchResults : tokens;

    return (
        <div className="container">
            {/* Header */}
            <div className="discover-header">
                <button className="back-button" onClick={() => router.back()}>
                    ← Back
                </button>
                <h1 className="page-title">Discover Assets</h1>
            </div>

            {/* Search */}
            <div className="search-container">
                <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search tokens..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="search-clear"
                            onClick={() => handleSearch('')}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Categories */}
            {!searchQuery && (
                <div className="categories-scroll">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Token List */}
            <div className="token-list">
                {isLoading || isSearching ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <span>Loading...</span>
                    </div>
                ) : displayTokens.length === 0 ? (
                    <div className="empty-state">
                        <span style={{ fontSize: '48px' }}>🔍</span>
                        <p>No tokens found</p>
                        {searchQuery && (
                            <button
                                className="btn-secondary"
                                onClick={() => handleSearch('')}
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    displayTokens.map((token, index) => {
                        const priceChange = formatPriceChange(token.priceChange24h);

                        return (
                            <div
                                key={token.address}
                                className="token-card"
                                onClick={() => handleTokenClick(token)}
                            >
                                <div className="token-rank">{index + 1}</div>

                                <div className="token-icon">
                                    {'imageUrl' in token && token.imageUrl ? (
                                        <img
                                            src={token.imageUrl}
                                            alt={token.symbol}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <span className="token-icon-fallback">
                                            {token.symbol.slice(0, 2)}
                                        </span>
                                    )}
                                </div>

                                <div className="token-info">
                                    <div className="token-symbol">${token.symbol}</div>
                                    <div className="token-name">{token.name}</div>
                                </div>

                                <div className="token-price-section">
                                    <div className="token-price">{formatPrice(token.priceUsd)}</div>
                                    <div className={`token-change ${priceChange.isPositive ? 'positive' : 'negative'}`}>
                                        {priceChange.text}
                                    </div>
                                </div>

                                {'volume24h' in token && (
                                    <div className="token-volume">
                                        <span className="volume-label">Vol</span>
                                        <span className="volume-value">{formatLargeNumber((token as TrendingToken).volume24h)}</span>
                                    </div>
                                )}

                                <button
                                    className="trade-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTokenClick(token);
                                    }}
                                >
                                    Trade
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Creator Coins CTA */}
            <div className="cta-card">
                <div className="cta-icon">🎨</div>
                <div className="cta-content">
                    <h3>Looking for Creator Coins?</h3>
                    <p>Support your favorite creators and earn conviction badges</p>
                </div>
                <Link href="/find-creators" className="cta-button">
                    Find Creators →
                </Link>
            </div>
        </div>
    );
}
