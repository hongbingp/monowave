'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { WalletButton } from '@/components/web3/WalletButton';
import { TestAddressInfo } from '@/components/web3/TestAddressInfo';
import { ContractInteraction } from '@/components/web3/ContractInteraction';
import { RealTimeBalance } from '@/components/web3/RealTimeBalance';
import { TransactionHistory } from '@/components/web3/TransactionHistory';
import { MessageSigning } from '@/components/web3/MessageSigning';
import { EventListener } from '@/components/web3/EventListener';
import { NetworkManager } from '@/components/web3/NetworkManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Coins, History, MessageSquare, Radio, Network } from 'lucide-react';

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

interface WalletViewProps {
  user: User;
}

export function WalletView({ user }: WalletViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 space-y-8"
    >
      {/* Header */}
      <div className="bg-white rounded-xl border border-mw-mist-400 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-mw-ink-950">Wallet</h1>
              <p className="text-mw-slate-600">Manage your Web3 wallet connections and transactions</p>
            </div>
          </div>
          
          {/* Wallet Connection Button */}
          <div className="flex items-center space-x-4">
            <WalletButton userRole={user.userType} />
          </div>
        </div>
        
        {/* Test Address Information */}
        <TestAddressInfo userRole={user.userType} />
      </div>

      {/* Network Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Network className="h-5 w-5 text-blue-600" />
            <CardTitle>Network Status</CardTitle>
          </div>
          <CardDescription>
            Current blockchain network and connection status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NetworkManager />
        </CardContent>
      </Card>

      {/* Real-time Balance */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Coins className="h-5 w-5 text-green-600" />
            <CardTitle>Balance Overview</CardTitle>
          </div>
          <CardDescription>
            Real-time token balances and portfolio overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RealTimeBalance />
        </CardContent>
      </Card>

      {/* Contract Interactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Wallet className="h-5 w-5 text-purple-600" />
            <CardTitle>Token Operations</CardTitle>
          </div>
          <CardDescription>
            Mint, transfer, and manage your tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractInteraction />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Message Signing */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <CardTitle>Message Signing</CardTitle>
            </div>
            <CardDescription>
              Sign messages with your connected wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MessageSigning />
          </CardContent>
        </Card>

        {/* Event Listener */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Radio className="h-5 w-5 text-red-600" />
              <CardTitle>Live Events</CardTitle>
            </div>
            <CardDescription>
              Monitor blockchain events in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventListener />
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <History className="h-5 w-5 text-orange-600" />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardDescription>
            View your recent blockchain transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionHistory />
        </CardContent>
      </Card>
    </motion.div>
  );
}