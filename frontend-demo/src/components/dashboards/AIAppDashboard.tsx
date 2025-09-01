'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Globe,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { AIAppDashboardData } from '@/types/dashboard';
import { AI_APP_DASHBOARD_DATA, DashboardDataGenerator } from '@/lib/dashboard-data';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  color = 'text-blue-600'
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`} />
                <span className={`text-xs ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
};

const UsageProgressBar: React.FC<{ 
  current: number; 
  limit: number; 
  label: string;
  type: 'daily' | 'monthly';
}> = ({ current, limit, label, type }) => {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage > 80;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={isNearLimit ? 'text-red-600' : 'text-gray-600'}>
          {formatNumber(current)} / {formatNumber(limit)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isNearLimit ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isNearLimit && (
        <div className="flex items-center text-xs text-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <span>Approaching {type} limit</span>
        </div>
      )}
    </div>
  );
};

const WebsiteCrawlTable: React.FC<{ crawls: AIAppDashboardData['websiteCrawls'] }> = ({ crawls }) => {
  return (
    <div className="space-y-4">
      {crawls.map((crawl, index) => (
        <div key={crawl.url} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{crawl.url}</p>
              <p className="text-sm text-gray-500">
                {formatNumber(crawl.requests)} requests • {crawl.successRate}% success
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">{formatCurrency(crawl.totalCost)}</p>
            <p className="text-sm text-gray-500">
              {formatCurrency(crawl.avgCost)}/req
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const RecentCrawlsTable: React.FC<{ crawls: AIAppDashboardData['recentCrawls'] }> = ({ crawls }) => {
  const generateTxHash = () => '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-600">URL</th>
            <th className="text-left py-3 px-4 font-medium text-gray-600">Format</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Size</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Cost</th>
            <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
            <th className="text-center py-3 px-4 font-medium text-gray-600">Blockchain</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Time</th>
          </tr>
        </thead>
        <tbody>
          {crawls.map((crawl) => {
            const txHash = generateTxHash();
            return (
              <tr key={crawl.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="max-w-xs truncate font-medium">
                    {crawl.url}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="secondary" className="text-xs">
                    {crawl.format}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  {crawl.bytesProcessed > 0 ? `${(crawl.bytesProcessed / 1024).toFixed(1)}KB` : '-'}
                </td>
                <td className="py-3 px-4 text-right font-medium">
                  ${formatCurrency(crawl.cost)} USDC
                </td>
                <td className="py-3 px-4 text-center">
                  {crawl.status === 'success' ? (
                    <div className="flex items-center justify-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge variant="success" className="text-xs">Confirmed</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-1">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <Badge variant="destructive" className="text-xs">Failed</Badge>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {crawl.status === 'success' && (
                    <button 
                      className="text-blue-600 hover:text-blue-800 font-mono text-xs hover:underline"
                      onClick={() => window.open(`https://basescan.org/tx/${txHash}`, '_blank')}
                      title="View on BaseScan"
                    >
                      {txHash.slice(0, 6)}...{txHash.slice(-4)}
                    </button>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-gray-500">
                  {crawl.createdAt.toLocaleTimeString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const AIAppDashboard: React.FC<{ userId: number }> = ({ userId }) => {
  const [data, setData] = useState<AIAppDashboardData>(AI_APP_DASHBOARD_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      const update = DashboardDataGenerator.generateRealtimeUpdate('ai_searcher');
      if (update) {
        setData(prev => ({
          ...prev,
          crawlCosts: {
            ...prev.crawlCosts,
            todayCost: prev.crawlCosts.todayCost + (update.data.cost || 0)
          },
          apiUsage: {
            ...prev.apiUsage,
            todayRequests: prev.apiUsage.todayRequests + 1
          }
        }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-mw-ink-950">Dashboard</h1>
          {/* <p className="text-mw-slate-600 mt-1">Monitor your crawling costs and API usage</p> */}
        </div>
        <Button 
          onClick={refreshData} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="border-mw-mist-400 text-mw-slate-600 hover:bg-mw-mist-100"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Balance"
          value={formatCurrency(data.accountInfo.balance)}
          icon={DollarSign}
          color="text-green-600"
        />
        <MetricCard
          title="Total Spent"
          value={formatCurrency(data.accountInfo.totalSpent)}
          change="+12.5%"
          trend="up"
          icon={TrendingUp}
          color="text-blue-600"
        />
        <MetricCard
          title="Today's Requests"
          value={formatNumber(data.apiUsage.todayRequests)}
          change="+8.2%"
          trend="up"
          icon={Activity}
          color="text-purple-600"
        />
        <MetricCard
          title="Success Rate"
          value={`${data.apiUsage.successRate}%`}
          change="+0.3%"
          trend="up"
          icon={CheckCircle}
          color="text-green-600"
        />
      </div>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>API Usage Limits</span>
            <Badge variant="secondary">{data.accountInfo.planName}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageProgressBar
            current={data.apiUsage.todayRequests}
            limit={data.apiUsage.dailyLimit}
            label="Daily Requests"
            type="daily"
          />
          <UsageProgressBar
            current={data.apiUsage.monthlyRequests}
            limit={data.apiUsage.monthlyLimit}
            label="Monthly Requests"
            type="monthly"
          />
        </CardContent>
      </Card>

      {/* Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Cost Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Today's Cost</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.crawlCosts.todayCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Monthly Cost</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(data.crawlCosts.monthlyCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cost Per Request</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(data.crawlCosts.costPerRequest)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="text-lg font-semibold text-gray-900">
                  {data.apiUsage.avgResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate</span>
                <span className="text-lg font-semibold text-green-600">
                  {data.apiUsage.successRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API Key Status</span>
                <Badge variant="success">
                  {data.accountInfo.apiKeyStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Website Crawl Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Website Crawl Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WebsiteCrawlTable crawls={data.websiteCrawls} />
        </CardContent>
      </Card>

      {/* Recent Crawl Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Crawl Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentCrawlsTable crawls={data.recentCrawls} />
        </CardContent>
      </Card>
    </div>
  );
};
