const { ethers } = require("hardhat");

function buildMerkle(leaves) {
  // leaves: array of bytes32
  if (leaves.length === 0) return { root: ethers.ZeroHash, layers: [leaves] };
  let layers = [leaves.slice()];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i];
      const b = i + 1 < prev.length ? prev[i + 1] : prev[i];
      next.push(a < b ? ethers.keccak256(ethers.concat([a, b])) : ethers.keccak256(ethers.concat([b, a])));
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

function getProof(layers, index) {
  const proof = [];
  let idx = index;
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const pairIndex = idx ^ 1;
    const sibling = pairIndex < layer.length ? layer[pairIndex] : layer[idx];
    proof.push(sibling);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

async function main() {
  const addresses = {
    tokenRegistry: process.env.TOKEN_REG || "0x7dA2b55BBAd825177c9d978dD6bbeaB085e0BF99",
    batchLedger: process.env.LEDGER || "0x322d1ad82664e1b22fA813a0CDfB44c02cbA2832",
    escrow: process.env.ESCROW || "0xb54b32AC2Ef06E5bD4E03121D0023d5d41BC63fA",
    distributor: process.env.DIST || "0x3fEC9A964F421E8D1C3a2B4D57E925f9d6e75654",
    usdc: process.env.USDC || "0x1cF6f62197703876C13AD64039A3dFC5cB5839F8",
  };

  const [op] = await ethers.getSigners();
  const usdc = await ethers.getContractAt("MockUSDC", addresses.usdc);
  const esc = await ethers.getContractAt("Escrow", addresses.escrow);
  const bl = await ethers.getContractAt("BatchLedger", addresses.batchLedger);
  const dist = await ethers.getContractAt("Distributor", addresses.distributor);

  console.log("Operator:", op.address);

  // ---------- Batch A: multi-account payout, settle ----------
  const addr2 = "0x1111111111111111111111111111111111111111"; // 示例地址（对方自行 claim）
  const addr3 = "0x2222222222222222222222222222222222222222"; // 示例地址
  const a1 = ethers.parseUnits("50", 6);
  const a2 = ethers.parseUnits("30", 6);
  const a3 = ethers.parseUnits("20", 6);

  const leavesA = [
    ethers.keccak256(ethers.solidityPacked(["address","address","uint256"],[op.address, addresses.usdc, a1])),
    ethers.keccak256(ethers.solidityPacked(["address","address","uint256"],[addr2, addresses.usdc, a2])),
    ethers.keccak256(ethers.solidityPacked(["address","address","uint256"],[addr3, addresses.usdc, a3])),
  ];
  const { root: rootA, layers: layersA } = buildMerkle(leavesA);
  const batchA = ethers.keccak256(ethers.toUtf8Bytes("batchA-"+Date.now().toString()));

  // 为了演示 settle，设置 windowEnd 为过去时间，立即可 settle
  const now = await ethers.provider.getBlock("latest");
  const windowEndA = BigInt(now.timestamp - 10);
  await (await bl.commitBatch(rootA, batchA, { token: addresses.usdc, total: 0n, windowEnd: windowEndA, kind: 1 })).wait();
  await (await dist.openPayout(batchA, rootA, addresses.usdc)).wait();

  // Operator claim with proof
  const proofOpA = getProof(layersA, 0);
  await (await dist.connect(op).claim(batchA, addresses.usdc, a1, proofOpA)).wait();
  const balAfterClaimA = await esc.balanceOf(op.address, addresses.usdc);
  console.log("BatchA: operator Escrow balance:", balAfterClaimA.toString());

  // 输出 addr2/addr3 的 proof，供他们自行链下领取
  console.log("BatchA proofs for external accounts:");
  console.log(JSON.stringify({
    batchId: batchA,
    token: addresses.usdc,
    leaves: [
      { account: addr2, amount: a2.toString(), proof: getProof(layersA, 1) },
      { account: addr3, amount: a3.toString(), proof: getProof(layersA, 2) },
    ]
  }, null, 2));

  // settle（window 已过）
  await (await dist.settle(batchA)).wait();
  console.log("BatchA settled.");

  // ---------- Batch B: claim -> dispute -> reverse ----------
  const bAmt = ethers.parseUnits("40", 6);
  const leavesB = [ ethers.keccak256(ethers.solidityPacked(["address","address","uint256"],[op.address, addresses.usdc, bAmt])) ];
  const { root: rootB, layers: layersB } = buildMerkle(leavesB);
  const batchB = ethers.keccak256(ethers.toUtf8Bytes("batchB-"+Date.now().toString()));
  const windowEndB = BigInt((await ethers.provider.getBlock("latest")).timestamp + 600); // 10 分钟后

  await (await bl.commitBatch(rootB, batchB, { token: addresses.usdc, total: 0n, windowEnd: windowEndB, kind: 1 })).wait();
  await (await dist.openPayout(batchB, rootB, addresses.usdc)).wait();
  await (await dist.connect(op).claim(batchB, addresses.usdc, bAmt, getProof(layersB, 0))).wait();

  // 争议（在窗口内）
  await (await dist.dispute(batchB, ethers.id("test-dispute"))).wait();
  console.log("BatchB disputed.");

  // 回冲一部分（从 operator 余额扣除）
  const adj = ethers.parseUnits("5", 6);
  await (await dist.reverse(batchB, [op.address], [adj])).wait();
  const balAfterReverse = await esc.balanceOf(op.address, addresses.usdc);
  console.log("BatchB: operator Escrow balance after reverse:", balAfterReverse.toString());

  console.log("\nMulti-account payout + dispute/settle flow completed.");
}

main().catch((e) => { console.error(e); process.exit(1); });


