export interface PlatformMetrics {
  totalRevenue: number;
  activePublishers: number;
  activeAIApps: number;
  activeAdvertisers: number;
  dailyTransactions: number;
  monthlyGrowth: number;
}

export interface LiveTransaction {
  id: string;
  timestamp: Date;
  type: 'crawl' | 'ad_click' | 'content_access' | 'revenue_distribution';
  amount: number;
  publisher?: string;
  aiApp?: string;
  advertiser?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface UserRole {
  id: 'publisher' | 'ai_app' | 'advertiser';
  label: string;
  icon: string;
  color: string;
}

export interface PublisherData {
  todayEarnings: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  topUrls: Array<{
    url: string;
    revenue: number;
    views: number;
  }>;
  contentPerformance: Array<{
    date: string;
    revenue: number;
    views: number;
  }>;
}

export interface AIAppData {
  apiUsage: {
    todayRequests: number;
    monthlyRequests: number;
    successRate: number;
    averageResponseTime: number;
  };
  balance: number;
  activeCrawls: number;
  costAnalysis: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
}

export interface AdvertiserData {
  campaignPerformance: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    roi: number;
  };
  totalSpend: number;
  activeCampaigns: number;
  performanceChart: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
  }>;
}

export interface TransactionStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
}

export interface RevenueDistribution {
  publisher: number;
  aiApp: number;
  platform: number;
  advertiser?: number;
}

export interface DemoConfig {
  animationSpeed: number;
  refreshInterval: number;
  simulateRealTime: boolean;
  mockDataEnabled: boolean;
}
