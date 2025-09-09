import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

// 优化的RPC配置以减少连接问题
const customBaseSepolia = {
  ...baseSepolia,
  rpcUrls: {
    ...baseSepolia.rpcUrls,
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
  },
};

// WalletConnect Project ID validation and fallback
const getWalletConnectProjectId = (): string => {
  const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
  
  if (!projectId) {
    console.warn('⚠️  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID not set, using fallback');
    return '2f05ae7f1116030fde2d36508f472bfb';
  }
  
  if (projectId === 'demo-project-id' || projectId.length < 32) {
    console.warn('⚠️  Using demo or invalid WalletConnect Project ID');
  }
  
  return projectId;
};

export const config = getDefaultConfig({
  appName: 'Monowave',
  projectId: getWalletConnectProjectId(),
  chains: [customBaseSepolia, base],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org', {
      batch: true,
      fetchOptions: {
        keepalive: true,
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
    [base.id]: http(),
  },
  ssr: true,
  enableEmailLogin: false,
  // 添加额外的连接配置
  multiInjectedProviderDiscovery: false,
  syncConnectedChain: true,
});

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
    AccessControl: '0x82f2085848b4743629733CA9744cDbe49E57C9bA',
    TokenRegistry: '0x98B5A80a43Ff4d5EC6d4f200347A66069B7FAf60',
    ParticipantRegistry: '0xA78606270A7b752bBda7F847F98Ce25888263A3E',
    BatchLedger: '0x3ADE3AAE3450B0e7d6F2Ae652bD9D3567D47F61e',
    Escrow: '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8',
    Distributor: '0xcBAD9733BCb2b9CBddbAAfD45449557A06C6a619'
  },
  base: {
    // Will be populated when deployed to mainnet
  }
};

export const SUPPORTED_CHAINS = [baseSepolia, base];

export const DEFAULT_CHAIN = baseSepolia;
