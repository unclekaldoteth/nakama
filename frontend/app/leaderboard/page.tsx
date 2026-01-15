'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopTrader, getTopTraders, formatPnL } from '@/lib/tradingApi';
import './page.css';

type Timeframe = '7d' | '30d' | 'all';

export default function LeaderboardPage() {
    const router = useRouter();
    const [traders, setTraders] = useState<TopTrader[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<Timeframe>('7d');

    const getPnLValue = (trader: TopTrader) => {
        if (timeframe === '30d') return trader.pnl30d;
        if (timeframe === 'all') return trader.pnlAll;
        return trader.pnl7d;
    };

    useEffect(() => {
        async function fetchTraders() {
            setIsLoading(true);
            try {
                // In production, this would pass timeframe to API
                const data = await getTopTraders(20);
                setTraders(data);
            } catch (error) {
                console.error('Failed to fetch traders:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTraders();
    }, [timeframe]);

    function handleCopyTrade(trader: TopTrader, e: React.MouseEvent) {
        e.stopPropagation();
        // TODO: Implement copy trading
        alert(`Copy trading ${trader.username || trader.address} coming soon!`);
    }

    return (
        <div className="container">
            {/* Header */}
            <div className="leaderboard-header">
                <button className="back-button" onClick={() => router.back()}>
                    ← Back
                </button>
                <h1 className="page-title">🏆 Leaderboard</h1>
            </div>

            {/* Timeframe Tabs */}
            <div className="timeframe-tabs">
                <button
                    className={`timeframe-tab ${timeframe === '7d' ? 'active' : ''}`}
                    onClick={() => setTimeframe('7d')}
                >
                    7 Days
                </button>
                <button
                    className={`timeframe-tab ${timeframe === '30d' ? 'active' : ''}`}
                    onClick={() => setTimeframe('30d')}
                >
                    30 Days
                </button>
                <button
                    className={`timeframe-tab ${timeframe === 'all' ? 'active' : ''}`}
                    onClick={() => setTimeframe('all')}
                >
                    All Time
                </button>
            </div>

            {/* Info Banner */}
            <div className="info-banner">
                <span className="info-icon">ℹ️</span>
                <span>Rankings based on realized PnL from trading on Base</span>
            </div>

            {/* Leaderboard List */}
            <div className="leaderboard-list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <span>Loading traders...</span>
                    </div>
                ) : traders.length === 0 ? (
                    <div className="empty-state">
                        <span style={{ fontSize: '48px' }}>🏆</span>
                        <p>No trader data available</p>
                    </div>
                ) : (
                    <>
                        {/* Top 3 Podium */}
                        <div className="podium">
                            {traders.slice(0, 3).map((trader, index) => {
                                const pnl = formatPnL(getPnLValue(trader));
                                const rankStyle = index === 0
                                    ? 'gold'
                                    : index === 1
                                        ? 'silver'
                                        : 'bronze';

                                return (
                                    <div
                                        key={trader.address}
                                        className={`podium-card ${rankStyle}`}
                                        style={{ order: index === 0 ? 2 : index === 1 ? 1 : 3 }}
                                    >
                                        <div className="podium-rank">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <div className="podium-avatar">
                                            {trader.avatarUrl ? (
                                                <img src={trader.avatarUrl} alt="" />
                                            ) : (
                                                <span>{(trader.username || 'A').charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="podium-name">
                                            {trader.username ? `@${trader.username}` : `${trader.address.slice(0, 6)}...`}
                                        </div>
                                        <div className={`podium-pnl ${pnl.isPositive ? 'positive' : 'negative'}`}>
                                            {pnl.text}
                                        </div>
                                        <div className="podium-stats">
                                            {trader.winRate.toFixed(0)}% win rate
                                        </div>
                                        <button
                                            className="copy-btn"
                                            onClick={(e) => handleCopyTrade(trader, e)}
                                        >
                                            Copy Trade
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Rest of the list */}
                        <div className="trader-rows">
                            {traders.slice(3).map((trader, index) => {
                                const pnl = formatPnL(getPnLValue(trader));
                                const rank = index + 4;

                                return (
                                    <div key={trader.address} className="trader-row">
                                        <div className="trader-rank">#{rank}</div>

                                        <div className="trader-avatar">
                                            {trader.avatarUrl ? (
                                                <img src={trader.avatarUrl} alt="" />
                                            ) : (
                                                <span>{(trader.username || 'A').charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>

                                        <div className="trader-info">
                                            <div className="trader-name">
                                                {trader.username ? `@${trader.username}` : `${trader.address.slice(0, 8)}...`}
                                            </div>
                                            <div className="trader-meta">
                                                {trader.totalTrades} trades • {trader.winRate.toFixed(1)}% win
                                            </div>
                                        </div>

                                        <div className="trader-pnl-section">
                                            <div className={`trader-pnl ${pnl.isPositive ? 'positive' : 'negative'}`}>
                                                {pnl.text}
                                            </div>
                                        </div>

                                        <button
                                            className="copy-btn-small"
                                            onClick={(e) => handleCopyTrade(trader, e)}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Copy Trading Info */}
            <div className="copy-info-card">
                <h3>📋 Copy Trading</h3>
                <p>
                    Copy the trades of top performers automatically.
                    Coming soon to Nakama!
                </p>
                <div className="features-list">
                    <div className="feature-item">
                        <span className="feature-icon">⚡</span>
                        <span>Auto-execute trades</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🎯</span>
                        <span>Set max allocation</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🛡️</span>
                        <span>Stop-loss protection</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
