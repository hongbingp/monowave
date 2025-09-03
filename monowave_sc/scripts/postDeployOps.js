import hre from "hardhat";
const { ethers } = await hre.network.connect();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Load deployment addresses
  const deploymentPath = path.resolve(__dirname, "../../deployment-mvp.json");
  let deployment;
  try {
    const deploymentData = fs.readFileSync(deploymentPath, "utf8");
    deployment = JSON.parse(deploymentData);
  } catch (error) {
    console.error("Failed to load deployment file:", deploymentPath);
    console.error("Please run deployment first: npm run deploy:base-sepolia");
    process.exit(1);
  }

  const addresses = {
    access: deployment.contracts.AccessControl,
    tokenRegistry: deployment.contracts.TokenRegistry,
    participantRegistry: deployment.contracts.ParticipantRegistry,
    batchLedger: deployment.contracts.BatchLedger,
    escrow: deployment.contracts.Escrow,
    distributor: deployment.contracts.Distributor,
    usdc: deployment.contracts.MockUSDC,
  };

  console.log("Using deployed contract addresses from:", deploymentPath);
  console.log("Network:", deployment.network);
  console.log("Deployed at:", deployment.timestamp);

  const [signer] = await ethers.getSigners();
  console.log("Operator:", signer.address);

  const tr = await ethers.getContractAt("TokenRegistry", addresses.tokenRegistry);
  const usdc = await ethers.getContractAt("MockUSDC", addresses.usdc);
  const esc = await ethers.getContractAt("Escrow", addresses.escrow);
  const bl = await ethers.getContractAt("BatchLedger", addresses.batchLedger);
  const dist = await ethers.getContractAt("Distributor", addresses.distributor);

  // 1) Token whitelist + limits
  console.log("\n[1] TokenRegistry: allow + setLimits...");
  await (await tr.allow(addresses.usdc, true)).wait();
  await (await tr.setLimits(addresses.usdc, ethers.parseUnits("10000", 6), ethers.parseUnits("100000", 6))).wait();
  console.log("   ✅ Token whitelisted and limits set");

  // 2) Mint USDC to operator and deposit into Escrow
  console.log("\n[2] USDC mint + Escrow deposit...");
  await (await usdc.mint(signer.address, ethers.parseUnits("5000", 6))).wait();
  await (await usdc.approve(await esc.getAddress(), ethers.parseUnits("1000", 6))).wait();
  await (await esc.deposit(addresses.usdc, ethers.parseUnits("1000", 6))).wait();
  const balAfterDeposit = await esc.balanceOf(signer.address, addresses.usdc);
  console.log("   ✅ Escrow balance after deposit:", balAfterDeposit.toString());

  // 3) Commit payout batch and open distribution, then claim single-leaf
  console.log("\n[3] Batch commit + openPayout + single-leaf claim...");
  const amount = ethers.parseUnits("50", 6);
  const leaf = ethers.keccak256(ethers.solidityPacked(["address", "address", "uint256"], [signer.address, addresses.usdc, amount]));
  const root = leaf; // single leaf tree: root == leaf
  const batchId = ethers.keccak256(ethers.toUtf8Bytes("batch-demo-" + Date.now().toString()));
  const latestBlock = await ethers.provider.getBlock("latest");
  const windowEnd = BigInt(latestBlock.timestamp + 1800);

  const committed = await bl.isCommitted(batchId);
  if (!committed) {
    await (await bl.commitBatch(root, batchId, { token: addresses.usdc, total: 0n, windowEnd, kind: 1 })).wait();
    console.log("   ✅ Batch committed:", batchId);
  }
  await (await dist.openPayout(batchId, root, addresses.usdc)).wait();
  const batchInfo = await dist.payoutBatches(batchId);
  console.log("   PayoutBatch status after open:", batchInfo.status?.toString?.() || batchInfo[3]?.toString?.());
  await (await dist.claim(batchId, addresses.usdc, amount, [])).wait();

  const balAfterClaim = await esc.balanceOf(signer.address, addresses.usdc);
  console.log("   ✅ Escrow balance after claim credit:", balAfterClaim.toString());

  console.log("\nAll post-deploy operations completed successfully.");
}

main().catch((e) => { console.error(e); process.exit(1); });


