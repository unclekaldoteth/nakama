/**
 * Tier Calculator Service
 * Computes effective tier by combining:
 * 1. Lock-duration tier (from smart contract)
 * 2. Stake amount threshold (from creator config)
 * 3. Ethos score threshold (from creator config)
 */

export interface TierConfig {
    minStakeBronze: string;
    minStakeSilver: string;
    minStakeGold: string;
    minStakeLegend: string;
    minEthosBronze: number;
    minEthosSilver: number;
    minEthosGold: number;
    minEthosLegend: number;
}

export interface TierInput {
    lockDays: number;      // From smart contract position
    stakeAmount: string;   // In wei
    ethosScore: number;    // From Ethos API (0-2000 typically)
}

/**
 * Calculate tier based on lock duration (matches smart contract logic)
 */
export function getLockBasedTier(lockDays: number): number {
    if (lockDays >= 90) return 4; // Legend
    if (lockDays >= 30) return 3; // Gold
    if (lockDays >= 7) return 2;  // Silver
    if (lockDays >= 1) return 1;  // Bronze
    return 0;
}

/**
 * Calculate tier based on stake amount thresholds
 */
export function getStakeBasedTier(stakeAmount: string, config: TierConfig): number {
    const amount = BigInt(stakeAmount || '0');

    if (amount <= 0n) return 0;
    if (amount >= BigInt(config.minStakeLegend)) return 4;
    if (amount >= BigInt(config.minStakeGold)) return 3;
    if (amount >= BigInt(config.minStakeSilver)) return 2;
    if (amount >= BigInt(config.minStakeBronze)) return 1;
    return 0;
}

/**
 * Calculate tier based on ethos score thresholds
 */
export function getEthosBasedTier(ethosScore: number, config: TierConfig): number {
    if (ethosScore >= config.minEthosLegend) return 4;
    if (ethosScore >= config.minEthosGold) return 3;
    if (ethosScore >= config.minEthosSilver) return 2;
    if (ethosScore >= config.minEthosBronze) return 1;
    return 0; // Fails ethos requirements
}

/**
 * Calculate effective tier (minimum of all factors)
 * User must meet ALL requirements to qualify for a tier
 */
export function calculateEffectiveTier(input: TierInput, config: TierConfig): number {
    const lockTier = getLockBasedTier(input.lockDays);
    const stakeTier = getStakeBasedTier(input.stakeAmount, config);
    const ethosTier = getEthosBasedTier(input.ethosScore, config);

    // Return minimum of all tiers (must meet all requirements)
    return Math.min(lockTier, stakeTier, ethosTier);
}

/**
 * Global default tier configuration
 * Used when creators haven't set custom thresholds
 */
export const GLOBAL_DEFAULTS: TierConfig = {
    minStakeBronze: '0',
    minStakeSilver: '1000000000000000000',     // 1 token
    minStakeGold: '10000000000000000000',      // 10 tokens
    minStakeLegend: '100000000000000000000',   // 100 tokens
    minEthosBronze: 0,
    minEthosSilver: 1200,    // Neutral+
    minEthosGold: 1400,      // Reputable
    minEthosLegend: 1600,    // Exemplary
};

/**
 * Convert database row to TierConfig
 */
export function rowToTierConfig(row: any): TierConfig {
    return {
        minStakeBronze: row.min_stake_bronze?.toString() || '0',
        minStakeSilver: row.min_stake_silver?.toString() || '0',
        minStakeGold: row.min_stake_gold?.toString() || '0',
        minStakeLegend: row.min_stake_legend?.toString() || '0',
        minEthosBronze: parseInt(row.min_ethos_bronze) || 0,
        minEthosSilver: parseInt(row.min_ethos_silver) || 0,
        minEthosGold: parseInt(row.min_ethos_gold) || 0,
        minEthosLegend: parseInt(row.min_ethos_legend) || 0,
    };
}
