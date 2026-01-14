'use client';

import { useState, useEffect } from 'react';
import { useMiniApp } from '@/lib/MiniAppProvider';
import { useAccount } from 'wagmi';
import { formatEther, parseEther, isAddress } from 'viem';
import { API_BASE_URL } from '@/lib/contracts';
import Link from 'next/link';
import './page.css';

interface TierConfig {
    minStakeBronze: string;
    minStakeSilver: string;
    minStakeGold: string;
    minStakeLegend: string;
    minEthosBronze: number;
    minEthosSilver: number;
    minEthosGold: number;
    minEthosLegend: number;
}

const TIER_INFO = [
    { key: 'bronze', name: 'Bronze', color: '#CD7F32', icon: '🥉' },
    { key: 'silver', name: 'Silver', color: '#C0C0C0', icon: '🥈' },
    { key: 'gold', name: 'Gold', color: '#FFD700', icon: '🥇' },
    { key: 'legend', name: 'Legend', color: '#9B59B6', icon: '👑' },
];

export default function CreatorSettingsPage() {
    const { isReady, context, actions, authFetch } = useMiniApp();
    const { address, isConnected } = useAccount();

    const [tokenAddress, setTokenAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isCustomConfig, setIsCustomConfig] = useState(false);

    // Stake thresholds (in display format, e.g., "100" for 100 tokens)
    const [stakeThresholds, setStakeThresholds] = useState({
        bronze: '0',
        silver: '1',
        gold: '10',
        legend: '100',
    });

    // Ethos score thresholds
    const [ethosThresholds, setEthosThresholds] = useState({
        bronze: 0,
        silver: 1200,
        gold: 1400,
        legend: 1600,
    });

    // Load config when token address changes
    useEffect(() => {
        if (!tokenAddress || !isAddress(tokenAddress)) return;
        loadConfig();
    }, [tokenAddress]);

    const loadConfig = async () => {
        if (!isAddress(tokenAddress)) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/creator/${tokenAddress}/config`);
            if (!res.ok) throw new Error('Failed to load config');

            const data = await res.json();
            setIsCustomConfig(data.isCustom);

            // Convert wei to display format
            setStakeThresholds({
                bronze: formatEther(BigInt(data.config.minStakeBronze || '0')),
                silver: formatEther(BigInt(data.config.minStakeSilver || '0')),
                gold: formatEther(BigInt(data.config.minStakeGold || '0')),
                legend: formatEther(BigInt(data.config.minStakeLegend || '0')),
            });

            setEthosThresholds({
                bronze: data.config.minEthosBronze || 0,
                silver: data.config.minEthosSilver || 0,
                gold: data.config.minEthosGold || 0,
                legend: data.config.minEthosLegend || 0,
            });
        } catch (err) {
            console.error('Error loading config:', err);
            setError('Failed to load configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!tokenAddress || !isAddress(tokenAddress)) {
            setError('Please enter a valid token address');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Convert display format to wei
            const body = {
                minStakeBronze: parseEther(stakeThresholds.bronze || '0').toString(),
                minStakeSilver: parseEther(stakeThresholds.silver || '0').toString(),
                minStakeGold: parseEther(stakeThresholds.gold || '0').toString(),
                minStakeLegend: parseEther(stakeThresholds.legend || '0').toString(),
                minEthosBronze: ethosThresholds.bronze,
                minEthosSilver: ethosThresholds.silver,
                minEthosGold: ethosThresholds.gold,
                minEthosLegend: ethosThresholds.legend,
            };

            // Use authFetch which handles Quick Auth automatically
            const res = await authFetch(`${API_BASE_URL}/creator/${tokenAddress}/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save config');
            }

            setSuccess('Configuration saved successfully!');
            setIsCustomConfig(true);
        } catch (err: any) {
            console.error('Error saving config:', err);
            setError(err.message || 'Failed to save configuration');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isReady) {
        return (
            <div className="container">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <Link href="/" className="back-button">← Back</Link>
                <h1>Creator Settings</h1>
                <p className="subtitle">Configure tier requirements for your supporters</p>
            </header>

            {/* Token Input */}
            <section className="section">
                <div className="card">
                    <h3>Your Token</h3>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter your token address (0x...)"
                        value={tokenAddress}
                        onChange={(e) => setTokenAddress(e.target.value)}
                    />
                    {isLoading && <p className="loading-text">Loading configuration...</p>}
                    {isCustomConfig && (
                        <p className="custom-badge">✓ Custom configuration active</p>
                    )}
                </div>
            </section>

            {/* Tier Configuration */}
            {tokenAddress && isAddress(tokenAddress) && !isLoading && (
                <section className="section">
                    <div className="card">
                        <h3>Tier Thresholds</h3>
                        <p className="helper-text">
                            Set minimum stake amounts and ethos scores for each tier.
                            Supporters must meet ALL requirements to qualify.
                        </p>

                        <div className="tier-config-grid">
                            {TIER_INFO.map((tier) => (
                                <div key={tier.key} className="tier-config-card" style={{ borderColor: tier.color }}>
                                    <div className="tier-header" style={{ background: `${tier.color}20` }}>
                                        <span className="tier-icon">{tier.icon}</span>
                                        <span className="tier-name">{tier.name}</span>
                                    </div>

                                    <div className="tier-inputs">
                                        <div className="input-group">
                                            <label>Min Stake (tokens)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={stakeThresholds[tier.key as keyof typeof stakeThresholds]}
                                                onChange={(e) => setStakeThresholds({
                                                    ...stakeThresholds,
                                                    [tier.key]: e.target.value
                                                })}
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label>Min Ethos Score</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={ethosThresholds[tier.key as keyof typeof ethosThresholds]}
                                                onChange={(e) => setEthosThresholds({
                                                    ...ethosThresholds,
                                                    [tier.key]: parseInt(e.target.value) || 0
                                                })}
                                                min="0"
                                                max="2000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {error && (
                            <p className="error-message">{error}</p>
                        )}
                        {success && (
                            <p className="success-message">{success}</p>
                        )}

                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleSave}
                            disabled={isSaving || !isConnected}
                            style={{ marginTop: '24px' }}
                        >
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>

                        {!isConnected && (
                            <p className="helper-text" style={{ marginTop: '12px', textAlign: 'center' }}>
                                Connect your wallet to save configuration
                            </p>
                        )}
                    </div>
                </section>
            )}

            {/* Info Section */}
            <section className="section">
                <div className="card info-card">
                    <h4>How Tiers Work</h4>
                    <ul className="info-list">
                        <li>🔒 <strong>Lock Duration:</strong> Still required (7d=Silver, 30d=Gold, 90d=Legend)</li>
                        <li>💰 <strong>Min Stake:</strong> Minimum tokens staked to qualify</li>
                        <li>⭐ <strong>Min Ethos:</strong> Minimum Ethos reputation score</li>
                        <li>📊 <strong>Final Tier:</strong> Minimum of all factors (must meet ALL requirements)</li>
                    </ul>
                </div>
            </section>
        </div>
    );
}
