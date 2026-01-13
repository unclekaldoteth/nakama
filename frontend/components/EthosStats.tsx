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
            <div className="ethos-stats-loading" style={loadingStyles}>
                <div style={pulseStyles}>Loading credibility stats...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="ethos-stats-empty" style={emptyStyles}>
                <p>No supporters yet. Be the first to show your support!</p>
            </div>
        );
    }

    const indexBand = getBandFromScore(stats.supportCredibilityIndex);

    return (
        <div className="ethos-stats" style={containerStyles}>
            {/* Primary Ethos-first metrics */}
            <div style={primaryGridStyles}>
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
            <div style={secondaryGridStyles}>
                <MiniStat label="Total Staked" value={formatTokenAmount(stats.totalStaked)} />
                <MiniStat label="Supporters" value={stats.totalSupporters} />
                <MiniStat label="Conviction Pts" value={formatNumber(stats.totalConvictionPoints)} />
            </div>

            {/* Band distribution */}
            <div style={distributionStyles}>
                <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>Distribution:</span>
                {Object.entries(stats.bandDistribution).map(([band, count]) => (
                    count > 0 && (
                        <span key={band} style={bandCountStyles}>
                            <EthosBadge score={getMinScoreForBand(band as EthosBand)} band={band as EthosBand} showScore={false} size="sm" />
                            <span style={{ marginLeft: '3px', fontSize: '11px' }}>×{count}</span>
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
        <div style={{
            ...cardStyles,
            ...(highlight ? highlightCardStyles : {}),
        }}>
            {icon && <span style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</span>}
            <div style={cardValueStyles}>
                {typeof value === 'number' ? value.toLocaleString() : value}
                {badge && <EthosBadge score={getMinScoreForBand(badge)} band={badge} showScore={false} size="sm" />}
            </div>
            <div style={cardLabelStyles}>{label}</div>
        </div>
    );
}

interface MiniStatProps {
    label: string;
    value: number | string;
}

function MiniStat({ label, value }: MiniStatProps) {
    return (
        <div style={miniStatStyles}>
            <span style={{ fontWeight: 600 }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
            <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '4px' }}>{label}</span>
        </div>
    );
}

// Helper functions
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

// Styles
const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: '16px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
};

const primaryGridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
};

const secondaryGridStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
};

const cardStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
};

const highlightCardStyles: React.CSSProperties = {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
};

const cardValueStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
};

const cardLabelStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '4px',
};

const miniStatStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#374151',
};

const distributionStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
};

const bandCountStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
};

const loadingStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: '16px',
};

const pulseStyles: React.CSSProperties = {
    color: '#6b7280',
    animation: 'pulse 2s infinite',
};

const emptyStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: '16px',
    color: '#9ca3af',
};
