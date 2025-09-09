/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  },
  webpack: (config, { dev, isServer }) => {
    // 修复 WalletConnect/pino 相关的模块解析问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // 忽略 pino-pretty 依赖
    config.externals = config.externals || [];
    config.externals.push({
      'pino-pretty': 'pino-pretty',
    });
    
    return config;
  },
}

module.exports = nextConfig
