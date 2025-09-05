const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalTransactions: number;
  totalRevenue: number;
  activeUsers: number;
  conversionRate: number;
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: number;
  amount: number;
  type: string;
  timestamp: string;
  from?: string;
  to?: string;
  hash?: string;
  status?: string;
  gasUsed?: number;
  gasPrice?: number;
}

export interface UserProfile {
  id: number;
  email: string;
  userType: 'ai_searcher' | 'publisher' | 'advertiser';
  walletAddress: string;
  balance: number;
  status: string;
  name: string;
  joinedAt?: string;
  lastActive?: string;
}

export interface ContractStatus {
  network: string;
  contracts: {
    [key: string]: string;
  };
  status: string;
  lastUpdated: string;
  deployer: string;
}

export interface AnalyticsSummary {
  daily: {
    transactions: number;
    revenue: number;
    users: number;
  };
  weekly: {
    transactions: number;
    revenue: number;
    users: number;
  };
  monthly: {
    transactions: number;
    revenue: number;
    users: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; message: string; version: string }>> {
    return this.request('/health');
  }

  // Dashboard stats
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/api/v1/stats/dashboard');
  }

  // User profile
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request('/api/v1/users/profile');
  }

  // Contract status
  async getContractStatus(): Promise<ApiResponse<ContractStatus>> {
    return this.request('/api/v1/contracts/status');
  }

  // Transactions
  async getTransactions(page: number = 1, limit: number = 10): Promise<ApiResponse<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }>> {
    return this.request(`/api/v1/transactions?page=${page}&limit=${limit}`);
  }

  // Analytics
  async getAnalyticsSummary(): Promise<ApiResponse<AnalyticsSummary>> {
    return this.request('/api/v1/analytics/summary');
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for custom instances
export default ApiClient;
