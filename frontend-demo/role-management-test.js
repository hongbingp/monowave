// 角色管理和分配脚本
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

// 角色常量 (基于AccessControlRoles.sol)
const ROLES = {
  // ParticipantRegistry 角色位图
  ROLE_PUBLISHER: 1 << 0,    // 1
  ROLE_ADVERTISER: 1 << 1,   // 2  
  ROLE_AI_SEARCHER: 1 << 2,  // 4
  
  // AccessControl 角色哈希
  GOVERNOR_ROLE: ethers.id("GOVERNOR_ROLE"),
  SETTLER_ROLE: ethers.id("SETTLER_ROLE"),
  LEDGER_ROLE: ethers.id("LEDGER_ROLE"),
  TREASURER_ROLE: ethers.id("TREASURER_ROLE"),
  RISK_ROLE: ethers.id("RISK_ROLE"),
  
  // AccessControl 业务角色
  PUBLISHER_MANAGER_ROLE: ethers.id("PUBLISHER_MANAGER_ROLE"),
  ADVERTISER_MANAGER_ROLE: ethers.id("ADVERTISER_MANAGER_ROLE"),
  AI_SEARCHER_MANAGER_ROLE: ethers.id("AI_SEARCHER_MANAGER_ROLE"),
  CHARGE_MANAGER_ROLE: ethers.id("CHARGE_MANAGER_ROLE"),
  REVENUE_DISTRIBUTOR_ROLE: ethers.id("REVENUE_DISTRIBUTOR_ROLE"),
  PREPAYMENT_MANAGER_ROLE: ethers.id("PREPAYMENT_MANAGER_ROLE"),
  AD_TRANSACTION_RECORDER_ROLE: ethers.id("AD_TRANSACTION_RECORDER_ROLE")
};

// AccessControl ABI
const ACCESS_CONTROL_ABI = [
  'function owner() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
  'function revokeRole(bytes32 role, address account)', 
  'function getRoleMembers(bytes32 role) view returns (address[])',
  'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
  'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)'
];

// ParticipantRegistry ABI  
const PARTICIPANT_REGISTRY_ABI = [
  'function register(address who, uint256 roleBitmap, address payout, bytes32 meta)',
  'function get(address who) view returns (tuple(address payout, uint256 roleBitmap, uint8 status, bytes32 meta))',
  'function isRegistered(address who) view returns (bool)',
  'function hasRole(address who, uint8 r) view returns (bool)',
  'function roleBitmapOf(address who) view returns (uint256)',
  'function statusOf(address who) view returns (uint8)',
  'event ParticipantRegistered(address indexed who, uint256 roles, address payout)',
  'event ParticipantUpdated(address indexed who)'
];

async function checkCurrentRoleStatus() {
  console.log('🔍 检查当前角色分配状态...\n');
  
  try {
    const accessControl = new ethers.Contract(CONTRACT_ADDRESSES.AccessControl, ACCESS_CONTROL_ABI, provider);
    const participantRegistry = new ethers.Contract(CONTRACT_ADDRESSES.ParticipantRegistry, PARTICIPANT_REGISTRY_ABI, provider);
    
    // 1. 检查合约所有者
    console.log('👑 1. 合约所有者信息:');
    const owner = await accessControl.owner();
    console.log(`  AccessControl所有者: ${owner}`);
    console.log(`  是否为DEPLOYER: ${owner.toLowerCase() === TEST_ADDRESSES.DEPLOYER.toLowerCase() ? '✅' : '❌'}`);
    
    // 2. 检查AccessControl中的管理角色
    console.log('\n🏛️ 2. AccessControl管理角色状态:');
    
    const managementRoles = [
      { name: 'GOVERNOR_ROLE', hash: ROLES.GOVERNOR_ROLE },
      { name: 'SETTLER_ROLE', hash: ROLES.SETTLER_ROLE },
      { name: 'TREASURER_ROLE', hash: ROLES.TREASURER_ROLE },
      { name: 'LEDGER_ROLE', hash: ROLES.LEDGER_ROLE }
    ];
    
    for (const role of managementRoles) {
      console.log(`  📋 ${role.name}:`);
      try {
        const members = await accessControl.getRoleMembers(role.hash);
        if (members.length > 0) {
          members.forEach(member => {
            const label = getAddressLabel(member);
            console.log(`    - ${member} (${label})`);
          });
        } else {
          console.log('    - 无成员');
        }
      } catch (error) {
        console.log(`    - 查询失败: ${error.message}`);
      }
    }
    
    // 3. 检查业务角色
    console.log('\n💼 3. AccessControl业务角色状态:');
    const businessRoles = [
      { name: 'PUBLISHER_MANAGER', hash: ROLES.PUBLISHER_MANAGER_ROLE },
      { name: 'ADVERTISER_MANAGER', hash: ROLES.ADVERTISER_MANAGER_ROLE },
      { name: 'AI_SEARCHER_MANAGER', hash: ROLES.AI_SEARCHER_MANAGER_ROLE }
    ];
    
    for (const role of businessRoles) {
      console.log(`  📋 ${role.name}:`);
      try {
        const members = await accessControl.getRoleMembers(role.hash);
        if (members.length > 0) {
          members.forEach(member => {
            const label = getAddressLabel(member);
            console.log(`    - ${member} (${label})`);
          });
        } else {
          console.log('    - 无成员');
        }
      } catch (error) {
        console.log(`    - 查询失败: ${error.message}`);
      }
    }
    
    // 4. 检查ParticipantRegistry注册状态
    console.log('\n👥 4. ParticipantRegistry注册状态:');
    
    for (const [role, address] of Object.entries(TEST_ADDRESSES)) {
      if (role === 'DEPLOYER') continue; // 跳过部署者
      
      console.log(`  📋 ${role} (${address}):`);
      try {
        const isRegistered = await participantRegistry.isRegistered(address);
        
        if (isRegistered) {
          const participant = await participantRegistry.get(address);
          const roleBitmap = participant.roleBitmap;
          const status = participant.status;
          const payout = participant.payout;
          
          console.log(`    ✅ 已注册`);
          console.log(`    - 角色位图: ${roleBitmap} (${decodeBitmap(roleBitmap)})`);
          console.log(`    - 状态: ${decodeStatus(status)}`);
          console.log(`    - 收款地址: ${payout}`);
        } else {
          console.log(`    ❌ 未注册`);
        }
      } catch (error) {
        console.log(`    ❌ 查询失败: ${error.message}`);
      }
    }
    
    // 5. 角色分配建议
    console.log('\n💡 5. 角色分配建议:');
    
    console.log('\n  🎯 需要完成的任务:');
    console.log('     1. 如果DEPLOYER不是所有者，需要转移所有权');
    console.log('     2. 为DEPLOYER分配GOVERNOR_ROLE (用于管理其他角色)');
    console.log('     3. 在ParticipantRegistry中注册各个测试账号:');
    console.log('        - AI_SEARCHER: ROLE_AI_SEARCHER (4)');
    console.log('        - PUBLISHER: ROLE_PUBLISHER (1)');  
    console.log('        - ADVERTISER: ROLE_ADVERTISER (2)');
    console.log('     4. 可选：为业务角色分配管理权限');
    
  } catch (error) {
    console.error('❌ 角色状态检查失败:', error.message);
  }
}

function getAddressLabel(address) {
  const addr = address.toLowerCase();
  for (const [role, testAddr] of Object.entries(TEST_ADDRESSES)) {
    if (testAddr.toLowerCase() === addr) {
      return role;
    }
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function decodeBitmap(bitmap) {
  const roles = [];
  if (bitmap & ROLES.ROLE_PUBLISHER) roles.push('PUBLISHER');
  if (bitmap & ROLES.ROLE_ADVERTISER) roles.push('ADVERTISER');
  if (bitmap & ROLES.ROLE_AI_SEARCHER) roles.push('AI_SEARCHER');
  return roles.length > 0 ? roles.join(' + ') : 'NONE';
}

function decodeStatus(status) {
  switch (status) {
    case 0: return '❌ 未激活';
    case 1: return '✅ 激活';
    case 2: return '⚠️ 暂停';
    default: return `未知(${status})`;
  }
}

// 执行检查
checkCurrentRoleStatus();