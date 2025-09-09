'use client';

import React, { useState } from 'react';
import { AuthLogin } from '@/components/auth/AuthLogin';
import { RoleBasedDashboard } from '@/components/auth/RoleBasedDashboard';

type UserRole = 'ai_searcher' | 'publisher' | 'advertiser';

interface User {
  id: number;
  email: string;
  userType: UserRole;
  walletAddress: string;
  balance: number;
  status: string;
  name: string;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; userData: User } | null>(null);
  
  const handleLogin = (role: UserRole, userData: User) => {
    setCurrentUser({ role, userData });
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
  };
  
  // 如果用户已登录，显示Dashboard
  if (currentUser) {
    return (
      <RoleBasedDashboard 
        initialRole={currentUser.role} 
        userData={currentUser.userData}
        onLogout={handleLogout} 
      />
    );
  }
  
  // 显示登录页面 - 不显示钱包连接
  return (
    <div>
      <AuthLogin onLogin={handleLogin} />
    </div>
  );
}
