'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TestTube, Copy, Users, Target, Zap, CheckCircle } from 'lucide-react';
import { TEST_ADDRESSES, getTestAddressByRole } from '@/lib/test-addresses';
import { useAccount } from 'wagmi';

interface TestAddressInfoProps {
  userRole?: string;
}

export function TestAddressInfo({ userRole }: TestAddressInfoProps) {
  const { address } = useAccount();
  const [copiedAddress, setCopiedAddress] = useState('');
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  const handleCopyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(''), 2000);
    } catch (error) {
      console.error('复制地址失败:', error);
    }
  };

  const recommendedAddr = userRole ? getTestAddressByRole(userRole) : null;
  const isUsingRecommendedAddress = recommendedAddr && 
    address?.toLowerCase() === recommendedAddr.address.toLowerCase();

  const getRoleInfo = () => {
    switch (userRole) {
      case 'ai_searcher':
        return {
          icon: <Zap className="h-4 w-4 text-blue-600" />,
          name: 'AI Searcher',
          color: 'bg-blue-50 border-blue-200 text-blue-800'
        };
      case 'publisher':
        return {
          icon: <Users className="h-4 w-4 text-green-600" />,
          name: 'Publisher',
          color: 'bg-green-50 border-green-200 text-green-800'
        };
      case 'advertiser':
        return {
          icon: <Target className="h-4 w-4 text-purple-600" />,
          name: 'Advertiser',
          color: 'bg-purple-50 border-purple-200 text-purple-800'
        };
      default:
        return {
          icon: <TestTube className="h-4 w-4 text-gray-600" />,
          name: 'User',
          color: 'bg-gray-50 border-gray-200 text-gray-800'
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TestTube className="h-4 w-4" />
          测试地址信息
        </CardTitle>
        <CardDescription>
          为 {roleInfo.name} 角色准备的测试钱包地址
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 推荐地址 */}
        {recommendedAddr && (
          <div className={`border rounded-lg p-4 ${
            isUsingRecommendedAddress 
              ? 'bg-green-50 border-green-200' 
              : roleInfo.color
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {roleInfo.icon}
                <span className={`text-sm font-medium ${
                  isUsingRecommendedAddress ? 'text-green-800' : ''
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
              isUsingRecommendedAddress ? 'text-green-700' : ''
            }`}>
              <strong>{recommendedAddr.label}</strong>
            </div>
            
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white p-2 rounded border flex-1 font-mono break-all">
                {recommendedAddr.address}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyAddress(recommendedAddr.address)}
                className="h-8 w-8 p-0 shrink-0"
              >
                {copiedAddress === recommendedAddr.address ? (
                  <span className="text-green-600 text-xs">✓</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            <div className="text-xs text-gray-600 mt-2">
              {recommendedAddr.description}
            </div>
          </div>
        )}

        {/* 显示所有测试地址按钮 */}
        <div className="text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAllAddresses(!showAllAddresses)}
            className="text-xs"
          >
            <TestTube className="h-3 w-3 mr-1" />
            {showAllAddresses ? '隐藏' : '查看'}所有测试地址
          </Button>
        </div>

        {/* 所有测试地址列表 */}
        {showAllAddresses && (
          <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="text-sm font-medium text-gray-800 mb-2">可用测试地址</div>
            {[
              TEST_ADDRESSES.DEPLOYER,
              TEST_ADDRESSES.AI_SEARCHER,
              TEST_ADDRESSES.PUBLISHER,
              TEST_ADDRESSES.ADVERTISER
            ].map((testAddr, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-white p-3 rounded border">
                <div className="flex-1 mr-3 min-w-0">
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
                  <div className="text-gray-600 font-mono text-xs break-all">{testAddr.address}</div>
                  <div className="text-gray-500 text-xs">{testAddr.description}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyAddress(testAddr.address)}
                  className="h-6 w-6 p-0 shrink-0"
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

        {/* 使用说明 */}
        <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
          <div className="font-medium text-blue-800 mb-1">💡 使用说明</div>
          <div>1. 复制推荐的测试地址</div>
          <div>2. 在MetaMask中导入私钥或助记词</div>
          <div>3. 点击"Connect Wallet"连接钱包</div>
          <div>4. 切换到Base Sepolia测试网络</div>
        </div>
      </CardContent>
    </Card>
  );
}