const { Web3 } = require('web3');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Import MVP contract ABIs
const ParticipantRegistryABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/ParticipantRegistry.sol/ParticipantRegistry.json').abi;
const BatchLedgerABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/BatchLedger.sol/BatchLedger.json').abi;
const EscrowABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/Escrow.sol/Escrow.json').abi;
const DistributorABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/Distributor.sol/Distributor.json').abi;
const TokenRegistryABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/TokenRegistry.sol/TokenRegistry.json').abi;
const MockUSDCABI = require('../../monowave_sc/artifacts/monowave_sc/contracts/MockUSDC.sol/MockUSDC.json').abi;

class BlockchainService {
  constructor() {
    this.web3 = new Web3(process.env.WEB3_PROVIDER_URL || 'http://127.0.0.1:8546');
    
    // MVP contract addresses from environment
    this.participantRegistryAddress = process.env.PARTICIPANT_REGISTRY_ADDRESS;
    this.batchLedgerAddress = process.env.BATCH_LEDGER_ADDRESS;
    this.escrowAddress = process.env.ESCROW_ADDRESS;
    this.distributorAddress = process.env.DISTRIBUTOR_ADDRESS;
    this.tokenRegistryAddress = process.env.TOKEN_REGISTRY_ADDRESS;
    this.mockUSDCAddress = process.env.MOCK_USDC_ADDRESS;
    
    this.privateKey = process.env.PRIVATE_KEY;
    
    if (this.privateKey && this.privateKey !== '') {
      try {
        this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
        this.web3.eth.accounts.wallet.add(this.account);
        
        // Initialize MVP contract instances
        this.participantRegistry = new this.web3.eth.Contract(ParticipantRegistryABI, this.participantRegistryAddress);
        this.batchLedger = new this.web3.eth.Contract(BatchLedgerABI, this.batchLedgerAddress);
        this.escrow = new this.web3.eth.Contract(EscrowABI, this.escrowAddress);
        this.distributor = new this.web3.eth.Contract(DistributorABI, this.distributorAddress);
        this.tokenRegistry = new this.web3.eth.Contract(TokenRegistryABI, this.tokenRegistryAddress);
        this.mockUSDC = new this.web3.eth.Contract(MockUSDCABI, this.mockUSDCAddress);
        
        logger.info('Blockchain service initialized with MVP contracts', {
          participantRegistry: this.participantRegistryAddress,
          batchLedger: this.batchLedgerAddress,
          escrow: this.escrowAddress,
          distributor: this.distributorAddress,
          tokenRegistry: this.tokenRegistryAddress,
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

  // Participant Registry Operations
  async registerParticipant(participantAddress, roleBitmap, payoutAddress, metadata = '0x0000000000000000000000000000000000000000000000000000000000000000') {
    if (!this.account || !this.participantRegistry) {
      logger.warn('Blockchain service not available');
      return { success: false, error: 'Service not available' };
    }

    try {
      logger.info('Registering participant', {
        participant: participantAddress,
        roles: roleBitmap,
        payout: payoutAddress
      });

      const tx = await this.participantRegistry.methods
        .register(participantAddress, roleBitmap, payoutAddress, metadata)
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Participant registered successfully', {
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
      logger.error('Participant registration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getParticipantInfo(participantAddress) {
    if (!this.participantRegistry) {
      return null;
    }

    try {
      const info = await this.participantRegistry.methods
        .participants(participantAddress)
        .call();

      return {
        payoutAddress: info.payout,
        roleBitmap: parseInt(info.roleBitmap),
        status: parseInt(info.status),
        metadata: info.meta,
        isPublisher: (parseInt(info.roleBitmap) & 1) !== 0, // ROLE_PUBLISHER = 1 << 0
        isAdvertiser: (parseInt(info.roleBitmap) & 2) !== 0, // ROLE_ADVERTISER = 1 << 1
        isAISearcher: (parseInt(info.roleBitmap) & 4) !== 0  // ROLE_AI_SEARCHER = 1 << 2
      };

    } catch (error) {
      logger.error('Failed to get participant info:', error);
      return null;
    }
  }

  // Escrow Operations
  async depositToEscrow(tokenAddress, amount) {
    if (!this.account || !this.escrow) {
      logger.warn('Blockchain service not available');
      return { success: false, error: 'Service not available' };
    }

    try {
      // Convert USDC to wei (6 decimals)
      const amountWei = this.web3.utils.toWei((amount * 1000000).toString(), 'wei');
      
      logger.info('Depositing to escrow', {
        token: tokenAddress,
        amount,
        amountWei
      });

      const tx = await this.escrow.methods
        .deposit(tokenAddress, amountWei)
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Escrow deposit successful', {
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      });

      return {
        success: true,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      };

    } catch (error) {
      logger.error('Escrow deposit failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getEscrowBalance(userAddress, tokenAddress) {
    if (!this.escrow) {
      return null;
    }

    try {
      const balanceWei = await this.escrow.methods
        .balances(userAddress, tokenAddress)
        .call();
      
      const balanceUSDC = parseFloat(this.web3.utils.fromWei(balanceWei, 'mwei'));
      return balanceUSDC;

    } catch (error) {
      logger.error('Failed to get escrow balance:', error);
      return null;
    }
  }

  // Batch Ledger Operations
  async commitBatch(batchId, merkleRoot, leavesCount, description = '') {
    if (!this.account || !this.batchLedger) {
      logger.warn('Blockchain service not available');
      return { success: false, error: 'Service not available' };
    }

    try {
      logger.info('Committing batch', {
        batchId,
        merkleRoot,
        leavesCount,
        description
      });

      const tx = await this.batchLedger.methods
        .commitBatch(batchId, merkleRoot, leavesCount, description)
        .send({
          from: this.account.address,
          gas: 200000,
          gasPrice: await this.web3.eth.getGasPrice()
        });

      logger.info('Batch committed successfully', {
        batchId,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      });

      return {
        success: true,
        batchId,
        txHash: tx.transactionHash,
        gasUsed: tx.gasUsed
      };

    } catch (error) {
      logger.error('Batch commit failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getBatchInfo(batchId) {
    if (!this.batchLedger) {
      return null;
    }

    try {
      const batch = await this.batchLedger.methods
        .batches(batchId)
        .call();

      return {
        root: batch.root,
        leavesCount: parseInt(batch.leavesCount),
        timestamp: parseInt(batch.timestamp),
        description: batch.description
      };

    } catch (error) {
      logger.error('Failed to get batch info:', error);
      return null;
    }
  }

  // Token Operations
  async mintTestTokens(toAddress, amountUSDC) {
    if (!this.account || !this.mockUSDC) {
      logger.warn('Cannot mint tokens, blockchain service not available');
      return { success: false, error: 'Service not available' };
    }

    try {
      // Convert USDC to wei (6 decimals)
      const amountWei = this.web3.utils.toWei((amountUSDC * 1000000).toString(), 'wei');
      
      const tx = await this.mockUSDC.methods
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

  async getTokenBalance(walletAddress, tokenAddress = null) {
    const tokenContract = tokenAddress ? 
      new this.web3.eth.Contract(MockUSDCABI, tokenAddress) : 
      this.mockUSDC;
    
    if (!tokenContract) {
      return null;
    }

    try {
      const balanceWei = await tokenContract.methods
        .balanceOf(walletAddress)
        .call();
      
      const balanceUSDC = parseFloat(this.web3.utils.fromWei(balanceWei, 'mwei'));
      return balanceUSDC;
    } catch (error) {
      logger.error('Failed to get token balance:', error);
      return null;
    }
  }

  // Legacy method compatibility for existing controllers
  async getAISearcherBalance(walletAddress) {
    // Map to participant info for backward compatibility
    const participantInfo = await this.getParticipantInfo(walletAddress);
    if (!participantInfo) {
      return null;
    }

    const tokenBalance = await this.getTokenBalance(walletAddress);
    const escrowBalance = await this.getEscrowBalance(walletAddress, this.mockUSDCAddress);

    return {
      walletAddress: walletAddress,
      name: 'AI Searcher', // Default name
      totalSpent: 0, // Would need to calculate from transaction history
      prepaidBalance: escrowBalance || 0,
      isActive: participantInfo.status === 1
    };
  }

  // Legacy method for crawl processing - now maps to participant validation
  async processCrawlCharge(apiKeyId, aiSearcherWallet, url, costInUSDC) {
    // Validate participant is registered
    const participantInfo = await this.getParticipantInfo(aiSearcherWallet);
    if (!participantInfo || !participantInfo.isAISearcher) {
      logger.warn('AI Searcher not registered', { wallet: aiSearcherWallet });
      return { success: false, error: 'AI Searcher not registered' };
    }

    // Check escrow balance
    const escrowBalance = await this.getEscrowBalance(aiSearcherWallet, this.mockUSDCAddress);
    if (!escrowBalance || escrowBalance < costInUSDC) {
      logger.warn('Insufficient escrow balance', { 
        wallet: aiSearcherWallet, 
        required: costInUSDC, 
        available: escrowBalance 
      });
      return { success: false, error: 'Insufficient escrow balance' };
    }

    logger.info('Crawl charge validated', {
      apiKeyId,
      aiSearcherWallet,
      url,
      costInUSDC,
      escrowBalance
    });

    // In MVP, actual charging happens through batch processing
    // Return success to maintain compatibility
    return {
      success: true,
      txHash: 'pending_batch_processing',
      message: 'Charge queued for batch processing'
    };
  }

  // Utility methods
  isAvailable() {
    return this.account !== null && this.participantRegistry !== null;
  }

  getContractAddresses() {
    return {
      participantRegistry: this.participantRegistryAddress,
      batchLedger: this.batchLedgerAddress,
      escrow: this.escrowAddress,
      distributor: this.distributorAddress,
      tokenRegistry: this.tokenRegistryAddress,
      mockUSDC: this.mockUSDCAddress
    };
  }

  // Role bitmap helpers
  static ROLES = {
    PUBLISHER: 1 << 0,   // 1
    ADVERTISER: 1 << 1,  // 2
    AI_SEARCHER: 1 << 2  // 4
  };

  static combineRoles(...roles) {
    return roles.reduce((combined, role) => combined | role, 0);
  }

  static hasRole(roleBitmap, role) {
    return (roleBitmap & role) !== 0;
  }
}

module.exports = BlockchainService;