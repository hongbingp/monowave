# AdChain Development Notes

## Product Overview

AdChain is a decentralized platform that connects AI Searchers, Publishers, and Advertisers through a transparent, blockchain-based content crawling and advertising ecosystem.

### Roles & Participants

| Role | Responsibilities |
|------|-----------------|
| **AI Searcher** | Initiates content crawl requests; consumes Publisher content; sends user profile and crawl results to the matching engine; prepays and deducts stablecoins for crawling and ad revenue shares. |
| **Publisher** | Provides content endpoints; registers API Keys and authorization policies in the Crawl Gateway; receives stablecoin payments; records logs on-chain. |
| **Advertiser** | Places ads via the Ad Exchange; pays ad fees in stablecoins based on audience targeting and bid strategy. |
| **Ad Exchange** | Receives user profiles and content signals, runs real-time bidding or private marketplace auctions, returns ad creatives to the matching engine, and settles/distributes stablecoins to Publishers and the AI Searcher. |

## End-to-End Product Flow

### 1. AI Searcher Crawls Content
- Calls `POST /api/v1/crawl` with `X-API-Key`, optional user profile, and a list of URLs
- The Crawl Gateway enforces rate limits, authenticates the key, and applies URL allow/deny rules
- The Publisher Service returns raw HTML or structured content, and logs the request in `usage_logs`

### 2. Real-Time Billing & Prepayment
- The Billing Engine reads each new `usage_logs` entry, calculates the fee (calls × unit price + bytes × unit price + format premium)
- It deducts the amount from the AI Searcher's pre-funded stablecoin balance in the on-chain escrow contract, emitting a `charge(apiKey, amount)` event

### 3. Ad Matching
- The Matching Engine combines crawl logs with the AI-provided user profile to build interest and content feature tags
- It formats these tags into a bid request and sends it to the Ad Exchange

### 4. Ad Auction & Creative Delivery
- The Ad Exchange runs an RTB or PMP auction based on the request, selects the highest bid, and returns the winning ad creative's URL, landing page, and metadata back to the Matching Engine

### 5. Result Push to User
- The Matching Engine merges the ad creative with the crawled content and returns the package to the AI Searcher, which displays it to the end user

### 6. Ad Revenue Settlement
- Advertisers pay the Ad Exchange in stablecoins
- The Settlement Engine computes each party's share (e.g., 70% to Publisher, 30% to AI Searcher) and calls the contract `distribute([publisherAddr, aiAddr], [amountP, amountA])`
- On-chain events allow both sides to verify, and the Admin UI reflects real-time balances

## Key Product Highlights

### Crawl-Authorization & Billing Middleware
- API authentication, rate limiting, allow/deny lists, and differentiated pricing
- Real-time on-chain deductions to prevent unpaid or abusive crawling

### Content + Profile-Driven Advertising
- Leverage AI's deep user insights to enable highly accurate audience targeting
- Achieve higher bids and improved ROI for advertisers

### Stablecoin-Based Real-Time Settlement
- Both crawl fees and ad revenues settle in on-chain stablecoins, with instant finality, low fees, and full transparency
- Uses L2 batch aggregation to minimize Gas costs

### End-to-End Transparency
- All crawl, billing, auction, and payout actions emit on-chain events, ensuring immutability
- Admin dashboard provides live views of usage, billing, and payout details

## Project Structure
```
ADchain/
├── src/
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── utils/             # Utilities
│   ├── config/            # Configuration
│   └── app.js             # Main application
├── contracts/             # Smart contracts
├── tests/                 # Test files
├── logs/                  # Application logs
└── README.md
```

## Key Components

### 1. Database Schema
- `users` - User accounts with wallet addresses
- `plans` - Pricing plans with rate limits
- `api_keys` - API key management
- `usage_logs` - Detailed usage tracking
- `billing_records` - Payment and billing history
- `ad_events` - Advertising events tracking

### 2. Core Services
- **CrawlerService**: Web scraping with multiple output formats
- **BillingService**: Cost calculation and blockchain integration
- **AuthService**: API key management and JWT handling
- **RateLimiter**: Redis-based rate limiting

### 3. API Endpoints
- `/api/v1/crawl` - Content crawling with format options
- `/api/v1/admin/*` - Administration endpoints
- `/api/v1/pay` - Payment processing

### 4. Smart Contract
- `AdChainContract.sol` - Main settlement contract
- `MockUSDC.sol` - Test token for development

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run typecheck

# Deploy contracts
cd contracts && npx hardhat run scripts/deploy.js --network localhost
```

## Security Features
- API key encryption with bcrypt
- JWT token authentication
- Rate limiting with Redis
- Input validation with Joi
- SQL injection prevention with parameterized queries
- CORS and security headers with helmet

## Monitoring
- Winston logging with daily rotation
- PM2 process management
- Redis metrics for rate limiting
- PostgreSQL query performance tracking