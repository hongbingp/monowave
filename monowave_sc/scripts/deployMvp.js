import hre from "hardhat";
const { ethers, upgrades } = hre;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("🚀 Deploying MVP stack (AccessControl + Registries + Escrow + Ledger + Distributor)...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  const deployment = { network: (await deployer.provider.getNetwork()).name || hre.network.name, deployer: deployer.address, timestamp: new Date().toISOString(), contracts: {} };

  // 1) Token (Mock USDC for local/testing)
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  deployment.contracts.MockUSDC = await usdc.getAddress();
  console.log("✅ MockUSDC:", deployment.contracts.MockUSDC);

  // 2) AccessControl
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const access = await AccessControl.deploy(deployer.address);
  await access.waitForDeployment();
  deployment.contracts.AccessControl = await access.getAddress();
  console.log("✅ AccessControl:", deployment.contracts.AccessControl);

  // Helper to compute role ids consistent with AccessControlRoles.sol
  const roleId = (name) => ethers.keccak256(ethers.toUtf8Bytes(name));
  const ROLES = {
    GOVERNOR_ROLE: roleId("GOVERNOR_ROLE"),
    SETTLER_ROLE: roleId("SETTLER_ROLE"),
    LEDGER_ROLE: roleId("LEDGER_ROLE"),
    TREASURER_ROLE: roleId("TREASURER_ROLE"),
    RISK_ROLE: roleId("RISK_ROLE"),
  };

  // Grant roles to deployer for MVP
  for (const [name, id] of Object.entries(ROLES)) {
    const tx = await access.grantRole(id, deployer.address);
    await tx.wait();
    console.log(`   Granted ${name} to ${deployer.address}`);
  }

  // 3) TokenRegistry
  const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
  const tokenRegistry = await upgrades.deployProxy(TokenRegistry, [await access.getAddress()]);
  await tokenRegistry.waitForDeployment();
  deployment.contracts.TokenRegistry = await tokenRegistry.getAddress();
  console.log("✅ TokenRegistry:", deployment.contracts.TokenRegistry);

  // Allow USDC and set limits
  await (await tokenRegistry.allow(await usdc.getAddress(), true)).wait();
  await (await tokenRegistry.setLimits(await usdc.getAddress(), ethers.parseUnits("10000", 6), ethers.parseUnits("100000", 6))).wait();

  // 4) ParticipantRegistry
  const ParticipantRegistry = await ethers.getContractFactory("ParticipantRegistry");
  const participants = await upgrades.deployProxy(ParticipantRegistry, [await access.getAddress()]);
  await participants.waitForDeployment();
  deployment.contracts.ParticipantRegistry = await participants.getAddress();
  console.log("✅ ParticipantRegistry:", deployment.contracts.ParticipantRegistry);

  // 5) BatchLedger
  const BatchLedger = await ethers.getContractFactory("BatchLedger");
  const ledger = await upgrades.deployProxy(BatchLedger, [await access.getAddress()]);
  await ledger.waitForDeployment();
  deployment.contracts.BatchLedger = await ledger.getAddress();
  console.log("✅ BatchLedger:", deployment.contracts.BatchLedger);

  // Grant LEDGER_ROLE to deployer already done; also grant to ledger/distributor if needed later

  // 6) Escrow
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await upgrades.deployProxy(Escrow, [await access.getAddress(), await tokenRegistry.getAddress()]);
  await escrow.waitForDeployment();
  deployment.contracts.Escrow = await escrow.getAddress();
  console.log("✅ Escrow:", deployment.contracts.Escrow);

  // 7) Distributor
  const Distributor = await ethers.getContractFactory("Distributor");
  const distributor = await upgrades.deployProxy(Distributor, [await access.getAddress(), await ledger.getAddress(), await escrow.getAddress()]);
  await distributor.waitForDeployment();
  deployment.contracts.Distributor = await distributor.getAddress();
  console.log("✅ Distributor:", deployment.contracts.Distributor);

  // Grant SETTLER_ROLE to Distributor for claim -> Escrow credit
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));
  await (await access.grantRole(SETTLER_ROLE, await distributor.getAddress())).wait();
  console.log("   Granted SETTLER_ROLE to Distributor");

  // Grant SETTLER_ROLE to deployer (already), optionally to distributor for internal operations
  // Here we keep deployer as the actor for settle/dispute/reverse in MVP

  // Save deployment
  const outPath = path.resolve(__dirname, "../../deployment-mvp.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("\n📄 Saved deployment to", outPath);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });


