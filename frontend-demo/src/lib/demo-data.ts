import { PlatformMetrics, LiveTransaction, PublisherData, AIAppData, AdvertiserData, TransactionStep } from '@/types/demo';

// 基于现有测试数据的演示配置
export const DEMO_USERS = {
  aiSearcher: {
    email: 'test-ai-searcher@monowave.com',
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    balance: 100.0,
    role: 'AI_SEARCHER'
  },
  publisher: {
    email: 'test-publisher@monowave.com',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    balance: 0.0,
    role: 'PUBLISHER'
  }
};

// 平台核心指标（投资人关注的数据）
export const PLATFORM_METRICS: PlatformMetrics = {
  totalRevenue: 12450.78,
  activePublishers: 156,
  activeAIApps: 23,
  activeAdvertisers: 8,
  dailyTransactions: 1247,
  monthlyGrowth: 23.5
};

// 实时交易模拟数据
export const MOCK_TRANSACTIONS: LiveTransaction[] = [
  {
    id: '1',
    timestamp: new Date(),
    type: 'crawl',
    amount: 0.50,
    publisher: 'TechCrunch',
    aiApp: 'GPT-4',
    description: 'AI crawled tech news article',
    status: 'completed'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 30000),
    type: 'ad_click',
    amount: 2.00,
    advertiser: 'Amazon',
    aiApp: 'Perplexity',
    description: 'User clicked product advertisement',
    status: 'completed'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 60000),
    type: 'content_access',
    amount: 0.25,
    publisher: 'Medium',
    aiApp: 'Claude',
    description: 'AI accessed premium content',
    status: 'completed'
  }
];

// Publisher Dashboard 数据
export const PUBLISHER_DATA: PublisherData = {
  todayEarnings: 156.78,
  monthlyRevenue: 3245.90,
  pendingPayouts: 1234.56,
  topUrls: [
    { url: 'techcrunch.com/ai-news', revenue: 45.20, views: 1250 },
    { url: 'medium.com/tech-insights', revenue: 32.15, views: 890 },
    { url: 'blog.example.com/analysis', revenue: 28.90, views: 750 }
  ],
  contentPerformance: [
    { date: '2024-01-01', revenue: 120.50, views: 2500 },
    { date: '2024-01-02', revenue: 135.75, views: 2800 },
    { date: '2024-01-03', revenue: 156.78, views: 3200 }
  ]
};

// AI App Dashboard 数据
export const AI_APP_DATA: AIAppData = {
  apiUsage: {
    todayRequests: 2456,
    monthlyRequests: 78900,
    successRate: 98.5,
    averageResponseTime: 245
  },
  balance: 89.23,
  activeCrawls: 12,
  costAnalysis: [
    { date: '2024-01-01', cost: 25.50, requests: 1200 },
    { date: '2024-01-02', cost: 32.75, requests: 1550 },
    { date: '2024-01-03', cost: 41.20, requests: 2000 }
  ]
};

// Advertiser Dashboard 数据
export const ADVERTISER_DATA: AdvertiserData = {
  campaignPerformance: {
    impressions: 45678,
    clicks: 1234,
    conversions: 156,
    ctr: 2.7,
    roi: 245
  },
  totalSpend: 567.89,
  activeCampaigns: 5,
  performanceChart: [
    { date: '2024-01-01', impressions: 12000, clicks: 320, spend: 150.00 },
    { date: '2024-01-02', impressions: 15000, clicks: 405, spend: 200.00 },
    { date: '2024-01-03', impressions: 18678, clicks: 509, spend: 217.89 }
  ]
};

// 交易流程步骤
export const TRANSACTION_STEPS: TransactionStep[] = [
  {
    id: 'request',
    label: 'AI Request',
    description: '🤖 AI App requests content crawl',
    status: 'pending'
  },
  {
    id: 'access',
    label: 'Content Access',
    description: '📰 Publisher content accessed',
    status: 'pending'
  },
  {
    id: 'payment',
    label: 'Payment Processing',
    description: '💰 Payment processed via escrow',
    status: 'pending'
  },
  {
    id: 'distribution',
    label: 'Revenue Distribution',
    description: '🔄 Revenue automatically distributed',
    status: 'pending'
  },
  {
    id: 'settlement',
    label: 'Blockchain Settlement',
    description: '✅ Transaction settled on blockchain',
    status: 'pending'
  }
];

// 商业场景演示
export const BUSINESS_SCENARIOS = [
  {
    title: "新闻内容AI分析",
    description: "AI搜索引擎爬取新闻网站内容进行分析",
    participants: {
      publisher: "TechCrunch",
      aiApp: "GPT-4",
      amount: 0.50
    },
    flow: [
      "📰 TechCrunch发布新文章",
      "🤖 OpenAI的GPT请求爬取内容",
      "💰 支付 $0.50 爬取费用",
      "📊 内容成功提取和分析",
      "💸 收益分配：TechCrunch $0.35, 平台 $0.15"
    ]
  },
  {
    title: "电商广告投放",
    description: "电商平台在AI应用中投放商品广告",
    participants: {
      advertiser: "Amazon",
      aiApp: "Perplexity",
      amount: 2.00
    },
    flow: [
      "🛒 Amazon投放产品广告",
      "👁️ 在AI搜索结果中展示",
      "🖱️ 用户点击广告链接",
      "💰 广告费用 $2.00",
      "📈 转化成功，ROI 300%"
    ]
  }
];

// 收益分配比例
export const REVENUE_SPLIT = {
  publisher: 70,
  aiApp: 15,
  platform: 15
};

// 生成随机交易数据
export function generateRandomTransaction(): LiveTransaction {
  const scenarios = [
    { type: 'crawl' as const, amount: 0.50, publisher: 'TechCrunch', aiApp: 'GPT-4' },
    { type: 'ad_click' as const, amount: 2.00, advertiser: 'Amazon', aiApp: 'Perplexity' },
    { type: 'content_access' as const, amount: 0.25, publisher: 'Medium', aiApp: 'Claude' }
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  return {
    id: Date.now().toString(),
    timestamp: new Date(),
    type: scenario.type,
    amount: scenario.amount,
    publisher: scenario.publisher,
    aiApp: scenario.aiApp,
    advertiser: scenario.advertiser,
    description: `${scenario.aiApp} ${scenario.type === 'crawl' ? 'crawled' : 'accessed'} content`,
    status: 'completed'
  };
}

// 更新平台指标
export function updatePlatformMetrics(currentMetrics: PlatformMetrics): PlatformMetrics {
  return {
    ...currentMetrics,
    totalRevenue: currentMetrics.totalRevenue + Math.random() * 10,
    dailyTransactions: currentMetrics.dailyTransactions + Math.floor(Math.random() * 5)
  };
}
