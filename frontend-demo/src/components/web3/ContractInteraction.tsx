'use client';

import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN } from '@/lib/web3-config';
import { TEST_ADDRESSES } from '@/lib/test-addresses';
import { parseUnits, formatUnits } from 'viem';
import { Activity, DollarSign, Send, Loader2, UserPlus } from 'lucide-react';

// Mock USDC ABI (simplified for demo)
const MOCK_USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Escrow ABI (simplified)
const ESCROW_ABI = [
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ParticipantRegistry ABI (simplified)
const PARTICIPANT_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'who', type: 'address' },
      { name: 'roleBitmap', type: 'uint256' },
      { name: 'payout', type: 'address' },
      { name: 'meta', type: 'bytes32' }
    ],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'who', type: 'address' }],
    name: 'isRegistered',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'who', type: 'address' }],
    name: 'get',
    outputs: [
      {
        components: [
          { name: 'payout', type: 'address' },
          { name: 'roleBitmap', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'meta', type: 'bytes32' }
        ],
        name: '',
        type: 'tuple',
      }
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Role constants
const ROLES = {
  ROLE_PUBLISHER: 1,    // 1 << 0
  ROLE_ADVERTISER: 2,   // 1 << 1  
  ROLE_AI_SEARCHER: 4   // 1 << 2
};

const TEST_ACCOUNTS = [
  { name: 'AI_SEARCHER', address: TEST_ADDRESSES.AI_SEARCHER.address, role: ROLES.ROLE_AI_SEARCHER, meta: "0x0b2fa5ccdd63fafe1f4230d054b7d01e2364d57595e584fa2d6de178f8a650af" },
  { name: 'PUBLISHER', address: TEST_ADDRESSES.PUBLISHER.address, role: ROLES.ROLE_PUBLISHER, meta: "0x27ab35ed20d9b6e191331ac7a5892fd0b6763b024c62acd0a0cc58483e1cd07b" },
  { name: 'ADVERTISER', address: TEST_ADDRESSES.ADVERTISER.address, role: ROLES.ROLE_ADVERTISER, meta: "0xfe2e4e8a1af985bd55826f5d82be58efaf5f42d27412bfbc9e3aae644f6673fd" }
];

export function ContractInteraction() {
  const { address, isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState('100');
  const [transferAmount, setTransferAmount] = useState('10');
  const [transferTo, setTransferTo] = useState('');
  const [depositAmount, setDepositAmount] = useState('50');
  const [depositStep, setDepositStep] = useState<'approve' | 'deposit' | 'idle'>('idle');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read Escrow balance
  const { data: escrowBalance, refetch: refetchEscrowBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`,
    abi: ESCROW_ABI,
    functionName: 'balanceOf',
    args: address ? [address, CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  // Read USDC allowance for Escrow
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
    abi: MOCK_USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const handleMintTokens = async () => {
    if (!address) return;
    
    writeContract({
      address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
      abi: MOCK_USDC_ABI,
      functionName: 'mint',
      args: [address, parseUnits(mintAmount, 6)],
    });
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) return;
    
    writeContract({
      address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
      abi: MOCK_USDC_ABI,
      functionName: 'transfer',
      args: [transferTo as `0x${string}`, parseUnits(transferAmount, 6)],
    });
  };

  const handleDepositApprove = async () => {
    if (!depositAmount) return;
    
    setDepositStep('approve');
    writeContract({
      address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
      abi: MOCK_USDC_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`, parseUnits(depositAmount, 6)],
    });
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    
    setDepositStep('deposit');
    writeContract({
      address: CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'deposit',
      args: [CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`, parseUnits(depositAmount, 6)],
    });
  };

  const handleRegisterAccount = async (account: typeof TEST_ACCOUNTS[0]) => {
    writeContract({
      address: CONTRACT_ADDRESSES.baseSepolia.ParticipantRegistry as `0x${string}`,
      abi: PARTICIPANT_REGISTRY_ABI,
      functionName: 'register',
      args: [
        account.address as `0x${string}`,
        BigInt(account.role),
        account.address as `0x${string}`, // payout address same as participant
        account.meta as `0x${string}`
      ],
    });
  };

  // Refresh balances when transaction is confirmed
  React.useEffect(() => {
    if (isConfirmed) {
      refetchUsdcBalance();
      refetchEscrowBalance();
      refetchAllowance();
      
      // Reset deposit step after successful transaction
      if (depositStep !== 'idle') {
        setTimeout(() => setDepositStep('idle'), 2000);
      }
    }
  }, [isConfirmed, refetchUsdcBalance, refetchEscrowBalance, refetchAllowance, depositStep]);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Interaction</CardTitle>
          <CardDescription>Connect your wallet to interact with contracts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Please connect your wallet to interact with smart contracts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Token Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800">USDC Balance</p>
              <p className="text-2xl font-bold text-blue-900">
                {usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0'} USDC
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800">Escrow Balance</p>
              <p className="text-2xl font-bold text-green-900">
                {escrowBalance ? formatUnits(escrowBalance as bigint, 6) : '0'} USDC
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800">Escrow Allowance</p>
              <p className="text-2xl font-bold text-purple-900">
                {allowance ? formatUnits(allowance as bigint, 6) : '0'} USDC
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Status */}
      {(isPending || isConfirming || isConfirmed) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {isPending && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Transaction pending...</span>
                </>
              )}
              {isConfirming && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Waiting for confirmation...</span>
                </>
              )}
              {isConfirmed && (
                <>
                  <Badge variant="default" className="bg-green-500">
                    Transaction confirmed!
                  </Badge>
                  {hash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm"
                    >
                      View on Explorer
                    </a>
                  )}
                </>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg mt-2">
                <p className="text-red-800 text-sm font-medium">Transaction Error:</p>
                <p className="text-red-600 text-xs mt-1">{error.message}</p>
                {error.message.includes('user rejected') && (
                  <p className="text-red-500 text-xs mt-1">💡 User cancelled the transaction</p>
                )}
                {error.message.includes('insufficient funds') && (
                  <p className="text-red-500 text-xs mt-1">💡 Insufficient balance or gas fees</p>
                )}
                {error.message.includes('TR: token not allowed') && (
                  <p className="text-red-500 text-xs mt-1">💡 Token not allowed in TokenRegistry</p>
                )}
                {hash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:underline text-xs block mt-2"
                  >
                    View failed transaction on BaseScan →
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mint Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Mint Test Tokens
          </CardTitle>
          <CardDescription>
            Mint USDC tokens for testing (testnet only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mintAmount">Amount to Mint</Label>
            <Input
              id="mintAmount"
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <Button 
            onClick={handleMintTokens} 
            disabled={isPending || isConfirming}
            className="w-full"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Mint {mintAmount} USDC
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Transfer Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transfer Tokens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transferTo">Recipient Address</Label>
            <Input
              id="transferTo"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div>
            <Label htmlFor="transferAmount">Amount</Label>
            <Input
              id="transferAmount"
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="10"
            />
          </div>
          <Button 
            onClick={handleTransfer} 
            disabled={isPending || isConfirming || !transferTo}
            className="w-full"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Transfer {transferAmount} USDC
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Deposit to Escrow */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit to Escrow</CardTitle>
          <CardDescription>
            Deposit USDC tokens to the escrow contract (2-step process)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="depositAmount">Amount to Deposit</Label>
            <Input
              id="depositAmount"
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="50"
            />
          </div>
          
          {/* Show current allowance status */}
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Current Allowance:</strong> {allowance ? formatUnits(allowance as bigint, 6) : '0'} USDC
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              You need to approve the Escrow contract to spend your USDC tokens before depositing.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleDepositApprove} 
              disabled={isPending || isConfirming}
              variant="outline"
            >
              {isPending && depositStep === 'approve' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  1. Approve {depositAmount} USDC
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleDeposit} 
              disabled={isPending || isConfirming || !allowance || (allowance as bigint) < parseUnits(depositAmount || '0', 6)}
            >
              {isPending && depositStep === 'deposit' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Depositing...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  2. Deposit {depositAmount} USDC
                </>
              )}
            </Button>
          </div>
          
          {/* Instructions */}
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border">
            <div className="font-medium mb-1">💡 Instructions:</div>
            <div>1. Click "Approve" to allow Escrow contract to spend your USDC</div>
            <div>2. Wait for approval confirmation</div>
            <div>3. Click "Deposit" to transfer USDC to Escrow</div>
          </div>
        </CardContent>
      </Card>

      {/* Role Assignment - Only show for DEPLOYER */}
      {address && address.toLowerCase() === TEST_ADDRESSES.DEPLOYER.address.toLowerCase() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Role Assignment (DEPLOYER Only)
            </CardTitle>
            <CardDescription>
              Register test accounts in ParticipantRegistry with their roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TEST_ACCOUNTS.map((account) => (
              <div key={account.address} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-gray-500">{account.address}</div>
                    <div className="text-xs text-blue-600">Role Bitmap: {account.role}</div>
                  </div>
                  <Button 
                    onClick={() => handleRegisterAccount(account)}
                    disabled={isPending || isConfirming}
                    size="sm"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 font-medium">⚠️ Important:</p>
              <p className="text-xs text-yellow-700 mt-1">
                Only the DEPLOYER account ({TEST_ADDRESSES.DEPLOYER.address}) can register participants.
                Make sure you are connected with the DEPLOYER wallet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
