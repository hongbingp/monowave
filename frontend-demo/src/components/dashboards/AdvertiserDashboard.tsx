'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Target,
  Eye,
  MousePointer,
  Users,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  CheckCircle,
  Bot,
  Globe
} from 'lucide-react';
import { AdvertiserDashboardData } from '@/types/dashboard';
import { ADVERTISER_DASHBOARD_DATA, DashboardDataGenerator } from '@/lib/dashboard-data';
import { formatCurrency, formatNumber, truncateAddress } from '@/lib/utils';

interface CampaignMetricProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const CampaignMetric: React.FC<CampaignMetricProps> = ({ 
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

const CampaignTable: React.FC<{ campaigns: AdvertiserDashboardData['campaigns'] }> = ({ campaigns }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Budget</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Spent</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Impressions</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Clicks</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">CTR</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">ROI</th>
            <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-xs text-gray-500">ID: {campaign.id}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatCurrency(campaign.budget)}
              </td>
              <td className="py-3 px-4 text-right">
                <div>
                  <p className="font-medium">{formatCurrency(campaign.spent)}</p>
                  <p className="text-xs text-gray-500">
                    {((campaign.spent / campaign.budget) * 100).toFixed(1)}%
                  </p>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatNumber(campaign.impressions)}
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatNumber(campaign.clicks)}
              </td>
              <td className="py-3 px-4 text-right">
                <span className={`font-medium ${
                  campaign.ctr > 2.5 ? 'text-green-600' : 
                  campaign.ctr > 2.0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {campaign.ctr.toFixed(2)}%
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className={`font-bold ${
                  campaign.roi > 200 ? 'text-green-600' : 
                  campaign.roi > 150 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {campaign.roi}%
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <Badge variant={getStatusColor(campaign.status)} className="flex items-center space-x-1">
                  {getStatusIcon(campaign.status)}
                  <span>{campaign.status}</span>
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PublisherPerformanceTable: React.FC<{ publishers: AdvertiserDashboardData['publisherPerformance'] }> = ({ publishers }) => {
  return (
    <div className="space-y-3">
      {publishers.map((publisher) => (
        <div key={publisher.publisherAddress} className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{publisher.publisherName}</p>
                <p className="text-xs text-gray-500">{truncateAddress(publisher.publisherAddress)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">{formatCurrency(publisher.spend)}</p>
              <p className="text-sm text-gray-500">Total Spend</p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2 bg-white rounded">
              <p className="font-bold text-gray-900">{formatNumber(publisher.impressions)}</p>
              <p className="text-gray-600">Impressions</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="font-bold text-gray-900">{formatNumber(publisher.clicks)}</p>
              <p className="text-gray-600">Clicks</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className={`font-bold ${
                publisher.ctr > 2.5 ? 'text-green-600' : 'text-gray-900'
              }`}>
                {publisher.ctr.toFixed(2)}%
              </p>
              <p className="text-gray-600">CTR</p>
            </div>
            <div className="text-center p-2 bg-white rounded">
              <p className="font-bold text-purple-600">{formatCurrency(publisher.cpa)}</p>
              <p className="text-gray-600">CPA</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const AIAppPlacementsTable: React.FC<{ placements: AdvertiserDashboardData['aiAppPlacements'] }> = ({ placements }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-600">AI App</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Impressions</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Clicks</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Spend</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">CTR</th>
            <th className="text-right py-3 px-4 font-medium text-gray-600">Avg Position</th>
          </tr>
        </thead>
        <tbody>
          {placements.map((placement) => (
            <tr key={placement.aiAppAddress} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center space-x-3">
                  <Bot className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">{placement.aiAppName}</p>
                    <p className="text-xs text-gray-500">{truncateAddress(placement.aiAppAddress)}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatNumber(placement.impressions)}
              </td>
              <td className="py-3 px-4 text-right font-medium">
                {formatNumber(placement.clicks)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-blue-600">
                {formatCurrency(placement.spend)}
              </td>
              <td className="py-3 px-4 text-right">
                <span className={`font-medium ${
                  placement.ctr > 2.5 ? 'text-green-600' : 
                  placement.ctr > 2.0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {placement.ctr.toFixed(2)}%
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <Badge variant={
                  placement.avgPosition <= 2 ? 'success' : 
                  placement.avgPosition <= 3 ? 'warning' : 'secondary'
                }>
                  {placement.avgPosition.toFixed(1)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RecentTransactionsTable: React.FC<{ transactions: AdvertiserDashboardData['adTransactions'] }> = ({ transactions }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'impression': return <Eye className="h-4 w-4 text-blue-600" />;
      case 'click': return <MousePointer className="h-4 w-4 text-green-600" />;
      case 'conversion': return <Target className="h-4 w-4 text-purple-600" />;
      default: return null;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'impression': return 'text-blue-600';
      case 'click': return 'text-green-600';
      case 'conversion': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const generateTxHash = () => '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => {
        const txHash = generateTxHash();
        return (
          <div key={transaction.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                {getTransactionIcon(transaction.transactionType)}
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.publisherName} → {transaction.aiAppName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Campaign #{transaction.campaignId} • {transaction.transactionType}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${getTransactionColor(transaction.transactionType)}`}>
                  ${formatCurrency(transaction.amount)} USDC
                </p>
                <p className="text-xs text-gray-500">
                  {transaction.createdAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Block: #{2847590 + Math.floor(Math.random() * 100)}</span>
                <span>Confirmations: {8 + Math.floor(Math.random() * 15)}</span>
                <Badge variant="success" className="text-xs">
                  ✓ Verified
                </Badge>
              </div>
              <button 
                className="text-blue-600 hover:text-blue-800 font-mono text-xs hover:underline"
                onClick={() => window.open(`https://basescan.org/tx/${txHash}`, '_blank')}
                title="View on BaseScan"
              >
                {txHash.slice(0, 6)}...{txHash.slice(-4)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AdvertiserDashboard: React.FC<{ userId: number }> = ({ userId }) => {
  const [data, setData] = useState<AdvertiserDashboardData>(ADVERTISER_DASHBOARD_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      const update = DashboardDataGenerator.generateRealtimeUpdate('advertiser');
      if (update) {
        setData(prev => ({
          ...prev,
          campaignOverview: {
            ...prev.campaignOverview,
            totalSpend: prev.campaignOverview.totalSpend + (update.data.cost || 0),
            totalImpressions: prev.campaignOverview.totalImpressions + (update.data.type === 'impression' ? 1 : 0),
            totalClicks: prev.campaignOverview.totalClicks + (update.data.type === 'click' ? 1 : 0)
          }
        }));
      }
    }, 7000);

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
          {/* <p className="text-mw-slate-600 mt-1">Monitor your advertising campaigns and ROI performance</p> */}
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

      {/* Campaign Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CampaignMetric
          title="Total Spend"
          value={formatCurrency(data.campaignOverview.totalSpend)}
          change="+8.5%"
          trend="up"
          icon={DollarSign}
          color="text-blue-600"
        />
        <CampaignMetric
          title="Total Impressions"
          value={formatNumber(data.campaignOverview.totalImpressions)}
          change="+12.3%"
          trend="up"
          icon={Eye}
          color="text-green-600"
        />
        <CampaignMetric
          title="Total Clicks"
          value={formatNumber(data.campaignOverview.totalClicks)}
          change="+15.7%"
          trend="up"
          icon={MousePointer}
          color="text-purple-600"
        />
        <CampaignMetric
          title="Average ROI"
          value={`${data.campaignOverview.avgROI}%`}
          change="+5.2%"
          trend="up"
          icon={TrendingUp}
          color="text-green-600"
        />
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Performance Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{data.campaignOverview.activeCampaigns}</p>
              <p className="text-sm text-gray-600">Active Campaigns</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{data.campaignOverview.avgCTR.toFixed(2)}%</p>
              <p className="text-sm text-gray-600">Average CTR</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{data.campaignOverview.avgROI}%</p>
              <p className="text-sm text-gray-600">Average ROI</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Campaign Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignTable campaigns={data.campaigns} />
        </CardContent>
      </Card>

      {/* Publisher Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Publisher Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PublisherPerformanceTable publishers={data.publisherPerformance} />
        </CardContent>
      </Card>

      {/* AI App Placements & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>AI App Placements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIAppPlacementsTable placements={data.aiAppPlacements} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Recent Transactions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactionsTable transactions={data.adTransactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
