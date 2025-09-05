const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Simple API server running'
  });
});

// Mock API endpoints for testing frontend integration
app.get('/api/v1/stats/dashboard', (req, res) => {
  res.json({
    totalTransactions: 1250,
    totalRevenue: 45000.50,
    activeUsers: 89,
    conversionRate: 3.2,
    recentTransactions: [
      { id: 1, amount: 100, type: 'payment', timestamp: new Date().toISOString() },
      { id: 2, amount: 250, type: 'revenue', timestamp: new Date().toISOString() },
      { id: 3, amount: 75, type: 'payment', timestamp: new Date().toISOString() }
    ]
  });
});

app.get('/api/v1/users/profile', (req, res) => {
  res.json({
    id: 1,
    email: 'test@monowave.com',
    userType: 'ai_searcher',
    walletAddress: '0x4D15ebD9cf36894E04802C96dF745458db808611',
    balance: 1000,
    status: 'active',
    name: 'Test User'
  });
});

app.get('/api/v1/contracts/status', (req, res) => {
  res.json({
    network: 'baseSepolia',
    contracts: {
      MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
      AccessControl: '0x82f2085848b4743629733CA9744cDbe49E57C9bA',
      TokenRegistry: '0x98B5A80a43Ff4d5EC6d4f200347A66069B7FAf60',
      ParticipantRegistry: '0xA78606270A7b752bBda7F847F98Ce25888263A3E',
      BatchLedger: '0x3ADE3AAE3450B0e7d6F2Ae652bD9D3567D47F61e',
      Escrow: '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8',
      Distributor: '0xcBAD9733BCb2b9CBddbAAfD45449557A06C6a619'
    },
    status: 'deployed',
    lastUpdated: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Simple API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
