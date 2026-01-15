'use client';

import { useEffect, useState } from 'react';
import {
    TrendingToken,
    getTrendingTokens,
    formatPrice,
    formatPriceChange
} from '@/lib/tradingApi';

interface TrendingAssetsProps {
    limit?: number;
    onTokenClick?: (token: TrendingToken) => void;
}

export function TrendingAssets({ limit = 5, onTokenClick }: TrendingAssetsProps) {
    const [tokens, setTokens] = useState<TrendingToken[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTrending() {
            try {
                setIsLoading(true);
                const data = await getTrendingTokens(limit);
                setTokens(data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch trending:', err);
                setError('Failed to load trending assets');
            } finally {
                setIsLoading(false);
            }
        }

        fetchTrending();

        // Refresh every 60 seconds
        const interval = setInterval(fetchTrending, 60000);
        return () => clearInterval(interval);
    }, [limit]);

    if (isLoading) {
        return (
            <div className="trending-assets">
                <div className="trending-header">
                    <h3 className="trending-title">🔥 Trending on Base</h3>
                </div>
                <div className="trending-loading">
                    <div className="spinner small" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    if (error || tokens.length === 0) {
        return (
            <div className="trending-assets">
                <div className="trending-header">
                    <h3 className="trending-title">🔥 Trending on Base</h3>
                </div>
                <div className="trending-empty">
                    No trending assets available
                </div>
            </div>
        );
    }

    return (
        <div className="trending-assets">
            <div className="trending-header">
                <h3 className="trending-title">🔥 Trending on Base</h3>
                <a href="/discover" className="trending-see-all">See all →</a>
            </div>

            <div className="trending-scroll">
                {tokens.map((token, index) => {
                    const priceChange = formatPriceChange(token.priceChange24h);

                    return (
                        <div
                            key={token.address}
                            className="trending-card"
                            onClick={() => onTokenClick?.(token)}
                        >
                            <div className="trending-rank">#{index + 1}</div>

                            <div className="trending-token-icon">
                                {token.imageUrl ? (
                                    <img
                                        src={token.imageUrl}
                                        alt={token.symbol}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="trending-token-fallback">
                                        {token.symbol.slice(0, 2)}
                                    </span>
                                )}
                            </div>

                            <div className="trending-token-info">
                                <span className="trending-token-symbol">${token.symbol}</span>
                                <span className="trending-token-name">{token.name}</span>
                            </div>

                            <div className="trending-token-price">
                                <span className="trending-price-value">
                                    {formatPrice(token.priceUsd)}
                                </span>
                                <span className={`trending-price-change ${priceChange.isPositive ? 'positive' : 'negative'}`}>
                                    {priceChange.text}
                                </span>
                            </div>

                            <button
                                className="trending-trade-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Open Uniswap or other DEX with this pair
                                    window.open(
                                        `https://app.uniswap.org/swap?chain=base&outputCurrency=${token.address}`,
                                        '_blank'
                                    );
                                }}
                            >
                                Trade
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="trending-categories">
                <span className="category-tag meme">🐸 Memes</span>
                <span className="category-tag creator">🎨 Creators</span>
                <span className="category-tag defi">💎 DeFi</span>
            </div>
        </div>
    );
}
