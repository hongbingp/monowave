import { ethers } from 'ethers';
import { readFileSync } from 'fs';

// Test addresses
const TEST_ADDRESSES = {
  AI_SEARCHER: '0xa8aD655BedCeCF10c6E3156Fc937C2D63a01159c',
  PUBLISHER: '0x8eE41EE5032E30F0bb04444463142DCDc53A19f0',
  ADVERTISER: '0x61f7204072D91cb5DC79a99D7d0D7551E302B921',
  DEPLOYER: '0x4D15ebD9cf36894E04802C96dF745458db808611'
};

// Role bitmap constants
const ROLES = {
  ROLE_PUBLISHER: 1,    // 1 << 0
  ROLE_ADVERTISER: 2,   // 1 << 1  
  ROLE_AI_SEARCHER: 4   // 1 << 2
};

// Simple ParticipantRegistry ABI (just the register function)
const PARTICIPANT_REGISTRY_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "who", "type": "address"},
      {"internalType": "uint256", "name": "roleBitmap", "type": "uint256"},
      {"internalType": "address", "name": "payout", "type": "address"},
      {"internalType": "bytes32", "name": "meta", "type": "bytes32"}
    ],
    "name": "register",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "who", "type": "address"}],
    "name": "isRegistered",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('🚀 Starting role assignment...\n');
  
  // Read deployment config
  const deploymentFile = "/Users/hongbingpan/monowave/deployment-mvp.json";
  const deployment = JSON.parse(readFileSync(deploymentFile, 'utf8'));
  
  // Setup provider and wallet (you'll need to set PRIVATE_KEY environment variable)
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY environment variable not set');
    console.log('💡 To execute: PRIVATE_KEY=<deployer_private_key> node assign-roles-direct.js');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(`👤 Using wallet: ${wallet.address}`);
  
  // Verify this is the deployer
  if (wallet.address.toLowerCase() !== TEST_ADDRESSES.DEPLOYER.toLowerCase()) {
    console.error(`❌ Error: Wallet is not DEPLOYER`);
    console.error(`   Expected: ${TEST_ADDRESSES.DEPLOYER}`);
    console.error(`   Actual: ${wallet.address}`);
    process.exit(1);
  }
  
  // Get ParticipantRegistry contract
  const participantRegistry = new ethers.Contract(
    deployment.contracts.ParticipantRegistry,
    PARTICIPANT_REGISTRY_ABI,
    wallet
  );
  
  console.log(`📄 ParticipantRegistry: ${deployment.contracts.ParticipantRegistry}`);
  
  // Registration data
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
  
  // Execute registrations
  console.log('\n📋 Registering accounts in ParticipantRegistry:');
  
  for (const reg of registrations) {
    console.log(`\n  🔧 Processing ${reg.name} (${reg.address}):`);
    
    try {
      // Check if already registered
      const isRegistered = await participantRegistry.isRegistered(reg.address);
      
      if (isRegistered) {
        console.log('     ✅ Already registered (skipping)');
      } else {
        console.log('     📤 Registering...');
        
        const tx = await participantRegistry.register(
          reg.address,
          reg.roleBitmap,
          reg.address, // payout address same as participant
          reg.meta,
          { gasLimit: 200000 }
        );
        
        console.log(`     ⏳ Transaction: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`     ✅ Registration successful (Gas: ${receipt.gasUsed})`);
        
        // Verify registration
        const nowRegistered = await participantRegistry.isRegistered(reg.address);
        console.log(`     ✅ Verification: ${nowRegistered ? 'Registered' : 'Not registered'}`);
      }
      
    } catch (error) {
      console.error(`     ❌ Failed: ${error.message}`);
      if (error.reason) console.error(`     Reason: ${error.reason}`);
    }
  }
  
  console.log('\n🎉 Role assignment complete!');
  console.log('\n💡 To verify results, run: node role-management-test.js');
}

main().catch((error) => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});