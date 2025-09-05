'use client';

import React from 'react';
import { LiveMetrics } from '@/components/demo/LiveMetrics';

export default function TestApiPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              API Integration Test
            </h1>
            <p className="text-lg text-gray-600">
              Testing real-time data integration between frontend and backend
            </p>
          </div>
          
          <LiveMetrics />
        </div>
      </div>
    </div>
  );
}
