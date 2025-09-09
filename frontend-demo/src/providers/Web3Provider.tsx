'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/web3-config';
import React, { useRef } from 'react';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  // 使用 useRef 确保 QueryClient 只创建一次
  const queryClientRef = useRef<QueryClient>();
  
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          staleTime: 30000, // 30 seconds
          cacheTime: 300000, // 5 minutes
        },
        mutations: {
          retry: 1,
          retryDelay: 1000,
        },
      },
    });
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClientRef.current}>
        <RainbowKitProvider
          showRecentTransactions={false}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
