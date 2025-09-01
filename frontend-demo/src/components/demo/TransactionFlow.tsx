'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  ArrowRight, 
  CheckCircle, 
  Clock,
  DollarSign,
  Newspaper,
  Bot,
  Megaphone
} from 'lucide-react';
import { TransactionStep } from '@/types/demo';
import { TRANSACTION_STEPS, REVENUE_SPLIT, BUSINESS_SCENARIOS } from '@/lib/demo-data';
import { formatCurrency } from '@/lib/utils';

interface FlowStepProps {
  step: TransactionStep;
  isActive: boolean;
  isCompleted: boolean;
}

const FlowStep: React.FC<FlowStepProps> = ({ step, isActive, isCompleted }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: isActive ? 1.05 : 1, 
        opacity: 1,
        backgroundColor: isCompleted ? '#10b981' : isActive ? '#3b82f6' : '#e5e7eb'
      }}
      transition={{ duration: 0.3 }}
      className={`
        relative p-4 rounded-lg border-2 min-h-[100px] flex flex-col justify-center
        ${isCompleted ? 'border-green-500 bg-green-50' : 
          isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
      `}
    >
      <div className="flex items-center space-x-2 mb-2">
        {isCompleted ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : isActive ? (
          <Clock className="h-5 w-5 text-blue-600 animate-spin" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
        )}
        <span className={`font-medium ${
          isCompleted ? 'text-green-800' : isActive ? 'text-blue-800' : 'text-gray-600'
        }`}>
          {step.label}
        </span>
      </div>
      <p className={`text-sm ${
        isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-500'
      }`}>
        {step.description}
      </p>
      
      {/* 进度指示器 */}
      {isActive && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: step.duration || 1 }}
          className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-lg"
        />
      )}
    </motion.div>
  );
};

const EcosystemDiagram: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8">
      <h3 className="text-lg font-semibold text-center mb-6">
        🔄 Ecosystem Flow
      </h3>
      
      <div className="flex items-center justify-between">
        {/* Publisher */}
        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-3 mx-auto">
            <Newspaper className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-blue-800">Publishers</p>
          <p className="text-sm text-gray-600">Content Creators</p>
          <Badge variant="success" className="mt-1">70% Revenue</Badge>
        </motion.div>
        
        {/* Arrow 1 */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </motion.div>
        </div>
        
        {/* AI Apps */}
        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-3 mx-auto">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-green-800">AI Apps</p>
          <p className="text-sm text-gray-600">Content Consumers</p>
          <Badge variant="secondary" className="mt-1">15% Revenue</Badge>
        </motion.div>
        
        {/* Arrow 2 */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          >
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </motion.div>
        </div>
        
        {/* Advertisers */}
        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mb-3 mx-auto">
            <Megaphone className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-purple-800">Advertisers</p>
          <p className="text-sm text-gray-600">Brand Partners</p>
          <Badge variant="warning" className="mt-1">Ad Spend</Badge>
        </motion.div>
      </div>
      
      {/* Platform Fee */}
      <div className="text-center mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <DollarSign className="h-4 w-4" />
          <span>Platform Fee: 15% • Automated Smart Contract Distribution</span>
        </div>
      </div>
    </div>
  );
};

const RevenueDistributionChart: React.FC<{ amount: number }> = ({ amount }) => {
  const publisherShare = (amount * REVENUE_SPLIT.publisher) / 100;
  const aiAppShare = (amount * REVENUE_SPLIT.aiApp) / 100;
  const platformShare = (amount * REVENUE_SPLIT.platform) / 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">Revenue Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Newspaper className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Publisher</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-blue-600">{formatCurrency(publisherShare)}</div>
              <div className="text-sm text-gray-500">{REVENUE_SPLIT.publisher}%</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-green-600" />
              <span className="font-medium">AI App</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-green-600">{formatCurrency(aiAppShare)}</div>
              <div className="text-sm text-gray-500">{REVENUE_SPLIT.aiApp}%</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Platform</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-600">{formatCurrency(platformShare)}</div>
              <div className="text-sm text-gray-500">{REVENUE_SPLIT.platform}%</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TransactionFlow: React.FC = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedScenario, setSelectedScenario] = useState(0);

  const simulateTransaction = async () => {
    setIsAnimating(true);
    setCurrentStep(-1);
    setCompletedSteps([]);

    // 逐步执行每个步骤
    for (let i = 0; i < TRANSACTION_STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500)); // 每步1.5秒
      setCompletedSteps(prev => [...prev, i]);
    }

    setCurrentStep(-1);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const scenario = BUSINESS_SCENARIOS[selectedScenario];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Live Transaction Flow
        </h2>
        <p className="text-gray-600 mb-6">
          Watch how our blockchain-powered system automatically processes transactions
        </p>
        
        <div className="flex justify-center space-x-4 mb-6">
          {BUSINESS_SCENARIOS.map((_, index) => (
            <Button
              key={index}
              variant={selectedScenario === index ? 'default' : 'outline'}
              onClick={() => setSelectedScenario(index)}
              disabled={isAnimating}
              size="sm"
            >
              Scenario {index + 1}
            </Button>
          ))}
        </div>
        
        <Button 
          onClick={simulateTransaction} 
          disabled={isAnimating}
          size="lg"
          className="px-8"
        >
          {isAnimating ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Transaction in Progress...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Simulate Transaction
            </>
          )}
        </Button>
      </div>

      {/* 场景描述 */}
      <Card>
        <CardHeader>
          <CardTitle>{scenario.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{scenario.description}</p>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="font-medium">Transaction Amount: </span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(scenario.participants.amount)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {scenario.participants.publisher && `${scenario.participants.publisher} → `}
              {scenario.participants.aiApp}
              {scenario.participants.advertiser && ` ← ${scenario.participants.advertiser}`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 生态系统图 */}
      <EcosystemDiagram />
      
      {/* 交易步骤 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {TRANSACTION_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <FlowStep
              step={step}
              isActive={currentStep === index}
              isCompleted={completedSteps.includes(index)}
            />
            {index < TRANSACTION_STEPS.length - 1 && (
              <ArrowRight className="h-5 w-5 text-gray-400 mx-2 hidden md:block" />
            )}
          </div>
        ))}
      </div>

      {/* 收益分配 */}
      {(isAnimating || completedSteps.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <RevenueDistributionChart amount={scenario.participants.amount} />
        </motion.div>
      )}
    </div>
  );
};
