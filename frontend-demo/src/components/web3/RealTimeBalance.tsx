'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useBlockNumber, useWatchContractEvent } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { formatUnits } from 'viem';
import { DollarSign, Activity, TrendingUp, Wallet, RefreshCw } from 'lucide-react';

// Mock USDC ABI for events
const MOCK_USDC_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Escrow ABI for events
const ESCROW_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'token', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'Deposit',
    type: 'event',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface BalanceUpdate {
  type: 'eth' | 'usdc' | 'escrow';
  previousValue: string;
  currentValue: string;
  timestamp: number;
  change: 'increase' | 'decrease' | 'same';
}

export function RealTimeBalance() {
  const { address, isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const [balanceHistory, setBalanceHistory] = useState<BalanceUpdate[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // ETH balance
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address,
  });

  // USDC balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Escrow balance
  const { data: escrowBalance, refetch: refetchEscrowBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'balanceOf',
    args: address ? [address, CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  // Watch for USDC Transfer events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
    abi: MOCK_USDC_ABI,
    eventName: 'Transfer',
    args: {
      from: address,
    },
    onLogs(logs) {
      console.log('USDC Transfer (from):', logs);
      refetchUsdcBalance();
      setLastUpdate(Date.now());
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
    abi: MOCK_USDC_ABI,
    eventName: 'Transfer',
    args: {
      to: address,
    },
    onLogs(logs) {
      console.log('USDC Transfer (to):', logs);
      refetchUsdcBalance();
      setLastUpdate(Date.now());
    },
  });

  // Watch for Escrow Deposit events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`,
    abi: ESCROW_ABI,
    eventName: 'Deposit',
    args: {
      user: address,
    },
    onLogs(logs) {
      console.log('Escrow Deposit:', logs);
      refetchEscrowBalance();
      setLastUpdate(Date.now());
    },
  });

  // Track balance changes
  const [previousBalances, setPreviousBalances] = useState({
    eth: '0',
    usdc: '0',
    escrow: '0',
  });

  useEffect(() => {
    if (!isConnected) return;

    const currentBalances = {
      eth: ethBalance ? ethBalance.formatted : '0',
      usdc: usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0',
      escrow: escrowBalance ? formatUnits(escrowBalance as bigint, 6) : '0',
    };

    // Check for changes and add to history
    const updates: BalanceUpdate[] = [];
    const timestamp = Date.now();

    Object.entries(currentBalances).forEach(([type, current]) => {
      const previous = previousBalances[type as keyof typeof previousBalances];
      if (previous !== '0' && previous !== current) {
        const change = parseFloat(current) > parseFloat(previous) ? 'increase' : 
                      parseFloat(current) < parseFloat(previous) ? 'decrease' : 'same';
        
        updates.push({
          type: type as 'eth' | 'usdc' | 'escrow',
          previousValue: previous,
          currentValue: current,
          timestamp,
          change,
        });
      }
    });

    if (updates.length > 0) {
      setBalanceHistory(prev => [...updates, ...prev].slice(0, 10)); // Keep last 10 updates
    }

    setPreviousBalances(currentBalances);
  }, [ethBalance, usdcBalance, escrowBalance, isConnected]);

  // Auto-refresh balances on new blocks
  useEffect(() => {
    if (blockNumber && isConnected) {
      refetchEthBalance();
      refetchUsdcBalance();
      refetchEscrowBalance();
    }
  }, [blockNumber]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Balance
          </CardTitle>
          <CardDescription>Connect your wallet to view real-time balances</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Please connect your wallet to view real-time balance updates
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Current Balances
          </CardTitle>
          <CardDescription>
            Real-time balance updates • Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">ETH Balance</span>
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0.0000'}
              </p>
              <p className="text-xs text-blue-600">Native Token</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">USDC Balance</span>
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">
                {usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-green-600">ERC-20 Token</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-800">Escrow Balance</span>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {escrowBalance ? parseFloat(formatUnits(escrowBalance as bigint, 6)).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-purple-600">Contract Balance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Balance Updates
          </CardTitle>
          <CardDescription>
            Recent balance changes detected in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balanceHistory.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No balance changes detected yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Make some transactions to see real-time updates
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {balanceHistory.map((update, index) => (
                <div
                  key={`${update.timestamp}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={update.change === 'increase' ? 'default' : 'destructive'}
                      className={
                        update.change === 'increase' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {update.change === 'increase' ? '+' : '-'}
                    </Badge>
                    <div>
                      <p className="font-medium text-sm">
                        {update.type.toUpperCase()} Balance {update.change}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {update.previousValue} → {update.currentValue}
                    </p>
                    <p className="text-xs text-gray-500">
                      {update.type === 'eth' ? 'ETH' : 'USDC'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">
              Live monitoring active • Block #{blockNumber?.toString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
