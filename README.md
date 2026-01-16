# Nakama - Trade & Hold on Base

Nakama is a Farcaster Mini App on Base that combines **trading-first** asset discovery with conviction-based staking. Trade any asset on Base, discover trending tokens, follow top traders, and stake creator coins to earn exclusive perks.

## Overview

**Trading-First, Finance-First UX** - Nakama brings together the best of DeFi trading and social conviction mechanics. Browse trending assets, track top traders with copy-trading features, and stake creator coins to unlock gated content and earn Soulbound NFT badges.

### Features

#### 🔥 Trading & Discovery
- **Trending Assets**: Real-time trending tokens on Base via DexScreener API
- **Asset Discovery**: Browse and search memes, DeFi tokens, and creator coins
- **Top Traders Leaderboard**: Track top performers by PnL (7d/30d/All Time)
- **Copy Trading Preview**: Follow and copy top traders (coming soon)
- **Multi-Category Browsing**: Filter by Trending, Top Gainers, Memes, DeFi

#### 🔒 Conviction Vault (Staking)
- **Universal Staking Vault**: Stake any ERC-20 creator coin with time-locked commitments
- **Tier-Based Rewards**: Bronze (any stake), Silver (7+ days), Gold (30+ days), Legend (90+ days)
- **Soulbound Badges**: Non-transferable NFTs with on-chain SVG metadata as proof of conviction
- **Gated Content**: Creators can restrict content access based on supporter tier
- **Conviction Leaderboards**: Track top supporters by conviction score (sqrt of staked amount)

#### 🎨 Creator Tools
- **Ethos Network Integration**: Credibility scores, on-chain reviews, and reputation-weighted metrics
- **Creator Tier Configuration**: Customize min stake amounts and min ethos scores per tier
- **Creator Coin Discovery**: Search and select creator coins via Zora API integration
- **Supporter Analytics**: View top supporters, tier distribution, and stats

#### 💎 Premium UX
- **Modern Dark UI**: Glassmorphism design with smooth animations
- **Mobile-First**: Optimized for Farcaster Mini App experience
- **Real-Time Data**: Live price feeds and trending metrics

## Project Structure

```
nakama/
├── contracts/          # Solidity smart contracts (Hardhat)
├── backend/            # Express.js API server
└── frontend/           # Next.js 14 frontend application
```

## Smart Contracts

Deployed on Base Mainnet:

| Contract | Address | Description |
|----------|---------|-------------|
| ConvictionVault | `0x457b617E9b63cED88d630761e9690e4207F7f798` | Universal staking vault for ERC-20 tokens |
| ConvictionBadge | `0xb7366b59eb1EDB9Cc776f67dE3711Bf0d74bb84A` | Soulbound NFT badges with on-chain SVG |

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
- A Base RPC URL
- A deployer private key with Base ETH

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
VAULT_ADDRESS=0x457b617E9b63cED88d630761e9690e4207F7f798
BADGE_ADDRESS=0x55f56C46B86fE3961cC51b4ca72CCfBFa4F760Ce
```

## API Endpoints

### Creator Routes
- `GET /api/creator/:token/supporters` - Get supporters list with effective tiers
- `GET /api/creator/:token/stats` - Get creator stats with effective tier counts
- `GET /api/creator/:token/allowlist` - Get tier-based allowlist
- `GET /api/creator/:token/config` - Get tier configuration for a token
- `PUT /api/creator/:token/config` - Update tier configuration (requires auth)
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

Tiers are determined by the **minimum** of three factors:
1. **Lock Duration** (on-chain): 7d=Silver, 30d=Gold, 90d=Legend
2. **Min Stake Amount** (creator-configurable): e.g., 10 tokens for Silver
3. **Min Ethos Score** (creator-configurable): e.g., 1400 for Gold

| Tier | Default Lock | Default Min Stake | Default Min Ethos | Color |
|------|--------------|-------------------|-------------------|-------|
| Bronze | Any stake | 0 | 0 | #CD7F32 |
| Silver | 7+ days | 1 token | 1200 | #C0C0C0 |
| Gold | 30+ days | 10 tokens | 1400 | #FFD700 |
| Legend | 90+ days | 100 tokens | 1600 | #9333EA |

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
- Creator tier configs are locked to original creator FID

## License

MIT

## Recent Updates

### v1.4.0 - Trading-First Hybrid Dashboard
- **Trading Dashboard**: Transformed home page to hybrid trading + conviction experience
- **Trending Assets**: Real-time trending tokens on Base via DexScreener API
- **Asset Discovery**: New `/discover` page with search, categories (Trending, Gainers, Memes, DeFi)
- **Trading Leaderboard**: New `/leaderboard` page with top traders by PnL (7d/30d/All Time)
- **Copy Trading Preview**: Copy-trade buttons and feature teaser
- **Multi-API Integration**: DexScreener for price data, Zora for creator coins
- **Finance-First UX**: Aligned with Jesse Pollak's Base app direction
- **Performance**: Optimized rendering and token deduplication

### v1.3.0 - New App Flow & Role-Based Navigation
- **Onboarding Carousel**: 3-slide introduction for first-time users
- **Role Selection**: Users choose Creator or Supporter path on first visit  
- **Creator Auto-Detection**: Returning users auto-routed via Zora API (checks for creator coin)
- **Creator Home Dashboard**: Dedicated page with supporter stats, top 3 preview, and quick actions
- **Find Creators Page**: Dedicated search page with username/address lookup
- **Improved Navigation**: Clear separation between creator and supporter flows
- **Zora Profile Integration**: Fetch creator profiles and coins by wallet address

### v1.2.0 - Creator Tier Configuration & Base Mainnet
- **Base Mainnet Deployment**: Contracts now live on Base mainnet
- **Creator Tier Configuration**: Creators can set custom min stake and min ethos thresholds per tier
- **Effective Tier Calculation**: Tiers now factor in stake amount + ethos score + lock duration
- **Creator Settings UI**: New `/creator-settings` page for tier configuration

### v1.1.0 - Ethos Integration & UI Revamp
- **Ethos Network**: Integrated credibility scores, on-chain reviews via EthosReview contract
- **Creator Coin Discovery**: Added TokenPicker component with Clanker API search
- **Premium UI**: Complete visual overhaul with glassmorphism dark theme
- **Allowlist Export**: Filter supporters by Ethos band and export as CSV

## Links

- [BaseScan - ConvictionVault](https://basescan.org/address/0x457b617E9b63cED88d630761e9690e4207F7f798#code)
- [BaseScan - ConvictionBadge](https://basescan.org/address/0xb7366b59eb1EDB9Cc776f67dE3711Bf0d74bb84A#code)
