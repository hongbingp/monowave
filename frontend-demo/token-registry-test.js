// TokenRegistry 状态检查脚本
const { ethers } = require('ethers');

// Base Sepolia 网络配置
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 合约地址
const CONTRACT_ADDRESSES = {
  MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
  TokenRegistry: '0x98B5A80a43Ff4d5EC6d4f200347A66069B7FAf60'
};

// TokenRegistry ABI
const TOKEN_REGISTRY_ABI = [
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'isAllowedToken',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'tokenLimits',
    outputs: [
      { name: 'singleMax', type: 'uint256' },
      { name: 'dailyMax', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  }
];

async function checkTokenRegistryStatus() {
  console.log('🔍 检查TokenRegistry状态...\n');
  
  try {
    const tokenRegistry = new ethers.Contract(CONTRACT_ADDRESSES.TokenRegistry, TOKEN_REGISTRY_ABI, provider);
    
    // 1. 检查USDC是否被允许
    console.log('📋 1. 检查USDC代币状态:');
    const isAllowed = await tokenRegistry.isAllowedToken(CONTRACT_ADDRESSES.MockUSDC);
    console.log(`  USDC被允许: ${isAllowed ? '✅ 是' : '❌ 否'}`);
    
    if (!isAllowed) {
      console.log('  ⚠️  USDC代币未被TokenRegistry允许，这是Deposit失败的原因！');
    }
    
    // 2. 检查代币限额
    console.log('\n💰 2. 检查USDC代币限额:');
    try {
      const limits = await tokenRegistry.tokenLimits(CONTRACT_ADDRESSES.MockUSDC);
      const singleMax = ethers.formatUnits(limits.singleMax, 6);
      const dailyMax = ethers.formatUnits(limits.dailyMax, 6);
      
      console.log(`  单次最大限额: ${singleMax} USDC`);
      console.log(`  每日最大限额: ${dailyMax} USDC`);
      
      if (limits.singleMax === 0n && limits.dailyMax === 0n) {
        console.log('  ⚠️  限额为0，可能需要设置合适的限额');
      }
    } catch (error) {
      console.log('  ❌ 无法读取限额:', error.message);
    }
    
    // 3. 问题诊断
    console.log('\n🔧 3. 问题诊断和解决方案:');
    
    if (!isAllowed) {
      console.log('  ❌ 主要问题: USDC代币未在TokenRegistry中被允许');
      console.log('  🔧 解决方案:');
      console.log('     1. 需要合约管理员调用 TokenRegistry.allow(USDC_ADDRESS, true)');
      console.log('     2. 可能还需要设置合适的限额');
      console.log('     3. 这需要GOVERNOR_ROLE权限');
    } else {
      console.log('  ✅ USDC代币已被允许，可以继续检查其他问题');
    }
    
    // 4. 前端解决方案
    console.log('\n🌐 4. 前端改进建议:');
    console.log('  1. 添加更详细的错误处理和用户提示');
    console.log('  2. 在存款前检查TokenRegistry状态');
    console.log('  3. 显示清晰的错误信息给用户');
    console.log('  4. 提供联系管理员的方式');
    
  } catch (error) {
    console.error('❌ TokenRegistry状态检查失败:', error.message);
  }
}

// 执行检查
checkTokenRegistryStatus();