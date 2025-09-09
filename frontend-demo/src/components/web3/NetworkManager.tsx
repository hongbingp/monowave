'use client';

import React from 'react';
import { useAccount, useChainId, useSwitchChain, useChains } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Loader2, AlertTriangle } from 'lucide-react';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from '@/lib/web3-config';

export function NetworkManager() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending, error } = useSwitchChain();

  const currentChain = chains.find(chain => chain.id === chainId);
  const isCorrectNetwork = chainId === DEFAULT_CHAIN.id;

  const handleSwitchChain = (targetChainId: number) => {
    switchChain({ chainId: targetChainId });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Network Manager
          </CardTitle>
          <CardDescription>Connect your wallet to manage networks</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Please connect your wallet to manage networks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Network Manager
        </CardTitle>
        <CardDescription>
          Switch between supported networks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Network */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Current Network</h4>
            <Badge variant={isCorrectNetwork ? 'default' : 'destructive'}>
              {isCorrectNetwork ? 'Supported' : 'Unsupported'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">
                {currentChain?.name || 'Unknown Network'}
              </p>
              <p className="text-xs text-gray-500">
                Chain ID: {chainId}
              </p>
            </div>
            
            {!isCorrectNetwork && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Switch Required</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Error switching network: {error.message}
            </p>
          </div>
        )}

        {/* Network Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Available Networks</h4>
          
          <div className="grid gap-3">
            {SUPPORTED_CHAINS.map((chain) => {
              const isCurrent = chain.id === chainId;
              
              return (
                <div 
                  key={chain.id} 
                  className={`border rounded-lg p-3 transition-colors ${
                    isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {chain.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Chain ID: {chain.id}
                      </p>
                      {chain.testnet && (
                        <Badge variant="outline" className="text-xs mt-1">
                          Testnet
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <Badge variant="default">Current</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSwitchChain(chain.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Switching...
                            </>
                          ) : (
                            'Switch'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended Network */}
        {!isCorrectNetwork && (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900">Recommended</h4>
            </div>
            
            <p className="text-sm text-blue-800 mb-3">
              Switch to <strong>{DEFAULT_CHAIN.name}</strong> for the best experience with Monowave contracts.
            </p>
            
            <Button
              size="sm"
              onClick={() => handleSwitchChain(DEFAULT_CHAIN.id)}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Switching...
                </>
              ) : (
                `Switch to ${DEFAULT_CHAIN.name}`
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}