'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { TransactionFlow } from '@/components/demo/TransactionFlow';

export default function LivePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/demo" 
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Demo</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-semibold text-gray-900">Live Transaction Flow</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <TransactionFlow />
          </motion.div>
        </div>
      </main>

      {/* Navigation */}
      <div className="fixed bottom-6 left-6">
        <Link
          href="/"
          className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold shadow-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </Link>
      </div>
    </div>
  );
}
