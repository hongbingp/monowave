// Dashboard API 服务 - 集成真实后端数据

import { 
  AIAppDashboardData, 
  PublisherDashboardData, 
  AdvertiserDashboardData,
  User 
} from '@/types/dashboard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class DashboardAPI {
  private baseUrl: string;
  private mockMode: boolean;

  constructor(baseUrl: string = API_BASE_URL, mockMode: boolean = true) {
    this.baseUrl = baseUrl;
    this.mockMode = mockMode;
  }

  // 通用请求方法
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (this.mockMode) {
      // 在mock模式下返回模拟数据
      return this.getMockData(endpoint);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NEXT_PUBLIC_DEMO_API_KEY || '',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      // 降级到mock数据
      return this.getMockData(endpoint);
    }
  }

  // Mock数据处理
  private getMockData(endpoint: string): any {
    // 根据endpoint返回相应的mock数据
    // 这里可以导入之前定义的mock数据
    return {};
  }

  // AI Apps Dashboard 数据
  async getAIAppDashboardData(userId: number): Promise<AIAppDashboardData> {
    const [
      accountInfo,
      apiUsage,
      crawlCosts,
      websiteCrawls,
      recentCrawls
    ] = await Promise.all([
      this.request<any>(`/api/v1/ai-searchers/${userId}/account`),
      this.request<any>(`/api/v1/ai-searchers/${userId}/usage`),
      this.request<any>(`/api/v1/ai-searchers/${userId}/costs`),
      this.request<any>(`/api/v1/ai-searchers/${userId}/website-crawls`),
      this.request<any>(`/api/v1/ai-searchers/${userId}/recent-crawls`)
    ]);

    return {
      accountInfo: this.transformAccountInfo(accountInfo),
      apiUsage: this.transformAPIUsage(apiUsage),
      crawlCosts: this.transformCrawlCosts(crawlCosts),
      websiteCrawls: this.transformWebsiteCrawls(websiteCrawls),
      recentCrawls: this.transformRecentCrawls(recentCrawls)
    };
  }

  // Publisher Dashboard 数据
  async getPublisherDashboardData(userId: number): Promise<PublisherDashboardData> {
    const [
      revenueOverview,
      websiteStats,
      aiAppAccess,
      adRevenue,
      revenueDistributions
    ] = await Promise.all([
      this.request<any>(`/api/v1/publishers/${userId}/revenue`),
      this.request<any>(`/api/v1/publishers/${userId}/website-stats`),
      this.request<any>(`/api/v1/publishers/${userId}/ai-app-access`),
      this.request<any>(`/api/v1/publishers/${userId}/ad-revenue`),
      this.request<any>(`/api/v1/publishers/${userId}/distributions`)
    ]);

    return {
      revenueOverview: this.transformRevenueOverview(revenueOverview),
      websiteStats: this.transformWebsiteStats(websiteStats),
      aiAppAccess: this.transformAIAppAccess(aiAppAccess),
      adRevenue: this.transformAdRevenue(adRevenue),
      revenueDistributions: this.transformRevenueDistributions(revenueDistributions)
    };
  }

  // Advertiser Dashboard 数据
  async getAdvertiserDashboardData(userId: number): Promise<AdvertiserDashboardData> {
    const [
      campaignOverview,
      campaigns,
      publisherPerformance,
      aiAppPlacements,
      adTransactions
    ] = await Promise.all([
      this.request<any>(`/api/v1/advertisers/${userId}/overview`),
      this.request<any>(`/api/v1/advertisers/${userId}/campaigns`),
      this.request<any>(`/api/v1/advertisers/${userId}/publisher-performance`),
      this.request<any>(`/api/v1/advertisers/${userId}/ai-app-placements`),
      this.request<any>(`/api/v1/advertisers/${userId}/transactions`)
    ]);

    return {
      campaignOverview: this.transformCampaignOverview(campaignOverview),
      campaigns: this.transformCampaigns(campaigns),
      publisherPerformance: this.transformPublisherPerformance(publisherPerformance),
      aiAppPlacements: this.transformAIAppPlacements(aiAppPlacements),
      adTransactions: this.transformAdTransactions(adTransactions)
    };
  }

  // 数据转换方法 - 将后端数据格式转换为前端格式

  private transformAccountInfo(data: any): AIAppDashboardData['accountInfo'] {
    return {
      balance: data?.balance || 0,
      totalSpent: data?.total_spent || 0,
      planName: data?.plan_name || 'Basic',
      apiKeyStatus: data?.api_key_status || 'active'
    };
  }

  private transformAPIUsage(data: any): AIAppDashboardData['apiUsage'] {
    return {
      todayRequests: data?.today_requests || 0,
      monthlyRequests: data?.monthly_requests || 0,
      dailyLimit: data?.daily_limit || 10000,
      monthlyLimit: data?.monthly_limit || 300000,
      successRate: data?.success_rate || 0,
      avgResponseTime: data?.avg_response_time || 0
    };
  }

  private transformCrawlCosts(data: any): AIAppDashboardData['crawlCosts'] {
    return {
      todayCost: data?.today_cost || 0,
      monthlyCost: data?.monthly_cost || 0,
      costPerRequest: data?.cost_per_request || 0,
      costTrend: data?.cost_trend?.map((item: any) => ({
        date: item.date,
        cost: item.cost,
        requests: item.requests
      })) || []
    };
  }

  private transformWebsiteCrawls(data: any): AIAppDashboardData['websiteCrawls'] {
    return data?.map((item: any) => ({
      url: item.url,
      requests: item.requests,
      totalCost: item.total_cost,
      avgCost: item.avg_cost,
      successRate: item.success_rate,
      lastCrawl: new Date(item.last_crawl)
    })) || [];
  }

  private transformRecentCrawls(data: any): AIAppDashboardData['recentCrawls'] {
    return data?.map((item: any) => ({
      id: item.id,
      url: item.url,
      format: item.format,
      bytesProcessed: item.bytes_processed,
      cost: item.cost,
      status: item.status,
      createdAt: new Date(item.created_at)
    })) || [];
  }

  private transformRevenueOverview(data: any): PublisherDashboardData['revenueOverview'] {
    return {
      todayRevenue: data?.today_revenue || 0,
      monthlyRevenue: data?.monthly_revenue || 0,
      totalRevenue: data?.total_revenue || 0,
      pendingRevenue: data?.pending_revenue || 0
    };
  }

  private transformWebsiteStats(data: any): PublisherDashboardData['websiteStats'] {
    return {
      totalCrawls: data?.total_crawls || 0,
      uniqueAIApps: data?.unique_ai_apps || 0,
      avgRevenuePerCrawl: data?.avg_revenue_per_crawl || 0,
      popularPages: data?.popular_pages?.map((item: any) => ({
        url: item.url,
        crawlCount: item.crawl_count,
        revenue: item.revenue,
        lastAccess: new Date(item.last_access)
      })) || []
    };
  }

  private transformAIAppAccess(data: any): PublisherDashboardData['aiAppAccess'] {
    return data?.map((item: any) => ({
      aiAppName: item.ai_app_name,
      aiAppAddress: item.ai_app_address,
      crawlCount: item.crawl_count,
      totalRevenue: item.total_revenue,
      avgRevenuePerCrawl: item.avg_revenue_per_crawl,
      lastAccess: new Date(item.last_access)
    })) || [];
  }

  private transformAdRevenue(data: any): PublisherDashboardData['adRevenue'] {
    return data?.map((item: any) => ({
      campaignId: item.campaign_id,
      advertiserName: item.advertiser_name,
      impressions: item.impressions,
      clicks: item.clicks,
      revenue: item.revenue,
      cpm: item.cpm,
      createdAt: new Date(item.created_at)
    })) || [];
  }

  private transformRevenueDistributions(data: any): PublisherDashboardData['revenueDistributions'] {
    return data?.map((item: any) => ({
      id: item.id,
      amount: item.amount,
      distributionType: item.distribution_type,
      txHash: item.tx_hash,
      status: item.status,
      createdAt: new Date(item.created_at)
    })) || [];
  }

  private transformCampaignOverview(data: any): AdvertiserDashboardData['campaignOverview'] {
    return {
      activeCampaigns: data?.active_campaigns || 0,
      totalSpend: data?.total_spend || 0,
      totalImpressions: data?.total_impressions || 0,
      totalClicks: data?.total_clicks || 0,
      avgCTR: data?.avg_ctr || 0,
      avgROI: data?.avg_roi || 0
    };
  }

  private transformCampaigns(data: any): AdvertiserDashboardData['campaigns'] {
    return data?.map((item: any) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      budget: item.budget,
      spent: item.spent,
      impressions: item.impressions,
      clicks: item.clicks,
      conversions: item.conversions,
      ctr: item.ctr,
      roi: item.roi,
      createdAt: new Date(item.created_at)
    })) || [];
  }

  private transformPublisherPerformance(data: any): AdvertiserDashboardData['publisherPerformance'] {
    return data?.map((item: any) => ({
      publisherName: item.publisher_name,
      publisherAddress: item.publisher_address,
      impressions: item.impressions,
      clicks: item.clicks,
      conversions: item.conversions,
      spend: item.spend,
      ctr: item.ctr,
      cpa: item.cpa
    })) || [];
  }

  private transformAIAppPlacements(data: any): AdvertiserDashboardData['aiAppPlacements'] {
    return data?.map((item: any) => ({
      aiAppName: item.ai_app_name,
      aiAppAddress: item.ai_app_address,
      impressions: item.impressions,
      clicks: item.clicks,
      spend: item.spend,
      ctr: item.ctr,
      avgPosition: item.avg_position
    })) || [];
  }

  private transformAdTransactions(data: any): AdvertiserDashboardData['adTransactions'] {
    return data?.map((item: any) => ({
      id: item.id,
      campaignId: item.campaign_id,
      publisherName: item.publisher_name,
      aiAppName: item.ai_app_name,
      transactionType: item.transaction_type,
      amount: item.amount,
      createdAt: new Date(item.created_at)
    })) || [];
  }

  // 实时数据订阅
  subscribeToRealtimeUpdates(userId: number, userType: string, callback: (data: any) => void) {
    if (this.mockMode) {
      // Mock模式下的模拟实时更新
      const interval = setInterval(() => {
        const mockUpdate = this.generateMockRealtimeUpdate(userType);
        callback(mockUpdate);
      }, 5000);
      
      return () => clearInterval(interval);
    }

    // 真实WebSocket连接
    const wsUrl = `${this.baseUrl.replace('http', 'ws')}/ws/${userType}/${userId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => ws.close();
  }

  private generateMockRealtimeUpdate(userType: string) {
    const timestamp = new Date();
    
    switch (userType) {
      case 'ai_searcher':
        return {
          type: 'crawl_completed',
          data: {
            url: 'example.com/article-' + Math.floor(Math.random() * 1000),
            cost: Math.random() * 0.002 + 0.0005, // 0.0005 - 0.0025范围
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
}

// 默认API实例
export const dashboardAPI = new DashboardAPI(
  API_BASE_URL,
  process.env.NEXT_PUBLIC_MOCK_MODE === 'true'
);

// React Hooks
export const useDashboardAPI = () => {
  return {
    getAIAppData: (userId: number) => dashboardAPI.getAIAppDashboardData(userId),
    getPublisherData: (userId: number) => dashboardAPI.getPublisherDashboardData(userId),
    getAdvertiserData: (userId: number) => dashboardAPI.getAdvertiserDashboardData(userId),
    subscribeToUpdates: (userId: number, userType: string, callback: (data: any) => void) => 
      dashboardAPI.subscribeToRealtimeUpdates(userId, userType, callback)
  };
};
