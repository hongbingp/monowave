// ABI自动检测和修复脚本
const { ethers } = require('ethers');

// Base Sepolia 网络配置
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 合约地址
const ESCROW_ADDRESS = '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8';
const USDC_ADDRESS = '0x5731AF5B463315028843f599Ae7dF02799a77eE2';

// 测试地址
const TEST_ADDRESSES = {
  AI_SEARCHER: '0x742d35cc3bf21f1cb0c6d6d8a4b37c6b5b5e8b1a',
  DEPLOYER: '0x4D15ebD9cf36894E04802C96dF745458db808611'
};

// 可能的Escrow ABI函数签名
const POTENTIAL_FUNCTIONS = [
  // 前端使用的ABI
  'function balanceOf(address user, address token) view returns (uint256)',
  // 测试脚本使用的ABI
  'function deposits(address user) view returns (uint256)',
  // 其他可能的函数
  'function userDeposits(address user) view returns (uint256)',
  'function getBalance(address user) view returns (uint256)',
  'function escrowBalance(address user) view returns (uint256)',
  // 标准的
  'function balanceOf(address user) view returns (uint256)',
];

// 常见的管理函数
const ADMIN_FUNCTIONS = [
  'function owner() view returns (address)',
  'function tokenContract() view returns (address)',
  'function totalDeposits() view returns (uint256)',
];

async function detectWorkingABI() {
  console.log('🔍 开始ABI自动检测...\n');
  
  try {
    // 1. 验证合约存在
    const code = await provider.getCode(ESCROW_ADDRESS);
    if (code === '0x') {
      console.log('❌ 合约不存在');
      return;
    }
    console.log('✅ Escrow合约已部署');
    
    const workingFunctions = [];
    const failedFunctions = [];
    
    // 2. 测试每个可能的函数
    console.log('\n📋 测试潜在的ABI函数:');
    
    for (const functionSig of POTENTIAL_FUNCTIONS) {
      try {
        // 创建临时合约实例
        const tempContract = new ethers.Contract(ESCROW_ADDRESS, [functionSig], provider);
        const functionName = functionSig.match(/function (\w+)/)[1];
        
        // 根据函数签名确定参数
        let args = [];
        if (functionSig.includes('user, address token')) {
          args = [TEST_ADDRESSES.AI_SEARCHER, USDC_ADDRESS];
        } else if (functionSig.includes('address user')) {
          args = [TEST_ADDRESSES.AI_SEARCHER];
        }
        
        // 尝试调用函数
        const result = await tempContract[functionName](...args);
        console.log(`  ✅ ${functionName}: 成功 (返回值: ${result.toString()})`);
        workingFunctions.push({ functionSig, functionName, result: result.toString() });
        
      } catch (error) {
        const functionName = functionSig.match(/function (\w+)/)[1];
        console.log(`  ❌ ${functionName}: 失败`);
        failedFunctions.push({ functionSig, functionName, error: error.message });
      }
    }
    
    // 3. 测试管理函数
    console.log('\n🔧 测试管理函数:');
    
    for (const functionSig of ADMIN_FUNCTIONS) {
      try {
        const tempContract = new ethers.Contract(ESCROW_ADDRESS, [functionSig], provider);
        const functionName = functionSig.match(/function (\w+)/)[1];
        
        const result = await tempContract[functionName]();
        console.log(`  ✅ ${functionName}: ${result.toString()}`);
        workingFunctions.push({ functionSig, functionName, result: result.toString() });
        
      } catch (error) {
        const functionName = functionSig.match(/function (\w+)/)[1];
        console.log(`  ❌ ${functionName}: 失败`);
        failedFunctions.push({ functionSig, functionName, error: error.message });
      }
    }
    
    // 4. 生成正确的ABI
    if (workingFunctions.length > 0) {
      console.log('\n🎯 检测到的可用函数:');
      
      const correctABI = workingFunctions.map(func => {
        // 将字符串签名转换为ABI格式
        if (func.functionName === 'balanceOf' && func.functionSig.includes('user, address token')) {
          return {
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'token', type: 'address' }
            ],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          };
        } else if (func.functionName === 'deposits') {
          return {
            inputs: [{ name: 'user', type: 'address' }],
            name: 'deposits',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          };
        } else if (func.functionName === 'owner') {
          return {
            inputs: [],
            name: 'owner',
            outputs: [{ name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          };
        } else if (func.functionName === 'tokenContract') {
          return {
            inputs: [],
            name: 'tokenContract',
            outputs: [{ name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          };
        } else if (func.functionName === 'totalDeposits') {
          return {
            inputs: [],
            name: 'totalDeposits',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          };
        }
        return null;
      }).filter(Boolean);
      
      console.log('\n📄 生成的正确ABI:');
      console.log('const ESCROW_ABI = ' + JSON.stringify(correctABI, null, 2) + ' as const;');
      
      // 5. 测试修复后的功能
      console.log('\n🧪 使用正确ABI进行功能测试:');
      
      if (correctABI.length > 0) {
        const escrowContract = new ethers.Contract(ESCROW_ADDRESS, correctABI, provider);
        
        // 测试余额查询
        for (const [role, address] of Object.entries(TEST_ADDRESSES)) {
          try {
            let balance;
            
            // 根据可用函数选择调用方式
            const hasBalanceOf = correctABI.find(f => f.name === 'balanceOf');
            const hasDeposits = correctABI.find(f => f.name === 'deposits');
            
            if (hasBalanceOf && hasBalanceOf.inputs.length === 2) {
              balance = await escrowContract.balanceOf(address, USDC_ADDRESS);
            } else if (hasDeposits) {
              balance = await escrowContract.deposits(address);
            }
            
            if (balance !== undefined) {
              const balanceFormatted = ethers.formatUnits(balance, 6);
              console.log(`  ✅ ${role}: ${balanceFormatted} USDC`);
            }
            
          } catch (error) {
            console.log(`  ❌ ${role}: 查询失败 - ${error.message}`);
          }
        }
      }
      
      return correctABI;
      
    } else {
      console.log('\n❌ 未检测到任何可用函数');
      console.log('可能的原因:');
      console.log('1. 合约ABI与预期不符');
      console.log('2. 合约可能是代理合约');
      console.log('3. 合约可能有访问控制');
    }
    
  } catch (error) {
    console.error('❌ ABI检测失败:', error.message);
  }
}

// 执行检测
detectWorkingABI();