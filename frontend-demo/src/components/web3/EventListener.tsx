'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWatchContractEvent, usePublicClient } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Circle, Trash2 } from 'lucide-react';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { formatUnits } from 'viem';

// Mock USDC Transfer Event ABI
const TRANSFER_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  }
] as const;

interface EventLog {
  id: string;
  timestamp: number;
  txHash: string;
  from: string;
  to: string;
  value: string;
}

export function EventListener() {
  const { address, isConnected } = useAccount();
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isListening, setIsListening] = useState(false);
  const publicClient = usePublicClient();

  // Watch for Transfer events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.baseSepolia.MockUSDC as `0x${string}`,
    abi: TRANSFER_EVENT_ABI,
    eventName: 'Transfer',
    onLogs(logs) {
      if (!isListening) return;
      
      const newEvents = logs.map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        timestamp: Date.now(),
        txHash: log.transactionHash || '',
        from: log.args.from || '',
        to: log.args.to || '',
        value: formatUnits(log.args.value || 0n, 6)
      }));

      setEvents(prev => [...newEvents, ...prev].slice(0, 20)); // Keep only last 20 events
    },
    enabled: isConnected && isListening,
  });

  const handleToggleListening = () => {
    setIsListening(!isListening);
    if (isListening) {
      // When stopping, don't clear events to preserve history
    }
  };

  const handleClearEvents = () => {
    setEvents([]);
  };

  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const isUserInvolved = (event: EventLog) => 
    address && (event.from.toLowerCase() === address.toLowerCase() || 
                 event.to.toLowerCase() === address.toLowerCase());

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Event Listener
          </CardTitle>
          <CardDescription>Connect your wallet to monitor contract events</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Please connect your wallet to monitor events
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Event Listener
            <Badge variant={isListening ? 'default' : 'secondary'} className="ml-2">
              <Circle className={`h-2 w-2 mr-1 ${isListening ? 'fill-green-500 text-green-500' : 'fill-gray-500 text-gray-500'}`} />
              {isListening ? 'Listening' : 'Stopped'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isListening ? 'destructive' : 'default'}
              onClick={handleToggleListening}
            >
              {isListening ? 'Stop' : 'Start'} Listening
            </Button>
            {events.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearEvents}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Monitor USDC transfer events on Base Sepolia in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Contract:</span>
          <span className="font-mono text-xs">
            {formatAddress(CONTRACT_ADDRESSES.baseSepolia.MockUSDC)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Events Captured:</span>
          <span className="font-semibold">{events.length}</span>
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {isListening ? (
              <div>
                <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <p>Listening for events...</p>
                <p className="text-xs mt-1">Transfer some USDC tokens to see events appear here</p>
              </div>
            ) : (
              <p>No events captured. Click "Start Listening" to monitor events.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h4 className="font-medium text-sm text-gray-900">Recent Transfer Events</h4>
            {events.map((event) => (
              <div 
                key={event.id} 
                className={`border rounded-lg p-3 text-sm ${
                  isUserInvolved(event) 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    Transfer
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-mono text-xs">
                      {formatAddress(event.from)}
                      {address && event.from.toLowerCase() === address.toLowerCase() && (
                        <Badge variant="outline" className="ml-1 text-xs">You</Badge>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-mono text-xs">
                      {formatAddress(event.to)}
                      {address && event.to.toLowerCase() === address.toLowerCase() && (
                        <Badge variant="outline" className="ml-1 text-xs">You</Badge>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-green-600">
                      {event.value} USDC
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t">
                  <a
                    href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    View on Explorer →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}