'use client';

import { useEffect, useState } from 'react';
import { TopTrader, getTopTraders, formatPnL } from '@/lib/tradingApi';

interface TopTradersProps {
    limit?: number;
    onTraderClick?: (trader: TopTrader) => void;
}

export function TopTraders({ limit = 5, onTraderClick }: TopTradersProps) {
    const [traders, setTraders] = useState<TopTrader[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');

    useEffect(() => {
        async function fetchTraders() {
            try {
                setIsLoading(true);
                const data = await getTopTraders(limit);
                setTraders(data);
            } catch (err) {
                console.error('Failed to fetch top traders:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTraders();
    }, [limit]);

    if (isLoading) {
        return (
            <div className="top-traders">
                <div className="traders-header">
                    <h3 className="traders-title">🏆 Top Traders</h3>
                </div>
                <div className="traders-loading">
                    <div className="spinner small" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    if (traders.length === 0) {
        return (
            <div className="top-traders">
                <div className="traders-header">
                    <h3 className="traders-title">🏆 Top Traders</h3>
                </div>
                <div className="traders-empty">
                    No trader data available
                </div>
            </div>
        );
    }

    return (
        <div className="top-traders">
            <div className="traders-header">
                <h3 className="traders-title">🏆 Top Traders</h3>
                <div className="traders-timeframe">
                    <button
                        className={`timeframe-btn ${timeframe === '7d' ? 'active' : ''}`}
                        onClick={() => setTimeframe('7d')}
                    >
                        7D
                    </button>
                    <button
                        className={`timeframe-btn ${timeframe === '30d' ? 'active' : ''}`}
                        onClick={() => setTimeframe('30d')}
                    >
                        30D
                    </button>
                </div>
            </div>

            <div className="traders-list">
                {traders.map((trader, index) => {
                    const pnl = formatPnL(timeframe === '7d' ? trader.pnl7d : trader.pnl30d);
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                    return (
                        <div
                            key={trader.address}
                            className="trader-card"
                            onClick={() => onTraderClick?.(trader)}
                        >
                            <div className="trader-rank">
                                {rankEmoji || `#${index + 1}`}
                            </div>

                            <div className="trader-avatar">
                                {trader.avatarUrl ? (
                                    <img src={trader.avatarUrl} alt={trader.username || ''} />
                                ) : (
                                    <span className="trader-avatar-fallback">
                                        {(trader.username || trader.address).slice(0, 2).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            <div className="trader-info">
                                <span className="trader-name">
                                    {trader.username ? `@${trader.username}` : `${trader.address.slice(0, 6)}...`}
                                </span>
                                <span className="trader-stats">
                                    {trader.totalTrades} trades • {trader.winRate.toFixed(1)}% win
                                </span>
                            </div>

                            <div className="trader-pnl">
                                <span className={`pnl-value ${pnl.isPositive ? 'positive' : 'negative'}`}>
                                    {pnl.text}
                                </span>
                                <span className="pnl-label">{timeframe} PnL</span>
                            </div>

                            <button
                                className="copy-trade-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement copy trading
                                    alert('Copy trading coming soon!');
                                }}
                            >
                                Copy
                            </button>
                        </div>
                    );
                })}
            </div>

            <a href="/leaderboard" className="view-leaderboard-btn">
                View Full Leaderboard →
            </a>
        </div>
    );
}
