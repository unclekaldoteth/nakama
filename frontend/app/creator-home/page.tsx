'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useOnboarding } from '@/lib/useOnboarding';
import { getZoraProfileByAddress, ZoraProfileResult } from '@/lib/zoraApi';
import { API_BASE_URL, TIER_NAMES } from '@/lib/contracts';
import { EthosBadge, EthosBand } from '@/components/EthosBadge';
import { formatEther } from 'viem';
import Link from 'next/link';
import './page.css';

interface CreatorStats {
    supporters: number;
    legends: number;
    gold: number;
    silver: number;
    bronze: number;
}

interface SupporterPreview {
    address: string;
    amount: string;
    tier: number;
    ethosScore?: number;
    ethosBand?: EthosBand;
    user?: {
        username?: string;
        displayName?: string;
        avatarUrl?: string;
    } | null;
}

export default function CreatorHomePage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { detectedCreatorToken, setDetectedCreatorToken, updateLastCreatorCheck } = useOnboarding();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<ZoraProfileResult | null>(null);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [supporters, setSupporters] = useState<SupporterPreview[]>([]);
    const [supportersError, setSupportersError] = useState<string | null>(null);
    const [isSupportersLoading, setIsSupportersLoading] = useState(false);
    const [configStatus, setConfigStatus] = useState<{ isCustom: boolean } | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const [isConfigLoading, setIsConfigLoading] = useState(false);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [stats, setStats] = useState<CreatorStats>({
        supporters: 0,
        legends: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
    });

    const tokenAddress = detectedCreatorToken || profile?.creatorCoinAddress || null;

    useEffect(() => {
        async function detectCreator() {
            if (!isConnected || !address) {
                setIsLoading(false);
                return;
            }

            try {
                setError(null);
                const result = await getZoraProfileByAddress(address);
                updateLastCreatorCheck();

                if (result.isCreator && result.creatorCoinAddress) {
                    setDetectedCreatorToken(result.creatorCoinAddress);
                    setProfile(result.profile);

                    // TODO: Fetch actual stats from backend
                    // For now, using placeholder
                } else {
                    // Not a creator, redirect to supporter home
                    setIsLoading(false);
                    router.replace('/');
                    return;
                }
            } catch (error) {
                console.error('Failed to detect creator:', error);
                setError('Failed to load creator profile. Please try again.');
            }

            setIsLoading(false);
        }

        detectCreator();
    }, [address, isConnected, router, setDetectedCreatorToken, updateLastCreatorCheck]);

    useEffect(() => {
        if (!tokenAddress) return;

        let cancelled = false;
        setIsStatsLoading(true);
        setStatsError(null);

        fetch(`${API_BASE_URL}/creator/${tokenAddress}/stats`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load stats (${res.status})`);
                }
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                setStats({
                    supporters: Number(data.totalSupporters) || 0,
                    legends: Number(data.legendCount) || 0,
                    gold: Number(data.goldCount) || 0,
                    silver: Number(data.silverCount) || 0,
                    bronze: Number(data.bronzeCount) || 0,
                });
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Failed to load creator stats:', err);
                setStatsError('Unable to load stats right now.');
            })
            .finally(() => {
                if (!cancelled) setIsStatsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [tokenAddress, refreshNonce]);

    useEffect(() => {
        if (!tokenAddress) return;

        let cancelled = false;
        setIsSupportersLoading(true);
        setSupportersError(null);
        setSupporters([]);

        fetch(`${API_BASE_URL}/creator/${tokenAddress}/supporters?limit=3`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load supporters (${res.status})`);
                }
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                const preview = (data.supporters || []).map((supporter: SupporterPreview) => ({
                    address: supporter.address,
                    amount: supporter.amount || '0',
                    tier: Number(supporter.tier) || 0,
                    ethosScore: typeof supporter.ethosScore === 'number' ? supporter.ethosScore : undefined,
                    ethosBand: supporter.ethosBand,
                    user: supporter.user || null,
                }));
                setSupporters(preview);
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Failed to load supporters preview:', err);
                setSupportersError('Unable to load supporters right now.');
            })
            .finally(() => {
                if (!cancelled) setIsSupportersLoading(false);
            });

        setIsConfigLoading(true);
        setConfigError(null);

        fetch(`${API_BASE_URL}/creator/${tokenAddress}/config`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to load config (${res.status})`);
                }
                return res.json();
            })
            .then(data => {
                if (cancelled) return;
                setConfigStatus({ isCustom: !!data.isCustom });
            })
            .catch(err => {
                if (cancelled) return;
                console.error('Failed to load tier config status:', err);
                setConfigError('Tier config unavailable.');
            })
            .finally(() => {
                if (!cancelled) setIsConfigLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [tokenAddress, refreshNonce]);

    const configStatusText = configError
        ? configError
        : isConfigLoading
            ? 'Checking tier configuration...'
            : configStatus?.isCustom
                ? 'Custom thresholds active'
                : 'Using default thresholds';
    const isRefreshing = isSupportersLoading || isStatsLoading || isConfigLoading;
    const formatStakeAmount = (amount: string) => {
        try {
            return Number(formatEther(BigInt(amount))).toFixed(2);
        } catch {
            return amount;
        }
    };
    const handleRefresh = () => {
        setRefreshNonce(prev => prev + 1);
    };

    if (isLoading) {
        return (
            <div className="creator-home-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading your creator profile...</p>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="creator-home-container">
                <div className="empty-state">
                    <div className="empty-icon">🔗</div>
                    <h2>Connect Wallet</h2>
                    <p>Connect your wallet to view your creator dashboard</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="creator-home-container">
                <div className="empty-state">
                    <div className="empty-icon">⚠️</div>
                    <h2>Unable to load creator profile</h2>
                    <p>{error}</p>
                    <button className="action-card" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                    <Link href="/" className="switch-link" style={{ marginTop: '12px' }}>
                        Back to Home →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="creator-home-container">
            {/* Header */}
            <header className="creator-header">
                <Link href="/" className="back-button">←</Link>
                <h1>Creator Home</h1>
                <div className="header-spacer"></div>
            </header>

            {/* Profile Card */}
            <div className="profile-card">
                <div className="profile-avatar">
                    {profile?.avatar?.previewImage?.medium ? (
                        <img src={profile.avatar.previewImage.medium} alt={profile.handle} />
                    ) : (
                        <div className="avatar-placeholder">🎨</div>
                    )}
                </div>
                <div className="profile-info">
                    <h2 className="profile-handle">@{profile?.handle || 'creator'}</h2>
                    <p className="profile-coin">${profile?.handle?.toUpperCase() || 'TOKEN'}</p>
                </div>
            </div>

            {/* Stats Grid */}
            {isStatsLoading && (
                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Loading stats...
                </p>
            )}
            {statsError && (
                <p style={{ color: '#ef4444', marginBottom: '8px' }}>
                    {statsError}
                </p>
            )}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.supporters}</div>
                    <div className="stat-label">Supporters</div>
                </div>
                <div className="stat-card legend">
                    <div className="stat-value">{stats.legends}</div>
                    <div className="stat-label">Legends</div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-value">{stats.gold}</div>
                    <div className="stat-label">Gold</div>
                </div>
                <div className="stat-card silver">
                    <div className="stat-value">{stats.silver}</div>
                    <div className="stat-label">Silver</div>
                </div>
            </div>

            {/* Supporter Preview */}
            <section className="preview-section">
                <div className="preview-header">
                    <h3 className="section-title">Top Supporters</h3>
                    <div className="preview-actions">
                        {tokenAddress && (
                            <Link href={`/creator/${tokenAddress}`} className="preview-link">
                                View all →
                            </Link>
                        )}
                        <button
                            type="button"
                            className="preview-refresh"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {isSupportersLoading && (
                    <p className="preview-hint">Loading supporters...</p>
                )}
                {supportersError && (
                    <p className="preview-error">{supportersError}</p>
                )}
                {!isSupportersLoading && !supportersError && supporters.length === 0 && (
                    <p className="preview-hint">No supporters yet.</p>
                )}
                {supporters.length > 0 && (
                    <div className="supporter-list">
                        {supporters.map((supporter, index) => {
                            const tierValue = Number(supporter.tier) || 0;
                            const tierName = TIER_NAMES[tierValue] || TIER_NAMES[0];
                            const hasEthos = typeof supporter.ethosScore === 'number';

                            return (
                            <div key={supporter.address} className="supporter-item">
                                <div className="supporter-rank">{index + 1}</div>
                                {supporter.user?.avatarUrl ? (
                                    <img
                                        src={supporter.user.avatarUrl}
                                        alt=""
                                        className="supporter-avatar"
                                    />
                                ) : (
                                    <div className="supporter-avatar" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        👤
                                    </div>
                                )}
                                <div className="supporter-info">
                                    <div className="supporter-name">
                                        {supporter.user?.displayName || supporter.user?.username || 'Anonymous'}
                                    </div>
                                    <div className="supporter-address">
                                        {supporter.address.slice(0, 6)}...{supporter.address.slice(-4)}
                                    </div>
                                    <div className="supporter-meta">
                                        <span className="supporter-amount">
                                            Staked {formatStakeAmount(supporter.amount)}
                                        </span>
                                        {hasEthos && supporter.ethosScore !== undefined && (
                                            <EthosBadge
                                                score={supporter.ethosScore}
                                                band={supporter.ethosBand}
                                                size="sm"
                                                showScore={false}
                                            />
                                        )}
                                    </div>
                                </div>
                                {tierValue > 0 ? (
                                    <span className={`tier-badge tier-badge-${tierName.toLowerCase()}`}>
                                        {tierName}
                                    </span>
                                ) : (
                                    <span className="preview-tier-none">No Tier</span>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Quick Actions */}
            <section className="quick-actions">
                <h3 className="section-title">Quick Actions</h3>

                {tokenAddress ? (
                    <Link href={`/creator/${tokenAddress}`} className="action-card">
                        <div className="action-icon">👥</div>
                        <div className="action-content">
                            <h4>View My Supporters</h4>
                            <p>See who's staking your coin</p>
                        </div>
                        <div className="action-arrow">→</div>
                    </Link>
                ) : (
                    <div className="action-card" style={{ opacity: 0.7 }}>
                        <div className="action-icon">👥</div>
                        <div className="action-content">
                            <h4>View My Supporters</h4>
                            <p>Creator coin not detected yet</p>
                        </div>
                    </div>
                )}

                <Link href="/creator-settings" className="action-card">
                    <div className="action-icon">⚙️</div>
                    <div className="action-content">
                        <h4>Tier Settings</h4>
                        <p>{configStatusText}</p>
                    </div>
                    <div className="action-arrow">→</div>
                </Link>

                <Link href="/my-convictions" className="action-card">
                    <div className="action-icon">🔒</div>
                    <div className="action-content">
                        <h4>My Stakes (as Supporter)</h4>
                        <p>View your own conviction stakes</p>
                    </div>
                    <div className="action-arrow">→</div>
                </Link>
            </section>

            {/* Switch Role */}
            <div className="switch-role">
                <Link href="/" className="switch-link">
                    Switch to Supporter View →
                </Link>
            </div>
        </div>
    );
}
