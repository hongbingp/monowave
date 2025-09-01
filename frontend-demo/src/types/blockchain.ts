// 区块链交易类型定义

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string;
  value: number;
  gasUsed: number;
  gasPrice: number;
  timestamp: Date;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface SmartContractEvent {
  eventName: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  args: Record<string, any>;
  timestamp: Date;
}

export interface CrawlTransaction extends BlockchainTransaction {
  type: 'crawl';
  publisherAddress: string;
  aiSearcherAddress: string;
  contentUrl: string;
  crawlCost: number;
  publisherShare: number;
  platformFee: number;
  contentHash: string; // IPFS hash for content verification
  events: SmartContractEvent[];
}

export interface AdTransaction extends BlockchainTransaction {
  type: 'advertisement';
  advertiserAddress: string;
  publisherAddress: string;
  aiSearcherAddress: string;
  campaignId: string;
  adAmount: number;
  publisherShare: number;
  aiSearcherShare: number;
  platformFee: number;
  adType: 'impression' | 'click' | 'conversion';
  targetingData: string; // Encrypted targeting parameters
  events: SmartContractEvent[];
}

export interface RevenueDistribution extends BlockchainTransaction {
  type: 'distribution';
  recipientAddress: string;
  amount: number;
  distributionType: 'crawl_revenue' | 'ad_revenue' | 'batch_settlement';
  batchId?: string;
  merkleProof?: string[];
  events: SmartContractEvent[];
}

export interface BatchSettlement {
  batchId: string;
  merkleRoot: string;
  totalTransactions: number;
  totalAmount: number;
  blockNumber: number;
  txHash: string;
  timestamp: Date;
  status: 'pending' | 'settled' | 'disputed';
  disputeWindow: number; // seconds
  transactions: (CrawlTransaction | AdTransaction)[];
}

export interface TransactionTrace {
  originalTx: CrawlTransaction | AdTransaction;
  distributions: RevenueDistribution[];
  batchSettlement?: BatchSettlement;
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    txHash: string;
    blockNumber: number;
    actor: string;
  }>;
}
