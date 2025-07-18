# AdChain Test Suite

Comprehensive testing suite for the AdChain platform including unit tests, integration tests, and smart contract tests.

## Test Structure

```
tests/
├── setup.js                    # Test environment setup
├── testRunner.js               # Test runner script
├── unit/                       # Unit tests
│   ├── auth.test.js           # Authentication service tests
│   ├── crawler.test.js        # Crawler service tests
│   ├── billing.test.js        # Billing service tests
│   ├── rateLimit.test.js      # Rate limiting tests
│   └── database.test.js       # Database operations tests
├── integration/               # Integration tests
│   └── api.test.js           # API endpoint tests
└── contracts/                 # Smart contract tests
    ├── AdChainContract.test.js
    └── MockUSDC.test.js
```

## Running Tests

### Prerequisites

1. **Database Setup**: PostgreSQL test database
   ```bash
   createdb adchain_test
   ```

2. **Redis Setup**: Redis server running on localhost:6379

3. **Environment Variables**: Copy `.env.example` to `.env` and configure test settings

### Test Commands

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run smart contract tests
npm run test:contracts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run full test suite with custom runner
node tests/testRunner.js
```

## Test Categories

### Unit Tests

**Authentication Tests** (`auth.test.js`)
- API key generation and validation
- JWT token operations
- Password hashing and verification
- Database operations for auth

**Crawler Tests** (`crawler.test.js`)
- URL validation
- Content extraction (raw, summary, structured)
- Error handling for network issues
- HTML parsing and data extraction

**Billing Tests** (`billing.test.js`)
- Payment processing
- Blockchain integration simulation
- Usage statistics calculation
- Revenue distribution

**Rate Limiting Tests** (`rateLimit.test.js`)
- QPS, daily, and monthly limits
- Redis-based rate limiting
- Usage statistics tracking
- Middleware functionality

**Database Tests** (`database.test.js`)
- CRUD operations for all tables
- Transaction handling
- Constraint violations
- Connection management

### Integration Tests

**API Integration Tests** (`api.test.js`)
- Full API endpoint testing
- Authentication flows
- Request/response validation
- Database integration
- Error handling

### Smart Contract Tests

**AdChainContract Tests**
- Contract deployment and configuration
- Access control mechanisms
- Charging and distribution functions
- Publisher management
- Emergency functions

**MockUSDC Tests**
- ERC20 token functionality
- Minting and transfers
- Decimal handling
- Edge cases

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Node.js environment
- Test timeout: 30 seconds
- Coverage collection from `src/` directory
- Setup file for test initialization

### Test Database
- Separate test database (`adchain_test`)
- Automatic table creation and cleanup
- Isolation between test runs

### Test Data
- Automatic test data generation
- Cleanup after each test
- Isolated test environment

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- HTML report: `coverage/lcov-report/index.html`
- Terminal summary during test runs
- Target: >80% code coverage

## Mock Services

### External Dependencies
- Axios HTTP client mocked
- Web3 blockchain interactions mocked
- Redis client operations mocked
- Database connections mocked in unit tests

### Test Utilities
- Custom matchers for API responses
- Database seeding helpers
- Mock data generators

## Best Practices

### Test Organization
- One test file per source file
- Descriptive test names
- Grouped related tests with `describe` blocks
- Clear arrange-act-assert pattern

### Test Data
- Use factory functions for test data
- Clean up after each test
- Avoid hardcoded values
- Use meaningful test data

### Assertions
- Specific assertions over generic ones
- Test both success and failure cases
- Verify side effects
- Check error messages and codes

### Performance
- Keep tests fast and focused
- Use mocks for external dependencies
- Parallel test execution where possible
- Timeout handling for async operations

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env`
   - Verify test database exists

2. **Redis Connection Errors**
   - Ensure Redis server is running
   - Check Redis configuration
   - Verify connection settings

3. **Test Timeouts**
   - Increase timeout in Jest config
   - Check for hanging promises
   - Verify cleanup in afterEach hooks

4. **Contract Tests Failing**
   - Ensure Hardhat network is running
   - Check contract compilation
   - Verify mock token deployment

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test file
npm test -- tests/unit/auth.test.js

# Run tests with verbose output
npm test -- --verbose
```

## CI/CD Integration

The test suite is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    npm run test:contracts
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add appropriate setup/teardown
3. Include both positive and negative test cases
4. Update this README if adding new test categories
5. Ensure tests are deterministic and isolated