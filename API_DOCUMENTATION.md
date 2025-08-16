# Monowave MVP API Documentation

This document provides comprehensive API documentation for the Monowave MVP platform, including all endpoints, request/response formats, and integration examples.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Core APIs](#core-apis)
  - [Crawling API](#crawling-api)
  - [Payment API](#payment-api)
  - [Statistics API](#statistics-api)
  - [Admin API](#admin-api)
- [Health Check](#health-check)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## 🔐 Authentication

All API endpoints require authentication via API key in the request header:

```http
X-API-Key: your_api_key_here
```

### API Key Format
- **Length**: 32 characters
- **Prefix**: `ak_` followed by 29 alphanumeric characters
- **Example**: `ak_1234567890abcdef1234567890abc`

## 🌐 Core APIs

### Crawling API

#### POST /api/v1/crawl

Process URL crawling requests with MVP batch processing integration.

**Enhanced MVP Features:**
- Automatic participant registration for AI searchers
- Batch transaction recording via BatchLedger
- Escrow balance checking and auto-deposit
- Real-time revenue distribution queuing

**Request:**
```http
POST /api/v1/crawl
Content-Type: application/json
X-API-Key: ak_1234567890abcdef1234567890abc

{
  "url": "https://example.com/article",
  "ai_searcher": "0x742d35Cc6634C0532925a3b8D0c6964b6Bd4C6Bd",
  "campaign_id": "campaign_123",
  "content_type": "article",
  "metadata": {
    "title": "Sample Article",
    "category": "technology"
  }
}
```

**Response:**
```json
{
  "code": "SUCCESS",
  "message": "Crawl processed successfully",
  "data": {
    "crawl_id": "crawl_456",
    "cost": 0.05,
    "balance_after": 99.95,
    "content": {
      "title": "Sample Article",
      "word_count": 1500,
      "images": 3
    },
    "blockchain": {
      "transaction_queued": true,
      "batch_processing": true,
      "estimated_confirmation": "2-5 minutes"
    },
    "mvpBatchProcessing": {
      "enabled": true,
      "batchId": "batch_789",
      "merkleRoot": "0x1234...",
      "queuePosition": 15
    },
    "contractAddresses": {
      "batchLedger": "0x123...",
      "escrow": "0x456...",
      "participantRegistry": "0x789..."
    }
  },
  "timestamp": "2025-08-16T12:00:00.000Z"
}
```

**Error Responses:**
```json
{
  "code": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance for crawl operation",
  "data": {
    "required": 0.05,
    "available": 0.02,
    "escrow_deposit_url": "/api/v1/pay/escrow/deposit"
  }
}
```

### Payment API

#### POST /api/v1/pay (Legacy)

Process payments with traditional billing system.

**Request:**
```http
POST /api/v1/pay
Content-Type: application/json
X-API-Key: ak_1234567890abcdef1234567890abc

{
  "amount": 100.00,
  "billing_id": 123,
  "payment_method": "crypto",
  "token": "USDC"
}
```

**Response:**
```json
{
  "code": "SUCCESS",
  "message": "Payment processed successfully",
  "data": {
    "payment_id": "pay_789",
    "amount": 100.00,
    "tx_hash": "0xabcdef123456...",
    "status": "confirmed",
    "balance_after": 200.00
  }
}
```

#### POST /api/v1/pay/escrow/deposit (MVP)

**NEW**: Direct deposit to MVP Escrow contract.

**Request:**
```http
POST /api/v1/pay/escrow/deposit
Content-Type: application/json
X-API-Key: ak_1234567890abcdef1234567890abc

{
  "amount": 50.0,
  "token": "USDC"
}
```

**Response:**
```json
{
  "code": "SUCCESS",
  "message": "Escrow deposit successful",
  "data": {
    "escrow": {
      "amount": 50.0,
      "token": "USDC",
      "tx_hash": "0x123456...",
      "escrow_address": "0x789abc...",
      "confirmation_time": "30-60 seconds"
    },
    "balance": {
      "before": 100.0,
      "after": 150.0,
      "currency": "USDC"
    }
  }
}
```

#### GET /api/v1/pay/escrow/balance (MVP)

**NEW**: Query escrow balance for authenticated user.

**Request:**
```http
GET /api/v1/pay/escrow/balance
X-API-Key: ak_1234567890abcdef1234567890abc
```

**Response:**
```json
{
  "code": "SUCCESS",
  "message": "Balance retrieved successfully",
  "data": {
    "balance": {
      "total": 150.0,
      "available": 145.0,
      "held": 5.0,
      "currency": "USDC"
    },
    "escrow_address": "0x789abc...",
    "last_updated": "2025-08-16T12:00:00.000Z"
  }
}
```

#### GET /api/v1/pay/history

Get payment history for authenticated user.

**Request:**
```http
GET /api/v1/pay/history?limit=10&offset=0
X-API-Key: ak_1234567890abcdef1234567890abc
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "payments": [
      {
        "payment_id": "pay_789",
        "amount": 100.00,
        "type": "deposit",
        "status": "confirmed",
        "tx_hash": "0xabcdef...",
        "created_at": "2025-08-16T11:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### Statistics API

#### GET /api/v1/stats/platform

Get platform statistics with MVP contract addresses.

**Request:**
```http
GET /api/v1/stats/platform
X-API-Key: ak_1234567890abcdef1234567890abc
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "platform": {
      "total_users": 1250,
      "total_crawls": 45000,
      "total_revenue": 12500.50,
      "active_campaigns": 89
    },
    "blockchain": {
      "network": "base-sepolia",
      "latest_block": 1234567,
      "gas_price": "0.000000001"
    },
    "mvpBatchProcessing": {
      "enabled": true,
      "totalBatches": 156,
      "pendingTransactions": 23,
      "lastBatchTime": "2025-08-16T11:55:00.000Z"
    },
    "contractAddresses": {
      "accessControl": "0x123...",
      "participantRegistry": "0x456...",
      "tokenRegistry": "0x789...",
      "escrow": "0xabc...",
      "batchLedger": "0xdef...",
      "distributor": "0x012...",
      "platformTimelock": "0x345...",
      "mockUSDC": "0x678..."
    }
  }
}
```

#### GET /api/v1/stats/batches (MVP)

**NEW**: Get batch processing statistics.

**Request:**
```http
GET /api/v1/stats/batches?period=24h
X-API-Key: ak_1234567890abcdef1234567890abc
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "summary": {
      "period": "24h",
      "total_batches": 45,
      "total_transactions": 1250,
      "avg_batch_size": 27.8,
      "success_rate": 99.2
    },
    "recent_batches": [
      {
        "batch_id": "batch_789",
        "transaction_count": 32,
        "merkle_root": "0x1234...",
        "committed_at": "2025-08-16T11:50:00.000Z",
        "gas_used": 150000
      }
    ],
    "performance": {
      "avg_confirmation_time": "45 seconds",
      "throughput_tps": 2.5,
      "gas_efficiency": "85%"
    }
  }
}
```

### Admin API

#### GET /api/v1/admin/usage

Get usage statistics (admin only).

**Request:**
```http
GET /api/v1/admin/usage?period=7d&user_id=123
X-API-Key: ak_admin_key_here
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "usage": {
      "total_calls": 5000,
      "total_cost": 250.00,
      "unique_users": 45,
      "avg_cost_per_call": 0.05
    },
    "breakdown": {
      "by_user": [
        {
          "user_id": 123,
          "calls": 500,
          "cost": 25.00
        }
      ],
      "by_date": [
        {
          "date": "2025-08-16",
          "calls": 750,
          "cost": 37.50
        }
      ]
    }
  }
}
```

#### POST /api/v1/admin/apikey

Create new API key (admin only).

**Request:**
```http
POST /api/v1/admin/apikey
Content-Type: application/json
X-API-Key: ak_admin_key_here

{
  "user_id": 123,
  "plan_id": 2,
  "expires_at": "2025-12-31T23:59:59.000Z",
  "metadata": {
    "purpose": "production",
    "department": "engineering"
  }
}
```

**Response:**
```json
{
  "code": "SUCCESS",
  "data": {
    "api_key": "ak_1234567890abcdef1234567890abc",
    "key_id": 456,
    "user_id": 123,
    "plan": {
      "name": "Professional",
      "qps": 100,
      "monthly_limit": 100000
    },
    "created_at": "2025-08-16T12:00:00.000Z",
    "expires_at": "2025-12-31T23:59:59.000Z"
  }
}
```

## 🏥 Health Check

#### GET /health

System health check with MVP status.

**Request:**
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-16T12:00:00.000Z",
  "mvp": {
    "syncService": {
      "running": true,
      "lastSync": "2025-08-16T11:58:00.000Z",
      "participantsCached": 1250,
      "escrowBalancesCached": 890
    },
    "configuration": {
      "batchSize": 50,
      "batchTimeout": 30000,
      "syncEnabled": true,
      "version": "1.0.0"
    }
  }
}
```

## ❌ Error Handling

### Standard Error Response Format

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "data": {
    "details": "Additional error context",
    "field": "Specific field that caused error"
  },
  "timestamp": "2025-08-16T12:00:00.000Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing or invalid |
| `INSUFFICIENT_BALANCE` | 402 | Insufficient funds for operation |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `BLOCKCHAIN_ERROR` | 503 | Blockchain service unavailable |
| `DATABASE_ERROR` | 500 | Database operation failed |

### MVP-Specific Error Codes

| Code | Description |
|------|-------------|
| `BATCH_PROCESSING_ERROR` | Batch ledger operation failed |
| `ESCROW_INSUFFICIENT` | Insufficient escrow balance |
| `PARTICIPANT_NOT_REGISTERED` | User not in participant registry |
| `CONTRACT_UNAVAILABLE` | MVP contract not accessible |

## 🚦 Rate Limiting

### Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692192000
X-RateLimit-Window: 60
```

### Rate Limit Types

| Type | Scope | Default Limit |
|------|-------|---------------|
| **QPS** | Per second | 100 requests |
| **Daily** | Per day | 10,000 requests |
| **Monthly** | Per month | 300,000 requests |

### Rate Limit Exceeded Response

```json
{
  "code": "QPS_LIMIT_EXCEEDED",
  "message": "QPS limit of 100 exceeded",
  "data": {
    "limit": 100,
    "window": 60,
    "retry_after": 30
  }
}
```

## 📝 Examples

### Complete Crawl Flow with MVP

```javascript
// 1. Check escrow balance
const balanceResponse = await fetch('/api/v1/pay/escrow/balance', {
  headers: { 'X-API-Key': 'ak_your_key_here' }
});
const balance = await balanceResponse.json();

// 2. Deposit if needed
if (balance.data.balance.available < 1.0) {
  await fetch('/api/v1/pay/escrow/deposit', {
    method: 'POST',
    headers: { 
      'X-API-Key': 'ak_your_key_here',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 10.0,
      token: 'USDC'
    })
  });
}

// 3. Process crawl with batch processing
const crawlResponse = await fetch('/api/v1/crawl', {
  method: 'POST',
  headers: { 
    'X-API-Key': 'ak_your_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/article',
    ai_searcher: '0x742d35Cc6634C0532925a3b8D0c6964b6Bd4C6Bd',
    campaign_id: 'campaign_123'
  })
});

const result = await crawlResponse.json();
console.log('Batch ID:', result.data.mvpBatchProcessing.batchId);
```

### Monitor Batch Processing

```javascript
// Get batch processing statistics
const statsResponse = await fetch('/api/v1/stats/batches?period=1h', {
  headers: { 'X-API-Key': 'ak_your_key_here' }
});

const stats = await statsResponse.json();
console.log('Recent batches:', stats.data.recent_batches);
console.log('Success rate:', stats.data.summary.success_rate);
```

### Admin Operations

```javascript
// Create API key for new user
const apiKeyResponse = await fetch('/api/v1/admin/apikey', {
  method: 'POST',
  headers: { 
    'X-API-Key': 'ak_admin_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 123,
    plan_id: 2,
    expires_at: '2025-12-31T23:59:59.000Z'
  })
});

const newKey = await apiKeyResponse.json();
console.log('New API key:', newKey.data.api_key);
```

## 🔗 SDK and Integration

### JavaScript/Node.js Example

```javascript
class MonowaveClient {
  constructor(apiKey, baseUrl = 'https://api.monowave.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response.json();
  }

  async crawl(url, aiSearcher, options = {}) {
    return this.request('/api/v1/crawl', {
      method: 'POST',
      body: JSON.stringify({
        url,
        ai_searcher: aiSearcher,
        ...options
      })
    });
  }

  async depositToEscrow(amount, token = 'USDC') {
    return this.request('/api/v1/pay/escrow/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, token })
    });
  }

  async getEscrowBalance() {
    return this.request('/api/v1/pay/escrow/balance');
  }

  async getBatchStats(period = '24h') {
    return this.request(`/api/v1/stats/batches?period=${period}`);
  }
}

// Usage
const client = new MonowaveClient('ak_your_key_here');
const result = await client.crawl(
  'https://example.com', 
  '0x742d35Cc6634C0532925a3b8D0c6964b6Bd4C6Bd'
);
```

---

**Monowave MVP API** - Comprehensive documentation for blockchain-powered AI content authorization and advertising settlement.
