'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronRight,
  CheckCircle,
  Clock,
  Hash,
  Blocks,
  Eye,
  Copy,
  Shield
} from 'lucide-react';
import { CrawlTransaction, AdTransaction, RevenueDistribution, TransactionTrace } from '@/types/blockchain';
import { formatCurrency, truncateAddress } from '@/lib/utils';

interface TransactionTraceProps {
  trace: TransactionTrace;
}

const TransactionStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Badge variant={getStatusColor(status)} className="flex items-center space-x-1">
      {status === 'confirmed' ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span className="capitalize">{status}</span>
    </Badge>
  );
};

const BlockchainLink: React.FC<{ hash: string; type: 'tx' | 'block' | 'address' }> = ({ hash, type }) => {
  const getExplorerUrl = (hash: string, type: string) => {
    const baseUrl = 'https://basescan.org';
    switch (type) {
      case 'tx': return `${baseUrl}/tx/${hash}`;
      case 'block': return `${baseUrl}/block/${hash}`;
      case 'address': return `${baseUrl}/address/${hash}`;
      default: return '#';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="font-mono text-sm text-gray-600">
        {truncateAddress(hash)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => copyToClipboard(hash)}
        className="h-6 w-6 p-0"
      >
        <Copy className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open(getExplorerUrl(hash, type), '_blank')}
        className="h-6 w-6 p-0"
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
};

const TransactionDetails: React.FC<{ 
  transaction: CrawlTransaction | AdTransaction | RevenueDistribution;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ transaction, isExpanded, onToggle }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'crawl': return '🕷️';
      case 'advertisement': return '📢';
      case 'distribution': return '💰';
      default: return '📄';
    }
  };

  const getTransactionTitle = (tx: any) => {
    switch (tx.type) {
      case 'crawl':
        return `Content Crawl: ${new URL(tx.contentUrl).hostname}`;
      case 'advertisement':
        return `Ad ${tx.adType}: Campaign ${tx.campaignId}`;
      case 'distribution':
        return `Revenue Distribution: ${tx.distributionType}`;
      default:
        return 'Blockchain Transaction';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTransactionIcon(transaction.type)}</span>
            <div>
              <CardTitle className="text-lg">{getTransactionTitle(transaction)}</CardTitle>
              <div className="flex items-center space-x-4 mt-1">
                <TransactionStatusBadge status={transaction.status} />
                <span className="text-sm text-gray-500">
                  Block #{transaction.blockNumber.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">
                  {transaction.confirmations} confirmations
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(transaction.value)} ETH
              </p>
              <p className="text-sm text-gray-500">
                {transaction.timestamp.toLocaleString()}
              </p>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-0 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transaction Info */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Hash className="h-4 w-4" />
                    <span>Transaction Details</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hash:</span>
                      <BlockchainLink hash={transaction.txHash} type="tx" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Block:</span>
                      <BlockchainLink hash={transaction.blockHash} type="block" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <BlockchainLink hash={transaction.from} type="address" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <BlockchainLink hash={transaction.to} type="address" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gas Used:</span>
                      <span>{transaction.gasUsed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gas Price:</span>
                      <span>{(transaction.gasPrice * 1e9).toFixed(2)} Gwei</span>
                    </div>
                  </div>
                </div>

                {/* Business Logic */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Blocks className="h-4 w-4" />
                    <span>Business Logic</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    {transaction.type === 'crawl' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Content URL:</span>
                          <a 
                            href={(transaction as CrawlTransaction).contentUrl} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-right max-w-48 truncate"
                          >
                            {new URL((transaction as CrawlTransaction).contentUrl).hostname}
                          </a>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Content Hash:</span>
                          <span className="font-mono text-xs">
                            {truncateAddress((transaction as CrawlTransaction).contentHash)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Publisher Share:</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency((transaction as CrawlTransaction).publisherShare)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Platform Fee:</span>
                          <span className="text-blue-600 font-medium">
                            {formatCurrency((transaction as CrawlTransaction).platformFee)} ETH
                          </span>
                        </div>
                      </>
                    )}

                    {transaction.type === 'advertisement' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Campaign ID:</span>
                          <span className="font-mono">{(transaction as AdTransaction).campaignId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ad Type:</span>
                          <Badge variant="secondary">{(transaction as AdTransaction).adType}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Publisher Share:</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency((transaction as AdTransaction).publisherShare)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">AI Searcher Share:</span>
                          <span className="text-purple-600 font-medium">
                            {formatCurrency((transaction as AdTransaction).aiSearcherShare)} ETH
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Platform Fee:</span>
                          <span className="text-blue-600 font-medium">
                            {formatCurrency((transaction as AdTransaction).platformFee)} ETH
                          </span>
                        </div>
                      </>
                    )}

                    {transaction.type === 'distribution' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Distribution Type:</span>
                          <Badge variant="secondary">
                            {(transaction as RevenueDistribution).distributionType.replace('_', ' ')}
                          </Badge>
                        </div>
                        {(transaction as RevenueDistribution).batchId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Batch ID:</span>
                            <span className="font-mono text-xs">
                              {(transaction as RevenueDistribution).batchId}
                            </span>
                          </div>
                        )}
                        {(transaction as RevenueDistribution).merkleProof && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Merkle Proof:</span>
                            <Badge variant="success" className="flex items-center space-x-1">
                              <Shield className="h-3 w-3" />
                              <span>Verified</span>
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Smart Contract Events */}
              {transaction.events && transaction.events.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="font-semibold mb-3 flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Smart Contract Events</span>
                  </h4>
                  <div className="space-y-2">
                    {transaction.events.map((event, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-600">{event.eventName}</span>
                          <span className="text-xs text-gray-500">
                            Log #{event.logIndex}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <p>Contract: {truncateAddress(event.contractAddress)}</p>
                          <p>Block: #{event.blockNumber}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const AuditTrail: React.FC<{ trail: TransactionTrace['auditTrail'] }> = ({ trail }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Audit Trail</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trail.map((entry, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{entry.action}</p>
                  <span className="text-sm text-gray-500">
                    {entry.timestamp.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <span>Block #{entry.blockNumber}</span>
                  <span>Actor: {truncateAddress(entry.actor)}</span>
                  <BlockchainLink hash={entry.txHash} type="tx" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const TransactionTraceComponent: React.FC<TransactionTraceProps> = ({ trace }) => {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const toggleExpanded = (txId: string) => {
    setExpandedTx(expandedTx === txId ? null : txId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Transaction Traceability
        </h2>
        <p className="text-gray-600">
          Complete blockchain audit trail showing transaction flow and revenue distribution
        </p>
      </div>

      {/* Original Transaction */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Original Transaction
        </h3>
        <TransactionDetails
          transaction={trace.originalTx}
          isExpanded={expandedTx === trace.originalTx.id}
          onToggle={() => toggleExpanded(trace.originalTx.id)}
        />
      </div>

      {/* Revenue Distributions */}
      {trace.distributions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Revenue Distributions
          </h3>
          <div className="space-y-4">
            {trace.distributions.map((distribution) => (
              <TransactionDetails
                key={distribution.id}
                transaction={distribution}
                isExpanded={expandedTx === distribution.id}
                onToggle={() => toggleExpanded(distribution.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Batch Settlement */}
      {trace.batchSettlement && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Batch Settlement
          </h3>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Settlement Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Batch ID:</span>
                      <span className="font-mono">{trace.batchSettlement.batchId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Merkle Root:</span>
                      <span className="font-mono text-xs">
                        {truncateAddress(trace.batchSettlement.merkleRoot)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions:</span>
                      <span>{trace.batchSettlement.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(trace.batchSettlement.totalAmount)} ETH
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Blockchain Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Block Number:</span>
                      <span>#{trace.batchSettlement.blockNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction:</span>
                      <BlockchainLink hash={trace.batchSettlement.txHash} type="tx" />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <TransactionStatusBadge status={trace.batchSettlement.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dispute Window:</span>
                      <span>{trace.batchSettlement.disputeWindow / 3600}h</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Trail */}
      <AuditTrail trail={trace.auditTrail} />
    </div>
  );
};
