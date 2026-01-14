'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useMiniApp } from '@/lib/MiniAppProvider';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, isAddress, zeroAddress } from 'viem';
import { CONTRACTS, TIER_NAMES, API_BASE_URL } from '@/lib/contracts';
import Link from 'next/link';
import { EthosStats, CreatorEthosStats } from '@/components/EthosStats';
import { EthosBadge, EthosVerifiedBadge, getBandFromScore, EthosBand } from '@/components/EthosBadge';
import { EthosReviewModal } from '@/components/EthosReviewModal';
import { TokenAddressInput } from '@/components/TokenAddressInput';
import { getZoraCoin, ZoraCoinData } from '@/lib/zoraApi';

interface Supporter {
    address: string;
    amount: string;
    tier: number;
    ethosScore?: number;
    ethosBand?: EthosBand;
    user: {
        fid?: number;
        username: string;
        displayName: string;
        avatarUrl: string;
    } | null;
}

export default function CreatorPage() {
    const { token } = useParams<{ token: string }>();
    const { isReady, actions, authFetch } = useMiniApp();
    const { address, isConnected } = useAccount();

    const [stakeAmount, setStakeAmount] = useState('');
    const [lockDays, setLockDays] = useState('30');
    const [supporters, setSupporters] = useState<Supporter[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [ethosStats, setEthosStats] = useState<CreatorEthosStats | null>(null);
    const [ethosLoading, setEthosLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'supporters' | 'stake'>('supporters');
    const [supporterFilter, setSupporterFilter] = useState<'all' | 'known' | 'credible'>('all');
    const [pendingStake, setPendingStake] = useState<{ amount: bigint; lockDays: bigint } | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [zoraCoin, setZoraCoin] = useState<ZoraCoinData | null>(null);

    const parsedToken = typeof token === 'string' && isAddress(token) ? token : null;
    const tokenAddress = parsedToken ?? zeroAddress;
    const isValidToken = tokenAddress !== zeroAddress;

    // Read user position
    const { data: position } = useReadContract({
        address: CONTRACTS.vault.address as `0x${string}`,
        abi: CONTRACTS.vault.abi,
        functionName: 'getPosition',
        args: isValidToken && address ? [address as `0x${string}`, tokenAddress as `0x${string}`] : undefined,
        query: { enabled: !!address && isValidToken }
    });

    // Read user tier
    const { data: tier } = useReadContract({
        address: CONTRACTS.vault.address as `0x${string}`,
        abi: CONTRACTS.vault.abi,
        functionName: 'getTier',
        args: isValidToken && address ? [address as `0x${string}`, tokenAddress as `0x${string}`] : undefined,
        query: { enabled: !!address && isValidToken }
    });

    const { data: allowance } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: CONTRACTS.erc20.abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, CONTRACTS.vault.address as `0x${string}`],
        query: { enabled: !!address && isValidToken }
    });

    // Stake transaction
    const { writeContract: stake, data: stakeHash, isPending: isStaking } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: stakeSuccess } = useWaitForTransactionReceipt({
        hash: stakeHash,
    });

    // Approve transaction
    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
    const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    // Claim badge transaction
    const { writeContract: claimBadge, data: claimHash, isPending: isClaiming } = useWriteContract();
    const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({
        hash: claimHash,
    });

    // Fetch supporters from API
    useEffect(() => {
        if (tokenAddress && isValidToken) {
            fetch(`${API_BASE_URL}/creator/${tokenAddress}/supporters`)
                .then(res => res.json())
                .then(data => setSupporters(data.supporters || []))
                .catch(console.error);

            fetch(`${API_BASE_URL}/creator/${tokenAddress}/stats`)
                .then(res => res.json())
                .then(data => setStats(data))
                .catch(console.error);

            // Fetch Ethos-weighted stats
            setEthosLoading(true);
            fetch(`${API_BASE_URL}/creator/${tokenAddress}/ethos-stats`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setEthosStats(data);
                    }
                })
                .catch(console.error)
                .finally(() => setEthosLoading(false));

            // Fetch Zora coin data for creator profile
            getZoraCoin(tokenAddress).then(data => {
                if (data) setZoraCoin(data);
            });
        }
    }, [isValidToken, stakeSuccess, tokenAddress]);

    // Prompt share cast and addMiniApp after successful stake
    useEffect(() => {
        if (stakeSuccess && tokenAddress && lockDays) {
            // Compose a cast about the stake
            const castText = `🔒 Just locked tokens for ${lockDays} days in @nakama App!\n\nShowing conviction for ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
            actions.composeCast(castText, [`https://nakama.app/creator/${tokenAddress}`]);

            // Prompt to add mini app after first stake
            actions.addMiniApp();
        }
    }, [stakeSuccess, tokenAddress, lockDays, actions]);

    const handleBuy = async () => {
        if (!isValidToken || !tokenAddress) return;
        await actions.swapToken(tokenAddress);
    };

    const handleStake = async () => {
        if (!stakeAmount || !lockDays || !isValidToken || !tokenAddress) return;
        let stakeAmountWei: bigint;
        try {
            stakeAmountWei = parseEther(stakeAmount);
        } catch (error) {
            console.error('Invalid stake amount:', error);
            return;
        }

        const allowanceValue = typeof allowance === 'bigint' ? allowance : BigInt(0);
        if (allowanceValue < stakeAmountWei) {
            setPendingStake({ amount: stakeAmountWei, lockDays: BigInt(lockDays) });
            approve({
                address: tokenAddress as `0x${string}`,
                abi: CONTRACTS.erc20.abi,
                functionName: 'approve',
                args: [CONTRACTS.vault.address as `0x${string}`, stakeAmountWei],
            });
            return;
        }

        stake({
            address: CONTRACTS.vault.address as `0x${string}`,
            abi: CONTRACTS.vault.abi,
            functionName: 'stake',
            args: [tokenAddress as `0x${string}`, stakeAmountWei, BigInt(lockDays)],
        });
    };

    const handleClaimBadge = async () => {
        if (!tokenAddress) return;
        claimBadge({
            address: CONTRACTS.badge.address as `0x${string}`,
            abi: CONTRACTS.badge.abi,
            functionName: 'claimOrRefresh',
            args: [tokenAddress as `0x${string}`],
        });
    };

    if (!isReady) {
        return (
            <div className="container">
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className="container">
                <div className="page-header">
                    <Link href="/" style={{ color: 'var(--text-secondary)' }}>← Back</Link>
                    <div className="page-title">Find Creator</div>
                </div>
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                        � Paste Token Address
                    </h3>
                    <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Copy the contract address from the creator's Base App profile.
                    </p>
                    <TokenAddressInput />
                </div>
            </div>
        );
    }

    const hasPosition = position && (position as any)[0] > BigInt(0);
    const currentTier = tier ? Number(tier) : 0;
    const allowanceValue = typeof allowance === 'bigint' ? allowance : BigInt(0);
    const stakeAmountWei = stakeAmount ? (() => {
        try {
            return parseEther(stakeAmount);
        } catch {
            return null;
        }
    })() : null;
    const needsApproval = !!stakeAmountWei && allowanceValue < stakeAmountWei;

    useEffect(() => {
        if (!approveSuccess || !pendingStake || !isValidToken || !tokenAddress) return;
        stake({
            address: CONTRACTS.vault.address as `0x${string}`,
            abi: CONTRACTS.vault.abi,
            functionName: 'stake',
            args: [tokenAddress as `0x${string}`, pendingStake.amount, pendingStake.lockDays],
        });
        setPendingStake(null);
    }, [approveSuccess, isValidToken, pendingStake, stake, tokenAddress]);

    return (
        <div className="container">
            {/* Header */}
            <div className="page-header">
                <Link href="/" style={{ color: 'var(--text-secondary)' }}>← Back</Link>
                <div className="page-title">Creator</div>
            </div>

            {/* Creator Profile */}
            <div className="creator-profile">
                {zoraCoin?.mediaContent?.previewImage?.medium ? (
                    <img
                        src={zoraCoin.mediaContent.previewImage.medium}
                        alt={zoraCoin.name || 'Creator'}
                        className="creator-avatar"
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid var(--surface-border)'
                        }}
                    />
                ) : (
                    <div className="creator-avatar">🎨</div>
                )}
                <h1 className="creator-name">
                    {zoraCoin?.creatorProfile?.handle || zoraCoin?.name || 'Creator'}
                </h1>
                <p className="creator-token">
                    ${zoraCoin?.symbol || `${token?.slice(0, 6)}...${token?.slice(-4)}`}
                </p>

                {/* Zora Stats */}
                {zoraCoin && (
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginTop: '12px',
                        fontSize: '13px',
                        color: 'var(--text-secondary)'
                    }}>
                        <span>💰 ${parseFloat(zoraCoin.marketCap).toLocaleString(undefined, { maximumFractionDigits: 0 })} mcap</span>
                        <span>👥 {zoraCoin.uniqueHolders} holders</span>
                    </div>
                )}

                {currentTier > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <span className={`tier-badge tier-badge-${TIER_NAMES[currentTier].toLowerCase()}`}>
                            {TIER_NAMES[currentTier]} Supporter
                        </span>
                    </div>
                )}
            </div>

            {/* Ethos-first Stats (Vibeathon) */}
            <EthosStats stats={ethosStats} loading={ethosLoading} />

            {/* Legacy Stats (secondary) */}
            {stats && !ethosStats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalSupporters}</div>
                        <div className="stat-label">Supporters</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.legendCount}</div>
                        <div className="stat-label">Legends</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.goldCount}</div>
                        <div className="stat-label">Gold</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.newThisWeek}</div>
                        <div className="stat-label">New This Week</div>
                    </div>
                </div>
            )}

            {/* CTA Buttons */}
            <div className="cta-group">
                <button className="btn btn-secondary" onClick={handleBuy} disabled={!isValidToken}>
                    💰 Buy Coin
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab('stake')}
                    disabled={!isConnected}
                >
                    🔒 Stake
                </button>
                {isConnected && (
                    <button
                        className="btn"
                        onClick={() => setShowReviewModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                            color: 'white',
                            marginTop: '8px',
                            width: '100%',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                        }}
                        disabled={!isValidToken}
                    >
                        ✍️ Write Ethos Feedback
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="nav-tabs">
                <button
                    className={`nav-tab ${activeTab === 'supporters' ? 'active' : ''}`}
                    onClick={() => setActiveTab('supporters')}
                >
                    Top Supporters
                </button>
                <button
                    className={`nav-tab ${activeTab === 'stake' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stake')}
                >
                    Stake
                </button>
            </div>

            {/* Supporters Tab */}
            {activeTab === 'supporters' && (
                <div className="section">
                    {/* Supporter Filter Toggles */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {(['all', 'known', 'credible'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setSupporterFilter(filter)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: supporterFilter === filter ? 'none' : '1px solid #e5e7eb',
                                    backgroundColor: supporterFilter === filter ? '#3B82F6' : 'white',
                                    color: supporterFilter === filter ? 'white' : '#374151',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                {filter === 'all' && 'All'}
                                {filter === 'known' && 'Known+'}
                                {filter === 'credible' && 'Top Credible'}
                            </button>
                        ))}

                        {/* Export Allowlist Button */}
                        <button
                            onClick={() => {
                                const filtered = supporters.filter(s => {
                                    if (supporterFilter === 'known') return (s.ethosScore || 0) >= 1400;
                                    if (supporterFilter === 'credible') return (s.ethosScore || 0) >= 1600;
                                    return true;
                                });
                                // ... csv generation ...
                                const csv = [
                                    ['address', 'amount', 'tier', 'ethosScore', 'ethosBand'].join(','),
                                    ...filtered.map(s => [
                                        s.address,
                                        s.amount,
                                        s.tier,
                                        s.ethosScore || '',
                                        s.ethosBand || ''
                                    ].join(','))
                                ].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `allowlist-${supporterFilter}-${tokenAddress.slice(0, 8)}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="btn-secondary"
                            style={{
                                marginLeft: 'auto',
                                padding: '8px 16px',
                                fontSize: '13px',
                                minHeight: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            📥 Export CSV
                        </button>
                    </div>

                    {supporters.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <p className="empty-state-text">No supporters yet. Be the first!</p>
                        </div>
                    ) : (
                        <div className="supporter-list">
                            {supporters
                                .filter(s => {
                                    if (supporterFilter === 'known') return (s.ethosScore || 0) >= 1400;
                                    if (supporterFilter === 'credible') return (s.ethosScore || 0) >= 1600;
                                    return true;
                                })
                                .map((supporter, index) => (
                                    <div
                                        key={supporter.address}
                                        className="supporter-item"
                                        onClick={() => {
                                            if (supporter.user?.fid) {
                                                actions.viewProfile(supporter.user.fid);
                                            }
                                        }}
                                        style={{ cursor: supporter.user?.fid ? 'pointer' : 'default' }}
                                    >
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
                                                {supporter.ethosScore && supporter.ethosScore >= 1400 && (
                                                    <EthosVerifiedBadge score={supporter.ethosScore} size="sm" />
                                                )}
                                            </div>
                                            <div className="supporter-address" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {supporter.address.slice(0, 6)}...{supporter.address.slice(-4)}
                                                {supporter.ethosBand && (
                                                    <EthosBadge score={supporter.ethosScore || 1200} band={supporter.ethosBand} size="sm" showScore={false} />
                                                )}
                                            </div>
                                        </div>
                                        <span className={`tier-badge tier-badge-${TIER_NAMES[supporter.tier].toLowerCase()}`}>
                                            {TIER_NAMES[supporter.tier]}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stake Tab */}
            {activeTab === 'stake' && (
                <div className="section">
                    {!isConnected ? (
                        <div className="card">
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                Connect your wallet to stake
                            </p>
                        </div>
                    ) : hasPosition ? (
                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Your Position</h3>
                            <div className="position-details">
                                <div className="position-detail">
                                    <div className="position-detail-value">
                                        {formatEther((position as any)[0])}
                                    </div>
                                    <div className="position-detail-label">Staked</div>
                                </div>
                                <div className="position-detail">
                                    <div className="position-detail-value">{TIER_NAMES[currentTier]}</div>
                                    <div className="position-detail-label">Tier</div>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-full"
                                style={{ marginTop: '16px' }}
                                onClick={handleClaimBadge}
                                disabled={isClaiming || currentTier === 0}
                            >
                                {isClaiming ? 'Claiming...' : claimSuccess ? '✓ Badge Claimed!' : '🏅 Claim Badge'}
                            </button>
                        </div>
                    ) : (
                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Create Position</h3>

                            <div className="form-group">
                                <label className="form-label">Amount to Stake</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0.0"
                                    value={stakeAmount}
                                    onChange={(e) => setStakeAmount(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Lock Duration (days)</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['7', '30', '60', '90'].map(days => (
                                        <button
                                            key={days}
                                            className={`btn ${lockDays === days ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ padding: '8px 16px', minHeight: 'auto' }}
                                            onClick={() => setLockDays(days)}
                                        >
                                            {days}d
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{
                                padding: '12px',
                                background: 'var(--surface-hover)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Tier you'll reach:</span>
                                    <span className={`tier-badge tier-badge-${getTierForDays(Number(lockDays)).toLowerCase()}`}>
                                        {getTierForDays(Number(lockDays))}
                                    </span>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleStake}
                                disabled={isStaking || isConfirming || isApproving || !stakeAmount || !isValidToken}
                            >
                                {needsApproval
                                    ? (isApproving ? 'Approving...' : 'Approve & Stake')
                                    : (isStaking || isConfirming ? 'Processing...' : stakeSuccess ? '✓ Staked!' : '🔒 Stake & Lock')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Ethos Review Modal */}
            <EthosReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                targetAddress={tokenAddress || undefined}
                targetName={`Creator ${token?.slice(0, 6)}...`}
                authFetch={authFetch}
            />
        </div>
    );
}

function getTierForDays(days: number): string {
    if (days >= 90) return 'Legend';
    if (days >= 30) return 'Gold';
    if (days >= 7) return 'Silver';
    return 'Bronze';
}
