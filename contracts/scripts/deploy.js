const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy mock USDC for testing (in production, use real USDC address)
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.deployed();
  console.log("Mock USDC deployed to:", mockUSDC.address);

  // Deploy AdChain contract
  const AdChainContract = await ethers.getContractFactory("AdChainContract");
  const adChainContract = await AdChainContract.deploy(mockUSDC.address);
  await adChainContract.deployed();
  
  console.log("AdChain contract deployed to:", adChainContract.address);
  
  // Optional: Set up initial configuration
  await adChainContract.addAuthorizedCharger(deployer.address);
  console.log("Deployer added as authorized charger");
  
  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    adChainContract: adChainContract.address,
    mockUSDC: mockUSDC.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });