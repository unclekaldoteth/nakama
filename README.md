# Nakama - Conviction Vault Mini App

Nakama is a Farcaster Mini App on the Base ecosystem that allows creators to build loyalty through staking-based conviction. Supporters can stake creator coins to demonstrate their conviction and earn Soulbound NFT badges as proof of their commitment.

## Overview

The core mechanic involves supporters buying creator coins, staking them to demonstrate conviction, and claiming SBT (Soulbound Token) badges. Creators can offer perks like gated content to their most loyal supporters.

### Features

- **Universal Staking Vault**: Stake any ERC-20 creator coin with time-locked commitments
- **Tier-Based Rewards**: Bronze (any stake), Silver (7+ days), Gold (30+ days), Legend (90+ days)
- **Soulbound Badges**: Non-transferable NFTs with on-chain SVG metadata as proof of conviction
- **Gated Content**: Creators can restrict content access based on supporter tier
- **Leaderboards**: Track top supporters by conviction score (sqrt of staked amount)
- **Ethos Network Integration**: Credibility scores, on-chain reviews, and reputation-weighted supporter metrics
- **Creator Coin Discovery**: Search and select creator coins via Clanker API integration
- **Premium Dark UI**: Modern glassmorphism design with smooth animations

## Project Structure

```
nakama/
├── contracts/          # Solidity smart contracts (Hardhat)
├── backend/            # Express.js API server
└── frontend/           # Next.js 14 frontend application
```

## Smart Contracts

Deployed on Base Sepolia testnet:

| Contract | Address | Description |
|----------|---------|-------------|
| ConvictionVault | `0x805daf87844E78fE86Bc0DfaBf5a6A6F4E24d218` | Universal staking vault for ERC-20 tokens |
| ConvictionBadge | `0x810BFa0A3aEa3aF7187a853A75f9827bD213f5b4` | Soulbound NFT badges with on-chain SVG |

### Contract Features

**ConvictionVault.sol**
- `stake(token, amount, lockDays)` - Stake tokens with a lock duration (1-365 days)
- `increaseStake(token, amount)` - Add more tokens to existing stake
- `extendLock(token, newLockDays)` - Extend the lock period
- `withdraw(token)` - Withdraw tokens after lock expires
- `getTier(user, token)` - Get tier based on lock duration
- `getConvictionScore(user, token)` - Get conviction score (sqrt of amount)

**ConvictionBadge.sol**
- `claimOrRefresh(token)` - Mint or update a Soulbound badge
- `hasValidBadge(user, token, minTier)` - Check if user has valid badge
- Non-transferable (Soulbound) with on-chain SVG generation

## Technology Stack

### Contracts
- Solidity 0.8.20
- Hardhat 2.x
- OpenZeppelin Contracts 5.x

### Backend
- Node.js with Express
- PostgreSQL database
- Farcaster Quick Auth

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Wagmi and Viem for blockchain interactions
- Farcaster Mini App SDK

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (for backend)
- A Base Sepolia RPC URL
- A deployer private key with Base Sepolia ETH

### Installation

1. Clone the repository:
```bash
git clone https://github.com/unclekaldoteth/nakama.git
cd nakama
```

2. Install dependencies for all packages:
```bash
# Contracts
cd contracts && npm install

# Backend
cd ../backend && npm install

# Frontend
cd ../frontend && npm install
```

### Contract Development

```bash
cd contracts

# Compile contracts
npm run compile

# Run tests (34 passing)
npm test

# Deploy to Base Sepolia
npm run deploy:sepolia

# Deploy to Base Mainnet
npm run deploy:mainnet
```

### Backend Development

```bash
cd backend

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev
```

## Environment Variables

### Contracts (.env)

```
PRIVATE_KEY=your_deployer_private_key
BASESCAN_API_KEY=your_etherscan_api_key
```

### Backend (.env)

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/nakama
FRONTEND_URL=http://localhost:3000
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VAULT_ADDRESS=0x805daf87844E78fE86Bc0DfaBf5a6A6F4E24d218
BADGE_ADDRESS=0x810BFa0A3aEa3aF7187a853A75f9827bD213f5b4
```

## API Endpoints

### Creator Routes
- `GET /api/creator/:token/supporters` - Get supporters list with Ethos scores
- `GET /api/creator/:token/stats` - Get creator stats including credibility metrics
- `GET /api/creator/:token/allowlist` - Get tier-based allowlist
- `POST /api/creator/:token/gated` - Create gated content (requires auth)

### User Routes
- `GET /api/me/positions` - Get user's staked positions
- `GET /api/me/badges` - Get user's badges

### Ethos Routes
- `GET /api/ethos/score/:userKey` - Get Ethos credibility score for a user
- `GET /api/ethos/stats/:tokenAddress` - Get aggregated Ethos stats for a creator

### Token Routes
- `GET /api/tokens/search?q=:query` - Search creator coins via Clanker API
- `GET /api/tokens/trending` - Get trending creator coins

### Gated Content
- `GET /api/gated/:contentId` - Access gated content (requires auth)
- `GET /api/gated/creator/:token` - List gated content for a creator

## Tier System

| Tier | Lock Duration | Color |
|------|---------------|-------|
| Bronze | Any stake | #CD7F32 |
| Silver | 7+ days | #C0C0C0 |
| Gold | 30+ days | #FFD700 |
| Legend | 90+ days | #9333EA |

## Testing

The project includes comprehensive test coverage:

```bash
cd contracts
npm test

# Output:
#   ConvictionBadge
#     claimOrRefresh() - 4 tests
#     Soulbound behavior - 4 tests
#     hasValidBadge() - 4 tests
#     tokenURI() - 2 tests
#   ConvictionVault
#     stake() - 5 tests
#     increaseStake() - 2 tests
#     extendLock() - 1 test
#     withdraw() - 3 tests
#     getTier() - 6 tests
#     getConvictionScore() - 1 test
#
#   34 passing
```

## Security Considerations

- Soulbound NFTs cannot be transferred (prevents badge trading)
- Reentrancy guard on all state-changing functions
- Time-locked staking prevents quick exits
- Quick Auth for authenticated creator actions

## License

MIT

## Recent Updates

### v1.1.0 - Ethos Integration & UI Revamp
- **Ethos Network**: Integrated credibility scores, on-chain reviews via EthosReview contract
- **Creator Coin Discovery**: Added TokenPicker component with Clanker API search
- **Premium UI**: Complete visual overhaul with glassmorphism dark theme
- **Allowlist Export**: Filter supporters by Ethos band and export as CSV

## Links

- [BaseScan - ConvictionVault](https://sepolia.basescan.org/address/0x805daf87844E78fE86Bc0DfaBf5a6A6F4E24d218#code)
- [BaseScan - ConvictionBadge](https://sepolia.basescan.org/address/0x810BFa0A3aEa3aF7187a853A75f9827bD213f5b4#code)
