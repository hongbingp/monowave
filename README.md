# AdChain - AI Content Authorization & Advertising Settlement Platform

AdChain is a middleware platform that bridges content publishers with AI platforms and facilitates transparent, blockchain-based advertising revenue settlement.

## Features

- **AI Crawling Authorization**: Secure API key management with rate limiting and usage tracking
- **Real-time Billing**: Automatic cost calculation based on API usage and data processing
- **Blockchain Settlement**: Smart contract-based revenue distribution using stablecoins
- **Comprehensive Admin Panel**: Usage analytics, billing management, and API key administration

## Architecture

- **Backend**: Node.js + Express
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for rate limiting and session management
- **Blockchain**: Ethereum + Layer 2 (Arbitrum/Optimism)
- **Smart Contracts**: Solidity with OpenZeppelin
- **Monitoring**: Winston logging with PM2

## Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ADchain
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database:
```bash
# Create PostgreSQL database
createdb adchain

# Tables will be created automatically on first run
```

5. Start Redis:
```bash
redis-server
```

6. Start the application:
```bash
npm run dev
```

## API Endpoints

### Crawling API
- `POST /api/v1/crawl` - Process URL crawling requests

### Admin API
- `GET /api/v1/admin/usage` - Get usage statistics
- `GET /api/v1/admin/billing` - Get billing records
- `POST /api/v1/admin/plan` - Create pricing plans
- `POST /api/v1/admin/apikey` - Create API keys
- `DELETE /api/v1/admin/apikey/:id` - Deactivate API keys

### Payment API
- `POST /api/v1/pay` - Process payments
- `GET /api/v1/pay/history` - Get payment history

## Smart Contract Deployment

1. Compile contracts:
```bash
npm run compile
```

2. Deploy to local network:
```bash
npm run deploy:localhost
```

3. Deploy to testnet/mainnet:
```bash
npm run deploy:testnet
```

## Usage Examples

### Crawling Content
```bash
curl -X POST http://localhost:3000/api/v1/crawl \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "format": "structured"
  }'
```

### Creating API Key
```bash
curl -X POST http://localhost:3000/api/v1/admin/apikey \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "planId": 1,
    "name": "Test API Key"
  }'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_NAME` | Database name | adchain |
| `REDIS_HOST` | Redis host | localhost |
| `JWT_SECRET` | JWT signing secret | - |
| `WEB3_PROVIDER_URL` | Blockchain RPC URL | - |
| `CONTRACT_ADDRESS` | Smart contract address | - |

### Rate Limiting

Default limits per API key:
- QPS: 100 requests/second
- Daily: 10,000 requests/day
- Monthly: 300,000 requests/month

### Pricing

Default pricing structure:
- Base cost per API call: $0.001
- Additional cost per byte: $0.0001

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:contracts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run typecheck
```

### Clean Install
```bash
# If you encounter dependency issues
./scripts/clean-install.sh
```

### Database Migrations
Tables are automatically created on application startup. For manual management:
```bash
# Connect to database and run SQL migrations
psql -d adchain -f migrations/001_initial_schema.sql
```

## Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start src/app.js --name adchain
pm2 save
pm2 startup
```

### Docker Deployment
```bash
# Build image
docker build -t adchain .

# Run container
docker run -d -p 3000:3000 --env-file .env adchain
```

### Security Considerations

- Use HTTPS in production
- Secure API keys with proper encryption
- Regular security audits for smart contracts
- Implement proper CORS policies
- Use environment variables for sensitive data

## Monitoring

- Application logs: `logs/adchain-*.log`
- PM2 monitoring: `pm2 monit`
- Database performance: PostgreSQL slow query log
- Redis metrics: `redis-cli info`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details