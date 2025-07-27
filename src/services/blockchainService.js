const { Web3 } = require('web3');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Import contract ABIs (simplified versions)
const AdChainPlatformABI = [
  {
    "inputs": [
      {"name": "_apiKeyId", "type": "uint256"},
      {"name": "_aiSearcher", "type": "address"},
      {"name": "_url", "type": "string"},
      {"name": "_cost", "type": "uint256"},
      {"name": "_chargeType", "type": "string"}
    ],
    "name": "processCrawlRequest",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const ChargeManagerABI = [
  {
    "inputs": [
      {"name": "_apiKeyId", "type": "uint256"},
      {"name": "_aiSearcher", "type": "address"},
      {"name": "_url", "type": "string"},
      {"name": "_amount", "type": "uint256"},
      {"name": "_chargeType", "type": "string"}
    ],
    "name": "processCharge",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const AISearcherRegistryABI = [
  {
    "inputs": [{"name": "_aiSearcher", "type": "address"}],
    "name": "getAISearcherStats",
    "outputs": [
      {"name": "", "type": "address"},
      {"name": "", "type": "string"},
      {"name": "", "type": "string"},
      {"name": "", "type": "string"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "bool"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "uint256"},
      {"name": "", "type": "string[]"},
      {"name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const MockUSDCABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

class BlockchainService {
  constructor() {
    this.web3 = new Web3(process.env.WEB3_PROVIDER_URL || 'http://127.0.0.1:8546');
    this.platformAddress = process.env.CONTRACT_ADDRESS;
    this.chargeManagerAddress = process.env.CHARGE_MANAGER_ADDRESS;
    this.aiSearcherRegistryAddress = process.env.AI_SEARCHER_REGISTRY_ADDRESS;
    this.mockUSDCAddress = process.env.MOCK_USDC_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    
    if (this.privateKey && this.privateKey !== '') {
      try {
        this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
        this.web3.eth.accounts.wallet.add(this.account);
        
        // Initialize contract instances
        this.platformContract = new this.web3.eth.Contract(AdChainPlatformABI, this.platformAddress);
        this.chargeManagerContract = new this.web3.eth.Contract(ChargeManagerABI, this.chargeManagerAddress);
        this.aiSearcherRegistryContract = new this.web3.eth.Contract(AISearcherRegistryABI, this.aiSearcherRegistryAddress);
        this.mockUSDCContract = new this.web3.eth.Contract(MockUSDCABI, this.mockUSDCAddress);
        
        logger.info('Blockchain service initialized with contracts', {
          platform: this.platformAddress,
          chargeManager: this.chargeManagerAddress,
          aiSearcherRegistry: this.aiSearcherRegistryAddress,
          mockUSDC: this.mockUSDCAddress
        });
      } catch (error) {
        logger.error('Failed to initialize blockchain service:', error);
        this.account = null;
      }
    } else {
      logger.warn('No private key provided, blockchain service disabled');
      this.account = null;
    }
  }

  async processCrawlCharge(apiKeyId, aiSearcherWallet, url, costInUSDC) {
    if (!this.account || !this.platformContract) {
      logger.warn('Blockchain service not available, skipping charge');
      return { success: false, txHash: 'simulated_tx_hash' };
    }

    try {
      // Convert USDC amount to wei (USDC has 6 decimals)
      const costInWei = this.web3.utils.toWei((costInUSDC * 1000000).toString(), 'wei');
      
      logger.info('Processing crawl charge on blockchain', {
        apiKeyId,
        aiSearcherWallet,
        url,
        costInUSDC,
        costInWei
      });

      // Call the smart contract to process the crawl request
      const tx = await this.platformContract.methods
        .processCrawlRequest(apiKeyId, aiSearcherWallet, url, costInWei, "crawl")
        .send({
          from: this.account.address,
          gas: 500000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Crawl charge processed successfully', {
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed,
        blockNumber: tx.blockNumber
      });

      return {
        success: true,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed,
        blockNumber: tx.blockNumber
      };

    } catch (error) {
      logger.error('Blockchain charge processing failed:', error);
      return {
        success: false,
        error: error.message,
        txHash: null
      };
    }
  }

  async getAISearcherBalance(walletAddress) {
    if (!this.account || !this.aiSearcherRegistryContract) {
      return null;
    }

    try {
      const stats = await this.aiSearcherRegistryContract.methods
        .getAISearcherStats(walletAddress)
        .call();
      
      // stats[5] is prepaidBalance in wei, convert to USDC
      const prepaidBalanceWei = stats[5];
      const prepaidBalanceUSDC = parseFloat(this.web3.utils.fromWei(prepaidBalanceWei, 'mwei')); // mwei = 6 decimals
      
      return {
        walletAddress: stats[0],
        name: stats[1],
        totalSpent: parseFloat(this.web3.utils.fromWei(stats[4], 'mwei')),
        prepaidBalance: prepaidBalanceUSDC,
        isActive: stats[7]
      };
    } catch (error) {
      logger.error('Failed to get AI searcher balance:', error);
      return null;
    }
  }

  async mintTestTokens(toAddress, amountUSDC) {
    if (!this.account || !this.mockUSDCContract) {
      logger.warn('Cannot mint tokens, blockchain service not available');
      return false;
    }

    try {
      // Convert USDC to wei (6 decimals)
      const amountWei = this.web3.utils.toWei((amountUSDC * 1000000).toString(), 'wei');
      
      const tx = await this.mockUSDCContract.methods
        .mint(toAddress, amountWei)
        .send({
          from: this.account.address,
          gas: 100000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Test tokens minted successfully', {
        toAddress,
        amountUSDC,
        txHash: tx.transactionHash
      });

      return {
        success: true,
        txHash: tx.transactionHash,
        amount: amountUSDC
      };
    } catch (error) {
      logger.error('Failed to mint test tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async getTokenBalance(walletAddress) {
    if (!this.mockUSDCContract) {
      return null;
    }

    try {
      const balanceWei = await this.mockUSDCContract.methods
        .balanceOf(walletAddress)
        .call();
      
      const balanceUSDC = parseFloat(this.web3.utils.fromWei(balanceWei, 'mwei'));
      return balanceUSDC;
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      return null;
    }
  }

  isAvailable() {
    return this.account !== null && this.platformContract !== null;
  }

  getContractAddresses() {
    return {
      platform: this.platformAddress,
      chargeManager: this.chargeManagerAddress,
      aiSearcherRegistry: this.aiSearcherRegistryAddress,
      mockUSDC: this.mockUSDCAddress
    };
  }
}

module.exports = BlockchainService;