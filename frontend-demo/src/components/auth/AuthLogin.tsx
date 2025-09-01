'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  LogIn,
  Eye,
  EyeOff,
  User,
  Lock,
  AlertCircle
} from 'lucide-react';

type UserRole = 'ai_searcher' | 'publisher' | 'advertiser';

interface AuthLoginProps {
  onLogin: (role: UserRole, userData: any) => void;
}

interface LoginCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
  role?: UserRole;
}

// 预设的用户账户
const USER_ACCOUNTS = {
  'ai-dev@monowave.com': {
    password: 'aidev2024',
    role: 'ai_searcher' as UserRole,
    userData: {
      id: 1,
      email: 'ai-dev@monowave.com',
      userType: 'ai_searcher',
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      balance: 89.23,
      status: 'active',
      name: 'AI Developer'
    }
  },
  'publisher@monowave.com': {
    password: 'pub2024',
    role: 'publisher' as UserRole,
    userData: {
      id: 2,
      email: 'publisher@monowave.com',
      userType: 'publisher',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      balance: 0.0,
      status: 'active',
      name: 'Content Publisher'
    }
  },
  'advertiser@monowave.com': {
    password: 'adv2024',
    role: 'advertiser' as UserRole,
    userData: {
      id: 3,
      email: 'advertiser@monowave.com',
      userType: 'advertiser',
      walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      balance: 1250.75,
      status: 'active',
      name: 'Brand Advertiser'
    }
  }
};

export const AuthLogin: React.FC<AuthLoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'ai_searcher'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isSignUp) {
      // 注册逻辑
      if (credentials.password !== credentials.confirmPassword) {
        setError('Passwords do not match.');
        setIsLoading(false);
        return;
      }

      if (!credentials.name || credentials.name.trim().length < 2) {
        setError('Please enter a valid name.');
        setIsLoading(false);
        return;
      }

      // 检查邮箱是否已存在
      if (USER_ACCOUNTS[credentials.email as keyof typeof USER_ACCOUNTS]) {
        setError('An account with this email already exists.');
        setIsLoading(false);
        return;
      }

      // 创建新用户 (在实际应用中这会调用API)
      const newUser = {
        id: Date.now(),
        email: credentials.email,
        userType: credentials.role!,
        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        balance: 0,
        status: 'active',
        name: credentials.name
      };

      onLogin(newUser.userType, newUser);
    } else {
      // 登录逻辑
      const account = USER_ACCOUNTS[credentials.email as keyof typeof USER_ACCOUNTS];
      
      if (!account) {
        setError('Account not found. Please check your email address.');
        setIsLoading(false);
        return;
      }

      if (account.password !== credentials.password) {
        setError('Invalid password. Please try again.');
        setIsLoading(false);
        return;
      }

      // 登录成功
      onLogin(account.role, account.userData);
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // 清除错误信息
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bronze-current-from via-bronze-current-via to-bronze-current-to flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="monowave Logo" 
              className="h-20 object-contain"
            />
          </div>

        </motion.div>

        {/* Login Form */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="shadow-lg border border-mw-mist-400 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-center text-mw-ink-950">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-mw-ink-950">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-mw-slate-600" />
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-mw-mist-400 rounded-lg focus:ring-2 focus:ring-mw-teal focus:border-transparent transition-colors"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-mw-ink-950">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-mw-slate-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full pl-10 pr-12 py-2 border border-mw-mist-400 rounded-lg focus:ring-2 focus:ring-mw-teal focus:border-transparent transition-colors"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-mw-slate-600 hover:text-mw-ink-950"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign Up Additional Fields */}
                {isSignUp && (
                  <>
                    {/* Name Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-mw-ink-950">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-mw-slate-600" />
                        <input
                          type="text"
                          value={credentials.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-mw-mist-400 rounded-lg focus:ring-2 focus:ring-mw-teal focus:border-transparent transition-colors"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-mw-ink-950">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-mw-slate-600" />
                        <input
                          type="password"
                          value={credentials.confirmPassword || ''}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-mw-mist-400 rounded-lg focus:ring-2 focus:ring-mw-teal focus:border-transparent transition-colors"
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-mw-ink-950">Account Type</label>
                      <select
                        value={credentials.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-4 py-2 border border-mw-mist-400 rounded-lg focus:ring-2 focus:ring-mw-teal focus:border-transparent transition-colors bg-white"
                        required
                      >
                        <option value="ai_searcher">AI Developer</option>
                        <option value="publisher">Publisher</option>
                        <option value="advertiser">Advertiser</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-2 text-mw-danger text-sm"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={isLoading || !credentials.email || !credentials.password || (isSignUp && (!credentials.name || !credentials.confirmPassword))}
                  className="w-full bg-mw-teal hover:bg-mw-ocean-deep text-white py-2 transition-colors focus:ring-2 focus:ring-mw-bronze-hi focus:ring-opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn className="h-4 w-4" />
                      <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    </div>
                  )}
                </Button>

                {/* Mode Switch */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError('');
                      setCredentials({
                        email: '',
                        password: '',
                        confirmPassword: '',
                        name: '',
                        role: 'ai_searcher'
                      });
                    }}
                    className="text-sm text-mw-slate-600 hover:text-mw-ink-950 transition-colors"
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Credentials Helper */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowCredentials(!showCredentials)}
            className="text-mw-slate-600 hover:text-mw-ink-950-950"
          >
            {showCredentials ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showCredentials ? 'Hide' : 'Show'} Test Accounts
          </Button>
          
          {showCredentials && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-4 p-4 bg-mw-mist-100 rounded-lg text-left"
            >
              <h3 className="font-semibold text-mw-ink-950 mb-3">Test Accounts:</h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-white rounded border-l-4 border-mw-teal">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-mw-ink-950">AI Developer</span>
                    <Badge className="bg-mw-bronze text-white">AI Apps</Badge>
                  </div>
                  <p className="text-mw-slate-600">ai-dev@monowave.com</p>
                  <p className="text-mw-slate-600 font-mono">aidev2024</p>
                </div>
                
                <div className="p-3 bg-white rounded border-l-4 border-mw-patina">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-mw-ink-950">Publisher</span>
                    <Badge className="bg-mw-patina text-white">Content</Badge>
                  </div>
                  <p className="text-mw-slate-600">publisher@monowave.com</p>
                  <p className="text-mw-slate-600 font-mono">pub2024</p>
                </div>
                
                <div className="p-3 bg-white rounded border-l-4 border-mw-bronze">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-mw-ink-950">Advertiser</span>
                    <Badge className="bg-mw-bronze-hi text-mw-ink-950">Marketing</Badge>
                  </div>
                  <p className="text-mw-slate-600">advertiser@monowave.com</p>
                  <p className="text-mw-slate-600 font-mono">adv2024</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
