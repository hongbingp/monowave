'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Eye } from 'lucide-react';
import { LiveTransaction } from '@/types/demo';
import { MOCK_TRANSACTIONS, generateRandomTransaction } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/utils';

export const LiveActivity: React.FC = () => {
  const [activities, setActivities] = useState<LiveTransaction[]>(MOCK_TRANSACTIONS);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTransaction = generateRandomTransaction();
      setActivities(prev => [newTransaction, ...prev.slice(0, 4)]); // 保持最新5条
    }, 4000); // 每4秒添加新交易

    return () => clearInterval(interval);
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'crawl': return '🕷️';
      case 'ad_click': return '🖱️';
      case 'content_access': return '📄';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'crawl': return 'bg-blue-50 border-blue-500';
      case 'ad_click': return 'bg-green-50 border-green-500';
      case 'content_access': return 'bg-purple-50 border-purple-500';
      default: return 'bg-gray-50 border-gray-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <div className="pulse-dot"></div>
            <span>Live Activity</span>
          </div>
          <Badge variant="success" className="ml-auto">
            Real-time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`p-4 rounded-lg border-l-4 ${getTransactionColor(activity.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-xl">
                    {getTransactionIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">
                        {activity.aiApp || activity.advertiser}
                      </span>
                      <span className="text-xs text-gray-500">→</span>
                      <span className="font-medium text-sm">
                        {activity.publisher || 'Platform'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    {formatCurrency(activity.amount)}
                  </div>
                  <Badge 
                    variant={activity.status === 'completed' ? 'success' : 'warning'}
                    className="text-xs mt-1"
                  >
                    {activity.status}
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Waiting for transactions...</p>
          </div>
        )}

        {/* 交易统计 */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {activities.filter(a => a.type === 'crawl').length}
              </div>
              <div className="text-xs text-gray-500">Crawls</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {activities.filter(a => a.type === 'ad_click').length}
              </div>
              <div className="text-xs text-gray-500">Ad Clicks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {activities.filter(a => a.type === 'content_access').length}
              </div>
              <div className="text-xs text-gray-500">Content Access</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
