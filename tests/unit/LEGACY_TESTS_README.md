# Legacy Test Files

This directory contains legacy test files that were created for the old smart contract architecture. These files are kept for reference purposes but are not actively maintained or run in the main test suite.

## Legacy Files

### `*.legacy.test.js` Files

These files test the old contract architecture and services:

- `adTransactionService.legacy.test.js` - Tests old AdTransactionRecorder contract integration
- `revenueService.legacy.test.js` - Tests old RevenueDistributor contract integration  
- `billing.legacy.test.js` - Tests old billing system with legacy contracts

## Why These Tests Are Legacy

1. **Contract Architecture Changed**: The old monolithic contracts (AdTransactionRecorder, RevenueDistributor, etc.) have been replaced with a modular MVP architecture (BatchLedger, Distributor, Escrow, etc.)

2. **Service Layer Refactored**: The backend services have been completely refactored to work with the new MVP contracts and batch processing logic

3. **Business Logic Updated**: The new system uses:
   - Batch processing instead of individual transactions
   - Merkle tree distribution instead of direct transfers
   - Escrow management with settlement states
   - Participant registry with role bitmaps

## Current MVP Tests

The current test suite includes:

### Smart Contract Tests
- `contracts/test_mvp/` - Tests for new MVP contracts
- `contracts/test/MockUSDC.test.js` - Still relevant
- `contracts/test/AccessControl.test.js` - Updated for MVP roles

### Backend Service Tests
- `tests/unit/blockchainSyncService.test.js` - New MVP sync service
- `tests/unit/configService.test.js` - New MVP configuration service
- `tests/unit/auth.test.js` - Still relevant
- `tests/unit/utils.test.js` - Still relevant
- `tests/unit/simple.test.js` - Still relevant
- `tests/unit/database.test.js` - Updated with MVP table tests

### Integration Tests
- `tests/integration/api.test.js` - Updated with MVP API endpoints

## Running Tests

### Current MVP Tests Only
```bash
npm run test:unit:current
npm run test:contracts:mvp
```

### Legacy Tests (May Fail)
```bash
npm run test:unit:legacy
```

### All Tests
```bash
npm run test:mvp
```

## Migration Notes

If you need to understand how the old system worked for migration purposes:

1. **Old Transaction Flow**: Individual transactions were recorded directly on-chain via AdTransactionRecorder
2. **Old Revenue Flow**: Revenue was distributed immediately via RevenueDistributor
3. **Old Registry System**: Separate registries for each participant type

**New MVP Flow**: 
1. Transactions are batched and committed with Merkle roots via BatchLedger
2. Revenue is distributed through pull-based claims via Distributor
3. Unified ParticipantRegistry with role bitmaps

## Maintenance

These legacy test files are:
- ❌ Not actively maintained
- ❌ Not run in CI/CD
- ❌ Not guaranteed to pass
- ✅ Kept for historical reference
- ✅ Useful for understanding old architecture

For any new development, use the current MVP test structure and patterns.
