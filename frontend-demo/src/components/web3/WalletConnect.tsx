'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronRight } from 'lucide-react';
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN } from '@/lib/web3-config';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address,
  });

  const isCorrectNetwork = chainId === DEFAULT_CHAIN.id;
  const networkName = chainId === DEFAULT_CHAIN.id ? 'Base Sepolia' : 'Unknown Network';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Connection
        </CardTitle>
        <CardDescription>
          Connect your wallet to interact with Monowave contracts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <ConnectButton />
        </div>

        {isConnected && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Address</p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {address}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Balance</p>
                <p className="text-sm">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network</p>
                <p className="text-sm">{networkName}</p>
              </div>
              <Badge variant={isCorrectNetwork ? 'default' : 'destructive'}>
                {isCorrectNetwork ? 'Connected' : 'Wrong Network'}
              </Badge>
            </div>

            {isCorrectNetwork && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Contract Addresses</h4>
                <div className="space-y-1 text-sm">
                  {Object.entries(CONTRACT_ADDRESSES.baseSepolia).map(([name, addr]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="text-green-700">{name}:</span>
                      <span className="font-mono text-green-600 text-xs">{addr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
