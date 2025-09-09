// 测试用的钱包地址配置
export const TEST_ADDRESSES = {
  // 实际部署合约时使用的钱包地址 (推荐使用)
  DEPLOYER: {
    address: '0x4D15ebD9cf36894E04802C96dF745458db808611',
    label: 'Contract Deployer',
    description: '合约部署钱包 (拥有管理员权限)'
  },
  // 指定的测试用户钱包地址
  AI_SEARCHER: {
    address: '0xa8aD655BedCeCF10c6E3156Fc937C2D63a01159c',
    label: 'AI App',
    description: 'AI应用测试钱包'
  },
  PUBLISHER: {
    address: '0x8eE41EE5032E30F0bb04444463142DCDc53A19f0',
    label: 'Publisher', 
    description: '发布者测试钱包'
  },
  ADVERTISER: {
    address: '0x61f7204072D91cb5DC79a99D7d0D7551E302B921',
    label: 'Advertiser',
    description: '广告商测试钱包'
  },
  
  // 测试合约地址 (已部署在 Base Sepolia)
  CONTRACTS: {
    MockUSDC: '0x5731AF5B463315028843f599Ae7dF02799a77eE2',
    AccessControl: '0x82f2085848b4743629733CA9744cDbe49E57C9bA',
    TokenRegistry: '0x98B5A80a43Ff4d5EC6d4f200347A66069B7FAf60',
    ParticipantRegistry: '0xA78606270A7b752bBda7F847F98Ce25888263A3E',
    BatchLedger: '0x3ADE3AAE3450B0e7d6F2Ae652bD9D3567D47F61e',
    Escrow: '0x957A80CdA5D93cF4FdFe85BC4e7a2e5fA4368EA8',
    Distributor: '0xcBAD9733BCb2b9CBddbAAfD45449557A06C6a619'
  }
};

// 根据用户角色获取推荐的测试地址
export function getTestAddressByRole(role: string): typeof TEST_ADDRESSES.AI_SEARCHER | null {
  switch (role) {
    case 'ai_searcher':
      return TEST_ADDRESSES.AI_SEARCHER;
    case 'publisher':
      return TEST_ADDRESSES.PUBLISHER;
    case 'advertiser':
      return TEST_ADDRESSES.ADVERTISER;
    default:
      return TEST_ADDRESSES.DEPLOYER; // 默认返回部署者地址
  }
}

// 检查地址是否为测试地址
export function isTestAddress(address: string): boolean {
  return Object.values(TEST_ADDRESSES)
    .filter(item => typeof item === 'object' && 'address' in item)
    .some(item => item.address.toLowerCase() === address.toLowerCase());
}

// 获取地址的标签
export function getAddressLabel(address: string): string {
  const testAddr = Object.values(TEST_ADDRESSES)
    .filter(item => typeof item === 'object' && 'address' in item)
    .find(item => item.address.toLowerCase() === address.toLowerCase());
  
  return testAddr?.label || `${address.slice(0, 6)}...${address.slice(-4)}`;
}