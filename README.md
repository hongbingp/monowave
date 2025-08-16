# Monowave MVP - AI Content Authorization & Advertising Settlement Platform

Monowave is a modular blockchain platform that bridges content publishers with AI platforms and facilitates transparent, scalable advertising revenue settlement using advanced smart contract architecture.

## 🌟 MVP Features

### Core Platform
- **Modular Smart Contracts**: UUPS upgradeable architecture with proxy patterns
- **Batch Processing**: High-frequency transaction batching with Merkle tree verification
- **Escrow Management**: Secure fund custody with settlement state machine
- **Role-Based Access**: Unified participant registry with role bitmaps
- **Pull-Based Distribution**: Efficient Merkle claim system for revenue payouts

### AI Integration
- **Secure API Management**: Rate limiting and usage tracking with Redis
- **Real-time Billing**: Automatic cost calculation and blockchain settlement
- **Content Authorization**: Publisher consent management for AI crawling
- **Performance Monitoring**: Comprehensive analytics and reporting

### Blockchain Innovation
- **Layer 2 Optimized**: Designed for Base (Coinbase L2) with low gas costs
- **Dispute Resolution**: Built-in dispute windows and reversal mechanisms
- **Token Registry**: Whitelisted stablecoins with transaction limits
- **Governance Ready**: Timelock-protected upgrades and emergency pausing

## 🏗️ MVP Architecture

### Smart Contract Layer (Solidity ^0.8.25)
```
┌─────────────────┬─────────────────┬─────────────────┐
│   AccessControl │ ParticipantReg  │  TokenRegistry  │
│   (Roles/Auth)  │ (Unified Users) │ (Whitelisted)   │
└─────────────────┴─────────────────┴─────────────────┘
┌─────────────────┬─────────────────┬─────────────────┐
│     Escrow      │   BatchLedger   │   Distributor   │
│ (Fund Custody)  │ (Merkle Batch)  │ (Pull Claims)   │
└─────────────────┴─────────────────┴─────────────────┘
┌─────────────────┬─────────────────┬─────────────────┐
│ PlatformTimelock│   ProxyImporter │    MockUSDC     │
│  (Governance)   │   (Deployment)  │   (Testing)     │
└─────────────────┴─────────────────┴─────────────────┘
```

### Backend Services (Node.js + Express)
- **blockchainService.js**: MVP contract integration and Web3 interactions
- **adTransactionService.js**: Batch processing and transaction queuing
- **revenueService.js**: Merkle distribution and settlement logic
- **blockchainSyncService.js**: On-chain data caching and synchronization
- **configService.js**: Dynamic configuration management

### Database Layer (PostgreSQL)
- **Legacy Tables**: users, publishers, advertisers, api_keys, usage_logs
- **MVP Tables**: participant_registry_cache, escrow_balance_cache, revenue_batches
- **Enhanced Tables**: ad_transactions (batch fields), revenue_distributions (MVP fields)

### Infrastructure
- **Database**: PostgreSQL for persistent storage + Redis for caching
- **Blockchain**: Base L2 (Sepolia testnet, Mainnet)
- **Monitoring**: Winston logging with comprehensive event tracking
- **Testing**: Hardhat + Jest with MVP-specific test suites

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Git

### Installation

1. **Clone and Setup**:
```bash
git clone <repository-url>
cd Monowave
npm install
```

2. **Environment Configuration**:
```bash
cp env.template .env
# Edit .env with your configuration
```

3. **Database Setup**:
```bash
# Run MVP database migrations
npm run migrate:mvp

# Initialize database tables
npm run setup:mvp
```

4. **Smart Contract Deployment**:
```bash
# Compile MVP contracts
npm run compile

# Deploy to local Hardhat network
npm run deploy:hardhat

# Deploy to Base Sepolia testnet
npm run deploy:base-sepolia
```

5. **Start Services**:
```bash
# Start Redis
redis-server

# Start the application
npm start
```

## 📡 API Endpoints

### Core APIs

#### Crawling API (Updated for MVP)
- `POST /api/v1/crawl` - Process URL crawling with batch transaction recording
  - Enhanced with MVP batch processing
  - Automatic participant registration for AI searchers
  - Escrow balance checking and auto-deposit

#### Payment API (MVP Enhanced)
- `POST /api/v1/pay` - Process payments with legacy billing
- `POST /api/v1/pay/escrow/deposit` - **NEW**: Direct escrow deposits
- `GET /api/v1/pay/escrow/balance` - **NEW**: Query escrow balances

#### Statistics API (MVP Metrics)
- `GET /api/v1/stats/platform` - Platform statistics with MVP contract addresses
- `GET /api/v1/stats/batches` - **NEW**: Batch processing statistics

#### Admin API (Legacy + MVP)
- `GET /api/v1/admin/usage` - Usage statistics
- `GET /api/v1/admin/billing` - Billing records
- `POST /api/v1/admin/plan` - Create pricing plans
- `POST /api/v1/admin/apikey` - Create API keys

### Health Check (Enhanced)
- `GET /health` - System health with MVP sync status and configuration

## 🔧 MVP Deployment

### Local Development
```bash
# Validate deployment configuration
npm run validate:deployment

# Deploy MVP contracts locally
npm run deploy:localhost

# Run post-deployment setup
npm run post-deploy
```

### Base Sepolia Testnet
```bash
# Deploy to testnet
npm run deploy:base-sepolia

# Configure contracts
npm run post-deploy:base-sepolia

# Verify on Basescan
npm run verify:base-sepolia
```

### Base Mainnet Production
```bash
# Deploy to mainnet
npm run deploy:base

# Verify contracts
npm run verify:all
```

## 🧪 Testing

### MVP Contract Tests
```bash
# Run all MVP contract tests
npm run test:contracts:mvp

# Run specific MVP test
npx hardhat test contracts/test_mvp/BatchLedger.test.js
```

### Backend Service Tests
```bash
# Run current MVP tests (excluding legacy)
npm run test:unit:current

# Run all MVP tests
npm run test:mvp

# Run legacy tests (reference only)
npm run test:unit:legacy
```

### Integration Tests
```bash
# Run MVP integration tests
npx jest tests/integration/mvp-integration.test.js

# Run all integration tests
npm run test:integration
```

## 📊 MVP Smart Contracts

### Core Contracts

| Contract | Purpose | Features |
|----------|---------|----------|
| **AccessControl** | Role-based permissions | Owner + 5 MVP roles |
| **ParticipantRegistry** | Unified user management | Role bitmaps, UUPS upgradeable |
| **TokenRegistry** | Whitelisted tokens | Transaction limits, pausable |
| **Escrow** | Fund custody | Credit/debit accounting, holdback |
| **BatchLedger** | Transaction batching | Merkle roots, idempotency |
| **Distributor** | Revenue distribution | Pull claims, dispute resolution |
| **PlatformTimelock** | Governance | Time-locked operations |

### MVP Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| `GOVERNOR_ROLE` | Platform governance | Contract upgrades, critical operations |
| `SETTLER_ROLE` | Settlement operations | Escrow credit/debit, dispute resolution |
| `LEDGER_ROLE` | Batch management | Commit batches, record transactions |
| `TREASURER_ROLE` | Fund management | Escrow operations, token management |
| `RISK_ROLE` | Risk management | Limits, pausing, emergency controls |

### Participant Roles (Bitmaps)

| Role | Bitmap | Description |
|------|--------|-------------|
| `ROLE_PUBLISHER` | 1 | Content publishers |
| `ROLE_ADVERTISER` | 2 | Advertising clients |
| `ROLE_AI_SEARCHER` | 4 | AI platform operators |

## 📈 Usage Examples

### 1. Publisher Registration
```javascript
// Auto-registration via API
const response = await fetch('/api/v1/crawl', {
  method: 'POST',
  headers: { 'X-API-Key': 'your-api-key' },
  body: JSON.stringify({
    url: 'https://example.com',
    ai_searcher: '0x...'
  })
});
```

### 2. Escrow Deposit
```javascript
// Direct escrow deposit
const deposit = await fetch('/api/v1/pay/escrow/deposit', {
  method: 'POST',
  headers: { 'X-API-Key': 'your-api-key' },
  body: JSON.stringify({
    amount: 100.0,
    token: 'USDC'
  })
});
```

### 3. Batch Processing Stats
```javascript
// Get batch processing statistics
const stats = await fetch('/api/v1/stats/batches', {
  headers: { 'X-API-Key': 'your-api-key' }
});
```

## 🔐 Security Features

### Smart Contract Security
- **UUPS Upgradeable**: Secure upgrade patterns with storage gaps
- **Access Control**: Role-based permissions with OpenZeppelin
- **Reentrancy Protection**: Guards on all state-changing functions
- **Pausable**: Emergency pause functionality
- **Timelock**: Governance delays for critical operations

### Backend Security
- **API Key Authentication**: Secure key-based access
- **Rate Limiting**: Redis-based QPS, daily, and monthly limits
- **Input Validation**: Joi schema validation for all endpoints
- **Error Handling**: Secure error responses without information leakage

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Integration Test Report](INTEGRATION_TEST_REPORT.md)** - End-to-end validation results
- **[Cleanup Report](CLEANUP_REPORT.md)** - Legacy code removal documentation
- **[Environment Template](env.template)** - Configuration variables reference
- **[Test Status](TEST_STATUS_MVP.md)** - Current test coverage and status

## 🛠️ Development

### Project Structure
```
Monowave/
├── contracts/                 # Smart contracts
│   ├── contracts/            # MVP contract source files
│   ├── test_mvp/            # MVP contract tests
│   ├── scripts/             # Deployment and utility scripts
│   └── hardhat.config.js    # Hardhat configuration
├── src/                     # Backend application
│   ├── controllers/         # API route handlers
│   ├── services/           # Business logic layer
│   ├── config/             # Database and Redis config
│   └── routes/             # Express route definitions
├── tests/                  # Test suites
│   ├── unit/               # Unit tests (MVP + Legacy)
│   └── integration/        # Integration tests
└── scripts/                # Database and utility scripts
```

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm run deploy` | Deploy MVP contracts (default) |
| `npm run test:mvp` | Run all MVP tests |
| `npm run validate:deployment` | Validate configuration |
| `npm run migrate:mvp` | Run database migrations |
| `npm start` | Start production server |
| `npm run dev` | Start development server |

## 🌐 Network Support

### Supported Networks
- **Local**: Hardhat Network (chainId: 1337)
- **Testnet**: Base Sepolia (chainId: 84532)
- **Mainnet**: Base (chainId: 8453)

### Contract Verification
- **Basescan**: Automatic verification with API v2
- **Etherscan**: Compatible verification for Ethereum networks

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the test examples in `/tests`

---

**Monowave MVP** - Powering the future of AI content authorization and blockchain-based advertising settlement.