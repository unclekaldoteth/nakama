/**
 * Credibility Calculator Service
 * Calculates weighted conviction points and credibility metrics for Nakama
 */

import { EthosProfile, getBandWeight, EthosBand, buildUserkey } from './ethosClient';

// Lock duration multipliers for conviction points
const LOCK_MULTIPLIERS: Record<string, number> = {
    any: 1.0,      // 1-6 days
    silver: 1.15,  // 7-29 days
    gold: 1.4,     // 30-89 days
    legend: 1.8,   // 90+ days
};

// Position data from database
export interface Position {
    userAddress: string;
    tokenAddress: string;
    amount: string; // BigInt as string
    lockEnd: Date;
    tier: number;
    createdAt: Date;
}

// Supporter with Ethos data
export interface SupporterWithCredibility {
    address: string;
    fid?: number;
    amount: string;
    lockEnd: Date;
    nakamaTier: number;
    nakamaColor: string;
    ethosScore: number;
    ethosBand: EthosBand;
    ethosWeight: number;
    convictionPoints: number;
    daysHeld: number;
}

// Aggregated creator stats
export interface CreatorCredibilityStats {
    // Primary Ethos-first metrics
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

/**
 * Get Nakama tier from lock days
 */
export function getTierFromLockDays(lockDays: number): number {
    if (lockDays >= 90) return 4; // Legend
    if (lockDays >= 30) return 3; // Gold
    if (lockDays >= 7) return 2;  // Silver
    if (lockDays > 0) return 1;   // Bronze
    return 0;
}

/**
 * Get tier name and color
 */
export function getTierInfo(tier: number): { name: string; color: string } {
    const tiers = [
        { name: 'None', color: '#666666' },
        { name: 'Bronze', color: '#CD7F32' },
        { name: 'Silver', color: '#C0C0C0' },
        { name: 'Gold', color: '#FFD700' },
        { name: 'Legend', color: '#9333EA' },
    ];
    return tiers[tier] || tiers[0];
}

/**
 * Get lock multiplier for conviction points
 */
function getLockMultiplier(lockDays: number): number {
    if (lockDays >= 90) return LOCK_MULTIPLIERS.legend;
    if (lockDays >= 30) return LOCK_MULTIPLIERS.gold;
    if (lockDays >= 7) return LOCK_MULTIPLIERS.silver;
    return LOCK_MULTIPLIERS.any;
}

/**
 * Calculate time held factor (ramps from 0.5 to 1.0 over 30 days)
 */
function getTimeHeldFactor(daysHeld: number): number {
    return Math.min(1.0, 0.5 + 0.5 * (daysHeld / 30));
}

/**
 * Calculate conviction points for a single position
 */
export function calculateConvictionPoints(
    amount: bigint,
    lockDays: number,
    daysHeld: number,
    ethosScore: number
): number {
    // Normalize amount (divide by 10^18 for ERC20 tokens)
    const amountNormalized = Number(amount) / 1e18;

    // Square root of amount (diminishing returns for large stakes)
    const sqrtAmount = Math.sqrt(amountNormalized);

    // Multipliers
    const lockMultiplier = getLockMultiplier(lockDays);
    const timeHeldFactor = getTimeHeldFactor(daysHeld);
    const ethosBand = getBandFromScore(ethosScore);
    const ethosMultiplier = getBandWeight(ethosBand);

    // Final calculation
    return sqrtAmount * lockMultiplier * timeHeldFactor * ethosMultiplier;
}

/**
 * Get band from score (duplicated here to avoid circular import)
 */
function getBandFromScore(score: number): EthosBand {
    if (score >= 2200) return 'Exemplary';
    if (score >= 1800) return 'Reputable';
    if (score >= 1600) return 'Established';
    if (score >= 1400) return 'Known';
    return 'Neutral';
}

/**
 * Calculate credibility-weighted stake
 */
export function calculateWeightedStake(amount: bigint, ethosBand: EthosBand): number {
    const amountNormalized = Number(amount) / 1e18;
    return amountNormalized * getBandWeight(ethosBand);
}

/**
 * Calculate creator credibility stats from positions and Ethos data
 */
export function calculateCreatorStats(
    positions: Position[],
    ethosProfiles: Map<string, EthosProfile>
): CreatorCredibilityStats {
    const now = new Date();
    const supporters: SupporterWithCredibility[] = [];
    let totalStaked = BigInt(0);
    let credibilityWeightedStake = 0;
    let totalConvictionPoints = 0;

    const bandDistribution: Record<EthosBand, number> = {
        Neutral: 0,
        Known: 0,
        Established: 0,
        Reputable: 0,
        Exemplary: 0,
    };

    for (const pos of positions) {
        const amount = BigInt(pos.amount);
        totalStaked += amount;

        // Get Ethos profile
        const userkey = buildUserkey(undefined, pos.userAddress) || pos.userAddress.toLowerCase();
        const ethosProfile = ethosProfiles.get(userkey) || {
            score: 1200,
            band: 'Neutral' as EthosBand,
        };

        // Calculate time metrics
        const lockEnd = new Date(pos.lockEnd);
        const lockDays = Math.max(0, Math.ceil((lockEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const created = new Date(pos.createdAt);
        const daysHeld = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));

        // Calculate metrics
        const ethosBand = ethosProfile.band;
        const ethosWeight = getBandWeight(ethosBand);
        const convictionPoints = calculateConvictionPoints(amount, lockDays, daysHeld, ethosProfile.score);
        const weightedStake = calculateWeightedStake(amount, ethosBand);

        credibilityWeightedStake += weightedStake;
        totalConvictionPoints += convictionPoints;
        bandDistribution[ethosBand]++;

        const tierInfo = getTierInfo(pos.tier);

        supporters.push({
            address: pos.userAddress,
            amount: pos.amount,
            lockEnd,
            nakamaTier: pos.tier,
            nakamaColor: tierInfo.color,
            ethosScore: ethosProfile.score,
            ethosBand,
            ethosWeight,
            convictionPoints,
            daysHeld,
        });
    }

    // Calculate Known+ supporters (score >= 1400)
    const knownPlusSupporters = supporters.filter(s => s.ethosScore >= 1400).length;

    // Calculate Support Credibility Index (median Ethos score)
    const sortedScores = supporters.map(s => s.ethosScore).sort((a, b) => a - b);
    const supportCredibilityIndex = sortedScores.length > 0
        ? sortedScores[Math.floor(sortedScores.length / 2)]
        : 1200;

    return {
        // Ethos-first metrics
        knownPlusSupporters,
        credibilityWeightedStake: Math.round(credibilityWeightedStake * 100) / 100,
        supportCredibilityIndex,

        // Secondary metrics
        totalStaked: totalStaked.toString(),
        totalSupporters: positions.length,
        totalConvictionPoints: Math.round(totalConvictionPoints * 100) / 100,

        // Distribution
        bandDistribution,
    };
}

/**
 * Build supporter list with Ethos data
 */
export function buildSupporterList(
    positions: Position[],
    ethosProfiles: Map<string, EthosProfile>
): SupporterWithCredibility[] {
    const now = new Date();

    return positions.map(pos => {
        const amount = BigInt(pos.amount);
        const userkey = buildUserkey(undefined, pos.userAddress) || pos.userAddress.toLowerCase();
        const ethosProfile = ethosProfiles.get(userkey) || {
            score: 1200,
            band: 'Neutral' as EthosBand,
            fid: undefined,
        };

        const lockEnd = new Date(pos.lockEnd);
        const lockDays = Math.max(0, Math.ceil((lockEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const created = new Date(pos.createdAt);
        const daysHeld = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));

        const ethosBand = ethosProfile.band;
        const tierInfo = getTierInfo(pos.tier);

        return {
            address: pos.userAddress,
            fid: ethosProfile.fid,
            amount: pos.amount,
            lockEnd,
            nakamaTier: pos.tier,
            nakamaColor: tierInfo.color,
            ethosScore: ethosProfile.score,
            ethosBand,
            ethosWeight: getBandWeight(ethosBand),
            convictionPoints: calculateConvictionPoints(amount, lockDays, daysHeld, ethosProfile.score),
            daysHeld,
        };
    }).sort((a, b) => b.convictionPoints - a.convictionPoints);
}
