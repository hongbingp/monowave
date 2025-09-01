// 区块链交易数据 - 强调可追溯性

import { 
  CrawlTransaction, 
  AdTransaction, 
  RevenueDistribution, 
  BatchSettlement,
  TransactionTrace 
} from '@/types/blockchain';

// 生成模拟的区块链交易哈希
function generateTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// 生成模拟的区块哈希
function generateBlockHash(): string {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// 生成模拟的内容哈希 (IPFS)
function generateContentHash(): string {
  return 'Qm' + Array.from({ length: 44 }, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    [Math.floor(Math.random() * 62)]
  ).join('');
}

// AI Apps 爬取交易记录
export const AI_APP_CRAWL_TRANSACTIONS: CrawlTransaction[] = [
  {
    id: 'crawl_001',
    type: 'crawl',
    txHash: generateTxHash(),
    blockNumber: 2847593,
    blockHash: generateBlockHash(),
    from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    value: 0.001,
    gasUsed: 45678,
    gasPrice: 0.000000020,
    timestamp: new Date('2024-01-05T14:30:15Z'),
    confirmations: 12,
    status: 'confirmed',
    publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    contentUrl: 'https://techcrunch.com/ai-news-latest',
    crawlCost: 0.001,
    publisherShare: 0.0007, // 70%
    platformFee: 0.0003, // 30%
    contentHash: generateContentHash(),
    events: [
      {
        eventName: 'ContentCrawled',
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: generateTxHash(),
        blockNumber: 2847593,
        logIndex: 0,
        args: {
          publisher: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          aiSearcher: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          contentUrl: 'https://techcrunch.com/ai-news-latest',
          amount: '1000000000000000', // 0.001 ETH in wei
          contentHash: generateContentHash()
        },
        timestamp: new Date('2024-01-05T14:30:15Z')
      },
      {
        eventName: 'RevenueDistributed',
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: generateTxHash(),
        blockNumber: 2847593,
        logIndex: 1,
        args: {
          recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          amount: '700000000000000', // 0.0007 ETH in wei
          distributionType: 'crawl_revenue'
        },
        timestamp: new Date('2024-01-05T14:30:16Z')
      }
    ]
  },
  {
    id: 'crawl_002',
    type: 'crawl',
    txHash: generateTxHash(),
    blockNumber: 2847591,
    blockHash: generateBlockHash(),
    from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    to: '0x8ba1f109551bD432803012645Hac136c63c16',
    value: 0.001,
    gasUsed: 43521,
    gasPrice: 0.000000018,
    timestamp: new Date('2024-01-05T14:28:42Z'),
    confirmations: 14,
    status: 'confirmed',
    publisherAddress: '0x8ba1f109551bD432803012645Hac136c63c16',
    aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    contentUrl: 'https://medium.com/tech-insights/ai-trends',
    crawlCost: 0.001,
    publisherShare: 0.0007,
    platformFee: 0.0003,
    contentHash: generateContentHash(),
    events: [
      {
        eventName: 'ContentCrawled',
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: generateTxHash(),
        blockNumber: 2847591,
        logIndex: 0,
        args: {
          publisher: '0x8ba1f109551bD432803012645Hac136c63c16',
          aiSearcher: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          contentUrl: 'https://medium.com/tech-insights/ai-trends',
          amount: '1000000000000000',
          contentHash: generateContentHash()
        },
        timestamp: new Date('2024-01-05T14:28:42Z')
      }
    ]
  }
];

// Publisher 收益分配记录
export const PUBLISHER_REVENUE_DISTRIBUTIONS: RevenueDistribution[] = [
  {
    id: 'dist_001',
    type: 'distribution',
    txHash: generateTxHash(),
    blockNumber: 2847595,
    blockHash: generateBlockHash(),
    from: '0x1234567890123456789012345678901234567890', // Smart contract
    to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Publisher
    value: 0.156,
    gasUsed: 21000,
    gasPrice: 0.000000020,
    timestamp: new Date('2024-01-05T23:59:00Z'),
    confirmations: 10,
    status: 'confirmed',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    amount: 0.156,
    distributionType: 'batch_settlement',
    batchId: 'batch_20240105_001',
    merkleProof: [
      '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1',
      '0xc3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2'
    ],
    events: [
      {
        eventName: 'BatchDistribution',
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: generateTxHash(),
        blockNumber: 2847595,
        logIndex: 0,
        args: {
          batchId: 'batch_20240105_001',
          recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          amount: '156000000000000000', // 0.156 ETH in wei
          merkleRoot: '0xd4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2c3'
        },
        timestamp: new Date('2024-01-05T23:59:00Z')
      }
    ]
  }
];

// Advertiser 广告交易记录
export const ADVERTISER_AD_TRANSACTIONS: AdTransaction[] = [
  {
    id: 'ad_001',
    type: 'advertisement',
    txHash: generateTxHash(),
    blockNumber: 2847592,
    blockHash: generateBlockHash(),
    from: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Advertiser
    to: '0x2345678901234567890123456789012345678901', // Ad contract
    value: 0.75,
    gasUsed: 67890,
    gasPrice: 0.000000025,
    timestamp: new Date('2024-01-05T14:30:00Z'),
    confirmations: 13,
    status: 'confirmed',
    advertiserAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    campaignId: 'camp_101',
    adAmount: 0.75,
    publisherShare: 0.525, // 70%
    aiSearcherShare: 0.1125, // 15%
    platformFee: 0.1125, // 15%
    adType: 'click',
    targetingData: 'encrypted_targeting_data_hash',
    events: [
      {
        eventName: 'AdInteraction',
        contractAddress: '0x2345678901234567890123456789012345678901',
        transactionHash: generateTxHash(),
        blockNumber: 2847592,
        logIndex: 0,
        args: {
          campaignId: 'camp_101',
          advertiser: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          publisher: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          aiSearcher: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
          interactionType: 'click',
          amount: '750000000000000000' // 0.75 ETH in wei
        },
        timestamp: new Date('2024-01-05T14:30:00Z')
      }
    ]
  }
];

// 批处理结算记录
export const BATCH_SETTLEMENTS: BatchSettlement[] = [
  {
    batchId: 'batch_20240105_001',
    merkleRoot: '0xd4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2c3',
    totalTransactions: 247,
    totalAmount: 1.567,
    blockNumber: 2847595,
    txHash: generateTxHash(),
    timestamp: new Date('2024-01-05T23:59:00Z'),
    status: 'settled',
    disputeWindow: 86400, // 24 hours
    transactions: [...AI_APP_CRAWL_TRANSACTIONS, ...ADVERTISER_AD_TRANSACTIONS]
  }
];

// 完整交易追踪记录
export const TRANSACTION_TRACES: TransactionTrace[] = [
  {
    originalTx: AI_APP_CRAWL_TRANSACTIONS[0],
    distributions: [PUBLISHER_REVENUE_DISTRIBUTIONS[0]],
    batchSettlement: BATCH_SETTLEMENTS[0],
    auditTrail: [
      {
        action: 'Transaction Initiated',
        timestamp: new Date('2024-01-05T14:30:15Z'),
        txHash: AI_APP_CRAWL_TRANSACTIONS[0].txHash,
        blockNumber: 2847593,
        actor: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      },
      {
        action: 'Content Verified',
        timestamp: new Date('2024-01-05T14:30:16Z'),
        txHash: generateTxHash(),
        blockNumber: 2847593,
        actor: 'Smart Contract'
      },
      {
        action: 'Revenue Calculated',
        timestamp: new Date('2024-01-05T14:30:17Z'),
        txHash: generateTxHash(),
        blockNumber: 2847593,
        actor: 'Smart Contract'
      },
      {
        action: 'Added to Batch',
        timestamp: new Date('2024-01-05T14:30:18Z'),
        txHash: generateTxHash(),
        blockNumber: 2847593,
        actor: 'Batch Processor'
      },
      {
        action: 'Batch Settled',
        timestamp: new Date('2024-01-05T23:59:00Z'),
        txHash: BATCH_SETTLEMENTS[0].txHash,
        blockNumber: 2847595,
        actor: 'Settlement Contract'
      }
    ]
  }
];

// 生成实时区块链交易
export function generateBlockchainTransaction(
  type: 'crawl' | 'ad' | 'distribution',
  userAddress: string
): CrawlTransaction | AdTransaction | RevenueDistribution {
  const baseBlock = 2847600 + Math.floor(Math.random() * 100);
  
  const baseTx = {
    id: `${type}_${Date.now()}`,
    txHash: generateTxHash(),
    blockNumber: baseBlock,
    blockHash: generateBlockHash(),
    gasUsed: 30000 + Math.floor(Math.random() * 40000),
    gasPrice: 0.000000015 + Math.random() * 0.000000010,
    timestamp: new Date(),
    confirmations: Math.floor(Math.random() * 20) + 1,
    status: 'confirmed' as const
  };

  switch (type) {
    case 'crawl':
      return {
        ...baseTx,
        type: 'crawl',
        from: userAddress,
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: 0.001,
        publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        aiSearcherAddress: userAddress,
        contentUrl: `https://example.com/article-${Math.floor(Math.random() * 1000)}`,
        crawlCost: 0.001,
        publisherShare: 0.0007,
        platformFee: 0.0003,
        contentHash: generateContentHash(),
        events: []
      } as CrawlTransaction;

    case 'ad':
      return {
        ...baseTx,
        type: 'advertisement',
        from: userAddress,
        to: '0x2345678901234567890123456789012345678901',
        value: Math.random() * 2 + 0.5,
        advertiserAddress: userAddress,
        publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        aiSearcherAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        campaignId: `camp_${Math.floor(Math.random() * 1000)}`,
        adAmount: Math.random() * 2 + 0.5,
        publisherShare: 0,
        aiSearcherShare: 0,
        platformFee: 0,
        adType: Math.random() > 0.7 ? 'click' : 'impression',
        targetingData: 'encrypted_hash',
        events: []
      } as AdTransaction;

    case 'distribution':
      return {
        ...baseTx,
        type: 'distribution',
        from: '0x1234567890123456789012345678901234567890',
        to: userAddress,
        value: Math.random() * 0.5 + 0.1,
        recipientAddress: userAddress,
        amount: Math.random() * 0.5 + 0.1,
        distributionType: 'crawl_revenue',
        events: []
      } as RevenueDistribution;

    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
}
