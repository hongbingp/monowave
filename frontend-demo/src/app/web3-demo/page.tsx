'use client';

import React from 'react';
import { WalletConnect } from '@/components/web3/WalletConnect';
import { ContractInteraction } from '@/components/web3/ContractInteraction';
import { TransactionHistory } from '@/components/web3/TransactionHistory';
import { RealTimeBalance } from '@/components/web3/RealTimeBalance';
import { MessageSigning } from '@/components/web3/MessageSigning';
import { NetworkManager } from '@/components/web3/NetworkManager';
import { EventListener } from '@/components/web3/EventListener';

export default function Web3DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Web3 Integration Demo
            </h1>
            <p className="text-lg text-gray-600">
              Complete wallet integration featuring wagmi + RainbowKit + WalletConnect
            </p>
          </div>
          
          <div className="space-y-8">
            {/* Wallet & Network Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <WalletConnect />
              </div>
              <div className="lg:col-span-1">
                <NetworkManager />
              </div>
              <div className="lg:col-span-1">
                <RealTimeBalance />
              </div>
            </div>

            {/* Contract Interaction */}
            <div>
              <ContractInteraction />
            </div>

            {/* Message Signing & Event Monitoring */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <MessageSigning />
              </div>
              <div>
                <EventListener />
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <TransactionHistory />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
