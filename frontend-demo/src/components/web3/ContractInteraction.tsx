'use client';

import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN } from '@/lib/web3-config';
import { parseUnits, formatUnits } from 'viem';
import { Activity, DollarSign, Send, Loader2 } from 'lucide-react';

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

export function ContractInteraction() {
  const { address, isConnected } = useAccount();
  const [mintAmount, setMintAmount] = useState('100');
  const [transferAmount, setTransferAmount] = useState('10');
  const [transferTo, setTransferTo] = useState('');
  const [depositAmount, setDepositAmount] = useState('50');

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

  const handleDeposit = async () => {
    if (!depositAmount) return;
    
    writeContract({
      address: CONTRACT_ADDRESSES.baseSepolia.Escrow as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'deposit',
      args: [CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`, parseUnits(depositAmount, 6)],
    });
  };

  // Refresh balances when transaction is confirmed
  React.useEffect(() => {
    if (isConfirmed) {
      refetchUsdcBalance();
      refetchEscrowBalance();
    }
  }, [isConfirmed, refetchUsdcBalance, refetchEscrowBalance]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="text-red-500 text-sm mt-2">
                Error: {error.message}
              </p>
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
            Deposit USDC tokens to the escrow contract
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
          <Button 
            onClick={handleDeposit} 
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
                Deposit {depositAmount} USDC
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
