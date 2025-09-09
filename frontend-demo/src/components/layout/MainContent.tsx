'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AIAppDashboard } from '@/components/dashboards/AIAppDashboard';
import { PublisherDashboard } from '@/components/dashboards/PublisherDashboard';
import { AdvertiserDashboard } from '@/components/dashboards/AdvertiserDashboard';
import { WalletView } from '@/components/wallet/WalletView';

export type UserRole = 'ai_searcher' | 'publisher' | 'advertiser';

interface User {
  id: number;
  email: string;
  userType: UserRole;
  walletAddress: string;
  balance: number;
  status: string;
  name: string;
}

interface MainContentProps {
  user: User;
  activeView: string;
}

export function MainContent({ user, activeView }: MainContentProps) {
  const renderContent = () => {
    // 如果是dashboard视图，显示角色特定的仪表板
    if (activeView === 'dashboard') {
      switch (user.userType) {
        case 'ai_searcher':
          return <AIAppDashboard userId={user.id} />;
        case 'publisher':
          return <PublisherDashboard userId={user.id} />;
        case 'advertiser':
          return <AdvertiserDashboard userId={user.id} />;
        default:
          return <div>Unknown user type</div>;
      }
    }

    // 如果是wallet视图，显示Wallet管理页面
    if (activeView === 'wallet') {
      return <WalletView user={user} />;
    }

    // 其他视图的占位符内容
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-8"
      >
        <div className="bg-white rounded-xl border border-mw-mist-400 p-8 text-center">
          <div className="w-16 h-16 bg-mw-mist-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">🚧</span>
          </div>
          <h2 className="text-xl font-semibold text-mw-ink-950 mb-2">
            {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View
          </h2>
          <p className="text-mw-slate-600">
            This feature is coming soon. Currently showing the {activeView} section for {user.userType} role.
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-mw-sand to-mw-mist-100 overflow-auto">
      {renderContent()}
    </div>
  );
}
