/**
 * Ethos Stats Component
 * Hero stats section for Creator Page showing Ethos-first metrics
 */

'use client';

import React from 'react';
import { EthosBadge, getBandFromScore, EthosBand } from './EthosBadge';

export interface CreatorEthosStats {
    // Ethos-first metrics (primary)
    knownPlusSupporters: number;
    credibilityWeightedStake: number;
    supportCredibilityIndex: number;

    // Secondary metrics
    totalStaked: string;
    totalSupporters: number;
    totalConvictionPoints: number;

    // Distribution
    bandDistribution: Record<EthosBand, number>;
}

interface EthosStatsProps {
    stats: CreatorEthosStats | null;
    loading?: boolean;
}

export function EthosStats({ stats, loading }: EthosStatsProps) {
    if (loading) {
        return (
            <div className="section" style={{ display: 'flex', justifyContent: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                <div style={{ color: 'var(--text-secondary)', animation: 'pulse 2s infinite' }}>Loading credibility stats...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="section" style={{ display: 'flex', justifyContent: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', color: 'var(--text-muted)' }}>
                <p>No supporters yet. Be the first to show your support!</p>
            </div>
        );
    }

    const indexBand = getBandFromScore(stats.supportCredibilityIndex);

    return (
        <div className="section">
            {/* Primary Ethos-first metrics */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <StatCard
                    label="Known+ Supporters"
                    value={stats.knownPlusSupporters}
                    icon="👥"
                    highlight
                />
                <StatCard
                    label="Credibility Weighted"
                    value={formatNumber(stats.credibilityWeightedStake)}
                    icon="⚖️"
                />
                <StatCard
                    label="Credibility Index"
                    value={stats.supportCredibilityIndex}
                    badge={indexBand}
                    icon="🛡️"
                />
            </div>

            {/* Secondary metrics */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                paddingTop: '16px',
                marginTop: '8px',
                borderTop: '1px solid var(--surface-border)'
            }}>
                <MiniStat label="Total Staked" value={formatTokenAmount(stats.totalStaked)} />
                <MiniStat label="Supporters" value={stats.totalSupporters} />
                <MiniStat label="Conviction Pts" value={formatNumber(stats.totalConvictionPoints)} />
            </div>

            {/* Band distribution */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--surface-border)'
            }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>Distribution:</span>
                {Object.entries(stats.bandDistribution).map(([band, count]) => (
                    count > 0 && (
                        <span key={band} style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <EthosBadge score={getMinScoreForBand(band as EthosBand)} band={band as EthosBand} showScore={false} size="sm" />
                            <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>×{count}</span>
                        </span>
                    )
                ))}
            </div>
        </div>
    );
}

interface StatCardProps {
    label: string;
    value: number | string;
    icon?: string;
    highlight?: boolean;
    badge?: EthosBand;
}

function StatCard({ label, value, icon, highlight, badge }: StatCardProps) {
    return (
        <div
            className="stat-card"
            style={highlight ? {
                background: 'rgba(6, 182, 212, 0.05)',
                borderColor: 'var(--accent)',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)'
            } : {}}
        >
            {icon && <span style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</span>}
            <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
                {badge && <EthosBadge score={getMinScoreForBand(badge)} band={badge} showScore={false} size="sm" />}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

interface MiniStatProps {
    label: string;
    value: number | string;
}

function MiniStat({ label, value }: MiniStatProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
            <span style={{ marginLeft: '4px', fontSize: '11px' }}>{label}</span>
        </div>
    );
}

// Helper functions (unchanged)
function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
}

function formatTokenAmount(amount: string): string {
    const num = parseFloat(amount) / 1e18;
    return formatNumber(num);
}

function getMinScoreForBand(band: EthosBand): number {
    const minScores: Record<EthosBand, number> = {
        Neutral: 1200,
        Known: 1400,
        Established: 1600,
        Reputable: 1800,
        Exemplary: 2200,
    };
    return minScores[band];
}
