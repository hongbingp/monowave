'use client';

import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function MessageSigning() {
  const { address, isConnected } = useAccount();
  const [message, setMessage] = useState('Hello Monowave!');
  const [signature, setSignature] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { signMessage, isPending, error } = useSignMessage({
    mutation: {
      onSuccess: (data) => {
        setSignature(data);
      },
    },
  });

  const handleSign = () => {
    if (!message.trim()) return;
    signMessage({ message });
  };

  const handleCopySignature = async () => {
    if (signature) {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Message Signing
          </CardTitle>
          <CardDescription>Connect your wallet to sign messages</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Please connect your wallet to sign messages
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Message Signing
        </CardTitle>
        <CardDescription>
          Sign messages with your wallet for authentication and verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Input */}
        <div className="space-y-2">
          <Label htmlFor="message">Message to Sign</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={3}
          />
        </div>

        {/* Sign Button */}
        <Button 
          onClick={handleSign} 
          disabled={isPending || !message.trim()}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Sign Message
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Error: {error.message}
            </p>
          </div>
        )}

        {/* Signature Display */}
        {signature && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Signature</Label>
              <Badge variant="default" className="bg-green-500">
                Signed Successfully
              </Badge>
            </div>
            
            <div className="relative">
              <Textarea
                value={signature}
                readOnly
                rows={3}
                className="font-mono text-xs pr-10 bg-gray-50"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={handleCopySignature}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            <div className="text-xs text-gray-600">
              <p><strong>Signer:</strong> {address}</p>
              <p><strong>Message:</strong> "{message}"</p>
              <p className="mt-2 text-gray-500">
                This signature proves that the wallet owner signed the above message.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}