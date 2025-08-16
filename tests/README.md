# Monowave MVP Test Suite

Comprehensive testing suite for the Monowave MVP platform including unit tests, integration tests, smart contract tests, and end-to-end validation.

## 🧪 Test Architecture

### MVP Test Structure

```
tests/
├── setup.js                           # Test environment setup
├── testRunner.js                      # Test runner script
├── unit/                              # Unit tests
│   ├── MVP Tests (Current)
│   │   ├── auth.test.js              # Authentication service tests
│   │   ├── database.test.js          # Database operations (MVP enhanced)
│   │   ├── blockchainSyncService.test.js  # NEW: Blockchain sync service
│   │   ├── configService.test.js     # NEW: MVP configuration service
│   │   ├── adTransactionService.test.js   # Updated for BatchLedger
│   │   ├── rateLimit.test.js         # Rate limiting tests
│   │   ├── simple.test.js            # Basic functionality tests
│   │   └── utils.test.js             # Utility function tests
│   ├── Legacy Tests (Reference Only)
│   │   ├── adTransactionService.legacy.test.js
│   │   ├── revenueService.legacy.test.js
│   │   ├── billing.legacy.test.js
│   │   └── LEGACY_TESTS_README.md    # Legacy test documentation
├── integration/                       # Integration tests
│   ├── api.test.js                   # API endpoint tests (MVP enhanced)
│   ├── mvp-integration.test.js       # NEW: End-to-end MVP validation
│   └── setup.js                      # Integration test setup
└── contracts/                        # Smart contract tests
    ├── MVP Contract Tests
    │   ├── test_mvp/                 # NEW: MVP-specific tests
    │   │   ├── BatchLedger.test.js   # Batch idempotency tests
    │   │   ├── Distributor.claim.test.js    # Merkle claim tests
    │   │   ├── Distributor.dispute.test.js  # Dispute resolution tests
    │   │   └── TokenRegistry.limits.test.js # Token limit tests
    │   ├── AccessControl.test.js     # Updated for MVP roles
    │   └── MockUSDC.test.js         # Test token functionality
    └── Legacy Contract Tests
        └── AccessControl.legacy.test.js     # Reference only
```

## 🚀 Running Tests

### Prerequisites

1. **Node.js 18+** with npm
2. **PostgreSQL 14+** test database
3. **Redis 6+** server running
4. **Hardhat** for smart contract testing

### Environment Setup

1. **Database Setup**:
   ```bash
   # Create test database
   createdb monowave_test
   
   # Run MVP migrations
   npm run migrate:mvp
   ```

2. **Environment Configuration**:
   ```bash
   # Copy environment template
   cp env.template .env
   
   # Configure test settings
   export NODE_ENV=test
   export DB_NAME_TEST=monowave_test
   ```

3. **Redis Setup**:
   ```bash
   # Start Redis server
   redis-server
   ```

### MVP Test Commands

#### Smart Contract Tests
```bash
# Run all MVP contract tests
npm run test:contracts:mvp

# Run specific MVP contract test
npx hardhat test contracts/test_mvp/BatchLedger.test.js --config contracts/hardhat.config.js

# Run updated AccessControl test
npx hardhat test contracts/test/AccessControl.test.js --config contracts/hardhat.config.js
```

#### Backend Service Tests
```bash
# Run current MVP tests (excluding legacy)
npm run test:unit:current

# Run all MVP tests (contracts + backend)
npm run test:mvp

# Run legacy tests (reference only)
npm run test:unit:legacy

# Run specific service test
npx jest tests/unit/blockchainSyncService.test.js
```

#### Integration Tests
```bash
# Run MVP end-to-end integration test
npx jest tests/integration/mvp-integration.test.js

# Run API integration tests
npm run test:integration

# Run all integration tests
npx jest tests/integration/
```

#### Complete Test Suite
```bash
# Run all MVP tests
npm run test:all

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📊 Test Coverage

### MVP Contract Test Coverage

| Contract | Tests | Coverage | Status |
|----------|-------|----------|--------|
| **BatchLedger** | Idempotency | ✅ | Complete |
| **Distributor** | Claims + Disputes | ✅ | Complete |
| **TokenRegistry** | Limits enforcement | ✅ | Complete |
| **AccessControl** | MVP roles | ✅ | Complete |
| **MockUSDC** | ERC20 functionality | ✅ | Complete |

### Backend Service Test Coverage

| Service | Tests | Coverage | Status |
|---------|-------|----------|--------|
| **blockchainSyncService** | Sync operations | ✅ | Complete |
| **configService** | Configuration management | ✅ | Complete |
| **adTransactionService** | BatchLedger integration | ✅ | Updated |
| **auth** | Authentication | ✅ | Current |
| **database** | MVP tables | ✅ | Enhanced |
| **rateLimit** | Rate limiting | ✅ | Current |
| **utils** | Utility functions | ✅ | Current |

### Integration Test Coverage

| Test Suite | Scope | Status |
|------------|-------|--------|
| **mvp-integration** | End-to-end validation | ✅ 20/20 tests passing |
| **api** | API endpoints | ⚠️ Needs MVP updates |

## 🧪 Test Categories

### 1. Unit Tests

#### Current MVP Tests
- **Purpose**: Test individual components in isolation
- **Scope**: Services, utilities, database operations
- **Mocking**: External dependencies mocked
- **Speed**: Fast execution (< 2 seconds)

#### Legacy Tests (Reference Only)
- **Purpose**: Historical reference for old architecture
- **Status**: Not actively maintained
- **Location**: `*.legacy.test.js` files
- **Usage**: Reference for understanding old system

### 2. Integration Tests

#### MVP Integration Test
- **Purpose**: End-to-end system validation
- **Scope**: Contract deployment, service integration, configuration
- **Coverage**: 20 comprehensive tests
- **Execution Time**: ~2.6 seconds

#### API Integration Tests
- **Purpose**: Test API endpoints with real dependencies
- **Scope**: HTTP requests, database interactions, blockchain calls
- **Status**: Being updated for MVP

### 3. Smart Contract Tests

#### MVP Contract Tests
- **Framework**: Hardhat + Chai + Ethers.js
- **Network**: Local Hardhat network
- **Coverage**: Core MVP functionality
- **Gas Reporting**: Included in test output

#### Test Scenarios
- **Batch Idempotency**: Prevent duplicate batch IDs
- **Merkle Claims**: Verify claim bitmap and proofs
- **Dispute Resolution**: Test dispute windows and reversals
- **Token Limits**: Enforce single and daily limits
- **Role Management**: MVP role assignment and checking

## 📝 Test Examples

### Running Specific Tests

```bash
# Test batch processing
npx hardhat test contracts/test_mvp/BatchLedger.test.js

# Test Merkle claims
npx hardhat test contracts/test_mvp/Distributor.claim.test.js

# Test blockchain sync service
npx jest tests/unit/blockchainSyncService.test.js

# Test MVP configuration
npx jest tests/unit/configService.test.js
```

### Test Output Examples

#### MVP Contract Test Output
```
  BatchLedger - idempotent commits
    ✓ rejects duplicate batchId (414ms)

  Distributor - claim bitmap & dispute window
    ✓ prevents double-claim and enforces window before settle (45ms)

  Distributor - dispute window
    ✓ allows dispute within window and reverse adjustments

  TokenRegistry - limits
    ✓ enforces single and daily limits

  4 passing (508ms)
```

#### Integration Test Output
```
  MVP End-to-End Integration
    Contract Compilation and Deployment
      ✓ should have compiled all MVP contracts (1 ms)
      ✓ should be able to deploy MVP contracts to local network (1565 ms)
    MVP Contract Tests
      ✓ should pass all MVP contract tests (711 ms)
    [... 17 more tests ...]

  20 passing (2.61s)
```

## 🔧 Test Configuration

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    'node_modules/',
    'contracts/',
    '.*\\.legacy\\.test\\.js$'  // Ignore legacy tests by default
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

### Hardhat Test Configuration
```javascript
// contracts/hardhat.config.js
module.exports = {
  solidity: "0.8.25",
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true
    }
  },
  mocha: {
    timeout: 60000
  }
};
```

## 🚨 Test Debugging

### Common Issues and Solutions

#### 1. Contract Compilation Errors
```bash
# Clean and recompile
npm run clean
npm run compile
```

#### 2. Database Connection Issues
```bash
# Check database exists
psql -l | grep monowave_test

# Reset test database
dropdb monowave_test && createdb monowave_test
npm run migrate:mvp
```

#### 3. Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Start Redis if not running
redis-server
```

#### 4. Legacy Test Failures
```bash
# Run only current tests
npm run test:unit:current

# Skip legacy tests
npx jest --testPathIgnorePatterns="legacy"
```

### Test Debugging Commands

```bash
# Run single test with debugging
npx jest tests/unit/configService.test.js --verbose

# Run contract test with gas reporting
npx hardhat test contracts/test_mvp/BatchLedger.test.js --gas-reporter

# Run integration test with full output
npx jest tests/integration/mvp-integration.test.js --verbose --no-coverage
```

## 📈 Continuous Integration

### GitHub Actions Workflow

```yaml
name: MVP Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run MVP contract tests
        run: npm run test:contracts:mvp
      
      - name: Run MVP backend tests
        run: npm run test:unit:current
      
      - name: Run integration tests
        run: npx jest tests/integration/mvp-integration.test.js
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:mvp"
    }
  }
}
```

## 📚 Test Documentation

### Test File Documentation

Each test file includes comprehensive documentation:

```javascript
/**
 * @fileoverview MVP BlockchainSyncService Unit Tests
 * @description Tests for the blockchain data synchronization service
 * @author Monowave Team
 * @since MVP v1.0.0
 */

describe('BlockchainSyncService', () => {
  // Test implementation
});
```

### Test Case Documentation

```javascript
it('should sync participant data successfully', async () => {
  // Given: Mock blockchain service with participant data
  // When: Sync operation is triggered
  // Then: Database cache is updated with correct data
});
```

## 🎯 Testing Best Practices

### 1. Test Organization
- **Arrange-Act-Assert**: Clear test structure
- **Descriptive Names**: Self-documenting test names
- **Single Responsibility**: One assertion per test
- **Independent Tests**: No test dependencies

### 2. Mocking Strategy
- **External Services**: Mock blockchain, database connections
- **Deterministic Results**: Consistent test outcomes
- **Isolation**: Test units in isolation
- **Real Integration**: Use real services for integration tests

### 3. Coverage Goals
- **Unit Tests**: 90%+ code coverage
- **Integration Tests**: Critical path coverage
- **Contract Tests**: 100% function coverage
- **End-to-End**: Complete user journey coverage

---

**Monowave MVP Test Suite** - Comprehensive testing for reliable, scalable blockchain infrastructure.