// 基于真实数据结构的Dashboard数据服务

import { AIAppDashboardData, PublisherDashboardData, AdvertiserDashboardData } from '@/types/dashboard';

// 基于现有测试数据的用户信息
export const DEMO_USERS = {
  aiSearcher: {
    id: 1,
    email: 'test-ai-searcher@monowave.com',
    userType: 'ai_searcher' as const,
    walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    balance: 89.23,
    status: 'active',
    name: 'AI Developer'
  },
  publisher: {
    id: 2,
    email: 'test-publisher@monowave.com',
    userType: 'publisher' as const,
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    balance: 0.0,
    status: 'active',
    name: 'Content Publisher'
  },
  advertiser: {
    id: 3,
    email: 'test-advertiser@monowave.com',
    userType: 'advertiser' as const,
    walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    balance: 1250.75,
    status: 'active',
    name: 'Brand Advertiser'
  }
};

// AI Apps Dashboard 数据 - 基于usage_logs, api_keys, billing_records
export const AI_APP_DASHBOARD_DATA: AIAppDashboardData = {
  accountInfo: {
    balance: 89.23,
    totalSpent: 456.78,
    planName: 'Pro Plan',
    apiKeyStatus: 'active'
  },
  
  apiUsage: {
    todayRequests: 1247,
    monthlyRequests: 34567,
    dailyLimit: 50000,
    monthlyLimit: 1500000,
    successRate: 98.5,
    avgResponseTime: 245
  },
  
  crawlCosts: {
    todayCost: 1.247,
    monthlyCost: 34.567,
    costPerRequest: 0.001,
    costTrend: [
      { date: '2024-01-01', cost: 0.85, requests: 850 },
      { date: '2024-01-02', cost: 1.02, requests: 1020 },
      { date: '2024-01-03', cost: 1.247, requests: 1247 },
      { date: '2024-01-04', cost: 0.98, requests: 980 },
      { date: '2024-01-05', cost: 1.13, requests: 1130 }
    ]
  },
  
  websiteCrawls: [
    {
      url: 'techcrunch.com',
      requests: 234,
      totalCost: 0.234,
      avgCost: 0.001,
      successRate: 99.1,
      lastCrawl: new Date('2024-01-05T14:30:00')
    },
    {
      url: 'medium.com',
      requests: 189,
      totalCost: 0.189,
      avgCost: 0.001,
      successRate: 97.8,
      lastCrawl: new Date('2024-01-05T14:25:00')
    },
    {
      url: 'hackernews.com',
      requests: 156,
      totalCost: 0.156,
      avgCost: 0.001,
      successRate: 98.7,
      lastCrawl: new Date('2024-01-05T14:20:00')
    },
    {
      url: 'reddit.com',
      requests: 145,
      totalCost: 0.145,
      avgCost: 0.001,
      successRate: 96.5,
      lastCrawl: new Date('2024-01-05T14:15:00')
    }
  ],
  
  recentCrawls: [
    {
      id: 1001,
      url: 'techcrunch.com/ai-news-latest',
      format: 'structured',
      bytesProcessed: 45678,
      cost: 0.001,
      status: 'success',
      createdAt: new Date('2024-01-05T14:30:15')
    },
    {
      id: 1002,
      url: 'medium.com/tech-insights/ai-trends',
      format: 'raw',
      bytesProcessed: 32456,
      cost: 0.001,
      status: 'success',
      createdAt: new Date('2024-01-05T14:28:42')
    },
    {
      id: 1003,
      url: 'hackernews.com/item?id=123456',
      format: 'summary',
      bytesProcessed: 12345,
      cost: 0.001,
      status: 'success',
      createdAt: new Date('2024-01-05T14:26:30')
    },
    {
      id: 1004,
      url: 'reddit.com/r/MachineLearning/hot',
      format: 'structured',
      bytesProcessed: 0,
      cost: 0.00,
      status: 'failed',
      createdAt: new Date('2024-01-05T14:24:18')
    }
  ]
};

// Publisher Dashboard 数据 - 基于publishers, usage_logs, ad_transactions, revenue_distributions
export const PUBLISHER_DASHBOARD_DATA: PublisherDashboardData = {
  revenueOverview: {
    todayRevenue: 156.78,
    monthlyRevenue: 3245.90,
    totalRevenue: 12450.67,
    pendingRevenue: 234.56
  },
  
  websiteStats: {
    totalCrawls: 5678,
    uniqueAIApps: 12,
    avgRevenuePerCrawl: 0.57,
    popularPages: [
      {
        url: 'techcrunch.com/startup-funding-2024',
        crawlCount: 89,
        revenue: 89.00,
        lastAccess: new Date('2024-01-05T14:30:00')
      },
      {
        url: 'techcrunch.com/ai-breakthrough-news',
        crawlCount: 76,
        revenue: 76.00,
        lastAccess: new Date('2024-01-05T14:25:00')
      },
      {
        url: 'techcrunch.com/tech-earnings-q4',
        crawlCount: 65,
        revenue: 65.00,
        lastAccess: new Date('2024-01-05T14:20:00')
      }
    ]
  },
  
  aiAppAccess: [
    {
      aiAppName: 'GPT-4 Crawler',
      aiAppAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      crawlCount: 234,
      totalRevenue: 234.00,
      avgRevenuePerCrawl: 1.00,
      lastAccess: new Date('2024-01-05T14:30:00')
    },
    {
      aiAppName: 'Claude Research Bot',
      aiAppAddress: '0x1234567890123456789012345678901234567890',
      crawlCount: 189,
      totalRevenue: 189.00,
      avgRevenuePerCrawl: 1.00,
      lastAccess: new Date('2024-01-05T14:25:00')
    },
    {
      aiAppName: 'Perplexity Indexer',
      aiAppAddress: '0x2345678901234567890123456789012345678901',
      crawlCount: 156,
      totalRevenue: 156.00,
      avgRevenuePerCrawl: 1.00,
      lastAccess: new Date('2024-01-05T14:20:00')
    }
  ],
  
  adRevenue: [
    {
      campaignId: 101,
      advertiserName: 'Amazon Product Ads',
      impressions: 12500,
      clicks: 340,
      revenue: 85.00,
      cpm: 6.80,
      createdAt: new Date('2024-01-05T10:00:00')
    },
    {
      campaignId: 102,
      advertiserName: 'Microsoft Azure',
      impressions: 8900,
      clicks: 267,
      revenue: 71.20,
      cpm: 8.00,
      createdAt: new Date('2024-01-05T09:30:00')
    }
  ],
  
  revenueDistributions: [
    {
      id: 501,
      amount: 156.78,
      distributionType: 'daily_settlement',
      txHash: '0xabcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
      status: 'completed',
      createdAt: new Date('2024-01-05T23:59:00')
    },
    {
      id: 502,
      amount: 234.56,
      distributionType: 'ad_revenue',
      txHash: '0xefgh5678901234efgh5678901234efgh5678901234efgh5678901234efgh5678',
      status: 'pending',
      createdAt: new Date('2024-01-05T18:30:00')
    }
  ]
};

// Advertiser Dashboard 数据 - 基于advertisers, ad_campaigns, ad_transactions, ad_metrics
export const ADVERTISER_DASHBOARD_DATA: AdvertiserDashboardData = {
  campaignOverview: {
    activeCampaigns: 5,
    totalSpend: 2450.67,
    totalImpressions: 125000,
    totalClicks: 3400,
    avgCTR: 2.72,
    avgROI: 245
  },
  
  campaigns: [
    {
      id: 101,
      name: 'Q1 Product Launch',
      status: 'active',
      budget: 1000.00,
      spent: 756.43,
      impressions: 45000,
      clicks: 1230,
      conversions: 89,
      ctr: 2.73,
      roi: 267,
      createdAt: new Date('2024-01-01T00:00:00')
    },
    {
      id: 102,
      name: 'Brand Awareness Campaign',
      status: 'active',
      budget: 800.00,
      spent: 623.21,
      impressions: 38000,
      clicks: 1045,
      conversions: 67,
      ctr: 2.75,
      roi: 234,
      createdAt: new Date('2024-01-02T00:00:00')
    },
    {
      id: 103,
      name: 'Holiday Special Offers',
      status: 'completed',
      budget: 1200.00,
      spent: 1200.00,
      impressions: 42000,
      clicks: 1125,
      conversions: 78,
      ctr: 2.68,
      roi: 189,
      createdAt: new Date('2023-12-01T00:00:00')
    }
  ],
  
  publisherPerformance: [
    {
      publisherName: 'TechCrunch',
      publisherAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      impressions: 25000,
      clicks: 680,
      conversions: 45,
      spend: 510.00,
      ctr: 2.72,
      cpa: 11.33
    },
    {
      publisherName: 'Medium Tech',
      publisherAddress: '0x8ba1f109551bD432803012645Hac136c63c16',
      impressions: 18000,
      clicks: 495,
      conversions: 32,
      spend: 378.00,
      ctr: 2.75,
      cpa: 11.81
    },
    {
      publisherName: 'Hacker News',
      publisherAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      impressions: 15000,
      clicks: 420,
      conversions: 28,
      spend: 315.00,
      ctr: 2.80,
      cpa: 11.25
    }
  ],
  
  aiAppPlacements: [
    {
      aiAppName: 'GPT-4 Search',
      aiAppAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      impressions: 35000,
      clicks: 945,
      spend: 735.00,
      ctr: 2.70,
      avgPosition: 1.8
    },
    {
      aiAppName: 'Claude Assistant',
      aiAppAddress: '0x1234567890123456789012345678901234567890',
      impressions: 28000,
      clicks: 756,
      spend: 588.00,
      ctr: 2.70,
      avgPosition: 2.1
    },
    {
      aiAppName: 'Perplexity AI',
      aiAppAddress: '0x2345678901234567890123456789012345678901',
      impressions: 22000,
      clicks: 594,
      spend: 462.00,
      ctr: 2.70,
      avgPosition: 2.3
    }
  ],
  
  adTransactions: [
    {
      id: 2001,
      campaignId: 101,
      publisherName: 'TechCrunch',
      aiAppName: 'GPT-4 Search',
      transactionType: 'click',
      amount: 0.75,
      createdAt: new Date('2024-01-05T14:30:00')
    },
    {
      id: 2002,
      campaignId: 101,
      publisherName: 'TechCrunch',
      aiAppName: 'GPT-4 Search',
      transactionType: 'impression',
      amount: 0.05,
      createdAt: new Date('2024-01-05T14:29:45')
    },
    {
      id: 2003,
      campaignId: 102,
      publisherName: 'Medium Tech',
      aiAppName: 'Claude Assistant',
      transactionType: 'conversion',
      amount: 5.00,
      createdAt: new Date('2024-01-05T14:28:30')
    }
  ]
};

// 数据生成器 - 用于实时更新模拟
export class DashboardDataGenerator {
  static generateRealtimeUpdate(userType: 'ai_searcher' | 'publisher' | 'advertiser') {
    const timestamp = new Date();
    
    switch (userType) {
      case 'ai_searcher':
        return {
          type: 'crawl_completed',
          data: {
            url: 'example.com/new-article',
            cost: Math.random() * 0.2,
            bytesProcessed: Math.floor(Math.random() * 50000),
            timestamp
          }
        };
        
      case 'publisher':
        return {
          type: 'revenue_earned',
          data: {
            amount: Math.random() * 2,
            source: 'ai_crawl',
            aiApp: 'GPT-4 Crawler',
            timestamp
          }
        };
        
      case 'advertiser':
        return {
          type: 'ad_interaction',
          data: {
            campaignId: 101,
            type: Math.random() > 0.7 ? 'click' : 'impression',
            cost: Math.random() * 1,
            publisher: 'TechCrunch',
            timestamp
          }
        };
        
      default:
        return null;
    }
  }
  
  static updateDashboardData(currentData: any, update: any) {
    // 根据更新类型修改dashboard数据
    // 这里实现实时数据更新逻辑
    return { ...currentData, lastUpdate: new Date() };
  }
}
