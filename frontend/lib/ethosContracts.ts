/**
 * Ethos Network Smart Contracts on Base Mainnet
 * Used for on-chain review/vouch signing
 */

// EthosReview contract on Base Mainnet
export const ETHOS_REVIEW_CONTRACT = {
    address: '0x6D3A8Fd5cF89f9a429BFaDFd970968F646AFF325' as const,
    abi: [
        {
            name: 'addReview',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
                { name: 'score', type: 'uint8' },       // 0=negative, 1=neutral, 2=positive
                { name: 'subject', type: 'address' },   // Address being reviewed
                { name: 'comment', type: 'string' },    // Review comment
                { name: 'metadata', type: 'string' },   // Additional metadata (JSON)
            ],
            outputs: [{ name: '', type: 'uint256' }],   // Returns review ID
        },
        {
            name: 'reviewIdsBySubjectProfileId',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'subjectProfileId', type: 'uint256' }],
            outputs: [{ name: '', type: 'uint256[]' }],
        },
    ] as const,
} as const;

// EthosVote contract on Base Mainnet
export const ETHOS_VOTE_CONTRACT = {
    address: '0x44EaaAE41355581C81eb5ce785A4452Ed554c0f2' as const,
    abi: [
        {
            name: 'voteFor',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
                { name: 'targetContract', type: 'address' },
                { name: 'targetId', type: 'uint256' },
                { name: 'isUpvote', type: 'bool' },
            ],
            outputs: [],
        },
    ] as const,
} as const;

// Review score mappings
export const REVIEW_SCORES = {
    negative: 0,
    neutral: 1,
    positive: 2,
} as const;

export type ReviewScore = keyof typeof REVIEW_SCORES;
