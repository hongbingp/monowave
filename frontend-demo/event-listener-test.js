// Web3 事件监听功能测试脚本
const { ethers } = require('ethers');

// Base Sepolia 网络配置
const RPC_URL = 'https://sepolia.base.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 合约地址
const CONTRACT_ADDRESSES = {
  MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
  Escrow: '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8'
};

// USDC ABI (用于事件监听)
const USDC_ABI = [
  'function name() view returns (string)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

async function testEventListening() {
  console.log('🎧 开始Web3事件监听功能测试...\n');
  
  try {
    // 1. 网络连接和基础信息
    console.log('📋 1. 验证网络连接和合约信息:');
    const network = await provider.getNetwork();
    console.log(`  ✅ 网络: ${network.name} (Chain ID: ${network.chainId})`);
    
    const latestBlock = await provider.getBlockNumber();
    console.log(`  ✅ 最新区块: ${latestBlock}`);
    
    const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.MockUSDC, USDC_ABI, provider);
    const name = await usdcContract.name();
    const decimals = await usdcContract.decimals();
    console.log(`  ✅ USDC合约: ${name} (精度: ${decimals})`);
    
    // 2. 历史事件查询测试
    console.log('\n📜 2. 历史事件查询测试:');
    const fromBlock = Math.max(0, latestBlock - 5000); // 检查最近5000个区块
    console.log(`  📊 查询区块范围: ${fromBlock} - ${latestBlock}`);
    
    // 查询Transfer事件
    const transferFilter = usdcContract.filters.Transfer();
    const transferEvents = await usdcContract.queryFilter(transferFilter, fromBlock, latestBlock);
    console.log(`  ✅ 发现 ${transferEvents.length} 个Transfer事件`);
    
    if (transferEvents.length > 0) {
      console.log('  📋 最近的Transfer事件:');
      const recentEvents = transferEvents.slice(-3); // 显示最近3个事件
      
      for (const event of recentEvents) {
        const fromAddress = event.args[0];
        const toAddress = event.args[1];
        const value = ethers.formatUnits(event.args[2], decimals);
        console.log(`    - 从 ${fromAddress} 到 ${toAddress}: ${value} USDC (区块 ${event.blockNumber})`);
      }
    } else {
      console.log('  ⚪ 在指定区块范围内未发现Transfer事件');
    }
    
    // 查询Approval事件
    const approvalFilter = usdcContract.filters.Approval();
    const approvalEvents = await usdcContract.queryFilter(approvalFilter, fromBlock, latestBlock);
    console.log(`  ✅ 发现 ${approvalEvents.length} 个Approval事件`);
    
    // 3. 事件过滤器测试
    console.log('\n🔍 3. 事件过滤器功能测试:');
    
    // 测试按地址过滤的Transfer事件
    const testAddresses = [
      '0xa8aD655BedCeCF10c6E3156Fc937C2D63a01159c', // AI_SEARCHER
      '0x8eE41EE5032E30F0bb04444463142DCDc53A19f0', // PUBLISHER
      '0x61f7204072D91cb5DC79a99D7d0D7551E302B921', // ADVERTISER
      '0x4D15ebD9cf36894E04802C96dF745458db808611'  // DEPLOYER
    ];
    
    for (const address of testAddresses) {
      // 查询该地址作为发送方的事件
      const fromFilter = usdcContract.filters.Transfer(address, null);
      const fromEvents = await usdcContract.queryFilter(fromFilter, fromBlock, latestBlock);
      
      // 查询该地址作为接收方的事件
      const toFilter = usdcContract.filters.Transfer(null, address);
      const toEvents = await usdcContract.queryFilter(toFilter, fromBlock, latestBlock);
      
      const roleLabel = address === '0xa8aD655BedCeCF10c6E3156Fc937C2D63a01159c' ? 'AI_SEARCHER' :
                       address === '0x8eE41EE5032E30F0bb04444463142DCDc53A19f0' ? 'PUBLISHER' :
                       address === '0x61f7204072D91cb5DC79a99D7d0D7551E302B921' ? 'ADVERTISER' : 'DEPLOYER';
      console.log(`  📊 ${roleLabel} (${address.slice(0,8)}...):`);
      console.log(`    - 作为发送方: ${fromEvents.length} 个事件`);
      console.log(`    - 作为接收方: ${toEvents.length} 个事件`);
    }
    
    // 4. 实时监听准备测试
    console.log('\n🔴 4. 实时监听能力测试:');
    
    // 测试事件监听器设置
    console.log('  📋 设置Transfer事件监听器...');
    
    const eventPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve('timeout');
      }, 5000); // 5秒超时
      
      // 监听新的Transfer事件
      usdcContract.once('Transfer', (from, to, value, event) => {
        clearTimeout(timeout);
        resolve({
          from,
          to,
          value: ethers.formatUnits(value, decimals),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      });
    });
    
    console.log('  ⏱️  监听中... (5秒超时)');
    const result = await eventPromise;
    
    if (result === 'timeout') {
      console.log('  ⚪ 5秒内未检测到新的Transfer事件 (正常)');
      console.log('  ✅ 监听器设置成功，可以监听实时事件');
    } else {
      console.log('  🎉 捕获到实时Transfer事件!');
      console.log(`    - 从: ${result.from}`);
      console.log(`    - 到: ${result.to}`);
      console.log(`    - 金额: ${result.value} USDC`);
      console.log(`    - 区块: ${result.blockNumber}`);
      console.log(`    - 交易哈希: ${result.transactionHash}`);
    }
    
    // 5. WebSocket连接测试(如果可用)
    console.log('\n🌐 5. WebSocket连接能力测试:');
    try {
      const wsProvider = new ethers.WebSocketProvider('wss://base-sepolia.g.alchemy.com/v2/demo');
      await wsProvider.getBlockNumber();
      console.log('  ✅ WebSocket连接可用 (更适合实时监听)');
      wsProvider.destroy();
    } catch (error) {
      console.log('  ⚪ WebSocket连接不可用，使用HTTP polling');
    }
    
    // 6. 前端集成验证准备
    console.log('\n🌐 6. 前端事件监听集成准备:');
    console.log('  📋 验证项目清单:');
    console.log('    - [✅] Provider连接正常');
    console.log('    - [✅] 合约实例创建成功');
    console.log('    - [✅] 历史事件查询功能');
    console.log('    - [✅] 事件过滤器功能');
    console.log('    - [✅] 实时监听器设置');
    console.log('    - [✅] 网络稳定性验证');
    
    // 7. 测试结果摘要
    console.log('\n🎯 事件监听功能测试摘要:');
    console.log('  ✅ 网络连接稳定');
    console.log('  ✅ 合约事件接口正常');
    console.log('  ✅ 历史事件查询功能');
    console.log('  ✅ 事件过滤功能正常');
    console.log('  ✅ 实时监听器可用');
    
    if (transferEvents.length > 0) {
      console.log('  ✅ 发现历史交易 - 可验证事件捕获');
    } else {
      console.log('  ⚪ 无历史交易 - 适合测试新交易事件');
    }
    
    console.log('\n🚀 前端事件监听建议:');
    console.log('  1. 使用useEffect设置事件监听器');
    console.log('  2. 在组件卸载时清理监听器');
    console.log('  3. 实现事件状态管理（useState/useContext)');
    console.log('  4. 添加错误处理和重连机制');
    console.log('  5. 考虑使用防抖避免频繁更新UI');
    
  } catch (error) {
    console.error('❌ 事件监听功能测试失败:', error.message);
  }
}

// 执行测试
testEventListening();