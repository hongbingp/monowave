'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, ExternalLink, TestTube, Copy } from 'lucide-react';
import { DEFAULT_CHAIN } from '@/lib/web3-config';
import { TEST_ADDRESSES, isTestAddress, getAddressLabel } from '@/lib/test-addresses';
import { useState } from 'react';

interface SimpleWalletConnectProps {
  userRole?: string;
}

export function SimpleWalletConnect({ userRole }: SimpleWalletConnectProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const [showTestAddresses, setShowTestAddresses] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState('');

  const isCorrectNetwork = chainId === DEFAULT_CHAIN.id;
  const isUsingTestAddress = address && isTestAddress(address);

  const handleCopyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(''), 2000);
  };

  const getRecommendedTestAddress = () => {
    if (!userRole) return null;
    switch (userRole) {
      case 'ai_searcher':
        return TEST_ADDRESSES.AI_SEARCHER;
      case 'publisher':
        return TEST_ADDRESSES.PUBLISHER;
      case 'advertiser':
        return TEST_ADDRESSES.ADVERTISER;
      default:
        return null;
    }
  };

  const recommendedAddr = getRecommendedTestAddress();

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Web3 Wallet
            {isUsingTestAddress && (
              <Badge variant="secondary" className="text-xs">
                <TestTube className="h-3 w-3 mr-1" />
                Test
              </Badge>
            )}
          </div>
          {isConnected && (
            <Badge variant={isCorrectNetwork ? 'default' : 'destructive'} className="text-xs">
              {isCorrectNetwork ? 'Base Sepolia' : 'Wrong Network'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your wallet to access Web3 features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <ConnectButton />
        </div>

        {/* 测试地址建议 */}
        {recommendedAddr && !isConnected && (
          <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <TestTube className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">推荐测试地址</span>
              </div>
            </div>
            <div className="text-sm text-blue-700 mb-2">
              <strong>{recommendedAddr.label}</strong> - {recommendedAddr.description}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white p-1 rounded border flex-1">
                {recommendedAddr.address}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyAddress(recommendedAddr.address)}
                className="h-6 w-6 p-0"
              >
                {copiedAddress === recommendedAddr.address ? (
                  <span className="text-green-600 text-xs">✓</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 显示所有测试地址按钮 */}
        {!showTestAddresses && (
          <div className="text-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTestAddresses(true)}
              className="text-xs"
            >
              <TestTube className="h-3 w-3 mr-1" />
              查看所有测试地址
            </Button>
          </div>
        )}

        {/* 所有测试地址列表 */}
        {showTestAddresses && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">测试钱包地址</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTestAddresses(false)}
                className="h-6 text-xs"
              >
                收起
              </Button>
            </div>
            <div className="space-y-2">
              {[TEST_ADDRESSES.DEPLOYER, TEST_ADDRESSES.AI_SEARCHER, TEST_ADDRESSES.PUBLISHER, TEST_ADDRESSES.ADVERTISER].map((testAddr, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{testAddr.label}</span>
                      {idx === 0 && (
                        <Badge variant="default" className="text-xs px-1 py-0">
                          推荐
                        </Badge>
                      )}
                    </div>
                    <div className="text-gray-600 truncate">{testAddr.address}</div>
                    <div className="text-gray-500 text-xs truncate">{testAddr.description}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyAddress(testAddr.address)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedAddress === testAddr.address ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isConnected && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Balance:</span>
              <span className="font-mono">
                {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Address:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">
                  {isUsingTestAddress ? getAddressLabel(address) : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyAddress(address!)}
                  className="h-4 w-4 p-0"
                >
                  {copiedAddress === address ? (
                    <span className="text-green-600 text-xs">✓</span>
                  ) : (
                    <Copy className="h-2 w-2" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <a
                href="/web3-demo"
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Full Web3 Demo
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}