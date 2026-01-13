/**
 * Ethos Badge Component
 * Displays Ethos score and credibility band with visual styling
 */

'use client';

import React from 'react';

export type EthosBand = 'Neutral' | 'Known' | 'Established' | 'Reputable' | 'Exemplary';

interface EthosBadgeProps {
    score: number;
    band?: EthosBand;
    showScore?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const BAND_COLORS: Record<EthosBand, { bg: string; text: string; border: string }> = {
    Neutral: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },
    Known: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
    Established: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7' },
    Reputable: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
    Exemplary: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
};

export function getBandFromScore(score: number): EthosBand {
    if (score >= 2200) return 'Exemplary';
    if (score >= 1800) return 'Reputable';
    if (score >= 1600) return 'Established';
    if (score >= 1400) return 'Known';
    return 'Neutral';
}

export function EthosBadge({
    score,
    band,
    showScore = true,
    size = 'md',
    className = ''
}: EthosBadgeProps) {
    const effectiveBand = band || getBandFromScore(score);
    const colors = BAND_COLORS[effectiveBand];

    const sizeStyles = {
        sm: { padding: '2px 6px', fontSize: '11px', gap: '3px' },
        md: { padding: '4px 10px', fontSize: '13px', gap: '5px' },
        lg: { padding: '6px 14px', fontSize: '15px', gap: '7px' },
    };

    const style = sizeStyles[size];

    return (
        <span
            className={`ethos-badge ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: style.gap,
                padding: style.padding,
                fontSize: style.fontSize,
                fontWeight: 500,
                borderRadius: '9999px',
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{ fontWeight: 600 }}>{effectiveBand}</span>
            {showScore && (
                <span style={{ opacity: 0.7, fontSize: '0.9em' }}>
                    ({score.toLocaleString()})
                </span>
            )}
        </span>
    );
}

/**
 * Verified badge for Known+ users
 */
interface EthosVerifiedBadgeProps {
    score: number;
    size?: 'sm' | 'md';
}

export function EthosVerifiedBadge({ score, size = 'md' }: EthosVerifiedBadgeProps) {
    if (score < 1400) return null; // Only show for Known+

    const band = getBandFromScore(score);
    const colors = BAND_COLORS[band];

    const iconSize = size === 'sm' ? 14 : 18;

    return (
        <span
            title={`Ethos ${band} (${score})`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: iconSize + 4,
                height: iconSize + 4,
                borderRadius: '50%',
                backgroundColor: colors.bg,
                color: colors.text,
                marginLeft: '4px',
            }}
        >
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        </span>
    );
}
