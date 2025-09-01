'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Bot,
  Newspaper,
  Megaphone,
  Wallet,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react';
import { DEMO_USERS } from '@/lib/dashboard-data';
import { truncateAddress } from '@/lib/utils';

type UserRole = 'ai_searcher' | 'publisher' | 'advertiser';

interface LoginPageProps {
  onLogin: (role: UserRole) => void;
}

const roleConfig = {
  ai_searcher: {
    label: 'AI App Developer',
    icon: Bot,
    color: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-500',
    hoverColor: 'hover:bg-green-50',
    description: 'Monitor crawling costs and API usage efficiency',
    features: ['API Usage Tracking', 'Cost Analysis', 'Website Access Logs', 'Performance Metrics']
  },
  publisher: {
    label: 'Content Publisher',
    icon: Newspaper,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500',
    hoverColor: 'hover:bg-blue-50',
    description: 'Track content monetization and AI access',
    features: ['Revenue Analytics', 'Content Performance', 'AI App Access', 'Payment History']
  },
  advertiser: {
    label: 'Advertiser',
    icon: Megaphone,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-500',
    hoverColor: 'hover:bg-purple-50',
    description: 'Manage campaigns and analyze ROI performance',
    features: ['Campaign Management', 'ROI Analysis', 'Publisher Performance', 'Audience Insights']
  }
};

const RoleCard: React.FC<{ 
  role: UserRole; 
  onLogin: (role: UserRole) => void;
  isDemo?: boolean;
}> = ({ role, onLogin, isDemo = true }) => {
  const config = roleConfig[role];
  const user = DEMO_USERS[role === 'ai_searcher' ? 'aiSearcher' : role === 'publisher' ? 'publisher' : 'advertiser'];
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`${config.hoverColor} transition-all duration-200 cursor-pointer border-2 ${config.borderColor} hover:shadow-lg`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 ${config.color} rounded-full flex items-center justify-center`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className={`text-lg ${config.textColor}`}>
                  {config.label}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {config.description}
                </p>
              </div>
            </div>

          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Account Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Account</span>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Wallet className="h-3 w-3" />
                <span>{truncateAddress(user.walletAddress)}</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>{user.email}</p>
              <p className="font-semibold text-green-600 mt-1">
                Balance: ${user.balance.toFixed(2)} USDC
              </p>
            </div>
          </div>
          
          {/* Features List */}
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium text-gray-700">Dashboard Features:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {config.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className={`w-1 h-1 ${config.color} rounded-full`}></div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Login Button */}
          <Button 
            onClick={() => onLogin(role)}
            className={`w-full ${config.color} hover:opacity-90 transition-opacity`}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Access Dashboard
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [showCredentials, setShowCredentials] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-mw-sand via-mw-mist-100 to-white flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src="/logo.png" 
              alt="Monowave Logo" 
              className="w-16 h-16 object-contain"
            />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-mw-ink-950">Monowave</h1>
              <p className="text-mw-slate-600">AI Content Platform</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Choose Your Role
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Access your personalized dashboard to monitor transactions, analyze performance, 
            and manage your business on the monowave platform.
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8"
        >
          <RoleCard role="ai_searcher" onLogin={onLogin} />
          <RoleCard role="publisher" onLogin={onLogin} />
          <RoleCard role="advertiser" onLogin={onLogin} />
        </motion.div>


      </div>
    </div>
  );
};
