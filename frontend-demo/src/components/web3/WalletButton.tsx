'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, TestTube, CheckCircle } from 'lucide-react';
import { isTestAddress, getAddressLabel, getTestAddressByRole } from '@/lib/test-addresses';

interface WalletButtonProps {
  userRole?: string;
}

export function WalletButton({ userRole }: WalletButtonProps) {
  const { address, isConnected } = useAccount();
  
  const isUsingTestAddress = address && isTestAddress(address);
  const recommendedAddr = userRole ? getTestAddressByRole(userRole) : null;
  const isUsingRecommendedAddress = recommendedAddr && 
    address?.toLowerCase() === recommendedAddr.address.toLowerCase();
  
  const getDisplayText = () => {
    if (!isConnected) {
      return 'Connect Wallet';
    }
    
    if (isUsingTestAddress) {
      return getAddressLabel(address);
    }
    
    return `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  };

  const getButtonVariant = () => {
    if (!isConnected) return 'outline';
    if (isUsingRecommendedAddress) return 'default';
    return isUsingTestAddress ? 'secondary' : 'outline';
  };

  return (
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
                  <Button 
                    onClick={openConnectModal}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2 min-w-[140px]"
                  >
                    <Wallet className="h-4 w-4" />
                    <span className="truncate flex-1">Connect Wallet</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button 
                    onClick={openChainModal} 
                    variant="destructive" 
                    size="sm"
                    className="flex items-center gap-2 min-w-[140px]"
                  >
                    <Wallet className="h-4 w-4" />
                    <span className="truncate flex-1">Wrong Network</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                );
              }

              return (
                <Button 
                  onClick={openAccountModal}
                  variant={getButtonVariant()} 
                  size="sm"
                  className="flex items-center gap-2 min-w-[140px] relative"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="truncate flex-1">{getDisplayText()}</span>
                  <div className="flex items-center gap-1">
                    {isUsingTestAddress && (
                      <TestTube className="h-3 w-3 opacity-70" />
                    )}
                    {isUsingRecommendedAddress && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </div>
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}