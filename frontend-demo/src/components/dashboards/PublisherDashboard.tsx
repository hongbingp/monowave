'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Eye,
  Globe,
  Bot,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';
import { PublisherDashboardData } from '@/types/dashboard';
import { PUBLISHER_DASHBOARD_DATA, DashboardDataGenerator } from '@/lib/dashboard-data';
import { formatCurrency, formatNumber, truncateAddress } from '@/lib/utils';

interface RevenueCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const RevenueCard: React.FC<RevenueCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  color = 'text-green-600'
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

const PopularPagesTable: React.FC<{ pages: PublisherDashboardData['websiteStats']['popularPages'] }> = ({ pages }) => {
  return (
    <div className="space-y-3">
      {pages.map((page, index) => (
        <div key={page.url} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <p className="font-medium text-gray-900 truncate max-w-md">{page.url}</p>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatNumber(page.crawlCount)} crawls • Last access: {page.lastAccess.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-green-600">{formatCurrency(page.revenue)}</p>
            <p className="text-sm text-gray-500">
              {formatCurrency(page.revenue / page.crawlCount)}/crawl
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const AIAppAccessTable: React.FC<{ aiApps: PublisherDashboardData['aiAppAccess'] }> = ({ aiApps }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-600">AI App</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Crawls</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Revenue</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Avg/Crawl</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Last Access</th>
          </tr>
        </thead>
        <tbody>
          {aiApps.map((app) => (
            <tr key={app.aiAppAddress} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center space-x-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{app.aiAppName}</p>
                    <p className="text-xs text-gray-500">{truncateAddress(app.aiAppAddress)}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatNumber(app.crawlCount)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-green-600">
                {formatCurrency(app.totalRevenue)}
              </td>
              <td className="py-3 px-4 text-right text-gray-600">
                {formatCurrency(app.avgRevenuePerCrawl)}
              </td>
              <td className="py-3 px-4 text-right text-gray-500">
                {app.lastAccess.toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdRevenueTable: React.FC<{ adRevenue: PublisherDashboardData['adRevenue'] }> = ({ adRevenue }) => {
  return (
    <div className="space-y-3">
      {adRevenue.map((ad) => (
        <div key={ad.campaignId} className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Campaign #{ad.campaignId}</Badge>
                <h4 className="font-medium text-gray-900">{ad.advertiserName}</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">{formatNumber(ad.impressions)}</span> impressions
                </div>
                <div>
                  <span className="font-medium">{formatNumber(ad.clicks)}</span> clicks
                </div>
                <div>
                  CPM: <span className="font-medium">{formatCurrency(ad.cpm)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-purple-600">{formatCurrency(ad.revenue)}</p>
              <p className="text-sm text-gray-500">{ad.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const RevenueDistributionTable: React.FC<{ distributions: PublisherDashboardData['revenueDistributions'] }> = ({ distributions }) => {
  return (
    <div className="space-y-3">
      {distributions.map((dist) => (
        <div key={dist.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                {dist.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : dist.status === 'pending' ? (
                  <Clock className="h-5 w-5 text-yellow-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <Badge variant={
                  dist.status === 'completed' ? 'success' : 
                  dist.status === 'pending' ? 'warning' : 'destructive'
                }>
                  {dist.status}
                </Badge>
                <span className="text-sm text-gray-600">{dist.distributionType.replace('_', ' ')}</span>
              </div>
              <div className="mt-2 space-y-1">
                {dist.txHash && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Tx Hash:</span>
                    <button 
                      className="text-blue-600 hover:text-blue-800 font-mono text-xs hover:underline"
                      onClick={() => window.open(`https://basescan.org/tx/${dist.txHash}`, '_blank')}
                      title="View on BaseScan"
                    >
                      {truncateAddress(dist.txHash)}
                    </button>
                  </div>
                )}
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Block: #{2847595 + Math.floor(Math.random() * 100)}</span>
                  <span>Confirmations: {12 + Math.floor(Math.random() * 10)}</span>
                  {dist.status === 'completed' && (
                    <Badge variant="success" className="text-xs">
                      🔒 Immutable
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">${formatCurrency(dist.amount)} USDC</p>
              <p className="text-sm text-gray-500">{dist.createdAt.toLocaleString()}</p>
              {dist.status === 'completed' && (
                <Badge variant="outline" className="text-xs mt-1">
                  Smart Contract
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const PublisherDashboard: React.FC<{ userId: number }> = ({ userId }) => {
  const [data, setData] = useState<PublisherDashboardData>(PUBLISHER_DASHBOARD_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      const update = DashboardDataGenerator.generateRealtimeUpdate('publisher');
      if (update) {
        setData(prev => ({
          ...prev,
          revenueOverview: {
            ...prev.revenueOverview,
            todayRevenue: prev.revenueOverview.todayRevenue + (update.data.amount || 0)
          },
          websiteStats: {
            ...prev.websiteStats,
            totalCrawls: prev.websiteStats.totalCrawls + 1
          }
        }));
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-mw-ink-950">Dashboard</h1>
          {/* <p className="text-mw-slate-600 mt-1">Monitor your content monetization and AI app access</p> */}
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

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <RevenueCard
          title="Today's Revenue"
          value={formatCurrency(data.revenueOverview.todayRevenue)}
          change="+15.3%"
          trend="up"
          icon={DollarSign}
          color="text-green-600"
        />
        <RevenueCard
          title="Monthly Revenue"
          value={formatCurrency(data.revenueOverview.monthlyRevenue)}
          change="+12.8%"
          trend="up"
          icon={TrendingUp}
          color="text-blue-600"
        />
        <RevenueCard
          title="Total Revenue"
          value={formatCurrency(data.revenueOverview.totalRevenue)}
          icon={DollarSign}
          color="text-purple-600"
        />
        <RevenueCard
          title="Pending Revenue"
          value={formatCurrency(data.revenueOverview.pendingRevenue)}
          icon={Clock}
          color="text-orange-600"
        />
      </div>

      {/* Website Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Website Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{formatNumber(data.websiteStats.totalCrawls)}</p>
              <p className="text-sm text-gray-600">Total Crawls</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{data.websiteStats.uniqueAIApps}</p>
              <p className="text-sm text-gray-600">Unique AI Apps</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.websiteStats.avgRevenuePerCrawl)}</p>
              <p className="text-sm text-gray-600">Avg Revenue/Crawl</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popular Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Top Performing Content</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PopularPagesTable pages={data.websiteStats.popularPages} />
        </CardContent>
      </Card>

      {/* AI Apps Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI Apps Accessing Your Content</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AIAppAccessTable aiApps={data.aiAppAccess} />
        </CardContent>
      </Card>

      {/* Ad Revenue & Revenue Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Ad Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdRevenueTable adRevenue={data.adRevenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Revenue Distributions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueDistributionTable distributions={data.revenueDistributions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
