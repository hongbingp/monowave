'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { formatEther, formatUnits } from 'viem';
import { History, ExternalLink, Search, RefreshCw, Filter } from 'lucide-react';

interface Transaction {
  hash: string;
  blockNumber: bigint;
  from: string;
  to: string;
  value: bigint;
  gasUsed?: bigint;
  gasPrice?: bigint;
  timestamp?: number;
  status: 'success' | 'failed' | 'pending';
  type: 'transfer' | 'contract' | 'mint' | 'deposit';
}

export function TransactionHistory() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchHash, setSearchHash] = useState('');

  const fetchTransactions = async () => {
    if (!address || !publicClient) return;
    
    setLoading(true);
    try {
      // Get recent blocks to find transactions
      const latestBlock = await publicClient.getBlockNumber();
      const transactions: Transaction[] = [];
      
      // Check last 10 blocks for transactions involving this address
      for (let i = 0; i < 10; i++) {
        const blockNumber = latestBlock - BigInt(i);
        try {
          const block = await publicClient.getBlock({
            blockNumber,
            includeTransactions: true,
          });
          
          if (block.transactions) {
            for (const tx of block.transactions) {
              if (typeof tx === 'object' && (tx.from === address || tx.to === address)) {
                const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
                
                transactions.push({
                  hash: tx.hash,
                  blockNumber: tx.blockNumber || blockNumber,
                  from: tx.from || '',
                  to: tx.to || '',
                  value: tx.value || BigInt(0),
                  gasUsed: receipt.gasUsed,
                  gasPrice: tx.gasPrice || BigInt(0),
                  timestamp: Number(block.timestamp),
                  status: receipt.status === 'success' ? 'success' : 'failed',
                  type: determineTransactionType(tx.to, tx.input),
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch block ${blockNumber}:`, error);
        }
      }
      
      setTransactions(transactions.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineTransactionType = (to: string | null, input?: string): Transaction['type'] => {
    if (!to) return 'contract';
    
    const contractAddresses = Object.values(CONTRACT_ADDRESSES.baseSepolia);
    if (contractAddresses.includes(to.toLowerCase())) {
      if (to.toLowerCase() === CONTRACT_ADDRESSES.baseSepolia.MockUSDC.toLowerCase()) {
        return 'mint';
      }
      if (to.toLowerCase() === CONTRACT_ADDRESSES.baseSepolia.Escrow.toLowerCase()) {
        return 'deposit';
      }
      return 'contract';
    }
    
    return 'transfer';
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all' && tx.type !== filter) return false;
    if (searchHash && !tx.hash.toLowerCase().includes(searchHash.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (isConnected) {
      fetchTransactions();
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>Connect your wallet to view transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Please connect your wallet to view your transaction history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          Recent blockchain transactions for your address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search by Hash</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Enter transaction hash..."
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="filter">Filter by Type</Label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Types</option>
              <option value="transfer">Transfers</option>
              <option value="mint">Mints</option>
              <option value="deposit">Deposits</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={fetchTransactions}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Transaction List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {transactions.length === 0 
                ? "No transactions found in recent blocks" 
                : "No transactions match your filters"
              }
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Try making some transactions or adjusting your filters
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.hash}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={tx.status === 'success' ? 'default' : 'destructive'}
                      className={tx.status === 'success' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {tx.status}
                    </Badge>
                    <Badge variant="outline">
                      {tx.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Block #{tx.blockNumber.toString()}
                    </span>
                    <a
                      href={`https://sepolia.basescan.org/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Hash:</p>
                    <p className="font-mono text-xs break-all">{tx.hash}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Value:</p>
                    <p className="font-medium">
                      {formatEther(tx.value)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">From:</p>
                    <p className="font-mono text-xs break-all">{tx.from}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">To:</p>
                    <p className="font-mono text-xs break-all">{tx.to}</p>
                  </div>
                  {tx.gasUsed && tx.gasPrice && (
                    <div>
                      <p className="text-gray-600">Gas Used:</p>
                      <p>{tx.gasUsed.toString()} @ {formatUnits(tx.gasPrice, 9)} gwei</p>
                    </div>
                  )}
                  {tx.timestamp && (
                    <div>
                      <p className="text-gray-600">Time:</p>
                      <p>{new Date(tx.timestamp * 1000).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
