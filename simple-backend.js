import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Load deployment info
let deploymentInfo = {};
try {
  const deploymentPath = path.join(__dirname, 'deployment-mvp.json');
  deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
} catch (error) {
  console.warn('Could not load deployment info:', error.message);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Monowave API server running',
    version: '1.0.0'
  });
});

// Dashboard stats API
app.get('/api/v1/stats/dashboard', (req, res) => {
  res.json({
    totalTransactions: 1250 + Math.floor(Math.random() * 100),
    totalRevenue: 45000.50 + Math.random() * 1000,
    activeUsers: 89 + Math.floor(Math.random() * 20),
    conversionRate: 3.2 + Math.random() * 0.5,
    recentTransactions: [
      { 
        id: 1, 
        amount: 100 + Math.random() * 50, 
        type: 'payment', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        from: '0x1234...5678',
        to: '0x9876...4321'
      },
      { 
        id: 2, 
        amount: 250 + Math.random() * 100, 
        type: 'revenue', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        from: '0x2345...6789',
        to: '0x8765...3210'
      },
      { 
        id: 3, 
        amount: 75 + Math.random() * 25, 
        type: 'payment', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        from: '0x3456...7890',
        to: '0x7654...2109'
      }
    ]
  });
});

// User profile API
app.get('/api/v1/users/profile', (req, res) => {
  const userTypes = ['ai_searcher', 'publisher', 'advertiser'];
  const randomType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  res.json({
    id: 1,
    email: 'test@monowave.com',
    userType: randomType,
    walletAddress: deploymentInfo.deployer || '0x4D15ebD9cf36894E04802C96dF745458db808611',
    balance: 1000 + Math.random() * 500,
    status: 'active',
    name: 'Test User',
    joinedAt: '2024-01-01T00:00:00.000Z',
    lastActive: new Date().toISOString()
  });
});

// Contract status API
app.get('/api/v1/contracts/status', (req, res) => {
  res.json({
    network: deploymentInfo.network || 'baseSepolia',
    contracts: deploymentInfo.contracts || {
      MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
      AccessControl: '0x82f2085848b4743629733CA9744cDbe49E57C9bA',
      TokenRegistry: '0x98B5A80a43Ff4d5EC6d4f200347A66069B7FAf60',
      ParticipantRegistry: '0xA78606270A7b752bBda7F847F98Ce25888263A3E',
      BatchLedger: '0x3ADE3AAE3450B0e7d6F2Ae652bD9D3567D47F61e',
      Escrow: '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8',
      Distributor: '0xcBAD9733BCb2b9CBddbAAfD45449557A06C6a619'
    },
    status: 'deployed',
    lastUpdated: deploymentInfo.timestamp || new Date().toISOString(),
    deployer: deploymentInfo.deployer || '0x4D15ebD9cf36894E04802C96dF745458db808611'
  });
});

// Transaction history API
app.get('/api/v1/transactions', (req, res) => {
  const transactions = [];
  for (let i = 0; i < 10; i++) {
    transactions.push({
      id: i + 1,
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      from: `0x${Math.random().toString(16).substring(2, 42)}`,
      to: `0x${Math.random().toString(16).substring(2, 42)}`,
      amount: Math.random() * 1000,
      type: ['payment', 'revenue', 'deposit', 'withdrawal'][Math.floor(Math.random() * 4)],
      status: ['pending', 'confirmed', 'failed'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      gasUsed: Math.floor(Math.random() * 100000) + 21000,
      gasPrice: Math.random() * 50 + 10
    });
  }
  
  res.json({
    transactions,
    total: transactions.length,
    page: 1,
    limit: 10
  });
});

// Analytics API
app.get('/api/v1/analytics/summary', (req, res) => {
  res.json({
    daily: {
      transactions: Math.floor(Math.random() * 100) + 50,
      revenue: Math.random() * 5000 + 1000,
      users: Math.floor(Math.random() * 20) + 10
    },
    weekly: {
      transactions: Math.floor(Math.random() * 500) + 200,
      revenue: Math.random() * 20000 + 5000,
      users: Math.floor(Math.random() * 100) + 50
    },
    monthly: {
      transactions: Math.floor(Math.random() * 2000) + 800,
      revenue: Math.random() * 80000 + 20000,
      users: Math.floor(Math.random() * 400) + 200
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Monowave API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/v1/stats/dashboard`);
  console.log(`👤 User API: http://localhost:${PORT}/api/v1/users/profile`);
  console.log(`🔗 Contracts API: http://localhost:${PORT}/api/v1/contracts/status`);
});
