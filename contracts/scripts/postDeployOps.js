const { ethers } = require("hardhat");

async function main() {
  const addresses = {
    access: process.env.ACCESS || "0x7F5100B88e0E55D7D2b22844fC8cC80aadeEEF82",
    tokenRegistry: process.env.TOKEN_REG || "0x7dA2b55BBAd825177c9d978dD6bbeaB085e0BF99",
    participantRegistry: process.env.PART_REG || "0x4c7d50000f02c6F4F0Afc94D6EFe7EBDf5904765",
    batchLedger: process.env.LEDGER || "0x322d1ad82664e1b22fA813a0CDfB44c02cbA2832",
    escrow: process.env.ESCROW || "0xb54b32AC2Ef06E5bD4E03121D0023d5d41BC63fA",
    distributor: process.env.DIST || "0x3fEC9A964F421E8D1C3a2B4D57E925f9d6e75654",
    usdc: process.env.USDC || "0x1cF6f62197703876C13AD64039A3dFC5cB5839F8",
  };

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


