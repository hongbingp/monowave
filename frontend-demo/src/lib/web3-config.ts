import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Monowave',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id',
  chains: [baseSepolia, base],
  ssr: true, // If your dApp uses server side rendering (SSR)
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
