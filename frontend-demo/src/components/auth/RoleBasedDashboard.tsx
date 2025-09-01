'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainContent } from '@/components/layout/MainContent';

export type UserRole = 'ai_searcher' | 'publisher' | 'advertiser';

interface User {
  id: number;
  email: string;
  userType: UserRole;
  walletAddress: string;
  balance: number;
  status: string;
  name: string;
}

interface RoleBasedDashboardProps {
  initialRole: UserRole;
  userData: User;
  onLogout: () => void;
}

export function RoleBasedDashboard({ initialRole, userData, onLogout }: RoleBasedDashboardProps) {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="h-screen flex bg-mw-mist-100">
      <Sidebar 
        user={userData}
        onLogout={onLogout}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <MainContent 
        user={userData}
        activeView={activeView}
      />
    </div>
  );
}