import hre from "hardhat";
const { ethers, upgrades } = hre;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Load the deployment file to get contract addresses
  const deploymentPath = path.resolve(__dirname, "../../deployment-mvp.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Run deployMvp.js first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  console.log("🔄 Upgrading contracts...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");
  
  // Example: Upgrade TokenRegistry to TokenRegistryV2
  // Replace "TokenRegistryV2" with your actual V2 contract name
  const contractName = process.env.CONTRACT_NAME || "TokenRegistry";
  const contractAddress = deployment.contracts[contractName];
  
  if (!contractAddress) {
    console.error(`❌ Contract ${contractName} not found in deployment file.`);
    process.exit(1);
  }
  
  console.log(`📋 Upgrading ${contractName} at ${contractAddress}...`);
  
  try {
    // Get the new contract factory (V2 version)
    const ContractV2 = await ethers.getContractFactory(`${contractName}V2`);
    
    // Upgrade the proxy to the new implementation
    const upgraded = await upgrades.upgradeProxy(contractAddress, ContractV2);
    await upgraded.waitForDeployment();
    
    console.log(`✅ ${contractName} upgraded successfully!`);
    console.log("   Proxy address:", await upgraded.getAddress());
    console.log("   New implementation deployed and proxy updated");
    
    // Update deployment file with upgrade info
    deployment.upgrades = deployment.upgrades || {};
    deployment.upgrades[contractName] = {
      timestamp: new Date().toISOString(),
      previousVersion: "V1",
      newVersion: "V2",
      upgrader: deployer.address
    };
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("📄 Updated deployment file with upgrade info");
    
  } catch (error) {
    console.error("❌ Upgrade failed:", error.message);
    
    // Check if it's a storage layout compatibility issue
    if (error.message.includes("storage layout")) {
      console.error("💡 This might be a storage layout compatibility issue.");
      console.error("   Make sure your V2 contract is upgrade-safe:");
      console.error("   - Don't change the order of existing state variables");
      console.error("   - Don't change the type of existing state variables");
      console.error("   - Don't remove existing state variables");
      console.error("   - Only add new state variables at the end");
    }
    
    process.exit(1);
  }
}

// Usage examples:
// npx hardhat run scripts/upgradeContract.js --network localhost
// CONTRACT_NAME=TokenRegistry npx hardhat run scripts/upgradeContract.js --network baseSepolia
// CONTRACT_NAME=Distributor npx hardhat run scripts/upgradeContract.js --network base

main()
  .then(() => process.exit(0))
  .catch((err) => { 
    console.error(err); 
    process.exit(1); 
  });