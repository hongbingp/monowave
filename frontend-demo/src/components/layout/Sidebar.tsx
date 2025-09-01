'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  CreditCard, 
  Settings, 
  LogOut,
  Home,
  Target,
  Zap,
  FileText,
  DollarSign,
  Users,
  Globe,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface SidebarProps {
  user: User;
  onLogout: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

// 不同角色的导航菜单配置
const ROLE_NAVIGATION = {
  ai_searcher: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'crawling', label: 'Crawling', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  publisher: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai-apps', label: 'AI Apps', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  advertiser: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'publishers', label: 'Publishers', icon: Globe },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]
};

const ROLE_COLORS = {
  ai_searcher: 'bg-mw-bronze',
  publisher: 'bg-mw-patina', 
  advertiser: 'bg-mw-bronze-hi'
};

const ROLE_LABELS = {
  ai_searcher: 'AI Developer',
  publisher: 'Publisher',
  advertiser: 'Advertiser'
};

export function Sidebar({ user, onLogout, activeView, onViewChange }: SidebarProps) {
  const navigation = ROLE_NAVIGATION[user.userType];
  const roleColor = ROLE_COLORS[user.userType];
  const roleLabel = ROLE_LABELS[user.userType];

  return (
    <div className="w-64 bg-white border-r border-mw-mist-400 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-mw-mist-400">
        <img 
          src="/logo.png" 
          alt="monowave Logo" 
          className="h-8 object-contain"
        />
      </div>

      {/* User Profile */}
      <div className="p-6 border-b border-mw-mist-400">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${roleColor} rounded-full flex items-center justify-center`}>
            <span className="text-white font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-mw-ink-950 truncate">{user.name}</p>
            <p className="text-xs text-mw-slate-600">{roleLabel}</p>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-mw-slate-600">
          <p>Balance: ${user.balance.toFixed(3)} USDC</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${isActive 
                  ? 'bg-mw-teal text-white' 
                  : 'text-mw-slate-600 hover:bg-mw-mist-100 hover:text-mw-ink-950'
                }
              `}
              whileHover={{ scale: isActive ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-mw-mist-400">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full flex items-center space-x-3 text-mw-slate-600 hover:text-mw-danger hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
