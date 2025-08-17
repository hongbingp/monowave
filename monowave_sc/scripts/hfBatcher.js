const { ethers } = require("hardhat");
const { buildTree, getProof } = require("./utils/merkle");

// Config via env
const BATCH_INTERVAL_MS = parseInt(process.env.BATCH_INTERVAL_MS || "2000");
const LEAVES_PER_BATCH = parseInt(process.env.LEAVES_PER_BATCH || "500");
const TOTAL_BATCHES = parseInt(process.env.TOTAL_BATCHES || "100");
const SAMPLE_CLAIMS = parseInt(process.env.SAMPLE_CLAIMS || "20");
const DISPUTE_RATE_BP = parseInt(process.env.DISPUTE_RATE_BP || "200"); // 2%
const WINDOW_SEC = parseInt(process.env.WINDOW_SEC || "1800");

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const addrs = {
    dist: process.env.DIST || "0x3fEC9A964F421E8D1C3a2B4D57E925f9d6e75654",
    ledger: process.env.LEDGER || "0x322d1ad82664e1b22fA813a0CDfB44c02cbA2832",
    escrow: process.env.ESCROW || "0xb54b32AC2Ef06E5bD4E03121D0023d5d41BC63fA",
    usdc: process.env.USDC || "0x1cF6f62197703876C13AD64039A3dFC5cB5839F8",
  };
  const [op] = await ethers.getSigners();
  const dist = await ethers.getContractAt("Distributor", addrs.dist);
  const ledger = await ethers.getContractAt("BatchLedger", addrs.ledger);
  const esc = await ethers.getContractAt("Escrow", addrs.escrow);

  console.log(`HF Batcher start: ${TOTAL_BATCHES} batches, ${LEAVES_PER_BATCH} leaves/batch, every ${BATCH_INTERVAL_MS}ms`);

  for (let b = 0; b < TOTAL_BATCHES; b++) {
    const latest = await ethers.provider.getBlock("latest");
    const windowEnd = BigInt(latest.timestamp + WINDOW_SEC);

    // generate random accounts and amounts
    const leaves = [];
    const accounts = [];
    const amounts = [];
    for (let i = 0; i < LEAVES_PER_BATCH; i++) {
      // pseudo account for demo;你可以改为真实发布方地址列表
      const wallet = ethers.Wallet.createRandom();
      const acc = wallet.address;
      const amt = ethers.parseUnits(String(10 + Math.floor(Math.random() * 90)), 6); // 10-100 USDC
      accounts.push(acc);
      amounts.push(amt);
      leaves.push(ethers.keccak256(ethers.solidityPacked(["address","address","uint256"],[acc, addrs.usdc, amt])));
    }
    const { root, layers } = buildTree(leaves);
    const batchId = ethers.keccak256(ethers.toUtf8Bytes(`hf-${Date.now()}-${b}`));

    try {
      await (await ledger.commitBatch(root, batchId, { token: addrs.usdc, total: 0n, windowEnd, kind: 1 })).wait();
      await (await dist.openPayout(batchId, root, addrs.usdc)).wait();
      console.log(`Batch#${b} committed+opened root=${root}`);
    } catch (e) {
      console.error(`Batch#${b} commit/open failed:`, e.message || e);
      await sleep(BATCH_INTERVAL_MS);
      continue;
    }

    // sample claims
    const claims = Math.min(SAMPLE_CLAIMS, LEAVES_PER_BATCH);
    for (let i = 0; i < claims; i++) {
      const idx = Math.floor(Math.random() * LEAVES_PER_BATCH);
      const proof = getProof(layers, idx);
      try {
        await (await dist.claim(batchId, addrs.usdc, amounts[idx], proof)).wait();
      } catch (e) {
        // ignore duplicate or proof errors from synthetic accs, this is demo
      }
    }

    // random dispute
    if (Math.floor(Math.random() * 10000) < DISPUTE_RATE_BP) {
      try {
        await (await dist.dispute(batchId, ethers.id("auto-dispute"))).wait();
        // small reverse for 1 account
        const ridx = Math.floor(Math.random() * LEAVES_PER_BATCH);
        await (await dist.reverse(batchId, [accounts[ridx]], [ethers.parseUnits("1",6)])).wait();
        console.log(`Batch#${b} disputed+reversed`);
      } catch {}
    }

    await sleep(BATCH_INTERVAL_MS);
  }
  console.log("HF Batcher finished.");
}

main().catch((e) => { console.error(e); process.exit(1); });


