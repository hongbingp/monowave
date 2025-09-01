import { PlatformMetrics, LiveTransaction } from '@/types/demo';
import { PLATFORM_METRICS, generateRandomTransaction, updatePlatformMetrics } from './demo-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API客户端类
export class DemoAPI {
  private baseUrl: string;
  private mockMode: boolean;

  constructor(baseUrl: string = API_BASE_URL, mockMode: boolean = true) {
    this.baseUrl = baseUrl;
    this.mockMode = mockMode;
  }

  // 获取平台统计数据
  async getPlatformStats(): Promise<PlatformMetrics> {
    if (this.mockMode) {
      // 使用模拟数据
      return PLATFORM_METRICS;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stats/platform`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // 转换后端数据格式到前端格式
      return {
        totalRevenue: data.data?.blockchain?.revenue?.totalRevenue || 0,
        activePublishers: data.data?.database?.publishers || 0,
        activeAIApps: data.data?.database?.ai_searchers || 0,
        activeAdvertisers: data.data?.database?.advertisers || 0,
        dailyTransactions: data.data?.database?.transactions || 0,
        monthlyGrowth: 23.5 // 模拟增长率
      };
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      // 降级到模拟数据
      return PLATFORM_METRICS;
    }
  }

  // 获取用户统计数据
  async getUserStats(userId: string): Promise<any> {
    if (this.mockMode) {
      return {
        apiUsage: { requests: 2456, successRate: 98.5 },
        balance: 89.23,
        revenue: 156.78
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stats/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      return null;
    }
  }

  // 获取收益报告
  async getRevenueReport(params: {
    startDate?: string;
    endDate?: string;
    entityType?: string;
  }): Promise<any> {
    if (this.mockMode) {
      return {
        totalRevenue: 3245.90,
        pendingRevenue: 1234.56,
        transactions: []
      };
    }

    try {
      const queryParams = new URLSearchParams(params as Record<string, string>);
      const response = await fetch(`${this.baseUrl}/api/v1/stats/revenue?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch revenue report:', error);
      return null;
    }
  }

  // 获取广告交易报告
  async getAdTransactionReport(params: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
  }): Promise<any> {
    if (this.mockMode) {
      return {
        summary: {
          impressions: 45678,
          clicks: 1234,
          conversions: 156,
          totalAmount: 567.89
        },
        transactions: []
      };
    }

    try {
      const queryParams = new URLSearchParams(params as Record<string, string>);
      const response = await fetch(`${this.baseUrl}/api/v1/stats/ad-transactions?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch ad transaction report:', error);
      return null;
    }
  }

  // 获取批处理统计
  async getBatchProcessingStats(): Promise<any> {
    if (this.mockMode) {
      return {
        pendingBatches: 5,
        processedToday: 142,
        successRate: 99.2
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stats/batches`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch batch stats:', error);
      return null;
    }
  }
}

// 实时数据模拟器
export class LiveDataSimulator {
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: Array<(data: LiveTransaction) => void> = [];

  startSimulation(callback: (data: LiveTransaction) => void): void {
    this.callbacks.push(callback);
    
    if (this.intervalId) return; // 已经在运行

    this.intervalId = setInterval(() => {
      const newTransaction = generateRandomTransaction();
      this.callbacks.forEach(cb => cb(newTransaction));
    }, 3000); // 每3秒生成一个新交易
  }

  stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.callbacks = [];
  }

  addCallback(callback: (data: LiveTransaction) => void): void {
    this.callbacks.push(callback);
  }

  removeCallback(callback: (data: LiveTransaction) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }
}

// 默认API实例
export const demoAPI = new DemoAPI();
export const liveSimulator = new LiveDataSimulator();

// Hooks for React components
export const useAPI = () => {
  return {
    getPlatformStats: () => demoAPI.getPlatformStats(),
    getUserStats: (userId: string) => demoAPI.getUserStats(userId),
    getRevenueReport: (params: any) => demoAPI.getRevenueReport(params),
    getAdTransactionReport: (params: any) => demoAPI.getAdTransactionReport(params),
    getBatchProcessingStats: () => demoAPI.getBatchProcessingStats()
  };
};
