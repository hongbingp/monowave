'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  Bot, 
  Megaphone, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { PUBLISHER_DATA, AI_APP_DATA, ADVERTISER_DATA } from '@/lib/demo-data';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';

type Role = 'publisher' | 'ai_app' | 'advertiser';

interface RoleConfig {
  id: Role;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const roles: RoleConfig[] = [
  { 
    id: 'publisher', 
    label: 'Publisher', 
    icon: Newspaper, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-500'
  },
  { 
    id: 'ai_app', 
    label: 'AI App', 
    icon: Bot, 
    color: 'text-green-600',
    bgColor: 'bg-green-500'
  },
  { 
    id: 'advertiser', 
    label: 'Advertiser', 
    icon: Megaphone, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-500'
  }
];

const PublisherDashboard: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Earnings</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(PUBLISHER_DATA.todayEarnings)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(PUBLISHER_DATA.monthlyRevenue)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payouts</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(PUBLISHER_DATA.pendingPayouts)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Top Performing Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {PUBLISHER_DATA.topUrls.map((url, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-sm">{url.url}</p>
                <p className="text-xs text-gray-500">{formatNumber(url.views)} views</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">{formatCurrency(url.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

const AIAppDashboard: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Requests Today</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(AI_APP_DATA.apiUsage.todayRequests)}
              </p>
            </div>
            <Zap className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(AI_APP_DATA.balance)} USDC
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {AI_APP_DATA.apiUsage.successRate}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Active Crawling Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center space-x-3">
            <div className="pulse-dot"></div>
            <div>
              <p className="font-medium">{AI_APP_DATA.activeCrawls} Active Crawls</p>
              <p className="text-sm text-gray-600">Processing content from multiple sources</p>
            </div>
          </div>
          <Badge variant="success">Running</Badge>
        </div>
      </CardContent>
    </Card>
  </div>
);

const AdvertiserDashboard: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Impressions</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(ADVERTISER_DATA.campaignPerformance.impressions)}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clicks</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(ADVERTISER_DATA.campaignPerformance.clicks)}
              </p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CTR</p>
              <p className="text-2xl font-bold text-purple-600">
                {ADVERTISER_DATA.campaignPerformance.ctr}%
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ROI</p>
              <p className="text-2xl font-bold text-green-600">
                {ADVERTISER_DATA.campaignPerformance.roi}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Ad Spend</p>
              <p className="text-xl font-bold">{formatCurrency(ADVERTISER_DATA.totalSpend)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Campaigns</p>
              <p className="text-xl font-bold">{ADVERTISER_DATA.activeCampaigns}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <div className="flex items-center space-x-2">
              <p className="text-xl font-bold text-green-600">
                {((ADVERTISER_DATA.campaignPerformance.conversions / ADVERTISER_DATA.campaignPerformance.clicks) * 100).toFixed(1)}%
              </p>
              <Badge variant="success">Excellent</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const RoleSwitcher: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role>('publisher');

  const renderDashboard = () => {
    switch (activeRole) {
      case 'publisher':
        return <PublisherDashboard />;
      case 'ai_app':
        return <AIAppDashboard />;
      case 'advertiser':
        return <AdvertiserDashboard />;
      default:
        return <PublisherDashboard />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Multi-Role Experience
        </h2>
        <p className="text-gray-600 mb-6">
          See how each participant benefits from our platform
        </p>
        
        <div className="flex justify-center space-x-2">
          {roles.map((role) => (
            <Button
              key={role.id}
              variant={activeRole === role.id ? 'default' : 'outline'}
              onClick={() => setActiveRole(role.id)}
              className="flex items-center space-x-2 px-6 py-3"
            >
              <role.icon className="h-4 w-4" />
              <span>{role.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderDashboard()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
