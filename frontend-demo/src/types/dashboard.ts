// 重构后的Dashboard类型定义

export interface User {
  id: number;
  email: string;
  userType: 'ai_searcher' | 'publisher' | 'advertiser';
  walletAddress: string;
  balance: number;
  status: string;
  createdAt: Date;
}

// AI Apps Dashboard 数据类型
export interface AIAppDashboardData {
  // 账户信息
  accountInfo: {
    balance: number;
    totalSpent: number;
    planName: string;
    apiKeyStatus: string;
  };
  
  // API使用统计
  apiUsage: {
    todayRequests: number;
    monthlyRequests: number;
    dailyLimit: number;
    monthlyLimit: number;
    successRate: number;
    avgResponseTime: number;
  };
  
  // 爬取费用分析
  crawlCosts: {
    todayCost: number;
    monthlyCost: number;
    costPerRequest: number;
    costTrend: Array<{
      date: string;
      cost: number;
      requests: number;
    }>;
  };
  
  // 网站爬取详情
  websiteCrawls: Array<{
    url: string;
    requests: number;
    totalCost: number;
    avgCost: number;
    successRate: number;
    lastCrawl: Date;
  }>;
  
  // 最近爬取记录
  recentCrawls: Array<{
    id: number;
    url: string;
    format: string;
    bytesProcessed: number;
    cost: number;
    status: 'success' | 'failed';
    createdAt: Date;
  }>;
}

// Publisher Dashboard 数据类型
export interface PublisherDashboardData {
  // 收益概览
  revenueOverview: {
    todayRevenue: number;
    monthlyRevenue: number;
    totalRevenue: number;
    pendingRevenue: number;
  };
  
  // 网站访问统计
  websiteStats: {
    totalCrawls: number;
    uniqueAIApps: number;
    avgRevenuePerCrawl: number;
    popularPages: Array<{
      url: string;
      crawlCount: number;
      revenue: number;
      lastAccess: Date;
    }>;
  };
  
  // AI Apps访问详情
  aiAppAccess: Array<{
    aiAppName: string;
    aiAppAddress: string;
    crawlCount: number;
    totalRevenue: number;
    avgRevenuePerCrawl: number;
    lastAccess: Date;
  }>;
  
  // 广告收益详情
  adRevenue: Array<{
    campaignId: number;
    advertiserName: string;
    impressions: number;
    clicks: number;
    revenue: number;
    cpm: number;
    createdAt: Date;
  }>;
  
  // 收益分配历史
  revenueDistributions: Array<{
    id: number;
    amount: number;
    distributionType: string;
    txHash: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
  }>;
}

// Advertiser Dashboard 数据类型
export interface AdvertiserDashboardData {
  // 活动概览
  campaignOverview: {
    activeCampaigns: number;
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    avgCTR: number;
    avgROI: number;
  };
  
  // 活动列表
  campaigns: Array<{
    id: number;
    name: string;
    status: 'active' | 'paused' | 'completed';
    budget: number;
    spent: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    roi: number;
    createdAt: Date;
  }>;
  
  // Publisher表现
  publisherPerformance: Array<{
    publisherName: string;
    publisherAddress: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpa: number;
  }>;
  
  // AI Apps展示详情
  aiAppPlacements: Array<{
    aiAppName: string;
    aiAppAddress: string;
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    avgPosition: number;
  }>;
  
  // 广告交易详情
  adTransactions: Array<{
    id: number;
    campaignId: number;
    publisherName: string;
    aiAppName: string;
    transactionType: 'impression' | 'click' | 'conversion';
    amount: number;
    createdAt: Date;
  }>;
}

// 通用Dashboard组件Props
export interface DashboardProps {
  userRole: 'ai_searcher' | 'publisher' | 'advertiser';
  userId: number;
  refreshInterval?: number;
}

// 图表数据类型
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

// 数据表格类型
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableData {
  columns: TableColumn[];
  rows: any[];
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
  };
}
