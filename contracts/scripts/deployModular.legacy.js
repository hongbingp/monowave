const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting AdChain Modular Platform Deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
    gasUsed: {},
    verification: {}
  };

  // Step 1: Deploy MockUSDC for testing (in production, use real USDC address)
  console.log("\n📄 Step 1: Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  console.log("✅ Mock USDC deployed to:", mockUSDCAddress);
  deploymentInfo.contracts.mockUSDC = mockUSDCAddress;

  // Step 2: Deploy AdChain Platform (this will deploy AccessControl internally)
  console.log("\n📄 Step 2: Deploying AdChain Platform...");
  const AdChainPlatform = await ethers.getContractFactory("AdChainPlatform");
  const platform = await AdChainPlatform.deploy(mockUSDCAddress, 1);
  await platform.waitForDeployment();
  const platformAddress = await platform.getAddress();
  
  console.log("✅ AdChain Platform deployed to:", platformAddress);
  deploymentInfo.contracts.adChainPlatform = platformAddress;

  // Step 3: Initialize all modules
  console.log("\n📄 Step 3: Initializing Platform Modules...");
  const initTx = await platform.initializeModules();
  await initTx.wait();
  console.log("✅ Platform modules initialized");

  // Step 4: Get all module addresses
  console.log("\n📄 Step 4: Retrieving Module Addresses...");
  const moduleAddresses = await platform.getModuleAddresses();
  
  deploymentInfo.contracts.accessControl = moduleAddresses[0];
  deploymentInfo.contracts.publisherRegistry = moduleAddresses[1];
  deploymentInfo.contracts.chargeManager = moduleAddresses[2];
  deploymentInfo.contracts.revenueDistributor = moduleAddresses[3];
  deploymentInfo.contracts.advertiserRegistry = moduleAddresses[4];
  deploymentInfo.contracts.aiSearcherRegistry = moduleAddresses[5];
  deploymentInfo.contracts.prepaymentManager = moduleAddresses[6];
  deploymentInfo.contracts.adTransactionRecorder = moduleAddresses[7];

  console.log("📋 Module Addresses:");
  console.log("   AccessControl:", deploymentInfo.contracts.accessControl);
  console.log("   PublisherRegistry:", deploymentInfo.contracts.publisherRegistry);
  console.log("   ChargeManager:", deploymentInfo.contracts.chargeManager);
  console.log("   RevenueDistributor:", deploymentInfo.contracts.revenueDistributor);
  console.log("   AdvertiserRegistry:", deploymentInfo.contracts.advertiserRegistry);
  console.log("   AISearcherRegistry:", deploymentInfo.contracts.aiSearcherRegistry);
  console.log("   PrepaymentManager:", deploymentInfo.contracts.prepaymentManager);
  console.log("   AdTransactionRecorder:", deploymentInfo.contracts.adTransactionRecorder);

  // Step 5: Setup initial configuration
  console.log("\n📄 Step 5: Setting up Initial Configuration...");
  
  // Note: Access control is managed by the AdChainPlatform contract
  // The deployer controls the platform, and the platform controls the access control
  console.log("   Access control managed by AdChainPlatform contract");
  console.log("   Platform owner has administrative control");

  // Step 6: Deploy some test entities for demonstration
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("\n📄 Step 6: Setting up Test Entities (Local Network Only)...");
    
    // Create test accounts
    const [, testPublisher, testAdvertiser, testAISearcher] = await ethers.getSigners();
    
    // Register test publisher
    console.log("   Registering test publisher...");
    const publisherTx = await platform.registerPublisher(
      testPublisher.address,
      "Test Publisher Co.",
      "https://testpublisher.com"
    );
    await publisherTx.wait();
    
    // Register test advertiser
    console.log("   Registering test advertiser...");
    const advertiserTx = await platform.registerAdvertiser(
      testAdvertiser.address,
      "Test Advertiser Inc.",
      "https://testadvertiser.com",
      ["tech", "ai"],
      ethers.parseUnits("10000", 6) // 10k USDC credit limit
    );
    await advertiserTx.wait();
    
    // Register test AI searcher
    console.log("   Registering test AI searcher...");
    const aiSearcherTx = await platform.registerAISearcher(
      testAISearcher.address,
      "Test AI Searcher",
      "AI content crawling service",
      "https://api.testsearcher.com",
      ["raw", "summary", "structured"],
      ethers.parseUnits("5000", 6) // 5k USDC credit limit
    );
    await aiSearcherTx.wait();
    
    // Fund test accounts with MockUSDC
    console.log("   Funding test accounts with MockUSDC...");
    const fundAmount = ethers.parseUnits("1000", 6); // 1000 USDC each
    
    await mockUSDC.mint(testPublisher.address, fundAmount);
    await mockUSDC.mint(testAdvertiser.address, fundAmount);
    await mockUSDC.mint(testAISearcher.address, fundAmount);
    
    deploymentInfo.testAccounts = {
      testPublisher: testPublisher.address,
      testAdvertiser: testAdvertiser.address,
      testAISearcher: testAISearcher.address
    };
    
    console.log("✅ Test entities created and funded");
  }

  // Step 7: Verify platform status
  console.log("\n📄 Step 7: Verifying Platform Status...");
  const platformInfo = await platform.getPlatformInfo();
  const platformStats = await platform.getPlatformStats();
  
  console.log("📊 Platform Information:");
  console.log("   Active:", platformInfo[0]);
  console.log("   Version:", platformInfo[1].toString());
  console.log("   Launch Timestamp:", new Date(Number(platformInfo[2]) * 1000).toISOString());
  console.log("   Stablecoin:", platformInfo[3]);
  console.log("   Owner:", platformInfo[4]);
  
  console.log("📈 Platform Statistics:");
  console.log("   Total Publishers:", platformStats[0].toString());
  console.log("   Total Advertisers:", platformStats[1].toString());
  console.log("   Total AI Searchers:", platformStats[2].toString());
  console.log("   Total Charges:", platformStats[3].toString());
  console.log("   Total Distributions:", platformStats[4].toString());
  console.log("   Total Ad Transactions:", platformStats[5].toString());

  // Save deployment information
  console.log("\n📄 Step 8: Saving Deployment Information...");
  const deploymentPath = require("path").resolve(__dirname, "../../deployment-modular.json");
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Deployment info saved to", deploymentPath);

  // Generate TypeScript types (if needed)
  if (fs.existsSync("./typechain-types")) {
    console.log("📝 TypeScript types available in ./typechain-types/");
  }

  console.log("\n🎉 AdChain Modular Platform Deployment Complete!");
  console.log("🔗 Platform Address:", platformAddress);
  console.log("🪙 Stablecoin Address:", mockUSDCAddress);
  
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⚠️  Remember to:");
    console.log("   1. Verify contracts on block explorer");
    console.log("   2. Set up proper access controls");
    console.log("   3. Configure production stablecoin address");
    console.log("   4. Register actual publishers, advertisers, and AI searchers");
  }

  return {
    platform: platformAddress,
    stablecoin: mockUSDCAddress,
    modules: deploymentInfo.contracts
  };
}

main()
  .then((result) => {
    console.log("\n✅ Deployment successful!");
    console.log("Result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });