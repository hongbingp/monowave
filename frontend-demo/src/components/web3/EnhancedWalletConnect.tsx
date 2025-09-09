'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Wallet, ExternalLink, TestTube, Copy, Users, Target, Zap, CheckCircle } from 'lucide-react';
import { DEFAULT_CHAIN } from '@/lib/web3-config';
import { TEST_ADDRESSES, isTestAddress, getAddressLabel } from '@/lib/test-addresses';
import { useState } from 'react';

interface EnhancedWalletConnectProps {
  userRole?: string;
}

export function EnhancedWalletConnect({ userRole }: EnhancedWalletConnectProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const [showTestAddresses, setShowTestAddresses] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState('');

  const isCorrectNetwork = chainId === DEFAULT_CHAIN.id;
  const isUsingTestAddress = address && isTestAddress(address);

  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(''), 2000);
    } catch (error) {
      console.error('复制地址失败:', error);
    }
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

  const getRoleInfo = () => {
    switch (userRole) {
      case 'ai_searcher':
        return {
          icon: <Zap className="h-4 w-4 text-blue-600" />,
          name: 'AI Searcher',
          desc: 'AI开发者专用钱包'
        };
      case 'publisher':
        return {
          icon: <Users className="h-4 w-4 text-green-600" />,
          name: 'Publisher',
          desc: '发布者专用钱包'
        };
      case 'advertiser':
        return {
          icon: <Target className="h-4 w-4 text-purple-600" />,
          name: 'Advertiser',
          desc: '广告商专用钱包'
        };
      default:
        return {
          icon: <Wallet className="h-4 w-4 text-gray-600" />,
          name: 'User',
          desc: '通用钱包连接'
        };
    }
  };

  const recommendedAddr = getRecommendedTestAddress();
  const roleInfo = getRoleInfo();

  // 检查当前连接的地址是否是推荐地址
  const isUsingRecommendedAddress = recommendedAddr && 
    address?.toLowerCase() === recommendedAddr.address.toLowerCase();

  return (
    <div className="space-y-4">
      {/* 角色信息卡片 */}
      <Card className="border-2 border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {roleInfo.icon}
            <div>
              <CardTitle className="text-base">{roleInfo.name} 钱包</CardTitle>
              <CardDescription className="text-sm">{roleInfo.desc}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 主要连接卡片 */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              钱包连接状态
              {isUsingTestAddress && (
                <Badge variant="secondary" className="text-xs">
                  <TestTube className="h-3 w-3 mr-1" />
                  测试
                </Badge>
              )}
              {isUsingRecommendedAddress && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  推荐
                </Badge>
              )}
            </div>
            {isConnected && (
              <Badge variant={isCorrectNetwork ? 'default' : 'destructive'} className="text-xs">
                {isCorrectNetwork ? 'Base Sepolia ✓' : 'Wrong Network ⚠️'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* RainbowKit连接按钮 */}
          <div className="flex justify-center">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button onClick={openConnectModal} className="w-full">
                            <Wallet className="mr-2 h-4 w-4" />
                            连接钱包
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button onClick={openChainModal} variant="destructive" className="w-full">
                            切换网络
                          </Button>
                        );
                      }

                      return (
                        <div className="flex gap-2 w-full">
                          <Button
                            onClick={openChainModal}
                            variant="outline"
                            className="flex-1"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 16,
                                  height: 16,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 8,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 16, height: 16 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </Button>
                          <Button
                            onClick={openAccountModal}
                            variant="outline"
                            className="flex-1"
                          >
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          <Separator />

          {/* 推荐测试地址 */}
          {recommendedAddr && (
            <div className={`border rounded-lg p-4 ${
              isUsingRecommendedAddress 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {roleInfo.icon}
                  <span className={`text-sm font-medium ${
                    isUsingRecommendedAddress ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {isUsingRecommendedAddress ? '✓ 正在使用推荐地址' : '推荐测试地址'}
                  </span>
                </div>
                {isUsingRecommendedAddress && (
                  <Badge variant="default" className="bg-green-600 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    已连接
                  </Badge>
                )}
              </div>
              
              <div className={`text-sm mb-2 ${
                isUsingRecommendedAddress ? 'text-green-700' : 'text-blue-700'
              }`}>
                <strong>{recommendedAddr.label}</strong> - {recommendedAddr.description}
              </div>
              
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white p-2 rounded border flex-1 font-mono">
                  {recommendedAddr.address}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyAddress(recommendedAddr.address)}
                  className="h-8 w-8 p-0"
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

          {/* 其他测试地址 */}
          <div className="text-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTestAddresses(!showTestAddresses)}
              className="text-xs"
            >
              <TestTube className="h-3 w-3 mr-1" />
              {showTestAddresses ? '隐藏' : '查看'}其他测试地址
            </Button>
          </div>

          {showTestAddresses && (
            <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
              <div className="text-sm font-medium text-gray-800 mb-2">可用测试地址</div>
              {[
                TEST_ADDRESSES.DEPLOYER,
                TEST_ADDRESSES.AI_SEARCHER,
                TEST_ADDRESSES.PUBLISHER,
                TEST_ADDRESSES.ADVERTISER
              ].map((testAddr, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                  <div className="flex-1 mr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{testAddr.label}</span>
                      {testAddr === recommendedAddr && (
                        <Badge variant="default" className="text-xs px-1 py-0 bg-blue-600">
                          推荐
                        </Badge>
                      )}
                      {address?.toLowerCase() === testAddr.address.toLowerCase() && (
                        <Badge variant="default" className="text-xs px-1 py-0 bg-green-600">
                          <CheckCircle className="h-2 w-2 mr-1" />
                          已连接
                        </Badge>
                      )}
                    </div>
                    <div className="text-gray-600 font-mono text-xs truncate">{testAddr.address}</div>
                    <div className="text-gray-500 text-xs">{testAddr.description}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyAddress(testAddr.address)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedAddress === testAddr.address ? (
                      <span className="text-green-600 text-xs">✓</span>
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 连接状态信息 */}
          {isConnected && (
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-gray-600 text-xs">余额</span>
                  <div className="font-mono text-sm">
                    {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '加载中...'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-600 text-xs">网络</span>
                  <div className="text-sm">
                    {isCorrectNetwork ? 'Base Sepolia ✓' : '网络错误 ⚠️'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 text-xs">钱包地址</span>
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
                  完整 Web3 演示
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}