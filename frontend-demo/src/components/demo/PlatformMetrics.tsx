'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Bot, Activity, TrendingUp } from 'lucide-react';
import { PlatformMetrics as PlatformMetricsType } from '@/types/demo';
import { PLATFORM_METRICS } from '@/lib/demo-data';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'up' 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const targetValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayValue(prev => {
        if (prev < targetValue) {
          const increment = Math.ceil((targetValue - prev) / 10);
          return prev + increment;
        }
        clearInterval(timer);
        return targetValue;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [targetValue]);

  const formatDisplayValue = (val: number) => {
    if (title.includes('Revenue')) return formatCurrency(val);
    return formatNumber(val);
  };

  return (
    <Card className="metric-card hover:scale-105 transition-transform duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold count-up">
          {formatDisplayValue(displayValue)}
        </div>
        {change && (
          <div className="flex items-center space-x-1 mt-1">
            <TrendingUp className={`h-3 w-3 ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`} />
            <Badge 
              variant={trend === 'up' ? 'success' : trend === 'down' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {change}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PlatformMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetricsType>(PLATFORM_METRICS);

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalRevenue: prev.totalRevenue + Math.random() * 5,
        dailyTransactions: prev.dailyTransactions + Math.floor(Math.random() * 3)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue),
      change: formatPercentage(metrics.monthlyGrowth),
      icon: DollarSign,
      trend: 'up' as const
    },
    {
      title: 'Active Publishers',
      value: formatNumber(metrics.activePublishers),
      change: '+12%',
      icon: Users,
      trend: 'up' as const
    },
    {
      title: 'AI Apps',
      value: formatNumber(metrics.activeAIApps),
      change: '+5%',
      icon: Bot,
      trend: 'up' as const
    },
    {
      title: 'Daily Transactions',
      value: formatNumber(metrics.dailyTransactions),
      change: '+18%',
      icon: Activity,
      trend: 'up' as const
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Platform Overview
        </h2>
        <p className="text-gray-600">
          Real-time metrics showing the growth of our AI content ecosystem
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <MetricCard
            key={metric.title}
            {...metric}
          />
        ))}
      </div>

      {/* 增长指标说明 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              🚀 Platform Growth
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Month-over-month growth across all key metrics
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage(metrics.monthlyGrowth)}
            </div>
            <div className="text-sm text-gray-600">
              Average Growth
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
