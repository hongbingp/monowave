// 合约连接验证脚本
const { ethers } = require('ethers');

// Base Sepolia RPC
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 合约地址
const CONTRACT_ADDRESSES = {
  MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
  AccessControl: '0x82f2085848b4743629733CA9744cDbe49E57C9bA',
  TokenRegistry: '0x98B5A80a43Ff4d5EC6d4f200347A66069B7FAf60',
  ParticipantRegistry: '0xA78606270A7b752bBda7F847F98Ce25888263A3E',
  BatchLedger: '0x3ADE3AAE3450B0e7d6F2Ae652bD9D3567D47F61e',
  Escrow: '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8',
  Distributor: '0xcBAD9733BCb2b9CBddbAAfD45449557A06C6a619'
};

// 测试地址
const TEST_ADDRESSES = {
  AI_SEARCHER: '0x742d35cc3bf21f1cb0c6d6d8a4b37c6b5b5e8b1a',
  PUBLISHER: '0x8ba1f109551bd432803012645hac136c53b6b80',
  ADVERTISER: '0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5',
  DEPLOYER: '0x4D15ebD9cf36894E04802C96dF745458db808611'
};

// USDC ABI (简化版)
const USDC_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

async function verifyContracts() {
  console.log('🔍 开始验证合约连接...\n');
  
  try {
    // 检查网络
    const network = await provider.getNetwork();
    console.log(`✅ 网络连接成功: ${network.name} (Chain ID: ${network.chainId})`);
    
    // 检查USDC合约
    console.log('\n📋 验证USDC合约:');
    const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.MockUSDC, USDC_ABI, provider);
    
    const name = await usdcContract.name();
    const symbol = await usdcContract.symbol();
    const decimals = await usdcContract.decimals();
    const totalSupply = await usdcContract.totalSupply();
    
    console.log(`  名称: ${name}`);
    console.log(`  符号: ${symbol}`);
    console.log(`  精度: ${decimals}`);
    console.log(`  总供应量: ${ethers.formatUnits(totalSupply, decimals)}`);
    
    // 检查测试地址余额
    console.log('\n💰 检查测试地址余额:');
    for (const [role, address] of Object.entries(TEST_ADDRESSES)) {
      try {
        const balance = await usdcContract.balanceOf(address);
        const ethBalance = await provider.getBalance(address);
        console.log(`  ${role}:`);
        console.log(`    地址: ${address}`);
        console.log(`    USDC余额: ${ethers.formatUnits(balance, decimals)}`);
        console.log(`    ETH余额: ${ethers.formatEther(ethBalance)}`);
      } catch (error) {
        console.log(`  ${role}: 查询失败 - ${error.message}`);
      }
    }
    
    // 检查其他合约是否部署
    console.log('\n📊 验证其他合约部署状态:');
    for (const [name, address] of Object.entries(CONTRACT_ADDRESSES)) {
      if (name === 'MockUSDC') continue;
      
      try {
        const code = await provider.getCode(address);
        const isDeployed = code !== '0x';
        console.log(`  ${name}: ${isDeployed ? '✅ 已部署' : '❌ 未部署'}`);
      } catch (error) {
        console.log(`  ${name}: ❌ 检查失败`);
      }
    }
    
    console.log('\n🎯 合约验证完成！');
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

// 执行验证
verifyContracts();