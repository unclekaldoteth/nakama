/**
 * Ethos Review Modal Component
 * Allows users to write Ethos reviews about creators or supporters
 */

'use client';

import React, { useState, useEffect } from 'react';
import { EthosBadge, getBandFromScore, EthosBand } from './EthosBadge';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EthosReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetFid?: number;
    targetAddress?: string;
    targetName?: string;
    authToken?: string;
}

interface EligibilityStatus {
    eligible: boolean;
    ethos: {
        score: number;
        band: string;
        eligible: boolean;
        required: number;
    };
    nakama: {
        tier: number;
        eligible: boolean;
        required: number;
    };
    rateLimit: {
        used: number;
        remaining: number;
        eligible: boolean;
    };
}

export function EthosReviewModal({
    isOpen,
    onClose,
    targetFid,
    targetAddress,
    targetName,
    authToken,
}: EthosReviewModalProps) {
    const [rating, setRating] = useState<'positive' | 'neutral' | 'negative'>('positive');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
    const [result, setResult] = useState<{ success: boolean; message: string; deepLink?: string } | null>(null);

    useEffect(() => {
        if (isOpen && authToken) {
            checkEligibility();
        }
    }, [isOpen, authToken]);

    async function checkEligibility() {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/ethos/eligibility`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setEligibility(data);
            }
        } catch (error) {
            console.error('Failed to check eligibility:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!eligibility?.eligible) return;

        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/ethos/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    targetFid,
                    targetAddress,
                    rating,
                    comment: comment.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResult({
                    success: true,
                    message: data.message,
                    deepLink: data.deepLink,
                });
            } else {
                setResult({
                    success: false,
                    message: data.error || 'Failed to submit review',
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Network error. Please try again.',
            });
        } finally {
            setSubmitting(false);
        }
    }

    function handleClose() {
        setRating('positive');
        setComment('');
        setResult(null);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div style={overlayStyles} onClick={handleClose}>
            <div style={modalStyles} onClick={e => e.stopPropagation()}>
                <div style={headerStyles}>
                    <h2 style={{ margin: 0 }}>Write Ethos Feedback</h2>
                    <button onClick={handleClose} style={closeButtonStyles}>×</button>
                </div>

                {targetName && (
                    <div style={targetStyles}>
                        for <strong>{targetName}</strong>
                    </div>
                )}

                {loading ? (
                    <div style={loadingStyles}>Checking eligibility...</div>
                ) : result ? (
                    <div style={resultStyles}>
                        {result.success ? (
                            <>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
                                <p style={{ marginBottom: '16px' }}>{result.message}</p>
                                {result.deepLink && (
                                    <a
                                        href={result.deepLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={linkButtonStyles}
                                    >
                                        Complete on Ethos →
                                    </a>
                                )}
                                <button onClick={handleClose} style={secondaryButtonStyles}>
                                    Done
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                                <p style={{ color: '#DC2626' }}>{result.message}</p>
                                <button onClick={() => setResult(null)} style={secondaryButtonStyles}>
                                    Try Again
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {eligibility && (
                            <div style={eligibilityStyles}>
                                <EligibilityRow
                                    label="Ethos Score"
                                    value={
                                        <EthosBadge
                                            score={eligibility.ethos.score}
                                            band={eligibility.ethos.band as EthosBand}
                                            size="sm"
                                        />
                                    }
                                    eligible={eligibility.ethos.eligible}
                                    requirement={`${eligibility.ethos.required}+ (Known)`}
                                />
                                <EligibilityRow
                                    label="Nakama Tier"
                                    value={getTierName(eligibility.nakama.tier)}
                                    eligible={eligibility.nakama.eligible}
                                    requirement="Bronze or higher"
                                />
                                <EligibilityRow
                                    label="Reviews Today"
                                    value={`${eligibility.rateLimit.used}/3`}
                                    eligible={eligibility.rateLimit.eligible}
                                    requirement="Max 3 per day"
                                />
                            </div>
                        )}

                        {eligibility?.eligible ? (
                            <form onSubmit={handleSubmit}>
                                <div style={formGroupStyles}>
                                    <label style={labelStyles}>Rating</label>
                                    <div style={ratingGroupStyles}>
                                        {(['positive', 'neutral', 'negative'] as const).map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRating(r)}
                                                style={{
                                                    ...ratingButtonStyles,
                                                    ...(rating === r ? activeRatingStyles[r] : {}),
                                                }}
                                            >
                                                {r === 'positive' && '👍'}
                                                {r === 'neutral' && '🤝'}
                                                {r === 'negative' && '👎'}
                                                <span style={{ marginLeft: '4px' }}>{r}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={formGroupStyles}>
                                    <label style={labelStyles}>Comment (optional)</label>
                                    <textarea
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        placeholder="Share your experience with this creator..."
                                        maxLength={500}
                                        style={textareaStyles}
                                    />
                                    <div style={charCountStyles}>{comment.length}/500</div>
                                </div>

                                <div style={footerStyles}>
                                    <button type="button" onClick={handleClose} style={secondaryButtonStyles}>
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} style={primaryButtonStyles}>
                                        {submitting ? 'Submitting...' : 'Submit to Ethos'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div style={ineligibleStyles}>
                                <p>You are not eligible to write reviews yet.</p>
                                <ul style={{ textAlign: 'left', marginTop: '12px' }}>
                                    {!eligibility?.ethos.eligible && (
                                        <li>Increase your Ethos score to Known (1400+)</li>
                                    )}
                                    {!eligibility?.nakama.eligible && (
                                        <li>Stake a creator coin to earn Bronze tier</li>
                                    )}
                                    {!eligibility?.rateLimit.eligible && (
                                        <li>Wait until tomorrow (daily limit reached)</li>
                                    )}
                                </ul>
                                <button onClick={handleClose} style={secondaryButtonStyles}>
                                    Close
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

interface EligibilityRowProps {
    label: string;
    value: React.ReactNode;
    eligible: boolean;
    requirement: string;
}

function EligibilityRow({ label, value, eligible, requirement }: EligibilityRowProps) {
    return (
        <div style={eligibilityRowStyles}>
            <span style={{ fontWeight: 500 }}>{label}:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {value}
                <span style={{ color: eligible ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                    {eligible ? '✓' : '✗'}
                </span>
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>({requirement})</span>
        </div>
    );
}

function getTierName(tier: number): string {
    const tiers = ['None', 'Bronze', 'Silver', 'Gold', 'Legend'];
    return tiers[tier] || 'None';
}

// Styles
const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
};

const modalStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '24px',
};

const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
};

const closeButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6b7280',
    lineHeight: 1,
};

const targetStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
};

const eligibilityStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '20px',
};

const eligibilityRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '13px',
};

const formGroupStyles: React.CSSProperties = {
    marginBottom: '16px',
};

const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    fontSize: '14px',
};

const ratingGroupStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
};

const ratingButtonStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    textTransform: 'capitalize',
};

const activeRatingStyles: Record<string, React.CSSProperties> = {
    positive: { borderColor: '#10B981', backgroundColor: '#d1fae5' },
    neutral: { borderColor: '#6b7280', backgroundColor: '#f3f4f6' },
    negative: { borderColor: '#EF4444', backgroundColor: '#fee2e2' },
};

const textareaStyles: React.CSSProperties = {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
};

const charCountStyles: React.CSSProperties = {
    textAlign: 'right',
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px',
};

const footerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
};

const primaryButtonStyles: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
};

const secondaryButtonStyles: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
};

const linkButtonStyles: React.CSSProperties = {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#8B5CF6',
    color: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    marginBottom: '12px',
};

const loadingStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
};

const resultStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '20px',
};

const ineligibleStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '20px',
    color: '#6b7280',
};
