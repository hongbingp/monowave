// 角色分配执行脚本
const { ethers } = require('ethers');

// Base Sepolia 网络配置
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 合约地址
const CONTRACT_ADDRESSES = {
  AccessControl: '0x82f2085848b4743629733CA9744cDbe49E57C9bA',
  ParticipantRegistry: '0xA78606270A7b752bBda7F847F98Ce25888263A3E'
};

// 测试账户地址
const TEST_ADDRESSES = {
  AI_SEARCHER: '0xa8aD655BedCeCF10c6E3156Fc937C2D63a01159c',
  PUBLISHER: '0x8eE41EE5032E30F0bb04444463142DCDc53A19f0',
  ADVERTISER: '0x61f7204072D91cb5DC79a99D7d0D7551E302B921',
  DEPLOYER: '0x4D15ebD9cf36894E04802C96dF745458db808611'
};

// 角色常量
const ROLES = {
  ROLE_PUBLISHER: 1 << 0,    // 1
  ROLE_ADVERTISER: 1 << 1,   // 2  
  ROLE_AI_SEARCHER: 1 << 2,  // 4
  
  PUBLISHER_MANAGER_ROLE: ethers.id("PUBLISHER_MANAGER_ROLE"),
  ADVERTISER_MANAGER_ROLE: ethers.id("ADVERTISER_MANAGER_ROLE"),
  AI_SEARCHER_MANAGER_ROLE: ethers.id("AI_SEARCHER_MANAGER_ROLE")
};

// ParticipantRegistry ABI (需要写入权限)  
const PARTICIPANT_REGISTRY_ABI = [
  'function register(address who, uint256 roleBitmap, address payout, bytes32 meta)',
  'function get(address who) view returns (tuple(address payout, uint256 roleBitmap, uint8 status, bytes32 meta))',
  'function isRegistered(address who) view returns (bool)'
];

// AccessControl ABI
const ACCESS_CONTROL_ABI = [
  'function grantRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)'
];

async function assignRolesToTestAccounts() {
  console.log('🚀 开始为测试账号分配角色...\n');
  
  // ⚠️ 警告：这个脚本只能模拟交易调用，无法实际执行
  console.log('⚠️  注意: 这是一个模拟脚本，显示需要执行的交易');
  console.log('   实际执行需要使用具有DEPLOYER私钥的wallet\n');
  
  try {
    const accessControl = new ethers.Contract(CONTRACT_ADDRESSES.AccessControl, ACCESS_CONTROL_ABI, provider);
    const participantRegistry = new ethers.Contract(CONTRACT_ADDRESSES.ParticipantRegistry, PARTICIPANT_REGISTRY_ABI, provider);
    
    // 1. 为测试账号在ParticipantRegistry中注册角色
    console.log('📋 1. ParticipantRegistry 角色注册:');
    
    const registrations = [
      {
        name: 'AI_SEARCHER',
        address: TEST_ADDRESSES.AI_SEARCHER,
        roleBitmap: ROLES.ROLE_AI_SEARCHER,
        meta: ethers.id("AI_SEARCHER_TEST_ACCOUNT")
      },
      {
        name: 'PUBLISHER', 
        address: TEST_ADDRESSES.PUBLISHER,
        roleBitmap: ROLES.ROLE_PUBLISHER,
        meta: ethers.id("PUBLISHER_TEST_ACCOUNT")
      },
      {
        name: 'ADVERTISER',
        address: TEST_ADDRESSES.ADVERTISER, 
        roleBitmap: ROLES.ROLE_ADVERTISER,
        meta: ethers.id("ADVERTISER_TEST_ACCOUNT")
      }
    ];
    
    for (const reg of registrations) {
      console.log(`\\n  🔧 注册 ${reg.name}:`);
      console.log(`     地址: ${reg.address}`);
      console.log(`     角色位图: ${reg.roleBitmap}`);
      
      // 检查是否已注册
      const isRegistered = await participantRegistry.isRegistered(reg.address);
      if (isRegistered) {
        console.log('     状态: ✅ 已注册 (跳过)');
        continue;
      }
      
      // 构造调用数据
      const calldata = participantRegistry.interface.encodeFunctionData('register', [
        reg.address,
        reg.roleBitmap, 
        reg.address, // 使用自己的地址作为payout地址
        reg.meta
      ]);
      
      console.log('     📄 需要执行的交易:');
      console.log(`       合约: ${CONTRACT_ADDRESSES.ParticipantRegistry}`);
      console.log(`       方法: register(${reg.address}, ${reg.roleBitmap}, ${reg.address}, ${reg.meta})`);
      console.log(`       调用者: DEPLOYER (${TEST_ADDRESSES.DEPLOYER})`);
      console.log('     状态: ⏳ 等待执行');
    }
    
    // 2. 可选：为测试账号分配业务管理角色
    console.log('\\n📋 2. AccessControl 业务管理角色 (可选):');
    
    const businessRoles = [
      {
        role: ROLES.PUBLISHER_MANAGER_ROLE,
        name: 'PUBLISHER_MANAGER_ROLE',
        account: TEST_ADDRESSES.PUBLISHER
      },
      {
        role: ROLES.ADVERTISER_MANAGER_ROLE,
        name: 'ADVERTISER_MANAGER_ROLE', 
        account: TEST_ADDRESSES.ADVERTISER
      },
      {
        role: ROLES.AI_SEARCHER_MANAGER_ROLE,
        name: 'AI_SEARCHER_MANAGER_ROLE',
        account: TEST_ADDRESSES.AI_SEARCHER
      }
    ];
    
    for (const businessRole of businessRoles) {
      console.log(`\\n  🔧 分配 ${businessRole.name}:`);
      console.log(`     接受者: ${businessRole.account}`);
      
      // 检查是否已有角色
      const hasRole = await accessControl.hasRole(businessRole.role, businessRole.account);
      if (hasRole) {
        console.log('     状态: ✅ 已有角色 (跳过)');
        continue;
      }
      
      console.log('     📄 需要执行的交易:');
      console.log(`       合约: ${CONTRACT_ADDRESSES.AccessControl}`);
      console.log(`       方法: grantRole(${businessRole.role}, ${businessRole.account})`);
      console.log(`       调用者: DEPLOYER (${TEST_ADDRESSES.DEPLOYER})`);
      console.log('     状态: ⏳ 等待执行');
    }
    
    // 3. 提供具体执行方案
    console.log('\\n🛠️  3. 具体执行方案:');
    
    console.log('\\n   方案A: 使用Hardhat脚本执行');
    console.log('   =====================================');
    console.log('   1. 在monowave_sc目录创建scripts/assign-roles.js');
    console.log('   2. 使用hardhat运行: npx hardhat run scripts/assign-roles.js --network baseSepolia');
    console.log('   3. 确保DEPLOYER私钥在.env中配置');
    
    console.log('\\n   方案B: 使用前端界面执行');
    console.log('   =====================================');
    console.log('   1. 在前端添加管理员界面');
    console.log('   2. 连接DEPLOYER钱包');
    console.log('   3. 通过UI调用合约方法');
    
    console.log('\\n   方案C: 使用Ethers.js直接执行');
    console.log('   =====================================');
    console.log('   1. 配置DEPLOYER私钥');
    console.log('   2. 创建wallet实例');
    console.log('   3. 执行上述交易');
    
    console.log('\\n💡 建议使用方案A (Hardhat脚本)，最安全可靠');
    
  } catch (error) {
    console.error('❌ 角色分配规划失败:', error.message);
  }
}

// 执行角色分配规划
assignRolesToTestAccounts();