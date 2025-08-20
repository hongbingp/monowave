# monowave - on-chain Ad system for AI apps

<div align="center">
  <img src="images/logo_4x.png" alt="Monowave Logo" width="200">
</div>

Monowave is a modular blockchain platform that bridges content publishers with AI platforms and facilitates transparent, scalable advertising revenue settlement using advanced smart contract architecture.

## 🌟 Core Features

- **Modular Smart Contracts**: UUPS upgradeable architecture with proxy patterns
- **Batch Processing**: High-frequency transaction batching with Merkle tree verification
- **Escrow Management**: Secure fund custody with settlement state machine
- **Role-Based Access**: Unified participant registry with role bitmaps
- **Pull-Based Distribution**: Efficient Merkle claim system for revenue payouts
- **Secure API Management**: Rate limiting and usage tracking with Redis
- **Real-time Billing**: Automatic cost calculation and blockchain settlement
- **Content Authorization**: Publisher consent management for AI crawling
- **Layer 2 Optimized**: Designed for Base (Coinbase L2) with low gas costs
- **Dispute Resolution**: Built-in dispute windows and reversal mechanisms

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

## 📊 Smart Contracts

| Contract | Purpose | Features |
|----------|---------|----------|
| **AccessControl** | Role-based permissions | Owner + 5 MVP roles |
| **ParticipantRegistry** | Unified user management | Role bitmaps, UUPS upgradeable |
| **TokenRegistry** | Whitelisted tokens | Transaction limits, pausable |
| **Escrow** | Fund custody | Credit/debit accounting, holdback |
| **BatchLedger** | Transaction batching | Merkle roots, idempotency |
| **Distributor** | Revenue distribution | Pull claims, dispute resolution |
| **PlatformTimelock** | Governance | Time-locked operations |

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

## 🔧 Testing

```bash
# Run all MVP tests
npm run test:mvp

# Run contract tests
npm run test:contracts:mvp

# Run integration tests
npm run test:integration
```

## 🔐 Security

- **UUPS Upgradeable**: Secure upgrade patterns with storage gaps
- **Access Control**: Role-based permissions with OpenZeppelin
- **Reentrancy Protection**: Guards on all state-changing functions
- **API Key Authentication**: Secure key-based access
- **Rate Limiting**: Redis-based QPS, daily, and monthly limits
- **Input Validation**: Joi schema validation for all endpoints

## 🌐 Networks

- **Local**: Hardhat Network (chainId: 1337)
- **Testnet**: Base Sepolia (chainId: 84532)

---

**Monowave** - Powering the future of AI content authorization and blockchain-based advertising settlement.