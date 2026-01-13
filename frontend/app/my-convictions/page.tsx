'use client';

import { useState, useEffect } from 'react';
import { useMiniApp } from '@/lib/MiniAppProvider';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACTS, API_BASE_URL } from '@/lib/contracts';
import Link from 'next/link';

interface Position {
    tokenAddress: string;
    amount: string;
    lockEnd: string;
    tier: number;
    tierName: string;
    isLocked: boolean;
}

export default function MyConvictionsPage() {
    const { isReady, authFetch } = useMiniApp();
    const { address, isConnected } = useAccount();
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    // Withdraw transaction
    const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract();
    const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
        hash: withdrawHash,
    });

    // Claim badge transaction
    const { writeContract: claimBadge, isPending: isClaiming } = useWriteContract();

    useEffect(() => {
        if (address) {
            authFetch(`${API_BASE_URL}/me/positions?address=${address}`)
                .then(res => res.json())
                .then(data => {
                    setPositions(data.positions || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [address, authFetch, withdrawSuccess]);

    const formatAmount = (amount: string) => {
        try {
            return Number(formatEther(BigInt(amount))).toFixed(2);
        } catch {
            return amount;
        }
    };

    const handleWithdraw = (tokenAddress: string) => {
        withdraw({
            address: CONTRACTS.vault.address as `0x${string}`,
            abi: CONTRACTS.vault.abi,
            functionName: 'withdraw',
            args: [tokenAddress as `0x${string}`],
        });
    };

    const handleClaimBadge = (tokenAddress: string) => {
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

    return (
        <div className="container">
            <div className="page-header">
                <Link href="/" style={{ color: 'var(--text-secondary)' }}>← Back</Link>
                <div className="page-title">My Convictions</div>
            </div>

            {!isConnected ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🔗</div>
                        <p className="empty-state-text">Connect your wallet to view positions</p>
                    </div>
                </div>
            ) : loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            ) : positions.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🔒</div>
                        <p className="empty-state-text">No positions yet</p>
                        <Link href="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
                            Find Creators to Support
                        </Link>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Summary Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{positions.length}</div>
                            <div className="stat-label">Positions</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">
                                {positions.filter(p => p.tier >= 4).length}
                            </div>
                            <div className="stat-label">Legend Badges</div>
                        </div>
                    </div>

                    {/* Position List */}
                    <div className="section">
                        <div className="section-header">
                            <h3 className="section-title">Your Positions</h3>
                        </div>

                        {positions.map((position) => {
                            const lockEndDate = new Date(position.lockEnd);
                            const isExpired = lockEndDate < new Date();
                            const daysRemaining = Math.max(0, Math.ceil((lockEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                            return (
                                <div key={position.tokenAddress} className="position-card">
                                    <div className="position-header">
                                        <Link
                                            href={`/creator/${position.tokenAddress}`}
                                            className="position-token"
                                            style={{ color: 'var(--primary)' }}
                                        >
                                            {position.tokenAddress.slice(0, 6)}...{position.tokenAddress.slice(-4)}
                                        </Link>
                                        <span className={`tier-badge tier-badge-${position.tierName.toLowerCase()}`}>
                                            {position.tierName}
                                        </span>
                                    </div>

                                    <div className="position-details">
                                        <div className="position-detail">
                                            <div className="position-detail-value">
                                                {formatAmount(position.amount)}
                                            </div>
                                            <div className="position-detail-label">Staked</div>
                                        </div>
                                        <div className="position-detail">
                                            <div className="position-detail-value">
                                                {isExpired ? 'Unlocked' : `${daysRemaining}d`}
                                            </div>
                                            <div className="position-detail-label">
                                                {isExpired ? 'Status' : 'Remaining'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ flex: 1, minHeight: '40px' }}
                                            onClick={() => handleClaimBadge(position.tokenAddress)}
                                            disabled={isClaiming || position.tier === 0}
                                        >
                                            🏅 Refresh Badge
                                        </button>

                                        {isExpired && (
                                            <button
                                                className="btn btn-primary"
                                                style={{ flex: 1, minHeight: '40px' }}
                                                onClick={() => handleWithdraw(position.tokenAddress)}
                                                disabled={isWithdrawing}
                                            >
                                                {isWithdrawing ? 'Withdrawing...' : '💸 Withdraw'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
