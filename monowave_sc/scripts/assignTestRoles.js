import hre from "hardhat";
const { ethers } = hre;
import { readFileSync } from "fs";

// 测试账户地址
const TEST_ADDRESSES = {
  AI_SEARCHER: '0xa8aD655BedCeCF10c6E3156Fc937C2D63a01159c',
  PUBLISHER: '0x8eE41EE5032E30F0bb04444463142DCDc53A19f0',
  ADVERTISER: '0x61f7204072D91cb5DC79a99D7d0D7551E302B921',
  DEPLOYER: '0x4D15ebD9cf36894E04802C96dF745458db808611'
};

// 角色常量 (基于AccessControlRoles.sol)
const ROLE_CONSTANTS = {
  ROLE_PUBLISHER: 1 << 0,    // 1
  ROLE_ADVERTISER: 1 << 1,   // 2  
  ROLE_AI_SEARCHER: 1 << 2,  // 4
};

async function main() {
  console.log('🚀 开始为测试账号分配角色...\n');
  
  // 在main函数中初始化角色哈希 (使用预计算的哈希值)
  const ROLES = {
    ...ROLE_CONSTANTS,
    PUBLISHER_MANAGER_ROLE: "0x10d0eb36e41c26561039ef37b45fdeae633ee31dc3680c7d4b88d61cd6f9e3a0",
    ADVERTISER_MANAGER_ROLE: "0x770e31de7620182e1551cbaf21dc5d68df44ced7aa7915c47d6ea6e705b2a54c",
    AI_SEARCHER_MANAGER_ROLE: "0x1cbd36a2c933f205e15bbafcc5602f1277b3d9086dc87a057cd29aab12f394c4"
  };
  
  // 从部署配置文件读取合约地址
  const deploymentFile = process.env.DEPLOYMENT_FILE || "/Users/hongbingpan/monowave/deployment-mvp.json";
  let deployment;
  try {
    const deploymentData = readFileSync(deploymentFile, 'utf8');
    deployment = JSON.parse(deploymentData);
    console.log(`📋 使用部署配置: ${deploymentFile}`);
  } catch (error) {
    console.error(`❌ 无法读取部署文件: ${deploymentFile}`);
    process.exit(1);
  }
  
  // 获取signer (应该是DEPLOYER)
  const [signer] = await hre.ethers.getSigners();
  console.log(`👤 使用账户: ${signer.address}`);
  
  // 验证signer是DEPLOYER
  if (signer.address.toLowerCase() !== TEST_ADDRESSES.DEPLOYER.toLowerCase()) {
    console.error(`❌ 错误: signer不是DEPLOYER账户`);
    console.error(`   期望: ${TEST_ADDRESSES.DEPLOYER}`);
    console.error(`   实际: ${signer.address}`);
    process.exit(1);
  }
  
  // 获取合约实例
  const accessControl = await hre.ethers.getContractAt("AccessControl", deployment.contracts.AccessControl);
  const participantRegistry = await hre.ethers.getContractAt("ParticipantRegistry", deployment.contracts.ParticipantRegistry);
  
  console.log(`📄 AccessControl地址: ${await accessControl.getAddress()}`);
  console.log(`📄 ParticipantRegistry地址: ${await participantRegistry.getAddress()}`);
  
  // 1. 在ParticipantRegistry中注册测试账号
  console.log('\\n📋 1. 在ParticipantRegistry中注册测试账号:');
  
  const registrations = [
    {
      name: 'AI_SEARCHER',
      address: TEST_ADDRESSES.AI_SEARCHER,
      roleBitmap: ROLES.ROLE_AI_SEARCHER,
      meta: "0x0b2fa5ccdd63fafe1f4230d054b7d01e2364d57595e584fa2d6de178f8a650af"
    },
    {
      name: 'PUBLISHER', 
      address: TEST_ADDRESSES.PUBLISHER,
      roleBitmap: ROLES.ROLE_PUBLISHER,
      meta: "0x27ab35ed20d9b6e191331ac7a5892fd0b6763b024c62acd0a0cc58483e1cd07b"
    },
    {
      name: 'ADVERTISER',
      address: TEST_ADDRESSES.ADVERTISER, 
      roleBitmap: ROLES.ROLE_ADVERTISER,
      meta: "0xfe2e4e8a1af985bd55826f5d82be58efaf5f42d27412bfbc9e3aae644f6673fd"
    }
  ];
  
  for (const reg of registrations) {
    console.log(`\\n  🔧 处理 ${reg.name} (${reg.address}):`);
    
    try {
      // 检查是否已注册
      const isRegistered = await participantRegistry.isRegistered(reg.address);
      
      if (isRegistered) {
        const participant = await participantRegistry.get(reg.address);
        console.log('     ✅ 已注册');
        console.log(`     - 当前角色位图: ${participant.roleBitmap}`);
        console.log(`     - 状态: ${participant.status === 1n ? '激活' : '未激活'}`);
        console.log(`     - 收款地址: ${participant.payout}`);
        
        // 检查角色位图是否匹配
        if (participant.roleBitmap !== BigInt(reg.roleBitmap)) {
          console.log(`     ⚠️  角色位图不匹配，期望: ${reg.roleBitmap}`);
        }
      } else {
        console.log('     📤 注册中...');
        
        const tx = await participantRegistry.register(
          reg.address,
          reg.roleBitmap,
          reg.address, // 使用自己的地址作为payout地址
          reg.meta,
          { gasLimit: 200000 } // 设置gas limit防止估算失败
        );
        
        console.log(`     ⏳ 交易哈希: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`     ✅ 注册成功 (Gas used: ${receipt.gasUsed})`);
        
        // 验证注册结果
        const newParticipant = await participantRegistry.get(reg.address);
        console.log(`     - 角色位图: ${newParticipant.roleBitmap}`);
        console.log(`     - 状态: ${newParticipant.status === 1n ? '激活' : '未激活'}`);
      }
      
    } catch (error) {
      console.error(`     ❌ 失败: ${error.message}`);
      if (error.reason) console.error(`     原因: ${error.reason}`);
    }
  }
  
  // 2. 分配AccessControl业务管理角色 (可选)
  console.log('\\n📋 2. 分配AccessControl业务管理角色:');
  
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
    console.log(`\\n  🔧 处理 ${businessRole.name}:`);
    console.log(`     接受者: ${businessRole.account}`);
    
    try {
      // 检查是否已有角色
      const hasRole = await accessControl.hasRole(businessRole.role, businessRole.account);
      
      if (hasRole) {
        console.log('     ✅ 已有角色 (跳过)');
      } else {
        console.log('     📤 分配角色中...');
        
        const tx = await accessControl.grantRole(businessRole.role, businessRole.account, {
          gasLimit: 100000
        });
        
        console.log(`     ⏳ 交易哈希: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`     ✅ 角色分配成功 (Gas used: ${receipt.gasUsed})`);
      }
      
    } catch (error) {
      console.error(`     ❌ 失败: ${error.message}`);
      if (error.reason) console.error(`     原因: ${error.reason}`);
    }
  }
  
  // 3. 最终验证
  console.log('\\n📋 3. 最终验证:');
  
  console.log('\\n   ParticipantRegistry状态:');
  for (const reg of registrations) {
    try {
      const isRegistered = await participantRegistry.isRegistered(reg.address);
      const hasRole = isRegistered ? await participantRegistry.hasRole(reg.address, getRoleEnum(reg.roleBitmap)) : false;
      
      console.log(`   - ${reg.name}: ${isRegistered ? '✅ 已注册' : '❌ 未注册'} ${hasRole ? '| 角色正确' : '| 角色错误'}`);
    } catch (error) {
      console.log(`   - ${reg.name}: ❌ 验证失败`);
    }
  }
  
  console.log('\\n   AccessControl业务角色:');
  for (const businessRole of businessRoles) {
    try {
      const hasRole = await accessControl.hasRole(businessRole.role, businessRole.account);
      const roleName = businessRole.name.replace('_ROLE', '');
      console.log(`   - ${roleName}: ${hasRole ? '✅ 已分配' : '❌ 未分配'}`);
    } catch (error) {
      console.log(`   - ${businessRole.name}: ❌ 验证失败`);
    }
  }
  
  console.log('\\n🎉 角色分配完成！');
}

function getRoleEnum(roleBitmap) {
  // ParticipantRegistry.Role枚举: None=0, Publisher=1, Advertiser=2, AISearcher=3
  if (roleBitmap === ROLES.ROLE_PUBLISHER) return 1;
  if (roleBitmap === ROLES.ROLE_ADVERTISER) return 2;
  if (roleBitmap === ROLES.ROLE_AI_SEARCHER) return 3;
  return 0;
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});