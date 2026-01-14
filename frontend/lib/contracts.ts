export const CONTRACTS = {
    // Base Mainnet deployment - 2026-01-14
    vault: {
        address: process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x457b617E9b63cED88d630761e9690e4207F7f798',
        abi: [
            {
                "inputs": [{ "name": "token", "type": "address" }, { "name": "amount", "type": "uint256" }, { "name": "lockDays", "type": "uint256" }],
                "name": "stake",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "name": "token", "type": "address" }, { "name": "amount", "type": "uint256" }],
                "name": "increaseStake",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "name": "token", "type": "address" }, { "name": "newLockDays", "type": "uint256" }],
                "name": "extendLock",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "name": "token", "type": "address" }],
                "name": "withdraw",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "name": "user", "type": "address" }, { "name": "token", "type": "address" }],
                "name": "getPosition",
                "outputs": [{ "name": "amount", "type": "uint256" }, { "name": "lockEnd", "type": "uint256" }],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{ "name": "user", "type": "address" }, { "name": "token", "type": "address" }],
                "name": "getTier",
                "outputs": [{ "name": "tier", "type": "uint8" }],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{ "name": "user", "type": "address" }, { "name": "token", "type": "address" }],
                "name": "isLocked",
                "outputs": [{ "name": "", "type": "bool" }],
                "stateMutability": "view",
                "type": "function"
            }
        ] as const,
    },
    badge: {
        address: process.env.NEXT_PUBLIC_BADGE_ADDRESS || '0x55f56C46B86fE3961cC51b4ca72CCfBFa4F760Ce',
        abi: [
            {
                "inputs": [{ "name": "token", "type": "address" }],
                "name": "claimOrRefresh",
                "outputs": [{ "name": "tokenId", "type": "uint256" }],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "name": "user", "type": "address" }, { "name": "token", "type": "address" }],
                "name": "getBadge",
                "outputs": [
                    { "name": "tokenId", "type": "uint256" },
                    { "name": "tier", "type": "uint8" },
                    { "name": "validUntil", "type": "uint256" },
                    { "name": "isValid", "type": "bool" }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{ "name": "user", "type": "address" }, { "name": "token", "type": "address" }, { "name": "minTier", "type": "uint8" }],
                "name": "hasValidBadge",
                "outputs": [{ "name": "", "type": "bool" }],
                "stateMutability": "view",
                "type": "function"
            }
        ] as const,
    },
    erc20: {
        abi: [
            {
                "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
                "name": "approve",
                "outputs": [{ "name": "", "type": "bool" }],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }],
                "name": "allowance",
                "outputs": [{ "name": "", "type": "uint256" }],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{ "name": "account", "type": "address" }],
                "name": "balanceOf",
                "outputs": [{ "name": "", "type": "uint256" }],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "symbol",
                "outputs": [{ "name": "", "type": "string" }],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "decimals",
                "outputs": [{ "name": "", "type": "uint8" }],
                "stateMutability": "view",
                "type": "function"
            }
        ] as const,
    },
} as const;

export const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Legend'] as const;
export const TIER_COLORS = ['#666666', '#CD7F32', '#C0C0C0', '#FFD700', '#9333EA'] as const;

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const NORMALIZED_API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
export const API_BASE_URL = NORMALIZED_API_BASE_URL.endsWith('/api')
    ? NORMALIZED_API_BASE_URL
    : `${NORMALIZED_API_BASE_URL}/api`;
